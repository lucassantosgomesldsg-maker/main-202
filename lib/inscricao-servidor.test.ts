import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST, definirDublesDeTeste } from "@/app/trilha/inscricao/api/route";
import {
  AI_ESTUDOS,
  AI_TRABALHO,
  ANOS_ATUAIS,
  CAMPO_HONEYPOT,
  CONCLUSOES_PREVISTAS,
  CURSOS,
  DISPONIBILIDADES,
  EMPREENDEDORISMO,
  ESTADOS,
  FERRAMENTAS_AI,
  INSTITUICOES,
  LIMITES,
  NIVEIS_AI,
  ORIGENS,
  SITUACOES,
  UNIDADES_USP,
  type ErrosInscricao,
} from "@/lib/inscricao";
import {
  baseDaUrl,
  repositorioFake,
  type LinhaFake,
} from "@/lib/inscricao-banco";

/**
 * Os testes do servidor: a Route Handler exercitada de ponta a ponta, sem
 * navegador, sem rede e sem banco.
 *
 * O `POST` é chamado direto, com um `Request` montado à mão. Não é economia de
 * preguiça: subir o Next para testar a ordem das checagens tornaria cada teste
 * lento o bastante para ninguém rodar, e o que precisa ser provado aqui —
 * honeypot antes do banco, cota por IP, upsert que preserva avaliação, e-mail
 * que não derruba a gravação — é tudo lógica de um módulo só.
 *
 * O dublê é o `repositorioFake()` da própria fundação de dados, que reproduz a
 * semântica de upsert do Postgres de propósito (preserva `criado_em`, `status`
 * e `nota`). Um fake mais bonzinho que o banco real produz teste verde e
 * produção quebrada — que é o pior tipo de teste verde.
 */

const URL_DA_ROTA = "https://202lab.com.br/trilha/inscricao/api";

/** Uma inscrição que passa na validação inteira. Cada teste muda o que precisa. */
function inscricaoValida(mudancas: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    nome: "Maria Clara de Souza Almeida",
    email: "maria@example.com",
    whatsapp: "(11) 91234-5678",
    idade: 21,
    estado: "SP",
    cidade: "São Paulo",
    linkedin: null,
    instituicao: "USP",
    instituicao_outra: null,
    unidade_usp: "POLI",
    curso: "Eng. de Produção",
    curso_outro: null,
    ano_atual: "3",
    conclusao_prevista: 2028,
    premios: [],
    nivel_ai: 2,
    ferramentas_ai: ["CHATGPT", "CLAUDE"],
    ai_estudos: "QUASE_TODO_DIA",
    historia_ai: null,
    situacao: "ESTAGIO",
    ai_trabalho: "ACEITO",
    empreendedorismo: 1,
    disponibilidade: "DE_10_A_20H",
    origem: "INDICACAO",
    origem_quem_indicou: "Joana Prado",
    origem_detalhe: null,
    algo_mais: null,
    aceite_dados: true,
    // O honeypot vem sempre, e vem vazio — é o que um formulário de verdade faz.
    [CAMPO_HONEYPOT]: "",
    ...mudancas,
  };
}

function requisicao(
  corpo: unknown,
  opcoes: { ip?: string; cru?: string; tipo?: string } = {},
): Request {
  const cabecalhos: Record<string, string> = {
    "Content-Type": opcoes.tipo ?? "application/json",
  };
  if (opcoes.ip !== undefined) cabecalhos["x-forwarded-for"] = opcoes.ip;

  return new Request(URL_DA_ROTA, {
    method: "POST",
    headers: cabecalhos,
    body: opcoes.cru ?? JSON.stringify(corpo),
  });
}

type Corpo = {
  ok: boolean;
  atualizada?: boolean;
  emailAtivo?: boolean;
  motivo?: string;
  erros?: ErrosInscricao;
};

async function enviar(
  corpo: unknown,
  opcoes?: { ip?: string; cru?: string; tipo?: string },
): Promise<{ status: number; corpo: Corpo }> {
  const resposta = await POST(requisicao(corpo, opcoes));
  return { status: resposta.status, corpo: (await resposta.json()) as Corpo };
}

/** O fake, com relógio controlado — o teste de upsert precisa mover o tempo. */
function bancoDeTeste(opcoes: { abertas?: boolean } = {}): {
  linhas: Map<string, LinhaFake>;
  avancar(ms: number): void;
} {
  let relogio = Date.UTC(2026, 7, 20, 12, 0, 0);
  const fake = repositorioFake({
    abertas: opcoes.abertas,
    agora: () => relogio,
  });
  definirDublesDeTeste({ repositorio: fake });
  return {
    linhas: fake.linhas,
    avancar: (ms) => {
      relogio += ms;
    },
  };
}

beforeEach(() => {
  vi.stubEnv("IP_SALT", "sal-de-teste");
  // O e-mail desligado é o padrão: quase nenhum teste aqui é sobre ele, e um
  // `fetch` de verdade escapando para a api.resend.com num teste unitário seria
  // descoberto tarde e do jeito ruim.
  vi.stubEnv("EMAIL_CONFIRMACAO_ATIVO", "");
  vi.stubEnv("RESEND_API_KEY", "");
});

afterEach(() => {
  definirDublesDeTeste(null);
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("a rota de inscrição", () => {
  it("recusa no servidor um payload que o cliente deixaria passar", async () => {
    const banco = bancoDeTeste();

    const { status, corpo } = await enviar(
      inscricaoValida({ email: "não é e-mail", nivel_ai: 99, aceite_dados: false }),
    );

    expect(status).toBe(400);
    expect(corpo.ok).toBe(false);
    // As frases vêm da fundação, não da rota: é a mesma validação dos dois lados.
    expect(corpo.erros?.email, "sem erro no e-mail").toBeDefined();
    expect(corpo.erros?.nivel_ai, "sem erro no nível de AI").toBeDefined();
    expect(corpo.erros?.aceite_dados, "sem erro no aceite").toBeDefined();
    expect(banco.linhas.size, "gravou uma inscrição inválida").toBe(0);
  });

  it("responde sucesso e não grava nada quando o honeypot vem preenchido", async () => {
    const banco = bancoDeTeste();

    const { status, corpo } = await enviar(
      inscricaoValida({ [CAMPO_HONEYPOT]: "Silva" }),
    );

    // Sucesso de mentira: uma recusa explícita ensinaria o autor do robô a tirar
    // o campo do formulário dele.
    expect(status).toBe(200);
    expect(corpo.ok).toBe(true);
    expect(corpo.atualizada).toBe(false);
    expect(typeof corpo.emailAtivo).toBe("boolean");
    expect(banco.linhas.size, "o honeypot gravou").toBe(0);
  });

  it("engole o honeypot antes de validar — nem um payload quebrado é gravado", async () => {
    const banco = bancoDeTeste();

    // Só o honeypot e nada mais: se a validação viesse antes, isto seria 400.
    const { status } = await enviar({ [CAMPO_HONEYPOT]: "robô" });

    expect(status).toBe(200);
    expect(banco.linhas.size).toBe(0);
  });

  it("deixa passar a quinta inscrição do mesmo IP e recusa a sexta", async () => {
    const banco = bancoDeTeste();
    const ip = "200.150.10.1";

    for (let i = 1; i <= 5; i += 1) {
      const { status } = await enviar(
        inscricaoValida({ email: `pessoa${i}@example.com` }),
        { ip },
      );
      expect(status, `a inscrição ${i} deveria passar`).toBe(200);
    }
    expect(banco.linhas.size).toBe(5);

    const sexta = await enviar(inscricaoValida({ email: "pessoa6@example.com" }), { ip });

    expect(sexta.status).toBe(429);
    expect(sexta.corpo.motivo).toBe("limite");
    expect(banco.linhas.size, "a sexta foi gravada mesmo assim").toBe(5);
  });

  it("não conta contra a cota o IP que veio de outro lugar", async () => {
    bancoDeTeste();

    for (let i = 1; i <= 5; i += 1) {
      await enviar(inscricaoValida({ email: `pessoa${i}@example.com` }), {
        ip: "200.150.10.1",
      });
    }
    const outro = await enviar(inscricaoValida({ email: "outra@example.com" }), {
      ip: "200.150.10.2",
    });

    expect(outro.status).toBe(200);
  });

  it("preserva criado_em, status e nota na reinscrição, e diz que atualizou", async () => {
    const banco = bancoDeTeste();

    const primeira = await enviar(inscricaoValida());
    expect(primeira.status).toBe(200);
    expect(primeira.corpo.atualizada, "a primeira inscrição não é atualização").toBe(false);

    const antes = banco.linhas.get("maria@example.com");
    expect(antes).toBeDefined();
    const criadoEmOriginal = antes?.criadoEm;

    // A fase 2 avalia a ficha. É exatamente isto que a reinscrição não pode
    // apagar: sem a preservação, a lista de triagem mente.
    banco.linhas.set("maria@example.com", {
      ...(antes as LinhaFake),
      status: "sim",
      nota: "conversar antes de setembro",
    });

    banco.avancar(48 * 60 * 60 * 1000);
    const segunda = await enviar(
      inscricaoValida({ nome: "Maria Clara Almeida", disponibilidade: "MAIS_DE_30H" }),
    );

    expect(segunda.status).toBe(200);
    expect(segunda.corpo.atualizada, "a reinscrição não se declarou atualização").toBe(true);

    const depois = banco.linhas.get("maria@example.com");
    expect(banco.linhas.size, "a reinscrição criou uma segunda ficha").toBe(1);
    expect(depois?.criadoEm, "criado_em mudou").toBe(criadoEmOriginal);
    expect(depois?.status, "a avaliação foi apagada").toBe("sim");
    expect(depois?.nota, "a nota do avaliador foi apagada").toBe("conversar antes de setembro");
    // E o que a pessoa reenviou vale.
    expect(depois?.inscricao.nome).toBe("Maria Clara Almeida");
    expect(depois?.inscricao.disponibilidade).toBe("MAIS_DE_30H");
    expect(depois?.atualizadoEm).toBeGreaterThan(criadoEmOriginal as number);
  });

  it("não consome cota do IP quando a mesma pessoa reenvia", async () => {
    bancoDeTeste();
    const ip = "200.150.10.9";

    for (let i = 1; i <= 4; i += 1) {
      await enviar(inscricaoValida({ email: `pessoa${i}@example.com` }), { ip });
    }
    // O quinto envio é reinscrição — update, não insert.
    await enviar(inscricaoValida({ email: "pessoa1@example.com" }), { ip });
    const quintaNova = await enviar(inscricaoValida({ email: "pessoa5@example.com" }), { ip });

    expect(quintaNova.status, "o reenvio consumiu uma vaga da cota").toBe(200);
  });

  it("grava a inscrição mesmo quando o Resend recusa o envio", async () => {
    const banco = bancoDeTeste();
    vi.stubEnv("EMAIL_CONFIRMACAO_ATIVO", "true");
    vi.stubEnv("RESEND_API_KEY", "re_teste");
    // Silencia só o log esperado — o teste prova que a falha é registrada e não
    // propagada, e um `console.error` legítimo poluindo a saída esconderia os
    // outros.
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const chamada = vi.fn().mockRejectedValue(new Error("a rede caiu"));
    vi.stubGlobal("fetch", chamada);

    const { status, corpo } = await enviar(inscricaoValida());

    expect(status).toBe(200);
    expect(corpo.ok).toBe(true);
    expect(corpo.emailAtivo, "o interruptor não chegou na resposta").toBe(true);
    expect(banco.linhas.size, "a inscrição se perdeu junto com o e-mail").toBe(1);
    expect(chamada, "nem tentou mandar o e-mail").toHaveBeenCalled();
    expect(log).toHaveBeenCalled();
  });

  it("não tenta e-mail nenhum com o interruptor desligado", async () => {
    bancoDeTeste();
    const chamada = vi.fn();
    vi.stubGlobal("fetch", chamada);

    const { corpo } = await enviar(inscricaoValida());

    expect(corpo.emailAtivo).toBe(false);
    expect(chamada, "mandou e-mail com o interruptor desligado").not.toHaveBeenCalled();
  });

  it("trata a chave do Resend ausente como desligado, e não como erro", async () => {
    bancoDeTeste();
    vi.stubEnv("EMAIL_CONFIRMACAO_ATIVO", "true");
    vi.stubEnv("RESEND_API_KEY", "");
    const chamada = vi.fn();
    vi.stubGlobal("fetch", chamada);

    const { status, corpo } = await enviar(inscricaoValida());

    expect(status).toBe(200);
    expect(corpo.emailAtivo).toBe(false);
    expect(chamada).not.toHaveBeenCalled();
  });

  it("recusa corpo vazio e JSON quebrado sem lançar exceção", async () => {
    const banco = bancoDeTeste();

    const vazio = await enviar(undefined, { cru: "" });
    const quebrado = await enviar(undefined, { cru: "{ isto não é json" });
    const formulario = await enviar(undefined, {
      cru: "nome=Maria&email=maria%40example.com",
      tipo: "application/x-www-form-urlencoded",
    });

    for (const [nome, resposta] of [
      ["corpo vazio", vazio],
      ["JSON quebrado", quebrado],
      ["corpo de formulário", formulario],
    ] as const) {
      expect(resposta.status, `${nome} não deu 400`).toBe(400);
      expect(resposta.corpo.ok).toBe(false);
      // 400 com os erros da fundação, e não um 500 — que seria indistinguível
      // de "o banco caiu" para quem for ler o log depois.
      expect(resposta.corpo.erros?.nome, `${nome} veio sem erros de campo`).toBeDefined();
    }
    expect(banco.linhas.size).toBe(0);
  });

  it("recusa também um corpo que é lista ou número", async () => {
    bancoDeTeste();

    const lista = await enviar([1, 2, 3]);
    const numero = await enviar(42);

    expect(lista.status).toBe(400);
    expect(numero.status).toBe(400);
  });

  it("dá o mesmo hash para o mesmo IP com o mesmo sal, e outro com outro sal", async () => {
    const ip = "200.150.10.77";

    const primeiro = bancoDeTeste();
    await enviar(inscricaoValida({ email: "a@example.com" }), { ip });
    await enviar(inscricaoValida({ email: "b@example.com" }), { ip });
    const hashes = [...primeiro.linhas.values()].map((l) => l.ipHash);
    expect(hashes[0], "o mesmo IP com o mesmo sal deu hashes diferentes").toBe(hashes[1]);
    // O que é gravado é o hash, e não o IP: o IP não pode aparecer no banco.
    expect(hashes[0]).not.toContain(ip);
    expect(hashes[0]).toMatch(/^[0-9a-f]{64}$/);

    definirDublesDeTeste(null);
    vi.stubEnv("IP_SALT", "outro-sal-completamente-diferente");
    const segundo = bancoDeTeste();
    await enviar(inscricaoValida({ email: "a@example.com" }), { ip });
    const comOutroSal = [...segundo.linhas.values()][0]?.ipHash;

    expect(comOutroSal, "trocar o sal não mudou o hash").not.toBe(hashes[0]);
  });

  it("recusa o envio, sem gravar, quando IP_SALT não existe", async () => {
    const banco = bancoDeTeste();
    vi.stubEnv("IP_SALT", "");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const { status, corpo } = await enviar(inscricaoValida(), { ip: "200.150.10.1" });

    // Gravar um `sha256(ip)` sem sal seria pior do que não gravar: os ~4 bilhões
    // de IPv4 cabem numa tabela, e o hash "anônimo" vira o IP de volta.
    expect(status).toBe(500);
    expect(corpo.motivo).toBe("servidor");
    expect(banco.linhas.size).toBe(0);
    expect(log).toHaveBeenCalled();
  });

  it("responde 409 quando as inscrições estão encerradas", async () => {
    const banco = bancoDeTeste({ abertas: false });

    const { status, corpo } = await enviar(inscricaoValida());

    expect(status).toBe(409);
    expect(corpo.ok).toBe(false);
    expect(corpo.motivo).toBe("encerrado");
    expect(banco.linhas.size).toBe(0);
  });

  it("recusa com erro de servidor, e não grava em memória, quando o Supabase não está configurado", async () => {
    // Sem dublê e sem ambiente: é o estado da fase 1 antes de as chaves
    // entrarem na Vercel. Cair no `repositorioFake()` aqui gravaria a inscrição
    // na memória do processo, e ela morreria no próximo deploy — depois de a
    // pessoa ter visto a tela de confirmação.
    definirDublesDeTeste(null);
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const { status, corpo } = await enviar(inscricaoValida());

    expect(status).toBe(500);
    expect(corpo.motivo).toBe("servidor");
    expect(log, "a falha não foi registrada no log do servidor").toHaveBeenCalled();
  });

  it("ainda valida o payload quando o banco não está configurado", async () => {
    definirDublesDeTeste(null);
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    // 400 e não 500: quem mandou um payload quebrado merece saber qual campo é,
    // e essa resposta não depende de banco nenhum.
    const { status } = await enviar(inscricaoValida({ email: "não é e-mail" }));

    expect(status).toBe(400);
  });

  it("lê o IP do primeiro item de x-forwarded-for, e não do último", async () => {
    const banco = bancoDeTeste();

    await enviar(inscricaoValida({ email: "a@example.com" }), {
      ip: "200.150.10.5, 10.0.0.1, 10.0.0.2",
    });
    await enviar(inscricaoValida({ email: "b@example.com" }), { ip: "200.150.10.5" });

    const hashes = [...banco.linhas.values()].map((l) => l.ipHash);
    // Se a rota lesse o último item, a cadeia de proxies da Vercel jogaria todo
    // mundo no mesmo balde e o limite por IP viraria um limite global.
    expect(hashes[0], "o IP do cliente não é o primeiro da lista").toBe(hashes[1]);
  });
});

/* ── O schema, conferido contra a fundação ───────────────────────────────── */

/**
 * O teste que impede o defeito mais caro deste conjunto de arquivos.
 *
 * `supabase/schema.sql` tem `check` que listam os `id` de `lib/inscricao.ts`.
 * Acrescentar um curso, uma instituição ou uma ferramenta lá e esquecer daqui
 * faria o Postgres recusar **toda** inscrição de quem escolhesse a opção nova —
 * e o sintoma seria um `500` genérico no envio, com o motivo escondido no corpo
 * do erro do PostgREST. Nada no build acusaria.
 *
 * Nenhum destes testes prova que o SQL roda: prova que ele **concorda** com o
 * código. A execução contra um Postgres de verdade continua sem cobertura.
 */
// `process.cwd()` e não `import.meta.url`: sob o vite-node o `import.meta.url`
// deste arquivo não é uma URL `file:`, e `fileURLToPath` recusa. O vitest roda
// com a raiz do projeto como diretório de trabalho — a mesma raiz onde estão o
// `vitest.config.mts` e a pasta `supabase/`.
const SQL = readFileSync(join(process.cwd(), "supabase", "schema.sql"), "utf8");

/** Os valores de um `check (<coluna> in ('a', 'b', …))`. */
function valoresDoCheck(coluna: string): string[] {
  const achado = new RegExp(`${coluna} in \\(([^)]*)\\)`).exec(SQL);
  expect(achado, `sem check de valores para ${coluna}`).not.toBeNull();
  return [...(achado?.[1] ?? "").matchAll(/'([^']*)'/g)].map((m) => m[1]);
}

/** Os limites de um `check (<coluna> between a and b)`. */
function faixaDoCheck(coluna: string): [number, number] {
  const achado = new RegExp(`${coluna} between (\\d+) and (\\d+)`).exec(SQL);
  expect(achado, `sem check de faixa para ${coluna}`).not.toBeNull();
  return [Number(achado?.[1]), Number(achado?.[2])];
}

describe("a SUPABASE_URL, como ela chega colada de verdade", () => {
  // O painel do Supabase oferece a raiz num lugar ("Project URL", nas
  // configurações) e o endpoint REST noutro (o diálogo "Connect"), e os dois
  // parecem "a URL do projeto". Colar o segundo aconteceu na primeira
  // configuração de verdade, em 24/08/2026: o caminho vira
  // `/rest/v1/rest/v1/inscricoes` e o PostgREST responde `PGRST125`, que não diz
  // nada sobre URL duplicada para quem está lendo o log às pressas.
  const raiz = "https://wfxjkfkgkrlghyeibcpg.supabase.co";

  it.each([
    ["a raiz, que é a forma certa", raiz],
    ["com barra no fim", `${raiz}/`],
    ["o endpoint REST do diálogo Connect", `${raiz}/rest/v1`],
    ["o endpoint REST com barra no fim", `${raiz}/rest/v1/`],
    ["com espaço em volta, de copiar e colar", `  ${raiz}  `],
  ])("normaliza %s", (_caso, colado) => {
    expect(baseDaUrl(colado)).toBe(raiz);
  });

  it("não come um `/rest/v1` que esteja no meio do caminho", () => {
    // Só o sufixo é engano conhecido. Um `/rest/v1` no meio seria um proxy de
    // propósito, e comê-lo silenciosamente quebraria uma configuração válida.
    expect(baseDaUrl("https://proxy.202lab.com.br/rest/v1/supabase")).toBe(
      "https://proxy.202lab.com.br/rest/v1/supabase",
    );
  });
});

describe("o schema do Supabase", () => {
  it("aceita exatamente os id que a validação grava, e não os rótulos", () => {
    const pares: readonly [string, readonly string[]][] = [
      ["instituicao", INSTITUICOES.map((o) => o.id)],
      ["unidade_usp", UNIDADES_USP.map((o) => o.id)],
      ["curso", CURSOS.map((o) => o.id)],
      ["ano_atual", ANOS_ATUAIS.map((o) => o.id)],
      ["ai_estudos", AI_ESTUDOS.map((o) => o.id)],
      ["situacao", SITUACOES.map((o) => o.id)],
      ["ai_trabalho", AI_TRABALHO.map((o) => o.id)],
      ["disponibilidade", DISPONIBILIDADES.map((o) => o.id)],
      ["origem", ORIGENS.map((o) => o.id)],
      ["estado", ESTADOS.map((e) => e.sigla)],
    ];

    for (const [coluna, esperados] of pares) {
      expect(
        [...valoresDoCheck(coluna)].sort(),
        `o check de ${coluna} não bate com lib/inscricao.ts`,
      ).toEqual([...esperados].sort());
    }
  });

  it("limita as indicações no mesmo número que a validação", () => {
    // O teto das indicações está escrito em DOIS lugares: `LIMITES.maxIndicacoes`
    // e o `jsonb_array_length(...) <= N` do schema. Se divergirem, o servidor
    // aceita uma indicação a mais do que o banco guarda, e o envio morre num
    // 500 sem explicação — exatamente o defeito que o teste da idade aqui
    // embaixo já existe para impedir.
    //
    // Aparece duas vezes no arquivo (na criação da tabela e na migração do
    // `do $$`), e as duas têm de bater: rodar o schema num banco novo e num
    // banco velho não pode dar tabelas diferentes.
    const achados = [...SQL.matchAll(/jsonb_array_length\(indicacoes\)\s*<=\s*(\d+)/g)].map(
      (m) => Number(m[1]),
    );
    expect(achados.length, "sem check de tamanho em indicacoes").toBeGreaterThan(0);
    for (const n of achados) expect(n).toBe(LIMITES.maxIndicacoes);
  });

  it("aceita as ferramentas de AI pelo id, dentro do array de contenção", () => {
    const achado = /ferramentas_ai <@ array\[([^\]]*)\]/.exec(SQL);
    expect(achado, "sem check de contenção em ferramentas_ai").not.toBeNull();
    const valores = [...(achado?.[1] ?? "").matchAll(/'([^']*)'/g)].map((m) => m[1]);

    expect([...valores].sort()).toEqual([...FERRAMENTAS_AI.map((f) => f.id)].sort());
  });

  it("aceita as faixas numéricas que as listas produzem", () => {
    const anos = CONCLUSOES_PREVISTAS.map((c) => c.valor).filter((v): v is number => v !== null);

    // A idade não sai mais de uma lista: sai de `LIMITES`, que é o que a
    // validação usa. Os dois precisam concordar, senão o servidor aceita uma
    // idade que o banco recusa — e o envio morre num 500 sem explicação.
    expect(faixaDoCheck("idade")).toEqual([LIMITES.idadeMin, LIMITES.idadeMax]);
    expect(faixaDoCheck("nivel_ai")).toEqual([
      Math.min(...NIVEIS_AI.map((n) => n.valor)),
      Math.max(...NIVEIS_AI.map((n) => n.valor)),
    ]);
    expect(faixaDoCheck("empreendedorismo")).toEqual([
      Math.min(...EMPREENDEDORISMO.map((e) => e.valor)),
      Math.max(...EMPREENDEDORISMO.map((e) => e.valor)),
    ]);
    expect(faixaDoCheck("conclusao_prevista")).toEqual([
      Math.min(...anos),
      Math.max(...anos),
    ]);
  });

  it("guarda as quatro situações de triagem da fase 2", () => {
    expect(valoresDoCheck("status")).toEqual(["novo", "sim", "talvez", "nao"]);
  });

  it("não atualiza criado_em, status, nota nem avaliado_em no upsert", () => {
    const bloco = /on conflict \(email\) do update set([\s\S]*?)returning/.exec(SQL);
    expect(bloco, "não achei o do update set do upsert").not.toBeNull();
    const atualizadas = bloco?.[1] ?? "";

    for (const coluna of ["criado_em", "status", "nota", "avaliado_em"]) {
      // Preservar `status` e `nota` é a spec §6.4 inteira: sem isso, quem já foi
      // avaliado como `sim` perde a avaliação ao reenviar o formulário.
      expect(
        new RegExp(`\\b${coluna}\\s*=`).test(atualizadas),
        `o upsert sobrescreve ${coluna}`,
      ).toBe(false);
    }
    expect(/\batualizado_em\s*=\s*now\(\)/.test(atualizadas), "não carimba atualizado_em").toBe(
      true,
    );
  });

  it("liga RLS nas duas tabelas e não cria policy nenhuma", () => {
    expect(SQL).toContain("alter table public.inscricoes enable row level security");
    expect(SQL).toContain("alter table public.config enable row level security");
    // Uma policy aqui abriria a tabela de dados pessoais para a chave anônima,
    // que é a única que pode vazar (spec §6.2).
    expect(/create\s+policy/i.test(SQL), "alguém criou uma policy").toBe(false);
  });

  it("tira de anon e authenticated o direito de executar a função security definer", () => {
    // Sem estes `revoke`, a chave anônima chamaria `rpc/upsert_inscricao` e
    // escreveria na tabela passando por cima da RLS — e todo o resto viraria
    // decoração. São três linhas e não uma: o `from public` desfaz a concessão
    // padrão do Postgres, e as outras duas desfazem a concessão explícita que o
    // Supabase faz por `alter default privileges` — que sobrevive ao primeiro.
    for (const papel of ["public", "anon", "authenticated"]) {
      expect(
        SQL,
        `a função continua executável por ${papel}`,
      ).toContain(`revoke all on function public.upsert_inscricao(jsonb) from ${papel}`);
    }
    expect(SQL).toContain(
      "grant execute on function public.upsert_inscricao(jsonb) to service_role",
    );
  });

  it("pode ser colado duas vezes", () => {
    // O Matheus vai colar isto num editor web, não aplicar por ferramenta de
    // migração. Toda criação precisa tolerar a segunda colada.
    const criacoes = [...SQL.matchAll(/^create (table|index|unique index|extension)\b.*/gim)];
    expect(criacoes.length, "nenhuma criação encontrada").toBeGreaterThan(0);
    for (const criacao of criacoes) {
      expect(criacao[0], `sem "if not exists": ${criacao[0]}`).toContain("if not exists");
    }
    expect(SQL).toContain("create or replace function");
    expect(SQL).toContain("on conflict (id) do nothing");
  });
});
