import { test, expect, type Page } from "@playwright/test";

/**
 * A regra dura do projeto: a página nunca tem scroll, em nenhum viewport.
 *
 * A base é o roteiro da Task 9 (cinco viewports, dois testes cada), mas a
 * página cresceu desde que esse roteiro foi escrito:
 *
 *   - o oneliner em inglês tem um comprimento diferente do em português —
 *     então cada checagem de layout roda nos DOIS idiomas, semeando
 *     `localStorage["202:idioma"]` antes do primeiro carregamento;
 *   - a entrada (MotionD) toca uma vez por sessão do navegador e é pulada
 *     num reload dentro da mesma sessão (`sessionStorage["202:motion"]`) — as
 *     asserções de "sem scroll" valem nos dois estados, não só durante a
 *     animação.
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

      // Original: "não tem scroll em ${vp.nome}", durante a animação de entrada.
      test("não tem scroll durante a entrada", async ({ page }) => {
        await page.goto("/");
        await page.waitForTimeout(2000); // deixa a animação terminar
        esperaSemScroll(await medirDocumento(page));
      });

      // Estado que o roteiro original não cobria: reload na mesma sessão
      // pula o MotionD (data-estatico="true" direto), e o layout final
      // precisa ser igualmente livre de scroll.
      test("não tem scroll após reload (animação pulada)", async ({ page }) => {
        await page.goto("/");
        await page.waitForTimeout(2000);
        await page.reload();
        await page.waitForTimeout(300);
        esperaSemScroll(await medirDocumento(page));
      });

      // Original: "nada é cortado em ${vp.nome}", durante a animação de entrada.
      test("nada é cortado durante a entrada", async ({ page }) => {
        await page.goto("/");
        await page.waitForTimeout(2000);
        await esperaNadaCortado(page, vp.width, vp.height);
      });

      test("nada é cortado após reload (animação pulada)", async ({ page }) => {
        await page.goto("/");
        await page.waitForTimeout(2000);
        await page.reload();
        await page.waitForTimeout(300);
        await esperaNadaCortado(page, vp.width, vp.height);
      });
    });
  }
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

  /** Onde a luz está e quanto ela cresceu, direto das variáveis CSS. */
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

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.waitForTimeout(2100); // a entrada termina em 2000ms
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
