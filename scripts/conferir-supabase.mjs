// Confere se o Supabase de `/trilha/inscricao` está de pé, e completa o que der.
//
//   node scripts/conferir-supabase.mjs
//
// Ele lê o `.env.local`, e faz três perguntas ao projeto — nesta ordem, porque
// cada uma só faz sentido se a anterior passou:
//
//   1. a chave é aceita? (URL certa + chave certa)
//   2. as tabelas `inscricoes` e `config` existem? (o schema.sql foi rodado)
//   3. a função `upsert_inscricao` existe e a `service_role` pode executá-la?
//
// A pergunta 3 é a que ninguém pensa em fazer e é a que mais quebra: o
// `schema.sql` termina com um `revoke` de `execute` em três papéis. Colar só
// metade do arquivo cria as tabelas e deixa a função de fora — o formulário
// então valida tudo, envia, e responde 500 no último passo.
//
// ── Sobre a URL ────────────────────────────────────────────────────────────
// Se `SUPABASE_URL` estiver vazia e a chave for a `service_role` clássica (um
// JWT, começa com `eyJ`), a URL é **derivada da própria chave**: o payload do
// JWT carrega o `ref` do projeto, e a URL é `https://{ref}.supabase.co`. Nesse
// caso o script escreve a URL de volta no `.env.local` e segue.
//
// ── A chave nunca é impressa ───────────────────────────────────────────────
// Nem inteira, nem "só o começo para conferir". Este script existe para rodar
// com alguém olhando a tela, e terminal tem histórico, screenshot e print.

import { readFileSync, writeFileSync } from "node:fs";

// O segundo argumento existe para o teste do próprio script poder rodar contra
// um arquivo descartável. No uso normal é sempre o `.env.local`.
const ARQUIVO = process.argv[2] ?? ".env.local";

const ok = (t) => console.log(`  ✓ ${t}`);
const nao = (t) => console.log(`  ✗ ${t}`);
const dica = (t) => console.log(`     ${t}`);

/** Lê o `.env.local` sem depender de biblioteca: só `CHAVE=valor`, sem aspas. */
function lerEnv(texto) {
  const env = {};
  for (const linha of texto.split(/\r?\n/)) {
    const corte = linha.indexOf("=");
    if (corte < 0 || linha.trimStart().startsWith("#")) continue;
    env[linha.slice(0, corte).trim()] = linha.slice(corte + 1).trim();
  }
  return env;
}

/**
 * O `ref` do projeto, tirado do payload do JWT da `service_role`.
 *
 * Devolve `null` sem reclamar para as chaves novas (`sb_secret_…`), que não são
 * JWT e não carregam o `ref` — ali a URL tem de vir da mão mesmo.
 */
function refDaChave(chave) {
  if (!chave.startsWith("eyJ")) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(chave.split(".")[1], "base64url").toString("utf8"),
    );
    return typeof payload.ref === "string" && payload.role === "service_role"
      ? payload.ref
      : null;
  } catch {
    return null;
  }
}

/**
 * A mesma normalização de `baseDaUrl()` em `lib/inscricao-banco.ts`, e ela está
 * repetida de propósito: este arquivo é `.mjs` sem build e não importa TS.
 * `lib/inscricao-servidor.test.ts` guarda a versão que vai para produção — esta
 * aqui só precisa concordar com ela.
 */
const raiz = (u) => u.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/, "");

let texto = readFileSync(ARQUIVO, "utf8");
const env = lerEnv(texto);
const chave = env.SUPABASE_SERVICE_ROLE_KEY ?? "";
let url = raiz(env.SUPABASE_URL ?? "");

console.log("\nSupabase — /trilha/inscricao\n");

// O painel oferece duas coisas com cara de "a URL do projeto": a raiz, nas
// configurações, e o endpoint REST, no diálogo Connect — este último já termina
// em `/rest/v1`. Colado assim, o caminho final vira `/rest/v1/rest/v1/…` e o
// PostgREST responde `PGRST125`, que não menciona URL duplicada. Consertar em
// silêncio seria pior: a mesma variável vai ser colada na Vercel à mão.
if (url && url !== (env.SUPABASE_URL ?? "").trim()) {
  texto = texto.replace(/^SUPABASE_URL=.*$/m, `SUPABASE_URL=${url}`);
  writeFileSync(ARQUIVO, texto);
  ok(`SUPABASE_URL tinha o endpoint REST junto; corrigida no ${ARQUIVO}`);
  dica(`Na Vercel, cole exatamente: ${url}`);
}

if (!chave) {
  nao("SUPABASE_SERVICE_ROLE_KEY está vazia no .env.local");
  dica("Supabase → Project Settings → API Keys → a chave `service_role`.");
  process.exit(1);
}

// A URL, por dedução, quando ela falta.
if (!url) {
  const ref = refDaChave(chave);
  if (!ref) {
    nao("SUPABASE_URL está vazia e não dá para deduzi-la desta chave");
    dica("Ela é `https://<ref>.supabase.co`, e o `<ref>` está na barra de");
    dica("endereço do painel: supabase.com/dashboard/project/<ref>");
    process.exit(1);
  }
  url = `https://${ref}.supabase.co`;
  writeFileSync(ARQUIVO, texto.replace(/^SUPABASE_URL=$/m, `SUPABASE_URL=${url}`));
  ok(`SUPABASE_URL deduzida da chave e gravada no ${ARQUIVO}: ${url}`);
} else {
  ok(`SUPABASE_URL: ${url}`);
}

const cabecalhos = {
  apikey: chave,
  Authorization: `Bearer ${chave}`,
  "Content-Type": "application/json",
};

/** Uma chamada ao PostgREST. Falha de rede vira resposta, não exceção. */
async function chamar(caminho, init = {}) {
  try {
    const r = await fetch(`${url}/rest/v1/${caminho}`, {
      ...init,
      headers: cabecalhos,
    });
    return { r, corpo: await r.text() };
  } catch (erro) {
    return { erro };
  }
}

let falhou = false;

// 1 e 2 — a chave é aceita, e as tabelas existem.
for (const tabela of ["inscricoes", "config"]) {
  const { r, corpo, erro } = await chamar(`${tabela}?select=*&limit=1`);
  if (erro) {
    nao(`não deu para falar com o projeto (${erro.message})`);
    dica("URL errada, projeto pausado, ou sem internet.");
    process.exit(1);
  }
  if (r.status === 401 || r.status === 403) {
    nao("a chave foi recusada (401/403)");
    dica("É a `service_role`, e não a `anon`/`publishable`? Copiou inteira?");
    process.exit(1);
  }
  if (r.ok) {
    const linhas = JSON.parse(corpo).length;
    ok(`tabela \`${tabela}\` responde (${linhas === 0 ? "vazia" : "com dados"})`);
  } else {
    falhou = true;
    nao(`tabela \`${tabela}\` não respondeu: ${r.status} ${corpo.slice(0, 120)}`);
    dica("Rode o `supabase/schema.sql` inteiro no SQL Editor do Supabase.");
  }
}

// 3 — a função existe e a `service_role` executa.
//
// Chamada com `dados` vazio de propósito: `nome` é `not null`, então o Postgres
// recusa com 23502 antes de gravar qualquer coisa. Um erro **é** a resposta
// certa aqui; o que se está medindo é qual erro.
{
  const { r, corpo, erro } = await chamar("rpc/upsert_inscricao", {
    method: "POST",
    body: JSON.stringify({ dados: {} }),
  });
  if (erro) {
    falhou = true;
    nao(`não deu para chamar a função (${erro.message})`);
  } else if (corpo.includes("23502") || corpo.includes("not-null")) {
    ok("função `upsert_inscricao` existe e a `service_role` pode executá-la");
  } else if (r.status === 404 || corpo.includes("PGRST202")) {
    falhou = true;
    nao("função `upsert_inscricao` não existe");
    dica("O schema.sql foi colado pela metade — rode o arquivo inteiro.");
  } else if (r.status === 401 || r.status === 403) {
    falhou = true;
    nao("a `service_role` não tem permissão de executar a função");
    dica("Falta o `grant execute … to service_role` do fim do schema.sql.");
  } else {
    falhou = true;
    nao(`resposta inesperada da função: ${r.status} ${corpo.slice(0, 160)}`);
  }
}

// O sal, que é do servidor e não do Supabase, mas sem ele o envio é recusado.
if ((env.IP_SALT ?? "").length >= 32) {
  ok("IP_SALT presente");
} else {
  falhou = true;
  nao("IP_SALT vazio ou curto demais — a rota recusa o envio sem ele");
  dica('node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
}

console.log(
  falhou
    ? "\nFalta coisa. Corrija o que está marcado acima e rode de novo.\n"
    : "\nTudo de pé. `npm run dev` e envie uma inscrição de teste.\n",
);
process.exit(falhou ? 1 : 0);
