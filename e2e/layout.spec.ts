import { test, expect, type Page } from "@playwright/test";
import {
  DURACAO_TOTAL_MAXIMA_MS,
  caracteres,
  duracaoApagamento,
  duracaoEscrita,
} from "../lib/abertura";

/**
 * Uma folga sobre o fim REAL da coreografia, importado de lib/abertura.ts em
 * vez de escrito à mão. Antes eram 2000ms literais espalhados pelo arquivo,
 * herdados do MotionD; a entrada de hoje termina em 4484ms (pt) e mexer numa
 * duração lá dentro empurra este número junto, sem ninguém precisar lembrar.
 *
 * Sim, isto deixa a suíte mais lenta: são ~4,8s por caso, contra ~2s antes.
 * É o preço de medir a página no estado em que o visitante a encontra.
 */
const DEPOIS_DA_ENTRADA = DURACAO_TOTAL_MAXIMA_MS + 300;

/**
 * A regra dura do projeto: a página nunca tem scroll, em nenhum viewport.
 *
 * A base é o roteiro da Task 9 (cinco viewports, dois testes cada), mas a
 * página cresceu desde que esse roteiro foi escrito:
 *
 *   - o oneliner em inglês tem um comprimento diferente do em português —
 *     então cada checagem de layout roda nos DOIS idiomas, semeando
 *     `localStorage["202:idioma"]` antes do primeiro carregamento;
 *   - a abertura (lib/abertura.ts + app/abertura.module.css) toca uma vez por
 *     sessão do navegador e é pulada num reload dentro da mesma sessão
 *     (`sessionStorage["202:motion"]`) — as asserções de "sem scroll" valem
 *     nos dois estados, não só durante a animação.
 *
 * Isso multiplica os dois testes originais por 2 idiomas x 2 estados de
 * animação = 4, mantendo a intenção do roteiro original (linhas comentadas
 * abaixo de cada bloco apontam de volta para ele).
 */

const VIEWPORTS = [
  { nome: "desktop", width: 1440, height: 900 },
  { nome: "notebook baixo", width: 1366, height: 660 },
  { nome: "tablet", width: 820, height: 1180 },
  { nome: "celular", width: 390, height: 844 },
  { nome: "celular pequeno", width: 320, height: 568 },
];

const IDIOMAS = ["pt", "en"] as const;

const SELETORES_CANTOS = ["[data-logo]", ".oneliner", ".contato"];

/** Semeia o idioma ANTES de qualquer script da página rodar — precisa
 *  existir já na primeira leitura de localStorage em app/page.tsx. */
async function semearIdioma(page: Page, idioma: string) {
  await page.addInitScript((valor) => {
    window.localStorage.setItem("202:idioma", valor);
  }, idioma);
}

/**
 * Duas medidas, porque uma só não denuncia nada.
 *
 * `document.documentElement.scrollHeight/scrollWidth` NÃO servem para esta
 * regra. Com `html, body { overflow: hidden }` em globals.css o overflow do
 * elemento raiz é propagado para a viewport, e o scrollHeight/scrollWidth do
 * documentElement passa a ser sempre igual ao clientHeight/clientWidth —
 * aconteça o que acontecer com o conteúdo. A revisão final provou isso com
 * três mutações reais (logo gigante, `.palco` sem `overflow:hidden`, `.tela`
 * com 1400px de altura): nenhuma delas fez essa comparação falhar uma única
 * vez. Vinte testes "não tem scroll" estavam guardando a própria guarda.
 *
 * O que de fato morde:
 *
 *   1. `document.body.scrollHeight/scrollWidth` — o body é quem recorta, e um
 *      elemento que recorta continua reportando a extensão REAL do conteúdo.
 *      Nas mesmas três mutações ele mediu 1552 / 2060 / 1400. Isto pega
 *      estouro de conteúdo mesmo quando o `overflow:hidden` o está escondendo.
 *   2. tentar rolar de verdade — `scrollTo` no canto e ler `scrollX/scrollY`.
 *      Isto pega o caso oposto: alguém remove o `html, body {overflow:hidden}`
 *      e a página vira rolável. Volta ao topo logo em seguida para não deixar
 *      o documento deslocado para as asserções seguintes.
 */
async function medirDocumento(page: Page) {
  return page.evaluate(() => {
    window.scrollTo(9999, 9999);
    const rolou = { x: window.scrollX, y: window.scrollY };
    window.scrollTo(0, 0);

    return {
      scrollH: document.body.scrollHeight,
      clientH: document.documentElement.clientHeight,
      scrollW: document.body.scrollWidth,
      clientW: document.documentElement.clientWidth,
      rolou,
    };
  });
}

function esperaSemScroll(medidas: Awaited<ReturnType<typeof medirDocumento>>) {
  expect(medidas.scrollH, "conteúdo mais alto que a viewport").toBeLessThanOrEqual(
    medidas.clientH + 1,
  );
  expect(medidas.scrollW, "conteúdo mais largo que a viewport").toBeLessThanOrEqual(
    medidas.clientW + 1,
  );
  expect(medidas.rolou, "o documento rolou de verdade").toEqual({ x: 0, y: 0 });
}

async function esperaNadaCortado(page: Page, width: number, height: number) {
  for (const seletor of SELETORES_CANTOS) {
    const caixa = await page.locator(seletor).boundingBox();
    expect(caixa, `${seletor} não foi encontrado`).not.toBeNull();
    expect(caixa!.x).toBeGreaterThanOrEqual(-1);
    expect(caixa!.y).toBeGreaterThanOrEqual(-1);
    expect(caixa!.x + caixa!.width).toBeLessThanOrEqual(width + 1);
    expect(caixa!.y + caixa!.height).toBeLessThanOrEqual(height + 1);
  }
}

for (const vp of VIEWPORTS) {
  for (const idioma of IDIOMAS) {
    test.describe(`${vp.nome} (${vp.width}x${vp.height}) — ${idioma}`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await semearIdioma(page, idioma);
      });

      // Original (Task 9): "não tem scroll em ${vp.nome}". Naquele roteiro a
      // espera era só o suficiente para a animação de 2000ms do MotionD
      // terminar, e o nome do teste dizia "durante a entrada" porque a
      // medição realmente acontecia nesse meio-tempo. A entrada de hoje dura
      // mais e tem uma duração real vinda de lib/abertura.ts — a espera sobe
      // para DEPOIS_DA_ENTRADA, e a medição some para depois do fim de
      // verdade. Não há mais "durante" nenhum aqui: ver §5c do design de
      // 31/07/2026 sobre por que medir de propósito durante a entrada
      // reintroduziria o artefato de scrollWidth ali documentado.
      test("não tem scroll com a entrada terminada", async ({ page }) => {
        await page.goto("/");
        await page.waitForTimeout(DEPOIS_DA_ENTRADA); // deixa a entrada terminar
        esperaSemScroll(await medirDocumento(page));
      });

      // Estado que o roteiro original não cobria: reload na mesma sessão
      // pula a coreografia (data-abertura="estatica" direto — o MotionD que
      // tinha data-estatico está arquivado), e o layout final precisa ser
      // igualmente livre de scroll.
      test("não tem scroll após reload (animação pulada)", async ({ page }) => {
        await page.goto("/");
        await page.waitForTimeout(DEPOIS_DA_ENTRADA);
        await page.reload();
        await page.waitForTimeout(300);
        esperaSemScroll(await medirDocumento(page));
      });

      // Original (Task 9): "nada é cortado em ${vp.nome}". Mesma nota do
      // teste acima — a espera foi para DEPOIS_DA_ENTRADA, então isto mede o
      // layout final, não mais um instante "durante" a animação.
      test("nada é cortado com a entrada terminada", async ({ page }) => {
        await page.goto("/");
        await page.waitForTimeout(DEPOIS_DA_ENTRADA);
        await esperaNadaCortado(page, vp.width, vp.height);
      });

      test("nada é cortado após reload (animação pulada)", async ({ page }) => {
        await page.goto("/");
        await page.waitForTimeout(DEPOIS_DA_ENTRADA);
        await page.reload();
        await page.waitForTimeout(300);
        await esperaNadaCortado(page, vp.width, vp.height);
      });
    });
  }
}

/** Onde a luz está e quanto ela cresceu, direto das variáveis CSS.
 *  Fora de qualquer describe: também é usada pelo teste de "mexer o mouse
 *  durante a entrada", que precisa do seu próprio goto/beforeEach e por isso
 *  não pode viver dentro de `test.describe("o ímã da lanterna", ...)`. */
async function luz(page: Page) {
  return page.evaluate(() => {
    const el = document.querySelector("[data-lanterna]") as HTMLElement;
    return {
      x: parseFloat(el.style.getPropertyValue("--lanterna-x")),
      y: parseFloat(el.style.getPropertyValue("--lanterna-y")),
      escala: parseFloat(el.style.getPropertyValue("--escala-lanterna")),
    };
  });
}

/**
 * Centro do alvo em coordenadas da lanterna — que são as da caixa do
 * elemento `[data-lanterna]`, não as da viewport. Na página real as duas
 * coincidem, mas a conta fica explícita para o teste não passar por sorte.
 */
async function centro(page: Page, seletor: string) {
  const alvo = (await page.locator(seletor).boundingBox())!;
  const caixa = (await page.locator("[data-lanterna]").boundingBox())!;
  return {
    x: alvo.x + alvo.width / 2 - caixa.x,
    y: alvo.y + alvo.height / 2 - caixa.y,
    pagina: { x: alvo.x + alvo.width / 2, y: alvo.y + alvo.height / 2 },
  };
}

/**
 * O ímã da lanterna (Task 11). A física em si é testada sem navegador em
 * lib/usaLanterna.test.ts; o que só um navegador de verdade prova é o resto:
 * que os retângulos medidos são os certos, que a luz encosta no centro do
 * alvo, e — o que mais importa — que marcar um elemento com `data-ima` não
 * roubou dele o clique nem o foco.
 */
test.describe("o ímã da lanterna", () => {
  const ALVOS = [
    { nome: "CONTATO", seletor: ".contato" },
    { nome: "seletor de idioma", seletor: "[data-ima='idioma']" },
    { nome: "oneliner", seletor: ".oneliner" },
  ];

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.waitForTimeout(DEPOIS_DA_ENTRADA); // a entrada termina em DURACAO_TOTAL_MAXIMA_MS
  });

  for (const alvo of ALVOS) {
    test(`gruda no ${alvo.nome}: vai ao centro e cresce 2x`, async ({ page }) => {
      const c = await centro(page, alvo.seletor);
      await page.mouse.move(c.pagina.x, c.pagina.y, { steps: 20 });
      await page.waitForTimeout(500);

      const depois = await luz(page);
      expect(Math.abs(depois.x - c.x)).toBeLessThan(2);
      expect(Math.abs(depois.y - c.y)).toBeLessThan(2);
      expect(depois.escala).toBeGreaterThan(1.9);
    });
  }

  test("mexer o cursor dentro do alvo não solta a luz", async ({ page }) => {
    const c = await centro(page, ".contato");
    await page.mouse.move(c.pagina.x, c.pagina.y, { steps: 20 });
    await page.waitForTimeout(500);

    for (const [dx, dy] of [[10, 4], [-12, -5], [8, -6]]) {
      await page.mouse.move(c.pagina.x + dx, c.pagina.y + dy);
      await page.waitForTimeout(120);
      const depois = await luz(page);
      expect(depois.escala).toBeGreaterThan(1.9);
      expect(Math.abs(depois.x - c.x)).toBeLessThan(2);
      expect(Math.abs(depois.y - c.y)).toBeLessThan(2);
    }
  });

  test("puxar o cursor para longe solta a luz e devolve o raio", async ({ page }) => {
    const c = await centro(page, ".contato");
    await page.mouse.move(c.pagina.x, c.pagina.y, { steps: 20 });
    await page.waitForTimeout(500);
    expect((await luz(page)).escala).toBeGreaterThan(1.9);

    // Puxada de verdade: passos pequenos, como uma mão, não um teleporte.
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(c.pagina.x - i * 40, c.pagina.y + i * 30);
      await page.waitForTimeout(30);
    }
    await page.waitForTimeout(700);

    const depois = await luz(page);
    expect(depois.escala).toBeLessThan(1.05);
    expect(Math.hypot(depois.x - c.x, depois.y - c.y)).toBeGreaterThan(100);
  });

  test("com o ímã ativo o botão EN continua clicável", async ({ page }) => {
    const c = await centro(page, "[data-ima='idioma']");
    await page.mouse.move(c.pagina.x, c.pagina.y, { steps: 20 });
    await page.waitForTimeout(400);
    expect((await luz(page)).escala).toBeGreaterThan(1.9);

    // O clique é dado com a luz grudada em cima do seletor: se o ímã tivesse
    // trazido junto qualquer coisa que recebe ponteiro, ele morreria aqui.
    await page.getByRole("button", { name: "EN" }).click();
    await expect(page.getByText("We amplify talent.")).toBeVisible();
  });

  test("com o ímã ativo o CONTATO continua focável pelo teclado", async ({ page }) => {
    const c = await centro(page, ".contato");
    await page.mouse.move(c.pagina.x, c.pagina.y, { steps: 20 });
    await page.waitForTimeout(400);
    expect((await luz(page)).escala).toBeGreaterThan(1.9);

    const contato = page.locator(".contato");
    for (let i = 0; i < 4 && !(await contato.evaluate((el) => el === document.activeElement)); i++) {
      await page.keyboard.press("Tab");
    }

    await expect(contato).toBeFocused();
    const anel = await contato.evaluate((el) => {
      const s = getComputedStyle(el);
      return { cor: s.outlineColor, estilo: s.outlineStyle, largura: s.outlineWidth };
    });
    expect(anel.cor).toBe("rgb(198, 255, 62)"); // --verde-sinal
    expect(anel.estilo).toBe("solid");
    expect(anel.largura).toBe("1px");
  });

  test("a troca de idioma remede o oneliner e o ímã acerta a caixa nova", async ({ page }) => {
    // O oneliner tem larguras diferentes em PT e EN. Se a medição ficasse
    // presa na de montagem, a luz grudaria no centro errado depois da troca.
    await page.getByRole("button", { name: "EN" }).click();
    await expect(page.getByText("We amplify talent.")).toBeVisible();
    await page.waitForTimeout(200);

    const c = await centro(page, ".oneliner");
    await page.mouse.move(c.pagina.x, c.pagina.y, { steps: 20 });
    await page.waitForTimeout(500);

    const depois = await luz(page);
    expect(Math.abs(depois.x - c.x)).toBeLessThan(2);
    expect(depois.escala).toBeGreaterThan(1.9);
    esperaSemScroll(await medirDocumento(page));
  });
});

/**
 * Finding 2 do review final (2026-08-02): a entrada transladada
 * `[data-ima="idioma"]` e `[data-ima="contato"]` para fora da tela e os traz
 * de volta — um movimento que ResizeObserver não vê (ele reporta TAMANHO;
 * `translateX` não muda tamanho nenhum) e que `getBoundingClientRect` mede
 * incluindo transform. Se o visitante mexe o mouse a qualquer momento antes
 * do fim da entrada, o primeiro quadro do laço da lanterna consome o
 * `precisaMedir` que o ResizeObserver da montagem já tinha marcado, e mede os
 * dois alvos AINDA deslocados — e, sem mais ninguém marcando `precisaMedir`
 * de novo, essa medição errada fica congelada pelo resto da visita. Este
 * teste faz exatamente esse gesto (mover o mouse durante a entrada, sem
 * esperar ela terminar antes) e prova que o ímã ainda funciona bem depois.
 * Deste teste NÃO faz parte medir durante a entrada — só o gesto que
 * quebrava a medição, com a asserção bem depois do fim real.
 */
test.describe("o ímã sobrevive a mexer o mouse durante a entrada", () => {
  test("depois de mexer o mouse na entrada, o ímã do CONTATO ainda gruda no centro certo", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    // O gesto que congelava a medição antes da correção: mexer o mouse
    // enquanto [data-ima='contato'] ainda está translatado para fora da
    // tela — a entrada só termina em DURACAO_TOTAL_MAXIMA_MS.
    await page.mouse.move(200, 120, { steps: 5 });
    await page.waitForTimeout(300);
    await page.mouse.move(600, 500, { steps: 10 });

    // Bem depois do fim real da coreografia — inclusive depois do resize
    // sintético que reafirma a medição (ver o useEffect em app/page.tsx).
    await page.waitForTimeout(DEPOIS_DA_ENTRADA);

    const c = await centro(page, "[data-ima='contato']");
    await page.mouse.move(c.pagina.x, c.pagina.y, { steps: 20 });
    await page.waitForTimeout(500);

    const depois = await luz(page);
    expect(Math.abs(depois.x - c.x)).toBeLessThan(2);
    expect(Math.abs(depois.y - c.y)).toBeLessThan(2);
    expect(depois.escala).toBeGreaterThan(1.9);
  });
});

test.describe("com animações reduzidas", () => {
  // `reducedMotion` não é uma option "achatada" em PlaywrightTestOptions
  // nesta versão (@playwright/test 1.62) — só colorScheme, viewport etc.
  // viram fixtures próprias; o resto (reducedMotion, contrast, forcedColors,
  // screen) só é aceito dentro de `contextOptions`, como o próprio .d.ts
  // documenta. Runtime idêntico a `{ reducedMotion: "reduce" }`.
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("a logo já aparece montada e visível", async ({ page }) => {
    await page.goto("/");
    const logo = page.locator("[data-logo]");
    await expect(logo).toBeVisible();
    await expect(page.locator("[data-ponto]")).toBeVisible();
    expect(await logo.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
  });
});

/**
 * O que o VISITANTE enxerga do fundo — e não o que está no backing store.
 *
 * `getImageData` lê o bitmap do canvas. Ele continua cheio de trama mesmo se
 * o `.fundo` voltar ao `clip-path: circle(0%)` de repouso (que é o estado
 * PADRÃO desta folha — basta a animação não rodar), ganhar `opacity: 0` ou for
 * soterrado no z-index: os testes ficariam verdes com a página preta. Estas
 * propriedades são o que decide se aquele bitmap chega aos olhos de alguém.
 *
 * O `.fundo` é alcançado pelo pai de `[data-lanterna]`, e não pela classe: ela
 * é um CSS Module com hash e mudaria a cada build.
 */
async function visibilidadeDoFundo(page: Page) {
  return page.evaluate(() => {
    const fundo = document.querySelector("[data-lanterna]")!.parentElement!;
    const canvas = document.querySelector("[data-lanterna] canvas") as HTMLElement;
    const sf = getComputedStyle(fundo);
    const sc = getComputedStyle(canvas);
    return {
      clipPath: sf.clipPath,
      opacity: sf.opacity,
      visibility: sf.visibility,
      display: sf.display,
      opacidadeCanvas: sc.opacity,
      visibilidadeCanvas: sc.visibility,
      displayCanvas: sc.display,
    };
  });
}

/**
 * `none` (modo estático e movimento reduzido) ou o círculo aberto do fim da
 * entrada (`circle(150% ...)`). O que este predicado existe para reprovar é o
 * `circle(0% at 50% 50%)` do estado de repouso — qualquer outra forma cai como
 * desconhecida de propósito, para ninguém trocar o recorte sem revisar isto.
 */
function clipPathCobreTudo(valor: string): boolean {
  if (valor === "none" || valor === "") return true;
  const m = /^circle\(\s*([\d.]+)%/.exec(valor);
  return m ? Number(m[1]) >= 100 : false;
}

function esperaFundoVisivel(v: Awaited<ReturnType<typeof visibilidadeDoFundo>>) {
  expect(v.visibility, "o fundo não está visível").toBe("visible");
  expect(v.displayCanvas, "o canvas não é renderizado").not.toBe("none");
  expect(v.visibilidadeCanvas, "o canvas não está visível").toBe("visible");
  expect(v.display, "o fundo não é renderizado").not.toBe("none");
  expect(Number(v.opacity), "o fundo está transparente").toBeGreaterThan(0.99);
  expect(Number(v.opacidadeCanvas), "o canvas está transparente").toBeGreaterThan(0.99);
  expect(
    clipPathCobreTudo(v.clipPath),
    `o fundo está recortado e não chega à tela: clip-path = ${v.clipPath}`,
  ).toBe(true);
}

/**
 * Um número que muda se QUALQUER pixel da trama mudar.
 *
 * FNV-1a sobre os bytes, calculado dentro da página: trazer o ImageData
 * inteiro para o Node seriam megabytes por leitura, e o que interessa aqui é
 * só "é o mesmo quadro ou não".
 */
async function assinaturaDaTrama(page: Page) {
  return page.locator("[data-lanterna] canvas").evaluate((el: HTMLCanvasElement) => {
    const ctx = el.getContext("2d")!;
    const d = ctx.getImageData(0, 0, el.width, Math.min(200, el.height)).data;
    let h = 2166136261;
    for (let i = 0; i < d.length; i++) {
      h ^= d[i];
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  });
}

/** O verde mais claro da faixa de cima: separa "textura" de "fundo liso". */
async function claroDaTrama(page: Page) {
  return page.locator("[data-lanterna] canvas").evaluate((el: HTMLCanvasElement) => {
    const ctx = el.getContext("2d")!;
    const d = ctx.getImageData(0, 0, el.width, Math.min(200, el.height)).data;
    let maximo = 0;
    for (let i = 0; i < d.length; i += 4) maximo = Math.max(maximo, d[i + 1]);
    return maximo;
  });
}

test.describe("a malha viva", () => {
  test("cobre a viewport e não deixa coordenada para trás", async ({ page }) => {
    await page.goto("/");
    const canvas = page.locator("[data-lanterna] canvas");
    await expect(canvas).toHaveCount(1);

    const caixa = await canvas.boundingBox();
    const viewport = page.viewportSize()!;
    expect(caixa!.width).toBeGreaterThanOrEqual(viewport.width - 1);
    expect(caixa!.height).toBeGreaterThanOrEqual(viewport.height - 1);

    await expect(page.getByText(/23°12'37"S/)).toHaveCount(0);
    await expect(page.getByText(/SÃO JOSÉ DOS CAMPOS/)).toHaveCount(0);
  });

  test("a trama é visível antes de qualquer movimento de mouse", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(DEPOIS_DA_ENTRADA); // a entrada termina em DURACAO_TOTAL_MAXIMA_MS

    // Duas afirmações diferentes, e as duas são necessárias:
    // 1. o bitmap tem trama (getImageData);
    // 2. o bitmap chega à tela (clip-path, opacity, visibility).
    // Sozinha, a primeira passaria com a página inteira preta.
    expect(await claroDaTrama(page)).toBeGreaterThan(8);
    esperaFundoVisivel(await visibilidadeDoFundo(page));
  });

  test("a trama cintila sozinha: dois quadros a 300ms são diferentes", async ({ page }) => {
    // Contraparte decisiva do teste de movimento reduzido logo abaixo. Sem
    // este par, aquele teste passaria com a cintilação ligada — o corpo dele
    // era igual ao deste, e nenhum dos dois olhava para o que os separa.
    await page.goto("/");
    await page.waitForTimeout(DEPOIS_DA_ENTRADA);

    const antes = await assinaturaDaTrama(page);
    await page.waitForTimeout(300); // sem tocar no mouse
    const depois = await assinaturaDaTrama(page);

    expect(depois, "a malha não respirou em 300ms").not.toBe(antes);
  });
});

test.describe("com movimento reduzido", () => {
  // `reducedMotion` "achatado" (fora de `contextOptions`) não é uma fixture
  // reconhecida nesta versão (@playwright/test 1.62) — vira uma chave morta,
  // sem efeito nenhum no contexto real, e o teste passaria mesmo com a
  // preferência nunca tendo sido ligada (falsa segurança). A forma que
  // realmente funciona é a mesma já usada acima, em "com animações
  // reduzidas": `contextOptions: { reducedMotion: "reduce" }`. Não
  // "simplificar" de volta para a forma achatada.
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("a trama continua visível e nada quebra", async ({ page }) => {
    const erros: string[] = [];
    page.on("pageerror", (e) => erros.push(e.message));

    await page.goto("/");
    await page.waitForTimeout(500); // sem animação de entrada, não há o que esperar

    // Prova de que a preferência realmente está ligada nesta página — sem
    // isso, o teste abaixo poderia passar mesmo com o modo reduzido nunca
    // tendo sido ativado, e não provaria nada sobre o comportamento reduzido.
    const reduzidoDeVerdade = await page.evaluate(
      () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    expect(reduzidoDeVerdade).toBe(true);

    const canvas = page.locator("[data-lanterna] canvas");
    await expect(canvas).toHaveCount(1);

    expect(await claroDaTrama(page)).toBeGreaterThan(8);
    esperaFundoVisivel(await visibilidadeDoFundo(page));
    expect(erros).toEqual([]);
  });

  test("a trama fica PARADA: dois quadros a 300ms são idênticos", async ({ page }) => {
    // Esta é a asserção que decide. Até aqui o corpo deste bloco era igual ao
    // do teste sem preferência nenhuma — ele afirmava só "a trama aparece e
    // nada quebra", que continuaria verdade com a cintilação ligada, e não
    // provava nada sobre o comportamento reduzido. Sem mexer no mouse, com
    // `cintila = false` e `devePular` funcionando, o laço não repinta e o
    // bitmap não pode mudar um único byte. O par que separa os dois estados é
    // "a trama cintila sozinha", no bloco da malha viva.
    await page.goto("/");
    await page.waitForTimeout(1000);

    const antes = await assinaturaDaTrama(page);
    await page.waitForTimeout(300); // sem tocar no mouse
    const depois = await assinaturaDaTrama(page);

    expect(depois, "a malha se mexeu com movimento reduzido ligado").toBe(antes);
  });
});

/**
 * A abertura em si. O que só um navegador de verdade prova é que as regras de
 * app/abertura.module.css realmente venceram as dos módulos dos componentes e
 * que a coreografia chega ao estado final — o jsdom não carrega CSS Modules,
 * então nenhum teste de vitest enxerga uma linha destas folhas.
 */
test.describe("a abertura", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("termina com a logo no tamanho final e o giro fechado", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(DEPOIS_DA_ENTRADA);

    // "none" e a matriz identidade dizem a mesma coisa: escala 1, sem giro.
    const identidade = ["none", "matrix(1, 0, 0, 1, 0, 0)"];

    const logo = await page
      .locator("[data-logo]")
      .evaluate((el) => getComputedStyle(el).transform);
    expect(identidade, `a logo parou em ${logo}`).toContain(logo);

    const zero = await page
      .locator("[data-glifo][data-indice='1'] path")
      .evaluate((el) => getComputedStyle(el).transform);
    expect(identidade, `o "0" parou em ${zero}`).toContain(zero);
  });

  test("o 0 continua no lugar dele dentro da palavra", async ({ page }) => {
    // A armadilha do §5a do design: se a rotação tivesse ido para o
    // <g data-glifo>, ela teria apagado o `transform` de atributo que
    // posiciona o glifo, e o "0" terminaria fora da caixa da logo.
    await page.goto("/");
    await page.waitForTimeout(DEPOIS_DA_ENTRADA);

    const logo = (await page.locator("[data-logo]").boundingBox())!;
    const zero = (await page
      .locator("[data-glifo][data-indice='1'] path")
      .boundingBox())!;

    expect(zero.x).toBeGreaterThan(logo.x);
    expect(zero.x + zero.width).toBeLessThan(logo.x + logo.width);
  });

  test("termina com a frase inteira acesa e nenhum cursor aceso", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(DEPOIS_DA_ENTRADA);

    const opacidades = await page
      .locator("[data-caractere]")
      .evaluateAll((els) => els.map((el) => Number(getComputedStyle(el).opacity)));

    expect(opacidades.length).toBeGreaterThan(30);
    expect(Math.min(...opacidades)).toBeGreaterThan(0.99);

    const cursoresAcesos = await page
      .locator("[data-caractere]")
      .evaluateAll(
        (els) =>
          els.filter(
            (el) => Number(getComputedStyle(el, "::after").opacity) > 0.01,
          ).length,
      );
    expect(cursoresAcesos).toBe(0);
  });

  test("no começo a frase ainda não escreveu nada", async ({ page }) => {
    // Contraparte decisiva do teste acima: sem ela, "tudo aceso no fim"
    // passaria com a animação nunca tendo rodado.
    await page.goto("/");
    await page.waitForTimeout(500); // a frase só começa em INICIO_FRASE (2310ms)

    const acesos = await page
      .locator("[data-caractere]")
      .evaluateAll(
        (els) =>
          els.filter((el) => Number(getComputedStyle(el).opacity) > 0.5).length,
      );
    expect(acesos).toBe(0);
  });
});

/**
 * A troca de idioma: apagar a frase antiga e escrever a nova.
 *
 * Nada disto é verificável sem navegador. O vitest prova a máquina de estado
 * (as fases, os timers, a martelada) mas não enxerga UMA linha de
 * FraseDigitada.module.css — e é o CSS que decide se o apagamento vai de trás
 * para frente, se algum caractere ficou preso apagado, e se a remontagem por
 * `tomada` reiniciou a animação de verdade em vez de herdar o relógio anterior.
 */
test.describe("a troca de idioma", () => {
  /** Quais caracteres estão acesos, na ordem em que estão na frase. */
  async function acesos(page: Page): Promise<boolean[]> {
    return page
      .locator("[data-caractere]")
      .evaluateAll((els) =>
        els.map((el) => Number(getComputedStyle(el).opacity) > 0.5),
      );
  }

  async function cursoresAcesos(page: Page): Promise<number> {
    return page
      .locator("[data-caractere]")
      .evaluateAll(
        (els) =>
          els.filter(
            (el) => Number(getComputedStyle(el, "::after").opacity) > 0.01,
          ).length,
      );
  }

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.waitForTimeout(DEPOIS_DA_ENTRADA); // a frase precisa estar inteira
  });

  test("apaga de trás para frente, com o texto antigo ainda no lugar", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "EN" }).click();
    // No meio do apagamento: 47 caracteres × 14ms ≈ 658ms de ponta a ponta.
    await page.waitForTimeout(Math.round(duracaoApagamento("pt") / 2));

    const estado = await acesos(page);
    const primeiroApagado = estado.indexOf(false);

    // A prova da ORDEM, e não da contagem: o que sobra aceso é um prefixo.
    // Se o apagamento andasse para frente, ou saísse tudo de uma vez, ou
    // saísse em ordem aleatória, esta asserção cairia.
    expect(primeiroApagado).toBeGreaterThan(0);
    expect(estado.slice(primeiroApagado).some(Boolean)).toBe(false);

    // E é a frase VELHA que está sendo apagada. Trocar o texto antes de
    // apagar passaria a asserção acima e mesmo assim estaria errado: seria a
    // frase nova sumindo de trás para frente, o filme ao contrário.
    await expect(page.getByText("Potencializamos talentos e")).toBeVisible();
  });

  test("reescreve na língua nova, inteira e sem cursor sobrando", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "EN" }).click();
    await page.waitForTimeout(
      duracaoApagamento("pt") + duracaoEscrita("en") + 300,
    );

    const estado = await acesos(page);
    expect(estado.length).toBe(caracteres("en"));
    expect(estado.every(Boolean)).toBe(true);
    expect(await cursoresAcesos(page)).toBe(0);
    await expect(page.getByText("We build the future.")).toBeVisible();
  });

  test("no meio da reescrita a frase está pela metade — não inteira de uma vez", async ({
    page,
  }) => {
    // Contraparte decisiva do teste acima: sem ela, "tudo aceso no fim"
    // passaria com a reescrita nunca tendo sido animada. É também o que pega a
    // armadilha da `tomada`: sem nós novos, os <span> herdariam a animação já
    // terminada da frase anterior e a frase nova nasceria inteira acesa.
    await page.getByRole("button", { name: "EN" }).click();
    // Folga dos DOIS lados: 500ms depois do apagamento são ~11 dos 38
    // caracteres do inglês (descontada a espera de 120ms), longe do zero e
    // longe dos 1618ms que a reescrita inteira leva.
    await page.waitForTimeout(duracaoApagamento("pt") + 500);

    const estado = await acesos(page);
    const primeiroApagado = estado.indexOf(false);

    expect(primeiroApagado).toBeGreaterThan(0); // já escreveu alguma coisa
    expect(estado.slice(primeiroApagado).some(Boolean)).toBe(false); // e não tudo
  });

  test("martelar PT/EN/PT/EN termina inteira, na língua do último clique", async ({
    page,
  }) => {
    const pt = page.getByRole("button", { name: "PT" });
    const en = page.getByRole("button", { name: "EN" });

    // Cliques em cima da hora, caindo em fases diferentes de propósito: no
    // meio do apagamento, no meio da reescrita, e um logo em seguida.
    await en.click();
    await page.waitForTimeout(80);
    await pt.click();
    await page.waitForTimeout(400);
    await en.click();
    await page.waitForTimeout(150);
    await pt.click();
    await en.click();

    // O pior caso possível depois do último clique, com folga.
    await page.waitForTimeout(
      duracaoApagamento("pt") + duracaoEscrita("en") + 600,
    );

    const estado = await acesos(page);
    expect(estado.length).toBe(caracteres("en"));
    expect(estado.every(Boolean)).toBe(true); // nenhum caractere ficou para trás
    expect(await cursoresAcesos(page)).toBe(0);
    await expect(page.getByText("We amplify talent.")).toBeVisible();
    esperaSemScroll(await medirDocumento(page));
  });
});

test.describe("a troca de idioma com movimento reduzido", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("troca na hora, sem apagar nem escrever", async ({ page }) => {
    // O @media zera as animações, mas não alcança os setTimeout que dividem as
    // fases — quem pediu MENOS movimento não pode ficar ~0,8s olhando para o
    // texto antigo, parado, esperando um apagamento que não vai acontecer.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    await page.getByRole("button", { name: "EN" }).click();
    await page.waitForTimeout(120); // dois quadros, não duas fases

    await expect(page.getByText("We amplify talent.")).toBeVisible();
    const opacidades = await page
      .locator("[data-caractere]")
      .evaluateAll((els) => els.map((el) => Number(getComputedStyle(el).opacity)));

    expect(opacidades.length).toBe(caracteres("en"));
    expect(Math.min(...opacidades)).toBeGreaterThan(0.99);
  });
});

test.describe("a abertura com movimento reduzido", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("a frase já está inteira no primeiro quadro, e sem cursor", async ({ page }) => {
    await page.goto("/");

    // Prova de que a preferência está mesmo ligada nesta página — sem isto o
    // teste passaria com o modo reduzido nunca tendo sido ativado.
    const reduzidoDeVerdade = await page.evaluate(
      () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    expect(reduzidoDeVerdade).toBe(true);

    const opacidades = await page
      .locator("[data-caractere]")
      .evaluateAll((els) => els.map((el) => Number(getComputedStyle(el).opacity)));

    expect(opacidades.length).toBeGreaterThan(30);
    expect(Math.min(...opacidades)).toBeGreaterThan(0.99);

    const cursoresAcesos = await page
      .locator("[data-caractere]")
      .evaluateAll(
        (els) =>
          els.filter(
            (el) => Number(getComputedStyle(el, "::after").opacity) > 0.01,
          ).length,
      );
    expect(cursoresAcesos).toBe(0);
  });

  test("o topo já está no lugar, sem ter entrado de lado", async ({ page }) => {
    await page.goto("/");

    for (const seletor of ["[data-ima='idioma']", "[data-ima='contato']"]) {
      const t = await page
        .locator(seletor)
        .evaluate((el) => getComputedStyle(el).transform);
      expect(["none", "matrix(1, 0, 0, 1, 0, 0)"], `${seletor} = ${t}`).toContain(t);
    }
  });
});
