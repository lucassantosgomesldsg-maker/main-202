import { spawn, type ChildProcess } from "node:child_process";
import { createServer, type Server } from "node:http";
import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  AI_ESTUDOS,
  AI_TRABALHO,
  CAMPO_HONEYPOT,
  COPY_INSCRICAO,
  CURSOS,
  DISPONIBILIDADES,
  EMPREENDEDORISMO,
  FERRAMENTAS_AI,
  ESTADOS,
  INSTITUICOES,
  LIMITES,
  NIVEIS_AI,
  ORIGENS,
  SITUACOES,
  TOTAL_BLOCOS,
  textoProgresso,
  UNIDADES_USP,
  validarInscricao,
} from "../lib/inscricao";

/**
 * O percurso de `/trilha/inscricao`, do primeiro campo à tela de fecho.
 *
 * ── Por que quase tudo aqui passa por `page.route` ──────────────────────────
 * Não existe Supabase configurado, de propósito: a fase 1 foi construída para
 * plugar depois (spec §14), e sem `SUPABASE_URL` o `POST` real responde `500`
 * com o motivo no log do servidor. Testar a tela de confirmação contra esse
 * servidor seria testar o erro, não o percurso — então a rota é interceptada e
 * devolve o **contrato** combinado entre a interface e o handler:
 *
 *   200 `{ ok, atualizada, emailAtivo }` · 400 `{ ok: false, erros }`
 *   429 `{ ok: false, motivo: "limite" }` · 409 `{ ok: false, motivo: "encerrado" }`
 *
 * O outro lado desse contrato — que o handler de verdade responde exatamente
 * isso — é guardado por `lib/inscricao-servidor.test.ts`, contra o repositório
 * fake. Os dois arquivos juntos cobrem a linha inteira; nenhum dos dois sozinho
 * cobre.
 *
 * ── Papel primeiro, `data-*` só onde o papel não distingue ──────────────────
 * `getByRole`/`getByLabel` em tudo que tem rótulo, porque um teste que acha o
 * campo pelo rótulo é o mesmo teste que prova que o rótulo existe e está ligado
 * ao controle. Os `data-*` da página entram só onde ARIA não separa: qual bloco
 * está na tela (`data-bloco`), qual tela de fecho apareceu (`data-tela`), e a
 * lista do combobox de cursos — cujas `<li role="option">` disputariam o papel
 * com as `<option>` dos três `<select>` do mesmo bloco.
 *
 * ── Nenhuma string em português escrita aqui ────────────────────────────────
 * Toda copy vem de `lib/inscricao.ts`, como `e2e/tese.spec.ts` faz com
 * `lib/tese.ts`. Um teste que repete o texto à mão passa a falhar quando o
 * Matheus troca uma palavra — e o texto é dele para trocar.
 */

const ROTA = "/trilha/inscricao";
const API = "**/trilha/inscricao/api";
const CHAVE_RASCUNHO = "202:inscricao";

const COPY = COPY_INSCRICAO;
const NAV = COPY.navegacao;

/** O último bloco, contado a partir da própria copy (hoje 5). */
const ULTIMO_BLOCO = TOTAL_BLOCOS - 1;

/* ── O contrato do servidor, em respostas de mentira ──────────────────────── */

type RespostaFalsa = {
  status: number;
  corpo: Record<string, unknown>;
  /** Segura a resposta, para o teste conseguir agir enquanto ela não chega. */
  atrasoMs?: number;
};

const OK_NOVA_SEM_EMAIL: RespostaFalsa = {
  status: 200,
  corpo: { ok: true, atualizada: false, emailAtivo: false },
};
const OK_NOVA_COM_EMAIL: RespostaFalsa = {
  status: 200,
  corpo: { ok: true, atualizada: false, emailAtivo: true },
};
const OK_REINSCRICAO: RespostaFalsa = {
  status: 200,
  corpo: { ok: true, atualizada: true, emailAtivo: true },
};

type Espiao = { readonly envios: Record<string, unknown>[] };

/**
 * Põe um servidor de mentira no lugar do `POST` e guarda o que foi enviado.
 *
 * O espião não é enfeite: é ele que prova que o duplo clique manda **uma** vez
 * e que o payload que sai do navegador é o que a pessoa digitou — inclusive o
 * campo-armadilha vazio, que só existe no corpo do POST e em lugar nenhum da
 * tela.
 */
async function fingirServidor(page: Page, resposta: RespostaFalsa): Promise<Espiao> {
  const envios: Record<string, unknown>[] = [];
  await page.route(API, async (rota) => {
    envios.push((rota.request().postDataJSON() ?? {}) as Record<string, unknown>);
    if (resposta.atrasoMs !== undefined) {
      await new Promise((pronto) => setTimeout(pronto, resposta.atrasoMs));
    }
    await rota.fulfill({
      status: resposta.status,
      contentType: "application/json",
      body: JSON.stringify(resposta.corpo),
    });
  });
  return { envios };
}

/* ── Achar as coisas ──────────────────────────────────────────────────────── */

/** O rótulo exato de um campo, direto da copy. */
function rotulo(campo: keyof typeof COPY.campos): string {
  return COPY.campos[campo].rotulo;
}

/** Um campo de texto, `<select>` ou `<textarea>`, pelo rótulo dele.
 *
 *  `exact` sempre: "Instituição" é prefixo de "Qual instituição" e "Curso" de
 *  "Qual curso", e sem isto o localizador acharia dois elementos assim que o
 *  condicional abrisse — falha que só apareceria no teste dos condicionais. */
function campo(page: Page, nome: keyof typeof COPY.campos): Locator {
  return page.getByLabel(rotulo(nome), { exact: true });
}

/**
 * Escolhe num campo de lista, pelo VALOR de coluna — o que `.selectOption()`
 * fazia enquanto o campo era um `<select>` nativo.
 *
 * Desde 01/09/2026 esses cinco campos são um `listbox` próprio
 * (`SelectLista`), porque o popup de um `<select>` é desenhado pelo sistema
 * operacional e não aceita as cores da página. O gesto do teste virou o gesto
 * de uma pessoa: abrir a lista e clicar na opção.
 *
 * Por `data-valor` e não pelo rótulo bonito: os testes afirmam `"USP"`, `"SP"`,
 * `"INDICACAO"` porque é esse `id` que vai para o banco.
 */
async function escolherNoSelect(
  page: Page,
  nome: keyof typeof COPY.campos,
  chave: string,
): Promise<void> {
  const alvo = campo(page, nome);
  await alvo.click();
  const lista = page.locator(`#${await alvo.getAttribute("id")}-lista`);
  await lista.locator(`[data-valor="${chave}"]`).click();
}

/**
 * Afirma a escolha de um campo de lista.
 *
 * `toHaveValue` deixou de servir quando os cinco campos deixaram de ser
 * `<select>`: o controle é um `<button>`, e o que ele mostra é o RÓTULO da
 * opção, não o `id` que vai para o banco. Esta função afirma o mesmo fato de
 * antes — "o campo contém esta escolha" — pelo único caminho que sobrou.
 *
 * O `data-valor` da opção escolhida não serve aqui: com a lista FECHADA ela
 * não está visível, e o ponto destes testes é justamente que a escolha
 * sobreviveu a um `voltar` ou a um recarregamento.
 */
async function esperaEscolha(
  page: Page,
  nome: keyof typeof COPY.campos,
  rotuloEsperado: string,
): Promise<void> {
  await expect(campo(page, nome)).toHaveText(rotuloEsperado);
}

function botao(page: Page, nome: string): Locator {
  return page.getByRole("button", { name: nome, exact: true });
}

/** Em que bloco a pessoa está agora (0..5). `-1` quando não há bloco na tela. */
async function blocoAtual(page: Page): Promise<number> {
  const secao = page.locator("[data-bloco]");
  if ((await secao.count()) === 0) return -1;
  return Number(await secao.getAttribute("data-bloco"));
}

/**
 * A mesma pergunta que `blocoAtual`, mas esperando a resposta chegar.
 *
 * Depois de um clique que dispara `fetch`, a troca de bloco só acontece quando
 * a resposta volta — e uma leitura de atributo sem espera mede a tela anterior.
 * É a diferença entre este arquivo medir a página e este arquivo medir a
 * velocidade da máquina do dia.
 */
async function esperarBloco(page: Page, bloco: number): Promise<void> {
  await expect(page.locator("[data-bloco]")).toHaveAttribute("data-bloco", String(bloco));
}

/**
 * O aviso de envio da página — e não o `__next-route-announcer__`, que o App
 * Router mantém no documento com o mesmo `role="alert"` e conteúdo vazio.
 */
function aviso(page: Page): Locator {
  return page.locator("form").getByRole("alert");
}

async function avancar(page: Page): Promise<void> {
  await botao(page, NAV.avancar).click();
}

async function voltar(page: Page): Promise<void> {
  await botao(page, NAV.voltar).click();
}

async function enviar(page: Page): Promise<void> {
  await botao(page, NAV.enviar).click();
}

/** Abre a página e passa da abertura para o bloco 1. */
async function abrirFormulario(page: Page): Promise<void> {
  await page.goto(ROTA);
  await expect(page.locator('[data-tela="abertura"]')).toBeVisible();
  await botao(page, COPY.abertura.botao).click();
  await expect(page.locator("[data-bloco]")).toHaveAttribute("data-bloco", "0");
}

/**
 * O combobox de cursos, escolhendo pela lista.
 *
 * A opção é procurada dentro de `#insc-curso-lista` e não na página inteira:
 * as `<option>` dos `<select>` de instituição, ano e conclusão também têm
 * `role="option"`, e "Outro" existe nas duas listas.
 */
function listaDeCursos(page: Page): Locator {
  return page.locator("#insc-curso-lista");
}

function campoCurso(page: Page): Locator {
  return page.getByRole("combobox", { name: rotulo("curso"), exact: true });
}

async function escolherCurso(page: Page, id: string): Promise<void> {
  const texto = CURSOS.find((c) => c.id === id)!.rotulo;
  const entrada = campoCurso(page);
  await entrada.click();
  await entrada.fill(texto);
  await listaDeCursos(page).getByRole("option", { name: texto, exact: true }).click();
  await expect(entrada).toHaveValue(texto);
}

/* ── Uma pessoa inteira ───────────────────────────────────────────────────── */

/**
 * A inscrição de referência. Ela escolhe `INDICACAO` como origem de propósito:
 * assim o percurso feliz já atravessa um campo condicional, e não só o teste
 * que existe para eles.
 */
const PESSOA = {
  nome: "Maria Clara de Souza Almeida",
  email: "maria.clara@exemplo.com",
  whatsapp: "11912345678",
  whatsappNaTela: "(11) 91234-5678",
  idade: "22",
  estado: "SP",
  cidade: "São Paulo",
  linkedin: "linkedin.com/in/maria-clara",
  instituicao: "Insper",
  curso: "Eng. de Produção",
  anoAtual: "3",
  conclusao: "2028",
  premio: "Medalha de ouro na OBMEP 2023",
  nivelAi: 2,
  ferramenta: "CHATGPT",
  aiEstudos: "QUASE_TODO_DIA",
  historiaAi: "Automatizei a triagem de artigos do laboratório com a API.",
  situacao: "ESTAGIO",
  aiTrabalho: "ACEITO",
  empreendedorismo: 2,
  disponibilidade: "DE_10_A_20H",
  origem: "INDICACAO",
  quemIndicou: "João da Silva",
} as const;

function radioDe(lista: readonly { valor: number; rotulo: string }[], valor: number): string {
  return lista.find((o) => o.valor === valor)!.rotulo;
}

function checkboxDe(id: string): string {
  return FERRAMENTAS_AI.find((f) => f.id === id)!.rotulo;
}

/** O rótulo de uma opção com `id` — o irmão de `radioDe`, para listas de texto. */
function opcaoDe(lista: readonly { id: string; rotulo: string }[], id: string): string {
  return lista.find((o) => o.id === id)!.rotulo;
}

/**
 * O `<fieldset>` de um campo de escolha exposta.
 *
 * Desde 21/08/2026 toda lista de até seis opções é um grupo de radio, e não um
 * `<select>` — e `getByLabel` não alcança um `<fieldset>`, cujo nome vem da
 * `<legend>`. O `data-campo` é o mesmo atributo que os outros testes já usam
 * para achar bloco e tela: nome estável, sem depender de classe de CSS Module.
 */
function grupoDe(page: Page, nome: keyof typeof COPY.campos): Locator {
  return page.locator(`fieldset[data-campo="${nome}"]`);
}

/** Marca a opção de `id` numa lista exposta, clicando na linha. */
async function escolherNaLista(
  page: Page,
  lista: readonly { id: string; rotulo: string }[],
  id: string,
): Promise<void> {
  await marcar(page.getByRole("radio", { name: opcaoDe(lista, id), exact: true }));
}

/**
 * Marca (ou desmarca) um radio/checkbox clicando na **linha**, que é o alvo de
 * verdade.
 *
 * `locator.check()` do Playwright não serve aqui, e a recusa dele está certa: o
 * `<input>` real é `opacity: 0` com `pointer-events: none`, e quem recebe o
 * ponteiro naquele ponto é o `<span>` do desenho — irmão do input, não
 * descendente. O `<label>` embrulha os dois de propósito (`Campos.tsx`): no
 * celular o alvo passa a ser a frase inteira em vez de um círculo de 16px, e é
 * nela que a pessoa clica. O pai direto do input é sempre esse `<label>`.
 */
async function clicarNaLinha(alvo: Locator): Promise<void> {
  await alvo.locator("..").click();
}

async function marcar(alvo: Locator): Promise<void> {
  await clicarNaLinha(alvo);
  await expect(alvo).toBeChecked();
}

async function desmarcar(alvo: Locator): Promise<void> {
  await clicarNaLinha(alvo);
  await expect(alvo).not.toBeChecked();
}

async function preencherBloco0(page: Page): Promise<void> {
  await campo(page, "nome").fill(PESSOA.nome);
  await campo(page, "email").fill(PESSOA.email);
  await campo(page, "whatsapp").fill(PESSOA.whatsapp);
  await campo(page, "idade").fill(PESSOA.idade);
  await escolherNoSelect(page, "estado", PESSOA.estado);
  await campo(page, "cidade").fill(PESSOA.cidade);
  await campo(page, "linkedin").fill(PESSOA.linkedin);
}

async function preencherBloco1(page: Page): Promise<void> {
  await escolherNoSelect(page, "instituicao", PESSOA.instituicao);
  await escolherCurso(page, PESSOA.curso);
  await escolherNoSelect(page, "ano_atual", PESSOA.anoAtual);
  await escolherNoSelect(page, "conclusao_prevista", PESSOA.conclusao);
  await premio(page, 1).fill(PESSOA.premio);
}

async function preencherBloco2(page: Page): Promise<void> {
  await marcar(
    page.getByRole("radio", { name: radioDe(NIVEIS_AI, PESSOA.nivelAi), exact: true }),
  );
  await marcar(
    page.getByRole("checkbox", { name: checkboxDe(PESSOA.ferramenta), exact: true }),
  );
  await escolherNaLista(page, AI_ESTUDOS, PESSOA.aiEstudos);
  await campo(page, "historia_ai").fill(PESSOA.historiaAi);
}

async function preencherBloco3(page: Page): Promise<void> {
  await escolherNaLista(page, SITUACOES, PESSOA.situacao);
  await escolherNaLista(page, AI_TRABALHO, PESSOA.aiTrabalho);
  await marcar(
    page.getByRole("radio", {
      name: radioDe(EMPREENDEDORISMO, PESSOA.empreendedorismo),
      exact: true,
    }),
  );
}

async function preencherBloco4(page: Page): Promise<void> {
  await escolherNaLista(page, DISPONIBILIDADES, PESSOA.disponibilidade);
  await escolherNoSelect(page, "origem", PESSOA.origem);
  await campo(page, "origem_quem_indicou").fill(PESSOA.quemIndicou);
}

/**
 * O último bloco: as indicações e o aceite.
 *
 * As três linhas ficam em BRANCO de propósito. Elas são recomendadas, nunca
 * obrigatórias, e este é o caminho que a maioria vai fazer — é ele que não pode
 * travar o envio. Quem exercita o preenchimento delas é o teste dedicado.
 */
async function preencherBloco5(page: Page): Promise<void> {
  await marcar(page.getByRole("checkbox", { name: COPY.aceite.rotulo, exact: true }));
}

/** A n-ésima linha das indicações (1-based), nome ou LinkedIn. */
function indicacao(page: Page, n: number, parte: "nome" | "linkedin"): Locator {
  const pessoa = COPY.indicacoes.rotuloItem.replace("{n}", String(n));
  const sufixo = parte === "nome" ? COPY.indicacoes.nome : COPY.indicacoes.linkedin;
  return page.getByRole("textbox", { name: `${pessoa} — ${sufixo}`, exact: true });
}

/** Da abertura até o último bloco preenchido, sem enviar. */
async function preencherTudo(page: Page): Promise<void> {
  await abrirFormulario(page);
  await preencherBloco0(page);
  await avancar(page);
  await preencherBloco1(page);
  await avancar(page);
  await preencherBloco2(page);
  await avancar(page);
  await preencherBloco3(page);
  await avancar(page);
  await preencherBloco4(page);
  await avancar(page);
  await preencherBloco5(page);
  expect(await blocoAtual(page)).toBe(ULTIMO_BLOCO);
}

/** A n-ésima linha do repeater de prêmios (1-based, como o rótulo diz). */
function premio(page: Page, n: number): Locator {
  return page.getByRole("textbox", {
    name: COPY.premios.rotuloItem.replace("{n}", String(n)),
    exact: true,
  });
}

/** O rascunho guardado, ou `null`. */
function rascunhoGuardado(page: Page): Promise<string | null> {
  return page.evaluate((chave) => window.sessionStorage.getItem(chave), CHAVE_RASCUNHO);
}

/* ══ A abertura ═══════════════════════════════════════════════════════════ */

/**
 * Desde 19/09/2026 a abertura explica a trilha, e ficou mais alta que a tela.
 * O que só um navegador de verdade prova — o jsdom não tem layout nem rolagem —
 * é o que a mudança pôs em risco: o COMEÇAR continuar à vista quando a pessoa
 * chega, a tela não ganhar rolagem horizontal, e o "COMO FUNCIONA" de fato
 * levar à explicação.
 */
test.describe("a abertura", () => {
  const TELAS = [
    { nome: "notebook", width: 1366, height: 680 },
    { nome: "celular", width: 390, height: 844 },
    // O iPhone SE de primeira geração: a menor tela que o site se propõe a
    // atender, e a primeira em que o cartaz deixa de caber.
    { nome: "celular baixo", width: 320, height: 568 },
  ] as const;

  for (const tela of TELAS) {
    test(`o COMEÇAR está à vista sem rolar, e nada vaza para o lado — ${tela.nome}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: tela.width, height: tela.height });
      await page.goto(ROTA);

      const caixa = await botao(page, COPY.abertura.botao).boundingBox();
      expect(caixa, "o COMEÇAR não foi desenhado").not.toBeNull();
      expect(
        caixa!.y + caixa!.height,
        "o COMEÇAR caiu abaixo da primeira dobra",
      ).toBeLessThanOrEqual(tela.height);

      // Quem rola é `[data-tela="abertura"]`, não o documento: mede-se os dois.
      const larguras = await page.locator('[data-tela="abertura"]').evaluate((el) => ({
        tela: el.scrollWidth - el.clientWidth,
        documento: document.documentElement.scrollWidth - window.innerWidth,
      }));
      expect(larguras).toEqual({ tela: 0, documento: 0 });
    });
  }

  test("o COMO FUNCIONA rola até a explicação, leva o foco e não mexe no histórico", async ({
    page,
  }) => {
    await page.goto(ROTA);
    const tela = page.locator('[data-tela="abertura"]');
    const entradas = await page.evaluate(() => window.history.length);

    await botao(page, COPY.abertura.convite).click();

    // A rolagem é suave, então o que se espera é o ESTADO final, e não um tempo.
    // "No máximo 1px do topo" e "a tela rolou" são duas perguntas separadas de
    // propósito: se um dia a explicação ficar mais baixa que a janela, ela não
    // TEM como chegar ao topo, e a falha precisa dizer isso em vez de mandar
    // alguém depurar o código de rolagem.
    await expect
      .poll(() => tela.evaluate((el) => Math.round(el.lastElementChild!.getBoundingClientRect().top)))
      .toBeLessThanOrEqual(1);
    expect(await tela.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    expect(await tela.evaluate((el) => document.activeElement === el.lastElementChild)).toBe(true);

    // Uma âncora teria empilhado uma entrada, e o VOLTAR do navegador deixaria
    // de sair da página — que é a regra desta rota.
    expect(await page.evaluate(() => window.history.length)).toBe(entradas);
    expect(new URL(page.url()).hash).toBe("");

    // Dali, o próximo Tab é a segunda porta, e ela abre o mesmo bloco 1.
    await page.keyboard.press("Tab");
    await expect(botao(page, COPY.abertura.fecho.botao)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator('[data-bloco="0"]')).toBeVisible();
  });
});

/* ══ O percurso ═══════════════════════════════════════════════════════════ */

test.describe("o percurso completo", () => {
  test("do primeiro campo à tela de confirmação", async ({ page }) => {
    // Nenhuma exceção sem dono no caminho inteiro. Só `pageerror` (erro de
    // JavaScript que ninguém pegou), e não o console: um aviso do React em modo
    // de produção não existe, mas um `console.warn` de terceiro tornaria este
    // teste instável sem dizer nada sobre a página.
    const explosoes: string[] = [];
    page.on("pageerror", (erro) => explosoes.push(erro.message));

    const servidor = await fingirServidor(page, OK_NOVA_SEM_EMAIL);

    await preencherTudo(page);
    await enviar(page);

    await expect(page.locator('[data-tela="confirmacao"]')).toBeVisible();
    expect(servidor.envios).toHaveLength(1);
    expect(explosoes).toEqual([]);

    // O que saiu do navegador é o que a pessoa digitou — normalizado onde a
    // fundação normaliza (o WhatsApp vai só com dígitos) e com o campo-armadilha
    // vazio, que existe no corpo do POST e em nenhum lugar da tela.
    const enviado = servidor.envios[0];
    expect(enviado.nome).toBe(PESSOA.nome);
    expect(enviado.email).toBe(PESSOA.email);
    expect(enviado.whatsapp).toBe(PESSOA.whatsapp);
    expect(enviado.curso).toBe(PESSOA.curso);
    expect(enviado.ferramentas_ai).toEqual([PESSOA.ferramenta]);
    expect(enviado.origem_quem_indicou).toBe(PESSOA.quemIndicou);
    expect(enviado.premios).toEqual([PESSOA.premio]);
    // Ninguém foi indicado: as três linhas em branco viram lista vazia, e não
    // três pares de strings vazias. É a fronteira de `paraEnvio` fazendo o
    // trabalho — sem ela o banco guardaria ruído em toda ficha.
    expect(enviado.indicacoes).toEqual([]);
    expect(enviado[CAMPO_HONEYPOT]).toBe("");
  });

  test("as três indicações vão inteiras, e o LinkedIn vai normalizado", async ({
    page,
  }) => {
    const servidor = await fingirServidor(page, OK_NOVA_SEM_EMAIL);

    await preencherTudo(page);

    // Duas pessoas, e a terceira linha deixada em branco de propósito: indicar
    // menos de três é permitido, e a linha vazia não pode virar erro nem ruído.
    await indicacao(page, 1, "nome").fill("Ana Prado");
    await indicacao(page, 1, "linkedin").fill("linkedin.com/in/anaprado");
    // Só o usuário, sem domínio: a forma que a §4.1 obriga a aceitar.
    await indicacao(page, 2, "nome").fill("Bruno Lima");
    await indicacao(page, 2, "linkedin").fill("brunolima");

    await enviar(page);
    await expect(page.locator('[data-tela="confirmacao"]')).toBeVisible();

    expect(servidor.envios[0].indicacoes).toEqual([
      { nome: "Ana Prado", linkedin: "linkedin.com/in/anaprado" },
      { nome: "Bruno Lima", linkedin: "brunolima" },
    ]);
  });

  test("a indicação pela metade é cobrada, e não apagada em silêncio", async ({ page }) => {
    await fingirServidor(page, OK_NOVA_SEM_EMAIL);

    await preencherTudo(page);
    await indicacao(page, 1, "nome").fill("Ana Prado");
    await enviar(page);

    // Continua no formulário, com a mensagem do par incompleto na tela.
    await expect(page.locator('[data-tela="confirmacao"]')).toHaveCount(0);
    await expect(page.getByText(COPY.erros.indicacaoIncompleta)).toBeVisible();
    await expect(indicacao(page, 1, "nome")).toHaveValue("Ana Prado");
  });

  test("o progresso conta os seis blocos, um por vez", async ({ page }) => {
    await abrirFormulario(page);

    // Na abertura a região `role=status` já existe (é isso que faz o leitor de
    // tela anunciar a troca), e está vazia.
    for (let bloco = 0; bloco <= ULTIMO_BLOCO; bloco++) {
      expect(await blocoAtual(page)).toBe(bloco);
      await expect(page.locator("[data-progresso]")).toContainText(textoProgresso(bloco + 1));
      await expect(page.locator("[data-progresso]")).toContainText(COPY.blocos[bloco].rotulo);
      if (bloco === ULTIMO_BLOCO) break;
      await preencherDoBloco(page, bloco);
      await avancar(page);
    }

    // No último bloco o botão primário muda de nome: não há mais para onde
    // avançar.
    await expect(botao(page, NAV.enviar)).toBeVisible();
    await expect(botao(page, NAV.avancar)).toHaveCount(0);
  });
});

async function preencherDoBloco(page: Page, bloco: number): Promise<void> {
  const preencher = [
    preencherBloco0,
    preencherBloco1,
    preencherBloco2,
    preencherBloco3,
    preencherBloco4,
    preencherBloco5,
  ];
  await preencher[bloco](page);
}

/* ══ Voltar ═══════════════════════════════════════════════════════════════ */

test.describe("voltar", () => {
  test("um bloco atrás, nada perdido", async ({ page }) => {
    await abrirFormulario(page);
    await preencherBloco0(page);
    await avancar(page);
    await preencherBloco1(page);

    await voltar(page);

    expect(await blocoAtual(page)).toBe(0);
    await expect(campo(page, "nome")).toHaveValue(PESSOA.nome);
    await expect(campo(page, "email")).toHaveValue(PESSOA.email);
    // A máscara é remontada a partir dos dígitos guardados, e não guardada
    // pronta: se o estado tivesse ficado com os parênteses dentro, a validação
    // do servidor receberia lixo.
    await expect(campo(page, "whatsapp")).toHaveValue(PESSOA.whatsappNaTela);
    await expect(campo(page, "idade")).toHaveValue(PESSOA.idade);
    await esperaEscolha(page, "estado", ESTADOS.find((e) => e.sigla === PESSOA.estado)!.nome);
    await expect(campo(page, "cidade")).toHaveValue(PESSOA.cidade);

    // E ir para a frente de novo devolve o bloco 2 como estava.
    await avancar(page);
    expect(await blocoAtual(page)).toBe(1);
    await esperaEscolha(page, "instituicao", PESSOA.instituicao);
    await expect(campoCurso(page)).toHaveValue(PESSOA.curso);
    await esperaEscolha(page, "conclusao_prevista", PESSOA.conclusao);
    await expect(premio(page, 1)).toHaveValue(PESSOA.premio);
  });

  test("o segmento cumprido da régua leva de volta ao bloco dele", async ({ page }) => {
    await abrirFormulario(page);
    await preencherBloco0(page);
    await avancar(page);
    await preencherBloco1(page);
    await avancar(page);
    expect(await blocoAtual(page)).toBe(2);

    // Segmento cumprido é botão; segmento futuro não é. Uma régua com um botão
    // por bloco seria um convite a pular bloco obrigatório.
    const regua = page.getByRole("navigation", { name: COPY.progresso.rotulo });
    await expect(regua.getByRole("button")).toHaveCount(2);
    await regua.getByRole("button", { name: COPY.blocos[0].rotulo, exact: true }).click();

    expect(await blocoAtual(page)).toBe(0);
    await expect(campo(page, "nome")).toHaveValue(PESSOA.nome);
  });
});

/* ══ O rascunho ═══════════════════════════════════════════════════════════ */

test.describe("o rascunho no sessionStorage", () => {
  test("recarregar no meio recupera o bloco e o preenchido", async ({ page }) => {
    await abrirFormulario(page);
    await preencherBloco0(page);
    await avancar(page);
    await preencherBloco1(page);

    // A gravação tem 400ms de respiro para não escrever a cada tecla. Esperar
    // o conteúdo aparecer, e não um `waitForTimeout`, é o que impede este teste
    // de virar sorte numa máquina lenta.
    await expect
      .poll(() => rascunhoGuardado(page))
      .toContain(PESSOA.curso);

    await page.reload();

    expect(await blocoAtual(page)).toBe(1);
    await esperaEscolha(page, "instituicao", PESSOA.instituicao);
    // O combobox de cursos não é controlado por `value`: ele tem texto próprio,
    // sincronizado com o valor por um efeito. Um rascunho restaurado é
    // exatamente o caso em que o valor muda "por fora", e sem esse efeito o
    // campo apareceria vazio com um curso escolhido por baixo.
    await expect(campoCurso(page)).toHaveValue(PESSOA.curso);
    await expect(premio(page, 1)).toHaveValue(PESSOA.premio);

    await voltar(page);
    await expect(campo(page, "whatsapp")).toHaveValue(PESSOA.whatsappNaTela);
    await expect(campo(page, "linkedin")).toHaveValue(PESSOA.linkedin);
  });

  test("enviar limpa o rascunho", async ({ page }) => {
    await fingirServidor(page, OK_NOVA_SEM_EMAIL);
    await preencherTudo(page);

    await expect.poll(() => rascunhoGuardado(page)).not.toBeNull();

    await enviar(page);
    await expect(page.locator('[data-tela="confirmacao"]')).toBeVisible();

    // E continua limpo: o efeito que grava precisa desistir enquanto a
    // confirmação está na tela, senão ele reescreveria o rascunho 400ms depois
    // de apagá-lo e a próxima visita cairia num formulário já preenchido.
    await expect.poll(() => rascunhoGuardado(page), { timeout: 2000 }).toBeNull();
  });
});

/* ══ Os campos condicionais ═══════════════════════════════════════════════ */

test.describe("os campos condicionais", () => {
  test.beforeEach(async ({ page }) => {
    await abrirFormulario(page);
    await preencherBloco0(page);
    await avancar(page);
  });

  test("`Outra` instituição abre e fecha o campo do nome", async ({ page }) => {
    const qual = campo(page, "instituicao_outra");
    await expect(qual).toHaveCount(0);

    await escolherNoSelect(page, "instituicao", "OUTRA");
    await expect(qual).toBeVisible();
    await qual.fill("Universidade Federal de Alagoas");

    await escolherNoSelect(page, "instituicao", INSTITUICOES[0].id);
    await expect(qual).toHaveCount(0);
  });

  test("`USP` abre a unidade, e só ela", async ({ page }) => {
    const unidade = grupoDe(page, "unidade_usp");
    await expect(unidade).toHaveCount(0);
    await expect(campo(page, "instituicao_outra")).toHaveCount(0);

    await escolherNoSelect(page, "instituicao", "USP");
    await expect(unidade).toBeVisible();
    await expect(campo(page, "instituicao_outra")).toHaveCount(0);
    await escolherNaLista(page, UNIDADES_USP, UNIDADES_USP[0].id);

    await escolherNoSelect(page, "instituicao", "OUTRA");
    await expect(unidade).toHaveCount(0);
    await expect(campo(page, "instituicao_outra")).toBeVisible();
  });

  test("`Outra` unidade da USP abre o campo do nome", async ({ page }) => {
    const qual = campo(page, "unidade_usp_outra");
    await escolherNoSelect(page, "instituicao", "USP");
    await expect(qual).toHaveCount(0);

    await escolherNaLista(page, UNIDADES_USP, "OUTRA");
    await expect(qual).toBeVisible();
    await qual.fill("IME");

    await escolherNaLista(page, UNIDADES_USP, UNIDADES_USP[0].id);
    await expect(qual).toHaveCount(0);

    // Sair da USP leva o campo junto, e não deixa um texto órfão na tela.
    await escolherNaLista(page, UNIDADES_USP, "OUTRA");
    await escolherNoSelect(page, "instituicao", "OUTRA");
    await expect(qual).toHaveCount(0);
  });

  test("`Outro` curso abre o campo livre", async ({ page }) => {
    const qual = campo(page, "curso_outro");
    await expect(qual).toHaveCount(0);

    await escolherCurso(page, "OUTRO");
    await expect(qual).toBeVisible();
    await qual.fill("Engenharia de Foguetes");

    await escolherCurso(page, PESSOA.curso);
    await expect(qual).toHaveCount(0);
  });

  test("`ai_trabalho` é perguntado a todo mundo, situação nenhuma esconde", async ({ page }) => {
    await preencherBloco1(page);
    await avancar(page);
    await preencherBloco2(page);
    await avancar(page);

    const aiTrabalho = grupoDe(page, "ai_trabalho");
    // Antes de escolher qualquer situação a pergunta já está lá — e continua lá
    // depois de cada uma delas, `Só estudo` inclusive. Era condicional até
    // 21/08/2026, e o condicional esvaziava a coluna para quem só estuda.
    await expect(aiTrabalho).toBeVisible();

    for (const situacao of SITUACOES) {
      await escolherNaLista(page, SITUACOES, situacao.id);
      await expect(aiTrabalho, situacao.id).toBeVisible();
    }
  });

  test("`Indicação de alguém` abre o campo de quem indicou", async ({ page }) => {
    await preencherBloco1(page);
    await avancar(page);
    await preencherBloco2(page);
    await avancar(page);
    await preencherBloco3(page);
    await avancar(page);

    const quem = campo(page, "origem_quem_indicou");
    await expect(quem).toHaveCount(0);

    await escolherNoSelect(page, "origem", "INDICACAO");
    await expect(quem).toBeVisible();
    await quem.fill(PESSOA.quemIndicou);

    const outra = ORIGENS.find((o) => o.id !== "INDICACAO" && o.id !== "OUTRO")!;
    await escolherNoSelect(page, "origem", outra.id);
    await expect(quem).toHaveCount(0);

    // `Outro` é o mesmo padrão em outra opção: campo curto e obrigatório, e
    // nunca ao mesmo tempo que "quem te indicou".
    const qual = campo(page, "origem_outra");
    await expect(qual).toHaveCount(0);
    await escolherNoSelect(page, "origem", "OUTRO");
    await expect(qual).toBeVisible();
    await expect(quem).toHaveCount(0);
    await escolherNoSelect(page, "origem", outra.id);
    await expect(qual).toHaveCount(0);
  });

  test("quem só estuda manda `ai_trabalho` como todo mundo", async ({ page }) => {
    // O contrário do que este teste guardava até 21/08/2026. A resposta de quem
    // só estuda tem de CHEGAR ao servidor: é justamente a fatia que a coluna
    // não enxergava, e "não uso" é um dado — coluna vazia não é.
    const servidor = await fingirServidor(page, OK_NOVA_SEM_EMAIL);
    const soEstuda = SITUACOES.find((s) => !s.trabalha)!;

    await preencherBloco1(page);
    await avancar(page);
    await preencherBloco2(page);
    await avancar(page);
    await escolherNaLista(page, SITUACOES, soEstuda.id);
    await escolherNaLista(page, AI_TRABALHO, "NAO_USO");
    await marcar(
      page.getByRole("radio", {
        name: radioDe(EMPREENDEDORISMO, PESSOA.empreendedorismo),
        exact: true,
      }),
    );
    await avancar(page);
    await preencherBloco4(page);
    await avancar(page);
    await preencherBloco5(page);
    await enviar(page);

    await expect(page.locator('[data-tela="confirmacao"]')).toBeVisible();
    expect(servidor.envios[0].situacao).toBe(soEstuda.id);
    expect(servidor.envios[0].ai_trabalho).toBe("NAO_USO");
  });
});

/* ══ As três telas de confirmação ═════════════════════════════════════════ */

test.describe("a tela de confirmação", () => {
  async function enviarCom(page: Page, resposta: RespostaFalsa): Promise<void> {
    await fingirServidor(page, resposta);
    await preencherTudo(page);
    await enviar(page);
    await expect(page.locator('[data-tela="confirmacao"]')).toBeVisible();
  }

  test("inscrição nova, com e-mail ligado: promete o e-mail", async ({ page }) => {
    await enviarCom(page, OK_NOVA_COM_EMAIL);
    const tela = page.locator('[data-tela="confirmacao"]');
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      COPY.confirmacao.comEmail.titulo,
    );
    for (const linha of COPY.confirmacao.comEmail.linhas) {
      await expect(tela).toContainText(linha);
    }
  });

  test("inscrição nova, sem e-mail: não promete e-mail nenhum", async ({ page }) => {
    // A exigência da spec §4.7. A asserção que decide é a NEGATIVA: com o
    // interruptor desligado (§7), a frase "mandamos um e-mail confirmando" não
    // pode aparecer — prometer e não cumprir custa mais do que não prometer.
    await enviarCom(page, OK_NOVA_SEM_EMAIL);
    const tela = page.locator('[data-tela="confirmacao"]');
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      COPY.confirmacao.semEmail.titulo,
    );
    for (const linha of COPY.confirmacao.semEmail.linhas) {
      await expect(tela).toContainText(linha);
    }
    for (const linha of COPY.confirmacao.comEmail.linhas) {
      await expect(tela).not.toContainText(linha);
    }
  });

  test("reinscrição: diz que atualizou, e não que deu erro", async ({ page }) => {
    await enviarCom(page, OK_REINSCRICAO);
    const tela = page.locator('[data-tela="confirmacao"]');
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      COPY.confirmacao.atualizada.titulo,
    );
    for (const linha of COPY.confirmacao.atualizada.linhas) {
      await expect(tela).toContainText(linha);
    }
  });

  /**
   * O último pedido de foco do percurso — e o que mais custa se faltar.
   *
   * O formulário entrega o foco em toda troca de bloco (`PRIMEIRO_DO_BLOCO`, em
   * `Formulario.tsx`), e o comentário de lá diz por quê: "sem isto, quem usa
   * leitor de tela clica em AVANÇAR e não ouve nada — o foco continua no botão,
   * que não mudou de nome, e a pessoa não sabe se funcionou".
   *
   * A confirmação era o único lugar onde a regra não valia: `enviar()` chamava
   * `setConfirmacao(...)` sem marcar `pedidoDeFoco`, o `<form>` inteiro — com o
   * botão que tinha o foco — saía do DOM e o foco caía no `<body>`. Quem
   * enviava pelo teclado não ouvia nada e precisava tabular a página inteira
   * para descobrir se a inscrição foi. Hoje `enviar()` pede foco para o título
   * da confirmação (`ID_CONFIRMACAO`, com `tabIndex={-1}` no `<h1>`), pelo
   * mesmo mecanismo das trocas de bloco — e é isto que este teste cobra: que o
   * foco pare DENTRO da tela que acabou de aparecer, não no corpo da página.
   */
  test(
    "o foco vai para a tela de confirmação: quem envia pelo teclado ouve o resultado",
    async ({ page }) => {
      await fingirServidor(page, OK_NOVA_SEM_EMAIL);
      await preencherTudo(page);
      await enviar(page);
      await expect(page.locator('[data-tela="confirmacao"]')).toBeVisible();

      const ondeEstaOFoco = await page.evaluate(() => ({
        tag: document.activeElement?.tagName ?? "nenhum",
        dentroDaConfirmacao:
          document.querySelector('[data-tela="confirmacao"]')?.contains(document.activeElement) ??
          false,
      }));

      expect(
        ondeEstaOFoco.dentroDaConfirmacao,
        `o foco parou em <${ondeEstaOFoco.tag}>, fora da tela que acabou de aparecer`,
      ).toBe(true);
    },
  );

  test("a única porta do fecho é a tese", async ({ page }) => {
    await enviarCom(page, OK_NOVA_SEM_EMAIL);
    const tela = page.locator('[data-tela="confirmacao"]');
    await expect(tela).toContainText(COPY.confirmacao.tese.convite);

    const saidas = tela.getByRole("link");
    await expect(saidas).toHaveCount(1);
    await expect(saidas).toHaveAttribute("href", COPY.confirmacao.tese.href);

    await saidas.click();
    await expect(page).toHaveURL(new RegExp(`${COPY.confirmacao.tese.href}$`));
  });
});

/* ══ O envio que dá errado ════════════════════════════════════════════════ */

test.describe("quando o servidor recusa", () => {
  test("400 leva de volta ao bloco onde o campo mora, com o erro ao lado", async ({
    page,
  }) => {
    // O `400` é o caso em que cliente e servidor divergiram — a lista mudou
    // entre carregar e enviar, por exemplo. A pessoa não pode receber uma lista
    // de erros no fim: ela volta ao bloco do primeiro campo com problema (§4.6).
    const mensagem = COPY.erros.email;
    await fingirServidor(page, {
      status: 400,
      corpo: { ok: false, erros: { email: mensagem } },
    });

    await preencherTudo(page);
    await enviar(page);

    await esperarBloco(page, 0);
    await expect(campo(page, "email")).toBeFocused();
    await expect(campo(page, "email")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator('[data-campo="email"] [data-erro]')).toHaveText(mensagem);
    await expect(aviso(page)).toHaveText(COPY.envio.invalido);

    // E o que o servidor disse deixa de valer no instante em que a pessoa mexe.
    await campo(page, "email").fill("outro@exemplo.com");
    await expect(page.locator('[data-campo="email"] [data-erro]')).toHaveCount(0);
    await expect(aviso(page)).toHaveCount(0);
  });

  test("429 e 409 falam sem perder o preenchido", async ({ page }) => {
    await fingirServidor(page, { status: 429, corpo: { ok: false, motivo: "limite" } });
    await preencherTudo(page);
    await enviar(page);

    await expect(aviso(page)).toHaveText(COPY.envio.limite);
    expect(await blocoAtual(page)).toBe(ULTIMO_BLOCO);
    await expect(botao(page, NAV.enviar)).toBeEnabled();
    await expect.poll(() => rascunhoGuardado(page)).not.toBeNull();

    // Agora o outro: as inscrições fecharam enquanto a pessoa preenchia.
    await page.unroute(API);
    await fingirServidor(page, { status: 409, corpo: { ok: false, motivo: "encerrado" } });
    await enviar(page);
    await expect(aviso(page)).toHaveText(COPY.envio.encerrado);
  });

  test("o duplo clique no envio manda uma vez só", async ({ page }) => {
    // O botão desabilita no primeiro clique; a resposta é segurada por meio
    // segundo para que o segundo clique caia dentro da janela em que um
    // formulário mal fechado mandaria de novo.
    const servidor = await fingirServidor(page, { ...OK_NOVA_SEM_EMAIL, atrasoMs: 500 });
    await preencherTudo(page);

    // Pelo seletor do submit, e não pelo nome: o nome do botão muda para
    // ENVIANDO… entre um clique e o outro, que é justamente o que se quer
    // atravessar.
    await page.locator('form button[type="submit"]').dblclick();

    await expect(page.locator('[data-tela="confirmacao"]')).toBeVisible();
    expect(servidor.envios).toHaveLength(1);
  });
});

/* ══ O combobox de cursos ═════════════════════════════════════════════════ */

test.describe("o combobox de cursos", () => {
  test.beforeEach(async ({ page }) => {
    await abrirFormulario(page);
    await preencherBloco0(page);
    await avancar(page);
  });

  test("digitar sem acento filtra a lista", async ({ page }) => {
    const entrada = campoCurso(page);
    await entrada.click();
    // As 44 aparecem inteiras enquanto ninguém digitou: abrir clicando é "só
    // quis olhar".
    await expect(listaDeCursos(page).getByRole("option")).toHaveCount(CURSOS.length);

    await entrada.fill("eletrica");
    const opcoes = listaDeCursos(page).getByRole("option");
    await expect(opcoes).toHaveCount(1);
    await expect(opcoes.first()).toHaveText("Eng. Elétrica");

    await opcoes.first().click();
    await expect(entrada).toHaveValue("Eng. Elétrica");
  });

  test("nada casou: `Outro` continua sendo uma saída", async ({ page }) => {
    const entrada = campoCurso(page);
    await entrada.click();
    await entrada.fill("astrofisica quantica");
    const opcoes = listaDeCursos(page).getByRole("option");
    await expect(opcoes).toHaveCount(1);
    await expect(opcoes.first()).toHaveText(CURSOS[CURSOS.length - 1].rotulo);
  });

  test("`Esc` fecha e devolve o valor anterior, sem deixar lixo", async ({ page }) => {
    const entrada = campoCurso(page);
    await escolherCurso(page, PESSOA.curso);

    await entrada.click();
    await entrada.fill("bio");
    await expect(listaDeCursos(page)).toBeVisible();

    await entrada.press("Escape");
    await expect(listaDeCursos(page)).toBeHidden();
    await expect(entrada).toHaveValue(PESSOA.curso);
    await expect(entrada).toHaveAttribute("aria-expanded", "false");
  });

  test("`Tab` numa lista aberta e intocada não escolhe nada", async ({ page }) => {
    // A armadilha clássica do combobox: abrir por curiosidade e sair tabulando
    // deixaria "Administração" escolhido para quem nunca olhou a lista.
    const entrada = campoCurso(page);
    await entrada.click();
    await expect(listaDeCursos(page)).toBeVisible();

    await entrada.press("Tab");
    await expect(entrada).toHaveValue("");
    await expect(listaDeCursos(page)).toBeHidden();

    // E a prova de que não foi só o texto que ficou vazio: o AVANÇAR cobra o
    // curso e o bloco não passa. Se um curso tivesse sido escolhido em silêncio,
    // este clique teria levado ao bloco 3.
    await avancar(page);
    expect(await blocoAtual(page)).toBe(1);
    await expect(page.locator('[data-campo="curso"]')).toHaveAttribute("data-invalido", "true");
  });

  test("seta e Enter escolhem pelo teclado", async ({ page }) => {
    const entrada = campoCurso(page);
    await entrada.click();
    await entrada.press("ArrowDown");
    await entrada.press("ArrowDown");
    await entrada.press("Enter");

    // Abrir clicando não realça nada; a primeira seta realça o item 0, a
    // segunda leva ao 1.
    await expect(entrada).toHaveValue(CURSOS[1].rotulo);
    await expect(listaDeCursos(page)).toBeHidden();
  });
});

/* ══ O repeater de prêmios ════════════════════════════════════════════════ */

test.describe("o repeater de prêmios", () => {
  test.beforeEach(async ({ page }) => {
    await abrirFormulario(page);
    await preencherBloco0(page);
    await avancar(page);
  });

  test("o `+` só aparece depois que a linha tem conteúdo", async ({ page }) => {
    const adicionar = botao(page, COPY.premios.adicionar);
    await expect(premio(page, 1)).toBeVisible();
    await expect(adicionar).toHaveCount(0);
    // Com uma linha só, remover não teria o que fazer.
    await expect(page.getByRole("button", { name: COPY.premios.remover })).toHaveCount(0);

    await premio(page, 1).fill(PESSOA.premio);
    await expect(adicionar).toBeVisible();

    await adicionar.click();
    // O foco vai para o campo novo: sem isso a pessoa clica em `+`, nada parece
    // acontecer, e ela clica de novo.
    await expect(premio(page, 2)).toBeFocused();
    await expect(adicionar).toHaveCount(0);
    await expect(page.getByRole("button", { name: COPY.premios.remover })).toHaveCount(2);

    // Esvaziar a última linha esconde o `+` de novo.
    await premio(page, 2).fill("Menção honrosa na OBA 2022");
    await expect(adicionar).toBeVisible();
    await premio(page, 2).fill("");
    await expect(adicionar).toHaveCount(0);
  });

  test("o teto de oito vale", async ({ page }) => {
    const adicionar = botao(page, COPY.premios.adicionar);
    for (let n = 1; n <= LIMITES.maxPremios; n++) {
      await premio(page, n).fill(`Prêmio número ${n}`);
      if (n < LIMITES.maxPremios) {
        await expect(adicionar).toBeVisible();
        await adicionar.click();
      }
    }

    await expect(page.locator("[data-premio]")).toHaveCount(LIMITES.maxPremios);
    await expect(adicionar).toHaveCount(0);

    // Removendo uma, o `+` volta: o teto é um teto, não um caminho sem volta.
    await page
      .getByRole("button", {
        name: `${COPY.premios.remover} ${COPY.premios.rotuloItem.replace("{n}", "8")}`,
        exact: true,
      })
      .click();
    await expect(page.locator("[data-premio]")).toHaveCount(LIMITES.maxPremios - 1);
    await expect(adicionar).toBeVisible();
  });

  test("prêmio em branco não chega ao servidor", async ({ page }) => {
    const servidor = await fingirServidor(page, OK_NOVA_SEM_EMAIL);
    await escolherNoSelect(page, "instituicao", PESSOA.instituicao);
    await escolherCurso(page, PESSOA.curso);
    await escolherNoSelect(page, "ano_atual", PESSOA.anoAtual);
    await escolherNoSelect(page, "conclusao_prevista", PESSOA.conclusao);
    await premio(page, 1).fill(PESSOA.premio);
    await botao(page, COPY.premios.adicionar).click();
    // A linha 2 nasce e fica vazia: o rastro de quem clicou em `+` e desistiu.

    await avancar(page);
    await preencherBloco2(page);
    await avancar(page);
    await preencherBloco3(page);
    await avancar(page);
    await preencherBloco4(page);
    await avancar(page);
    await preencherBloco5(page);
    await enviar(page);

    await expect(page.locator('[data-tela="confirmacao"]')).toBeVisible();
    expect(servidor.envios[0].premios).toEqual([PESSOA.premio]);
  });
});

/* ══ `Nenhuma dessas` ═════════════════════════════════════════════════════ */

test.describe("o checklist de ferramentas", () => {
  test("`Nenhuma dessas` é exclusiva nos dois sentidos", async ({ page }) => {
    await abrirFormulario(page);
    await preencherBloco0(page);
    await avancar(page);
    await preencherBloco1(page);
    await avancar(page);

    const exclusiva = FERRAMENTAS_AI.find((f) => f.exclusiva === true)!;
    const outras = FERRAMENTAS_AI.filter((f) => f.exclusiva !== true).slice(0, 2);

    const nenhuma = page.getByRole("checkbox", { name: exclusiva.rotulo, exact: true });
    const primeira = page.getByRole("checkbox", { name: outras[0].rotulo, exact: true });
    const segunda = page.getByRole("checkbox", { name: outras[1].rotulo, exact: true });

    await marcar(primeira);
    await marcar(segunda);

    // Sentido 1: marcar a exclusiva apaga as outras.
    await marcar(nenhuma);
    await expect(primeira).not.toBeChecked();
    await expect(segunda).not.toBeChecked();

    // Sentido 2: marcar qualquer outra tira a exclusiva do caminho, sem avisar:
    // a pessoa acabou de dizer que usa alguma coisa.
    await marcar(primeira);
    await expect(nenhuma).not.toBeChecked();

    // E desmarcar a exclusiva não deixa nada marcado para trás.
    await desmarcar(primeira);
    await marcar(nenhuma);
    await desmarcar(nenhuma);
    await expect(page.getByRole("checkbox", { checked: true })).toHaveCount(0);
  });
});

/* ══ O teclado ════════════════════════════════════════════════════════════ */

test.describe("o teclado", () => {
  test("o foco cai no primeiro campo a cada bloco, indo e voltando", async ({ page }) => {
    // Sem isto, quem usa leitor de tela clica em AVANÇAR e não ouve nada: o
    // foco fica no botão, que não mudou de nome, e a pessoa não sabe se
    // funcionou.
    await page.goto(ROTA);
    await botao(page, COPY.abertura.botao).click();
    await expect(campo(page, "nome")).toBeFocused();

    await preencherBloco0(page);
    await avancar(page);
    await expect(campo(page, "instituicao")).toBeFocused();

    await preencherBloco1(page);
    await avancar(page);
    // O primeiro campo do bloco de AI é um grupo de radio: quem leva o id do
    // campo é o primeiro degrau da escala.
    await expect(
      page.getByRole("radio", { name: NIVEIS_AI[0].rotulo, exact: true }),
    ).toBeFocused();

    await preencherBloco2(page);
    await avancar(page);
    await expect(
      page.getByRole("radio", { name: SITUACOES[0].rotulo, exact: true }),
    ).toBeFocused();

    await preencherBloco3(page);
    await avancar(page);
    // Como no bloco de AI, quem leva o id do campo é o primeiro radio do grupo.
    await expect(
      page.getByRole("radio", { name: DISPONIBILIDADES[0].rotulo, exact: true }),
    ).toBeFocused();

    // E na volta também: o VOLTAR não pode deixar o foco preso no botão.
    await voltar(page);
    await expect(
      page.getByRole("radio", { name: SITUACOES[0].rotulo, exact: true }),
    ).toBeFocused();
  });

  test("o campo-armadilha não está no caminho do Tab", async ({ page }) => {
    // Ele mora entre a seção e a navegação, no DOM. Se um dia perder o
    // `tabindex="-1"`, quem navega por teclado cai num campo invisível e sem
    // rótulo — e o honeypot passa a acusar gente de verdade.
    await abrirFormulario(page);
    await campo(page, "linkedin").focus();
    await page.keyboard.press("Tab");
    await expect(botao(page, NAV.voltar)).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(botao(page, NAV.avancar)).toBeFocused();

    const armadilhaFocada = await page.evaluate(
      (nome) => document.activeElement?.getAttribute("name") === nome,
      CAMPO_HONEYPOT,
    );
    expect(armadilhaFocada).toBe(false);
  });

  test("o percurso inteiro anda sem mouse nenhum", async ({ page }) => {
    const servidor = await fingirServidor(page, OK_NOVA_SEM_EMAIL);
    await page.goto(ROTA);

    // Abertura: DOIS alvos, nesta ordem. O logo vem primeiro porque está no
    // canto superior esquerdo, e a ordem de tabulação segue o DOM — que aqui
    // segue a leitura. Ele entrou em 04/09/2026 com o redesenho; antes disso o
    // COMEÇAR era a primeira parada.
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: COPY.abertura.voltarAoSite })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(botao(page, COPY.abertura.botao)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(campo(page, "nome")).toBeFocused();

    /* Bloco 1 — quem é você */
    await page.keyboard.type(PESSOA.nome);
    await page.keyboard.press("Tab");
    await page.keyboard.type(PESSOA.email);
    await page.keyboard.press("Tab");
    await page.keyboard.type(PESSOA.whatsapp);
    await page.keyboard.press("Tab");
    await page.keyboard.type(PESSOA.idade);
    await page.keyboard.press("Tab");
    await escolherComSeta(page, campo(page, "estado"), 1);
    await page.keyboard.press("Tab");
    await page.keyboard.type(PESSOA.cidade);
    // O LinkedIn é opcional; passar direto por ele faz parte do percurso.
    await irAoAvancarPeloTeclado(page, 3);

    /* Bloco 2 — universidade */
    await escolherComSeta(page, campo(page, "instituicao"), 3);
    await page.keyboard.press("Tab");
    // Enter com a lista fechada é do formulário; com a lista aberta, escolhe.
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(campoCurso(page)).toHaveValue(CURSOS[0].rotulo);
    await page.keyboard.press("Tab");
    await escolherComSeta(page, campo(page, "ano_atual"), 2);
    await page.keyboard.press("Tab");
    await escolherComSeta(page, campo(page, "conclusao_prevista"), 3);
    // Depois da conclusão vem o repeater (uma linha vazia, sem `+` e sem `×`).
    await irAoAvancarPeloTeclado(page, 3);

    /* Bloco 3 — AI */
    await page.keyboard.press("Space"); // o primeiro degrau da escala
    await expect(page.getByRole("radio", { name: NIVEIS_AI[0].rotulo, exact: true })).toBeChecked();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Space"); // a primeira ferramenta
    // Cada caixa é uma parada de Tab própria; atravessar as doze é o percurso
    // real de quem não usa mouse.
    for (let i = 0; i < FERRAMENTAS_AI.length; i++) await page.keyboard.press("Tab");
    await escolherRadioComSeta(page, "ai_estudos", 2);
    await irAoAvancarPeloTeclado(page, 3);

    /* Bloco 4 — trabalho */
    await escolherRadioComSeta(page, "situacao", 0); // Só estudo
    await page.keyboard.press("Tab");
    // A pergunta de AI está aqui mesmo para quem só estuda, e é uma parada de
    // Tab a mais do que era antes de 21/08/2026.
    await escolherRadioComSeta(page, "ai_trabalho", 0); // Não uso
    await page.keyboard.press("Tab");
    await page.keyboard.press("Space");
    await irAoAvancarPeloTeclado(page, 2);

    /* Bloco 5 — a trilha */
    await escolherRadioComSeta(page, "disponibilidade", 3);
    await page.keyboard.press("Tab");
    await escolherComSeta(page, campo(page, "origem"), 2); // sem condicional
    await expect(campo(page, "origem_quem_indicou")).toHaveCount(0);
    // Depois da origem vêm os dois textos livres (atravessados sem escrever: os
    // dois são opcionais) e o VOLTAR — quatro paradas até o AVANÇAR.
    await irAoAvancarPeloTeclado(page, 4);

    /* Bloco 6 — indicações. Seis caixas (três pares) atravessadas em branco:
       indicar é recomendado, e quem não indica precisa chegar ao ENVIAR pelo
       teclado como qualquer outro. */
    for (let i = 0; i < 6; i++) await page.keyboard.press("Tab");
    await page.keyboard.press("Space"); // o aceite
    await expect(page.getByRole("checkbox", { name: COPY.aceite.rotulo, exact: true })).toBeChecked();

    // O VOLTAR e depois o ENVIAR.
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(page.locator('form button[type="submit"]')).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(page.locator('[data-tela="confirmacao"]')).toBeVisible();
    expect(servidor.envios).toHaveLength(1);
  });
});

/**
 * Escolhe num campo de lista já focado, sem tocar no mouse, e confere que a
 * escolha pegou.
 *
 * **O gesto mudou em 01/09/2026, com o fim do `<select>` nativo.** Antes o
 * `<select>` andava na lista FECHADA: cada `ArrowDown` trocava o valor na hora.
 * Agora o primeiro `ArrowDown` ABRE a lista, os seguintes movem o realce dentro
 * dela, e o `Enter` é quem confirma — o padrão de listbox, e o mesmo que o
 * `ComboboxCurso` desta página já usava.
 *
 * Isto não é o teste sendo afrouxado para passar: a asserção final continua
 * sendo "o campo saiu do vazio", que é o que o comentário antigo aqui protegia
 * ("um ArrowDown que abrisse a roda do sistema deixaria o campo vazio e o teste
 * seguiria adiante sem notar"). Ela só passou a valer depois do `Enter`, porque
 * é ali que a escolha se torna escolha.
 */
async function escolherComSeta(page: Page, alvo: Locator, passos: number): Promise<void> {
  await expect(alvo).toBeFocused();

  // Abre a lista. O realce nasce na opção atual, ou na primeira quando ainda
  // não há escolha.
  await page.keyboard.press("ArrowDown");
  await expect(alvo).toHaveAttribute("aria-expanded", "true");

  // Qual opção os `passos` alcançam, lido da lista ABERTA. Sem isto o teste só
  // afirmava "saiu do vazio", e a mudança de gesto (o 1º `ArrowDown` passou a
  // ABRIR em vez de andar) deslocou a escolha em um sem que nada notasse.
  const rotulos = await page.locator(`#${await alvo.getAttribute("id")}-lista li`).allInnerTexts();
  const esperado = rotulos[Math.min(passos, rotulos.length - 1)].trim();

  for (let i = 0; i < passos; i++) await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");

  // O campo mostra EXATAMENTE a opção que os passos alcançaram. `toHaveValue`
  // não serve mais: o controle é um `<button>`, e o que ele mostra é o rótulo.
  await expect(alvo).toHaveText(esperado);
  // E a lista fechou: um listbox preso aberto engoliria os Tab seguintes e
  // faria o resto do percurso falhar longe da causa.
  await expect(alvo).toHaveAttribute("aria-expanded", "false");
}

/**
 * O mesmo, num grupo de radio já focado.
 *
 * Duas diferenças em relação ao `<select>`, e as duas importam aqui: a seta num
 * grupo de radio **já marca** o que alcança, e o grupo inteiro é uma parada de
 * Tab só — entrar e sair custa um Tab cada, igual a um campo comum. É isso que
 * mantém as contagens de `saltos` válidas depois da troca dos selects curtos
 * por botões expostos.
 */
async function escolherRadioComSeta(
  page: Page,
  nome: keyof typeof COPY.campos,
  passos: number,
): Promise<void> {
  await expect(grupoDe(page, nome).locator('input[type="radio"]').first()).toBeFocused();
  // `passos` conta degraus a partir do primeiro. Zero é o próprio primeiro, e
  // ali quem marca é o Espaço — a seta andaria para o degrau seguinte.
  if (passos === 0) await page.keyboard.press("Space");
  else for (let i = 0; i < passos; i++) await page.keyboard.press("ArrowDown");
  await expect(grupoDe(page, nome).locator("input:checked")).toHaveCount(1);
}

/** Tabula até o AVANÇAR e o aciona. `saltos` conta os campos que faltam. */
async function irAoAvancarPeloTeclado(page: Page, saltos: number): Promise<void> {
  for (let i = 0; i < saltos; i++) await page.keyboard.press("Tab");
  const primario = page.locator('form button[type="submit"]');
  await expect(primario).toBeFocused();
  await page.keyboard.press("Enter");
}

/* ══ A rota: descoberta e segredo ═════════════════════════════════════════ */

test.describe("a rota", () => {
  test("declara noindex, nofollow", async ({ page }) => {
    // A página existe para quem recebe o link a dedo (spec §11). O `<meta>` é
    // medido no HTML entregue, e não no objeto `metadata` — é o HTML que o
    // robô lê.
    await page.goto(ROTA);
    const robots = page.locator('meta[name="robots"]');
    await expect(robots).toHaveAttribute("content", /noindex/);
    await expect(robots).toHaveAttribute("content", /nofollow/);
    await expect(page).toHaveTitle(COPY.tituloAba);
  });

  test("nenhuma chave de servidor chega ao navegador", async ({ page }) => {
    /**
     * A regra dura da §6.2: o navegador fala com `POST /trilha/inscricao/api` e
     * com mais nada. A `service_role key` do Supabase ignora RLS, e a tabela do
     * outro lado guarda nome, telefone e idade de estudantes — alguns menores.
     *
     * Medir o HTML sozinho não bastaria: um `NEXT_PUBLIC_` acidental sai no
     * bundle, não no HTML. Por isso todo `.js` que a página busca é lido de
     * volta e varrido junto. `eyJ` é o começo de todo JWT em base64 — é assim
     * que uma chave do Supabase se parece antes de alguém reparar nela.
     */
    const scripts = new Set<string>();
    page.on("response", (resposta) => {
      const url = resposta.url();
      if (url.endsWith(".js") || url.includes(".js?")) scripts.add(url);
    });

    await page.goto(ROTA);
    await botao(page, COPY.abertura.botao).click();
    await expect(page.locator("[data-bloco]")).toBeVisible();

    const proibidas = ["service_role", "SUPABASE_SERVICE_ROLE_KEY", "IP_SALT", "eyJ"];
    const achados: string[] = [];

    const html = await page.content();
    for (const chave of proibidas) if (html.includes(chave)) achados.push(`HTML: ${chave}`);

    expect(
      scripts.size,
      "nenhum bundle foi observado — o varredor não varreu nada",
    ).toBeGreaterThan(0);

    for (const url of scripts) {
      const corpo = await (await page.request.get(url)).text();
      for (const chave of proibidas) {
        if (corpo.includes(chave)) achados.push(`${url}: ${chave}`);
      }
    }

    expect(achados).toEqual([]);
  });

  test("o handler de verdade existe e cumpre o contrato que esta suíte finge", async ({
    request,
  }) => {
    /**
     * O único teste do arquivo que **não** intercepta nada.
     *
     * Todos os outros fingem o `POST` — e um percurso inteiro verde contra um
     * `page.route` continuaria verde com a rota apagada do projeto. Este aqui
     * bate na URL real e cobra as duas respostas que não dependem de o Supabase
     * existir: elas acontecem **antes** de o handler tocar no banco (§8 e §12),
     * então valem tanto hoje quanto depois de as chaves entrarem na Vercel.
     */

    // Corpo vazio: recusa com os erros da fundação — os mesmos, campo a campo,
    // que o navegador mostraria. É esta igualdade que prova a regra de ouro da
    // §12: uma validação só, rodando dos dois lados.
    const vazio = await request.post("/trilha/inscricao/api", { data: {} });
    expect(vazio.status()).toBe(400);
    const recusa: unknown = await vazio.json();
    expect(recusa).toEqual({ ok: false, erros: validarInscricao({}).erros });

    // Campo-armadilha preenchido: sucesso de mentira, e nada gravado. O robô
    // precisa acreditar que funcionou — uma recusa explícita ensinaria o autor
    // dele a tirar o campo.
    const robo = await request.post("/trilha/inscricao/api", {
      data: { [CAMPO_HONEYPOT]: "Almeida" },
    });
    expect(robo.status()).toBe(200);
    expect(await robo.json()).toMatchObject({ ok: true, atualizada: false });
  });
});

/* ══ As inscrições encerradas ═════════════════════════════════════════════ */

/**
 * A única tela desta página que **não** dá para exercitar no servidor da suíte.
 *
 * Quem decide entre o formulário e o "encerradas" é o servidor, em
 * `app/trilha/inscricao/page.tsx`, lendo `inscricoesAbertas()` — que consulta a
 * tabela `config` do Supabase (spec §9.4). Sem banco configurado o padrão é
 * `true`, de propósito: um banco fora do ar não pode fechar as inscrições
 * sozinho. Não existe interruptor de cliente para virar, e não existe rota de
 * rede para interceptar: a decisão já veio pronta dentro do HTML.
 *
 * A saída sem tocar em código de produção é subir **um segundo servidor** do
 * mesmo build, apontando `SUPABASE_URL` para um Supabase de mentira que responde
 * `inscricoes_abertas: false`. É o caminho de verdade — `page.tsx` chama
 * `inscricoesAbertas()`, que chama `repositorioSupabase()`, que faz o `GET` em
 * `/rest/v1/config` — só que contra um `http.createServer` de dez linhas.
 *
 * O build já existe quando este arquivo roda: `playwright.config.ts` faz
 * `npm run build && npm run start` antes de qualquer teste, então o
 * `next start` daqui reaproveita o `.next` e sobe em segundos.
 */
test.describe("as inscrições encerradas", () => {
  const PORTA_SUPABASE_FALSO = 3987;
  const PORTA_APP = 3988;
  const ENDERECO = `http://127.0.0.1:${PORTA_APP}${ROTA}`;

  let supabaseFalso: Server;
  let app: ChildProcess;

  test.beforeAll(async () => {
    test.setTimeout(180_000);

    supabaseFalso = createServer((requisicao, resposta) => {
      resposta.setHeader("content-type", "application/json");
      if ((requisicao.url ?? "").startsWith("/rest/v1/config")) {
        resposta.end(JSON.stringify([{ inscricoes_abertas: false }]));
        return;
      }
      resposta.statusCode = 404;
      resposta.end("[]");
    });
    await new Promise<void>((pronto) =>
      supabaseFalso.listen(PORTA_SUPABASE_FALSO, "127.0.0.1", pronto),
    );

    // `process.execPath` e o binário do Next direto, sem `npm` e sem shell: um
    // processo só, que dá para matar pelo pid no `afterAll`.
    app = spawn(
      process.execPath,
      ["node_modules/next/dist/bin/next", "start", "-p", String(PORTA_APP)],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          SUPABASE_URL: `http://127.0.0.1:${PORTA_SUPABASE_FALSO}`,
          // Valor de mentira, e que não se parece com uma chave: este servidor
          // só fala com o `createServer` acima.
          SUPABASE_SERVICE_ROLE_KEY: "chave-de-mentira-do-teste",
          /*
           * O CRM, desligado à força — e não por descuido de quem escreveu isto.
           *
           * `repositorioConfigurado()` escolhe o CRM **antes** do Supabase
           * sempre que `CRM_INTEREST_URL` existe. Quem trabalha nesta página tem
           * essa variável no `.env.local`, o `next start` a carrega, e então o
           * servidor de mentira aqui em cima nunca é consultado: o CRM de
           * verdade responde "abertas" e o teste falha dizendo que a tela de
           * encerrado não apareceu — sem uma linha sobre o porquê. No CI passa,
           * porque lá não existe `.env.local`; falha só na máquina de quem
           * mexeu, que é o pior lugar para um teste mentir.
           *
           * String vazia e não `delete`: o `next start` recarrega os `.env` e
           * repõe o que estiver **ausente** do ambiente. Vazio já está presente,
           * e `ambienteCrm()` trata vazio como não configurado.
           */
          CRM_INTEREST_URL: "",
          CRM_INTEREST_FORM_TOKEN: "",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    // A saída do processo é guardada só para a mensagem de erro: um
    // `next start` que morre por porta ocupada falharia aqui como "não subiu",
    // sem dizer por quê, e a próxima pessoa perderia meia hora.
    let saida = "";
    app.stdout?.on("data", (pedaco: Buffer) => (saida += pedaco.toString()));
    app.stderr?.on("data", (pedaco: Buffer) => (saida += pedaco.toString()));

    await esperarNoAr(ENDERECO, () => saida);
  });

  test.afterAll(async () => {
    if (app?.pid !== undefined) {
      if (process.platform === "win32") {
        // `next start` pode ter filhos; no Windows só o `taskkill /T` os leva
        // junto, e um servidor esquecido na 3988 quebraria a próxima corrida.
        spawn("taskkill", ["/pid", String(app.pid), "/T", "/F"], { stdio: "ignore" });
      } else {
        app.kill("SIGTERM");
      }
    }
    await new Promise<void>((pronto) => supabaseFalso.close(() => pronto()));
  });

  test("mostra a tela de encerrado, e não o formulário", async ({ page }) => {
    await page.goto(ENDERECO);

    const tela = page.locator('[data-tela="encerrado"]');
    await expect(tela).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(COPY.encerrado.titulo);
    for (const linha of COPY.encerrado.linhas) {
      await expect(tela).toContainText(linha);
    }

    // Nada de formulário: nem um campo, nem o COMEÇAR. A decisão é do servidor
    // exatamente para que ninguém veja o formulário piscar antes de sumir.
    await expect(page.locator("[data-bloco]")).toHaveCount(0);
    await expect(botao(page, COPY.abertura.botao)).toHaveCount(0);
    await expect(page.getByRole("textbox")).toHaveCount(0);

    // Uma saída só, e é a tese.
    const saidas = tela.getByRole("link");
    await expect(saidas).toHaveCount(1);
    await expect(saidas).toHaveAttribute("href", COPY.confirmacao.tese.href);
  });

  test("continua fora do índice", async ({ page }) => {
    await page.goto(ENDERECO);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });
});

/** Bate na porta até o servidor responder, ou desiste com o motivo escrito. */
async function esperarNoAr(endereco: string, log: () => string): Promise<void> {
  const limite = Date.now() + 120_000;
  let ultimo = "";
  while (Date.now() < limite) {
    try {
      const resposta = await fetch(endereco);
      if (resposta.ok) return;
      ultimo = `status ${resposta.status}`;
    } catch (erro) {
      ultimo = erro instanceof Error ? erro.message : String(erro);
    }
    await new Promise((pronto) => setTimeout(pronto, 300));
  }
  throw new Error(`o servidor de ${endereco} não subiu: ${ultimo}\n${log()}`);
}
