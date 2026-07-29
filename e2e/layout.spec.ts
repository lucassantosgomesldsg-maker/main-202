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

const SELETORES_CANTOS = ["[data-logo]", ".oneliner", ".coordenadas", ".contato"];

/** Semeia o idioma ANTES de qualquer script da página rodar — precisa
 *  existir já na primeira leitura de localStorage em app/page.tsx. */
async function semearIdioma(page: Page, idioma: string) {
  await page.addInitScript((valor) => {
    window.localStorage.setItem("202:idioma", valor);
  }, idioma);
}

async function medirDocumento(page: Page) {
  return page.evaluate(() => ({
    scrollH: document.documentElement.scrollHeight,
    clientH: document.documentElement.clientHeight,
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
  }));
}

function esperaSemScroll(medidas: Awaited<ReturnType<typeof medirDocumento>>) {
  expect(medidas.scrollH).toBeLessThanOrEqual(medidas.clientH + 1);
  expect(medidas.scrollW).toBeLessThanOrEqual(medidas.clientW + 1);
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

test.describe("com animações reduzidas", () => {
  test.use({ reducedMotion: "reduce" });

  test("a logo já aparece montada e visível", async ({ page }) => {
    await page.goto("/");
    const logo = page.locator("[data-logo]");
    await expect(logo).toBeVisible();
    await expect(page.locator("[data-ponto]")).toBeVisible();
    expect(await logo.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
  });
});
