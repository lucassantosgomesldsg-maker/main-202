import type { Inscricao } from "./inscricao";

/**
 * O seam entre a inscrição e o Postgres.
 *
 * Este arquivo existe para que a página `/trilha/inscricao` possa ir ao ar
 * **antes** de o Supabase existir. Em 20/08/2026 o projeto ainda não tinha sido
 * criado (spec §14: são ~5 minutos de cliques do Matheus, mais a espera de DNS
 * do Resend), e a decisão foi construir tudo pronto para plugar em vez de
 * esperar. Daí a forma: um contrato (`RepositorioInscricoes`), duas
 * implementações que o cumprem — a de verdade e uma de mentira — e um seletor
 * que escolhe lendo o ambiente.
 *
 * A consequência prática é que `npm test` exercita o caminho inteiro do
 * servidor sem rede e sem banco, e que colar as chaves na Vercel liga a
 * gravação **sem tocar em código**.
 *
 * ── Por que `fetch` e não `@supabase/supabase-js` ────────────────────────────
 * O repo tem três dependências de produção (next, react, react-dom). O cliente
 * oficial traria realtime, auth e storage — nada disso é usado aqui — para
 * fazer dois POST e dois GET contra uma REST API que já é HTTP puro. A conta
 * não fecha.
 */

/** O que o servidor precisa do banco. Nada além disto. */
export type RepositorioInscricoes = {
  /**
   * Grava a inscrição. Devolve `atualizada: true` quando o e-mail já existia —
   * a tela de confirmação tem texto diferente para reinscrição (spec §4.7).
   */
  salvar(
    inscricao: Inscricao,
    meta: { ipHash: string },
  ): Promise<{ atualizada: boolean }>;

  /** Quantas inscrições este `ip_hash` **criou** na última hora (spec §8). */
  contarPorIpNaUltimaHora(ipHash: string): Promise<number>;

  /** O interruptor da spec §9.4, guardado na tabela `config`. */
  inscricoesAbertas(): Promise<boolean>;
};

/** As variáveis que a implementação de verdade exige para existir. */
export type AmbienteBanco = {
  url: string;
  serviceRoleKey: string;
};

/**
 * A raiz do projeto, a partir do que a pessoa colou em `SUPABASE_URL`.
 *
 * Tira a barra do fim e **tira o `/rest/v1` do fim**, porque o painel do
 * Supabase oferece as duas formas em lugares diferentes: "Project URL", nas
 * configurações, é a raiz; o diálogo **Connect** mostra o endpoint REST, que já
 * termina em `/rest/v1`. Colar o segundo é o engano natural — e sem isto o
 * caminho final vira `/rest/v1/rest/v1/inscricoes`, que o PostgREST recusa com
 * um `PGRST125 Invalid path specified in request URL`.
 *
 * O erro merece ser consertado aqui, e não só no script de conferência, porque
 * na Vercel não há script nenhum rodando: lá a variável é colada num formulário
 * web e o engano só apareceria como 500 no envio de alguém de verdade.
 * Aconteceu em 24/08/2026, na primeira configuração.
 */
export function baseDaUrl(url: string): string {
  return url.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
}

/**
 * Lê o ambiente. Devolve `null` quando o Supabase ainda não foi configurado —
 * que é um estado **esperado**, não um defeito, enquanto a fase 1 não é
 * plugada. Quem chama decide o que fazer com o `null`; ninguém lança daqui.
 */
export function ambienteBanco(): AmbienteBanco | null {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return { url, serviceRoleKey };
}

/**
 * O repositório em memória. É o que os testes usam, e ele **não é um dublê
 * complacente**: reproduz a semântica de upsert da spec §6.4 — preserva
 * `criado_em`, `status` e `nota` na reinscrição — porque um fake mais bonzinho
 * que o banco real produz teste verde e produção quebrada.
 */
export type LinhaFake = {
  inscricao: Inscricao;
  ipHash: string;
  criadoEm: number;
  atualizadoEm: number;
  status: string;
  nota: string | null;
};

export function repositorioFake(opcoes?: {
  abertas?: boolean;
  agora?: () => number;
}): RepositorioInscricoes & { linhas: Map<string, LinhaFake> } {
  const linhas = new Map<string, LinhaFake>();
  const agora = opcoes?.agora ?? (() => Date.now());
  const abertas = opcoes?.abertas ?? true;

  return {
    linhas,

    async salvar(inscricao, meta) {
      // A chave é o e-mail já normalizado por `validarInscricao` (minúsculo,
      // sem espaço nas pontas) — o `citext` do Postgres faz o mesmo papel lá.
      const chave = inscricao.email;
      const anterior = linhas.get(chave);
      const t = agora();

      linhas.set(chave, {
        inscricao,
        ipHash: meta.ipHash,
        criadoEm: anterior?.criadoEm ?? t,
        atualizadoEm: t,
        // Preservados de propósito: quem já foi avaliado como `sim` não pode
        // perder a avaliação por reenviar o formulário (spec §6.4).
        status: anterior?.status ?? "novo",
        nota: anterior?.nota ?? null,
      });

      return { atualizada: anterior !== undefined };
    },

    async contarPorIpNaUltimaHora(ipHash) {
      const corte = agora() - 60 * 60 * 1000;
      let total = 0;
      for (const linha of linhas.values()) {
        // `criadoEm`, e não `atualizadoEm`: reenvio da mesma pessoa é update e
        // não consome cota. O limite existe contra robô, não contra insegurança.
        if (linha.ipHash === ipHash && linha.criadoEm > corte) total += 1;
      }
      return total;
    },

    async inscricoesAbertas() {
      return abertas;
    },
  };
}

/**
 * Lê o interruptor da spec §9.4 para a renderização da página.
 *
 * **O padrão é `true`.** Se o banco não responder — ou nem existir ainda — as
 * inscrições continuam abertas. A alternativa (fechar no erro) deixaria uma
 * falha de rede transitória mostrar "inscrições encerradas" para quem recebeu
 * o link naquele minuto, e isso é irrecuperável: a pessoa não volta. Um envio
 * que chega com o banco fora do ar falha no `salvar`, com mensagem própria e
 * com o preenchimento preservado — que é o modo certo de errar aqui.
 */
export async function inscricoesAbertas(): Promise<boolean> {
  try {
    return await repositorio().inscricoesAbertas();
  } catch {
    return true;
  }
}

/**
 * O seletor. Devolve o repositório de verdade quando o ambiente está
 * configurado, e o fake quando não está.
 *
 * Cair no fake em produção seria péssimo — inscrição gravada em memória, morta
 * no próximo deploy — então o caminho de escrita **nunca** decide por aqui em
 * silêncio: `app/trilha/inscricao/api/route.ts` verifica `ambienteBanco()`
 * antes de gravar e recusa com mensagem clara se ele for `null`. Este seletor
 * serve à leitura do interruptor, onde cair no fake apenas devolve "abertas".
 */
export function repositorio(): RepositorioInscricoes {
  const ambiente = ambienteBanco();
  return ambiente ? repositorioSupabase(ambiente) : repositorioFake();
}

/**
 * A implementação de verdade, contra a REST API do Supabase.
 *
 * O upsert vai por **função SQL** (`rpc/upsert_inscricao`) e não pelo
 * `Prefer: resolution=merge-duplicates` do PostgREST. Motivo: naquele caminho o
 * conjunto de colunas que o `ON CONFLICT DO UPDATE` toca é inferido do payload,
 * então "preservar `criado_em`, `status` e `nota`" passaria a depender de quais
 * chaves o JSON por acaso tinha — um campo opcional ausente num envio e `null`
 * no outro mudaria a semântica do banco sem ninguém perceber. Na função, a
 * lista de colunas está escrita à mão em `supabase/schema.sql`, versionada e
 * legível, e ela ainda devolve de graça o `atualizada` que a tela de
 * confirmação precisa.
 */
export function repositorioSupabase(
  ambiente: AmbienteBanco,
): RepositorioInscricoes {
  const base = baseDaUrl(ambiente.url);

  // `apikey` e `Authorization` com o mesmo valor não é redundância inútil: o
  // PostgREST usa o `Authorization` para decidir o papel (e com ele a RLS), e o
  // Kong do Supabase exige o `apikey` para deixar a requisição chegar até lá.
  // Faltando um dos dois a resposta é 401 sem explicação de qual.
  const cabecalhos: Record<string, string> = {
    apikey: ambiente.serviceRoleKey,
    Authorization: `Bearer ${ambiente.serviceRoleKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  /**
   * Toda chamada leva prazo. Sem isso, um Supabase pendurado seguraria a
   * resposta do formulário até o limite da função na Vercel, e a pessoa veria
   * "ENVIANDO…" por um minuto. Falhar rápido deixa a mensagem de erro da §7
   * aparecer com o preenchimento preservado, que é o modo certo de errar aqui.
   */
  const PRAZO_MS = 8000;

  /**
   * O corpo do erro do PostgREST é onde mora o motivo de verdade (violação de
   * `check`, coluna inexistente, RLS). Ele vai para a mensagem porque quem lê
   * o log do servidor não tem outra forma de saber qual das dezenas de
   * restrições de `supabase/schema.sql` foi a que recusou.
   */
  const exigirOk = async (resposta: Response, oQue: string): Promise<void> => {
    if (resposta.ok) return;
    const detalhe = await resposta.text().catch(() => "");
    throw new Error(
      `Supabase recusou ${oQue}: ${resposta.status} ${resposta.statusText} ${detalhe}`.trim(),
    );
  };

  const ehObjeto = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);

  return {
    async salvar(inscricao, meta) {
      // O `ip_hash` entra no mesmo objeto que a inscrição porque a função SQL
      // recebe **um** `jsonb` e monta a linha inteira a partir dele. Repare que
      // `aceite_em`, `criado_em` e `atualizado_em` não vão daqui: são carimbados
      // com o relógio do banco, e data de consentimento escolhida pelo cliente
      // não vale nada.
      const resposta = await fetch(`${base}/rest/v1/rpc/upsert_inscricao`, {
        method: "POST",
        headers: cabecalhos,
        body: JSON.stringify({ dados: { ...inscricao, ip_hash: meta.ipHash } }),
        signal: AbortSignal.timeout(PRAZO_MS),
      });
      await exigirOk(resposta, "gravar a inscrição");

      // `returns table (atualizada boolean)` chega como uma lista de uma linha.
      const corpo: unknown = await resposta.json().catch(() => null);
      const linha = Array.isArray(corpo) ? corpo[0] : corpo;
      if (!ehObjeto(linha) || typeof linha.atualizada !== "boolean") {
        // Chegar aqui significa que a linha **foi gravada** e só a resposta veio
        // com forma inesperada. Lançar agora faria a pessoa reenviar um
        // formulário que já está no banco; o preço de continuar é a tela de
        // confirmação errada — "Recebemos" no lugar de "Atualizamos" —, que é
        // cosmético. Por isso o aviso vai para o log e a inscrição segue de pé.
        console.warn(
          "[inscricao] upsert_inscricao respondeu sem `atualizada` booleano; assumindo inserção",
        );
        return { atualizada: false };
      }
      return { atualizada: linha.atualizada };
    },

    async contarPorIpNaUltimaHora(ipHash) {
      const corte = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const filtro = new URLSearchParams({
        select: "id",
        ip_hash: `eq.${ipHash}`,
        criado_em: `gt.${corte}`,
      });

      // `count=exact` + `Range: 0-0` pede a contagem sem trazer as linhas: o
      // total vem no cabeçalho `Content-Range`, no formato `0-0/12`.
      const resposta = await fetch(`${base}/rest/v1/inscricoes?${filtro}`, {
        headers: { ...cabecalhos, Prefer: "count=exact", Range: "0-0" },
        signal: AbortSignal.timeout(PRAZO_MS),
      });
      await exigirOk(resposta, "contar as inscrições do IP");

      const faixa = resposta.headers.get("content-range") ?? "";
      const total = Number(faixa.split("/")[1]);
      if (!Number.isFinite(total)) {
        // Lançar, e não devolver `0`. Um limitador que responde "nenhuma" quando
        // não consegue contar é um limitador desligado — e desligado em
        // silêncio, para sempre. Assim a falha aparece no primeiro envio, alta e
        // localizável, em vez de aparecer no dia em que um robô encher a tabela.
        throw new Error(
          `Supabase não devolveu Content-Range ao contar o IP: "${faixa}"`,
        );
      }
      return total;
    },

    async inscricoesAbertas() {
      const resposta = await fetch(
        `${base}/rest/v1/config?select=inscricoes_abertas&limit=1`,
        { headers: cabecalhos, signal: AbortSignal.timeout(PRAZO_MS) },
      );
      await exigirOk(resposta, "ler o interruptor de inscrições");

      const corpo: unknown = await resposta.json().catch(() => null);
      const linha = Array.isArray(corpo) ? corpo[0] : corpo;
      // Tabela vazia — schema colado pela metade, `insert` inicial pulado — cai
      // no mesmo padrão do resto do arquivo: **abertas**. Fechar as inscrições
      // por causa de uma linha que ninguém inseriu seria o pior erro possível.
      if (!ehObjeto(linha) || typeof linha.inscricoes_abertas !== "boolean") {
        return true;
      }
      return linha.inscricoes_abertas;
    },
  };
}
