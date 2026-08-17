import { test, expect, type Page } from "@playwright/test";
import { IDS_SECOES, TESE } from "../lib/tese";

/**
 * A /tese é a primeira página do site que ROLA, e é isso que esta suíte
 * guarda — dos dois lados.
 *
 * A regra dura do repo ("a página nunca rola") não foi revogada: ela virou uma
 * regra sobre a HOME. O interruptor mudou de `html, body { overflow: hidden }`
 * para `html:has(.tela), body:has(.tela)` em app/globals.css. Um seletor que
 * pergunta "esta página é a home?" é exatamente o tipo de coisa que quebra em
 * silêncio numa refatoração — daí o primeiro bloco abaixo medir os dois lados
 * do interruptor, na mesma corrida.
 *
 * e2e/layout.spec.ts continua sendo a autoridade sobre a home em cinco
 * viewports; aqui a home aparece só como o outro lado da comparação.
 */

/** As seções que carregam um desenho. As outras cinco são texto puro. */
const SECOES_COM_INSTRUMENTO = [
  "velocidade",
  "descompasso",
  "o-que-supera",
  "pilares",
  "frentes",
];

const VIEWPORTS = [
  { nome: "desktop", width: 1440, height: 900 },
  { nome: "notebook baixo", width: 1366, height: 660 },
  { nome: "tablet", width: 820, height: 1180 },
  { nome: "celular", width: 390, height: 844 },
  { nome: "celular pequeno", width: 320, height: 568 },
];

/** Semeia o idioma ANTES de qualquer script da página rodar. */
async function semearIdioma(page: Page, idioma: string) {
  await page.addInitScript((valor) => {
    window.localStorage.setItem("202:idioma", valor);
  }, idioma);
}

/**
 * `behavior: "instant"` em todo `scrollTo` desta suíte, sem exceção.
 *
 * `app/globals.css` declara `html { scroll-behavior: smooth }` para os saltos
 * da régua, e isso vale para QUALQUER rolagem programática, inclusive as do
 * teste: `window.scrollTo(0, 9999)` volta antes de a rolagem acontecer, e
 * `window.scrollY` lido logo em seguida ainda é o valor antigo. Sem o
 * `instant`, este arquivo mede a página parada e conclui que ela não rola.
 */
async function rolarPara(page: Page, y: number) {
  await page.evaluate(
    (topo) => window.scrollTo({ top: topo, behavior: "instant" }),
    y,
  );
}

/**
 * Põe o instrumento de uma seção no centro da tela, e só volta quando ele
 * existe de fato.
 *
 * Um `page.evaluate` com `querySelector('[data-toque]')` não serve, e a falha
 * é silenciosa: o atributo só existe depois da hidratação — quem o escreve é
 * `usaTocarAoVer` —, então um `evaluate` disparado cedo demais não acha nada,
 * não rola nada, e o teste segue medindo uma seção que nunca apareceu na tela.
 * Passa ou falha por acaso, conforme a máquina do dia. `locator.evaluate`
 * espera o elemento aparecer antes de rodar.
 */
async function verInstrumento(page: Page, id: string) {
  const instrumento = page.locator(`#${id} [data-toque]`);
  await expect(instrumento, `instrumento de ${id}`).toHaveCount(1);
  await instrumento.evaluate((no) =>
    no.scrollIntoView({ behavior: "instant", block: "center" }),
  );
  return instrumento;
}

async function rolarAteOFim(page: Page) {
  // De tela em tela, e não de uma vez: as revelações são dirigidas por
  // `animation-timeline: view()`, que só avança com scroll REAL. Um salto
  // direto para o fim pularia faixas inteiras e mediria um estado que nenhum
  // visitante encontra.
  const passos = await page.evaluate(
    () => Math.ceil(document.body.scrollHeight / window.innerHeight) + 1,
  );
  for (let i = 0; i <= passos; i++) {
    await page.evaluate(
      (n) =>
        window.scrollTo({ top: n * window.innerHeight, behavior: "instant" }),
      i,
    );
    await page.waitForTimeout(60);
  }
}

test.describe("o interruptor do scroll", () => {
  test("a home não rola e a tese rola", async ({ page }) => {
    await page.goto("/");
    await rolarPara(page, 9999);
    const home = await page.evaluate(() => ({
      overflow: getComputedStyle(document.body).overflowY,
      rolou: window.scrollY,
    }));
    expect(home.overflow, "a home perdeu o overflow:hidden").toBe("hidden");
    expect(home.rolou, "a home rolou").toBe(0);

    await page.goto("/tese");
    await rolarPara(page, 9999);
    const tese = await page.evaluate(() => ({
      overflow: getComputedStyle(document.body).overflowY,
      rolou: window.scrollY,
    }));
    expect(tese.overflow, "a tese herdou o overflow:hidden da home").not.toBe(
      "hidden",
    );
    expect(tese.rolou, "a tese não rolou").toBeGreaterThan(0);
  });
});

for (const vp of VIEWPORTS) {
  test.describe(`${vp.nome} (${vp.width}x${vp.height})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
    });

    test("não vaza na horizontal", async ({ page }) => {
      // Vertical é o ponto da página; horizontal nunca. Uma barra lateral aqui
      // é sempre defeito — instrumento largo demais, linha de mono sem quebra,
      // régua fora da calha.
      await page.goto("/tese");
      await rolarAteOFim(page);

      const medidas = await page.evaluate(() => ({
        scrollW: document.body.scrollWidth,
        clientW: document.documentElement.clientWidth,
      }));
      expect(medidas.scrollW).toBeLessThanOrEqual(medidas.clientW + 1);
    });

    test("nada fica preso invisível depois de rolar a página inteira", async ({
      page,
    }) => {
      // O risco real da revelação por scroll: um elemento cuja faixa de
      // `view()` nunca se completa fica em `opacity: 0` PARA SEMPRE, e a seção
      // simplesmente não existe para o visitante. É por isso que o fecho não
      // anima (ver app/tese/page.tsx) — este teste é o que prova que a decisão
      // cobre todos os casos, em todo viewport.
      await page.goto("/tese");
      await rolarAteOFim(page);

      const invisiveis = await page.evaluate(() =>
        [...document.querySelectorAll("main [data-movimento]")]
          .filter((no) => Number(getComputedStyle(no).opacity) < 0.9)
          .map((no) => `${no.tagName}: ${no.textContent?.slice(0, 40)}`),
      );
      expect(invisiveis).toEqual([]);
    });

    test("todo instrumento chega inteiro quando aparece na tela", async ({
      page,
    }) => {
      // O defeito que este teste guarda, medido a 1440×900 antes da correção:
      // o instrumento é o elemento mais BAIXO da seção, e numa faixa `cover`
      // isso significa estar sempre atrás do texto. Com a seção parada na
      // posição natural de leitura, a caixa do desenho ficava em opacidade
      // 0,40 — mais apagada que a frase que ela existe para provar. Quem traz
      // o instrumento hoje é `usaTocarAoVer`, e não o scroll.
      await page.goto("/tese");

      for (const id of SECOES_COM_INSTRUMENTO) {
        // O desenho ao centro, e não a seção ao topo: em viewport curto a
        // seção inteira não cabe, e "o topo da seção está visível" não é a
        // mesma pergunta que "o desenho está sendo olhado".
        const instrumento = await verInstrumento(page, id);
        await expect(instrumento, `instrumento de ${id}`).toHaveCSS(
          "opacity",
          "1",
        );
      }
    });
  });
}

test.describe("a estrutura do argumento", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("desenha as dez seções na ordem da tese", async ({ page }) => {
    await page.goto("/tese");
    const ids = await page.evaluate(() =>
      [...document.querySelectorAll("main section[id]")].map((no) => no.id),
    );
    expect(ids).toEqual([...IDS_SECOES]);
  });

  test("acende exatamente um ponto verde por seção", async ({ page }) => {
    // A regra de cor da página ("verde é a fronteira, e é raro") só sobrevive
    // se for medida. Um ponto por seção, nem zero nem dois.
    await page.goto("/tese");
    const pontos = await page.evaluate(() =>
      [...document.querySelectorAll("main section[id]")].map(
        (secao) => secao.querySelectorAll("[data-ponto]").length,
      ),
    );
    expect(pontos).toEqual(IDS_SECOES.map(() => 1));
  });

  test("a régua leva à seção clicada", async ({ page }) => {
    await page.goto("/tese");
    const alvo = "frentes";
    await page.locator(`nav a[href="#${alvo}"]`).click();
    await page.waitForFunction((id) => {
      const caixa = document.getElementById(id)!.getBoundingClientRect();
      return Math.abs(caixa.top) < window.innerHeight * 0.5;
    }, alvo);

    await expect(page.locator(`nav a[href="#${alvo}"]`)).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  test("a linha do tempo termina sozinha, sem depender de mais scroll", async ({
    page,
  }) => {
    // A pergunta que separa esta versão da anterior. Com
    // `animation-timeline: view()`, parar de rolar congelava o desenho no
    // quadro em que o leitor parou: barra da graduação cortada no meio,
    // renovações pela metade, e aquilo lido como resultado. Aqui o teste rola
    // UMA vez, fica parado e cobra a chegada.
    await page.goto("/tese");
    await verInstrumento(page, "velocidade");

    await page.waitForTimeout(4200);

    const medidas = await page.evaluate(() => {
      const percurso = document.querySelector<HTMLElement>("[data-percurso]");
      const eixo = percurso?.parentElement;
      return {
        // Sem isto o teste passaria com o instrumento no estado base, em que a
        // barra também está inteira — e não teria medido animação nenhuma.
        toque: percurso?.closest("[data-toque]")?.getAttribute("data-toque"),
        percurso: Math.round(percurso?.getBoundingClientRect().width ?? -1),
        // O percurso e o eixo cobrem exatamente a mesma largura quando os dois
        // estão em `scaleX(1)`. Comparar com o pai é o que dispensa cravar um
        // número de pixel que muda com o viewport.
        caixa: Math.round(eixo?.getBoundingClientRect().width ?? -2),
      };
    });
    expect(medidas.toque, "o instrumento nem chegou a tocar").toBe("tocando");
    expect(medidas.percurso).toBe(medidas.caixa);
  });

  test("as duas curvas do descompasso chegam ao fim do gráfico", async ({
    page,
  }) => {
    await page.goto("/tese");
    await verInstrumento(page, "descompasso");
    await page.waitForTimeout(3200);

    const estado = await page.evaluate(() => {
      const svg = document.querySelector("#descompasso svg")!;
      const recorte = svg.querySelector("clipPath rect")!;
      return {
        // Sem isto o teste passaria com o instrumento parado no estado base,
        // que também é "inteiro" — e não teria medido animação nenhuma.
        toque: svg.closest("[data-toque]")?.getAttribute("data-toque"),
        recorte: getComputedStyle(recorte).transform,
        tracos: [...svg.querySelectorAll("path")].map(
          (p) => getComputedStyle(p).strokeDasharray,
        ),
      };
    });

    expect(estado.toque, "o instrumento nem chegou a tocar").toBe("tocando");

    // A frente terminou de varrer, sem transform residual.
    expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(estado.recorte);

    // E nenhuma curva depende de `stroke-dasharray` para existir. Foi
    // exatamente assim que o gráfico ficou PERMANENTEMENTE cortado:
    // `stroke-dasharray` + `pathLength` + `vector-effect: non-scaling-stroke`
    // faz o Chrome medir o traço em pixels de tela, e com
    // `preserveAspectRatio="none"` esticando o eixo X em 1,44× o traço cobria
    // ~71% da curva verde e ~74% da escada. Não era a animação: era o estado
    // final, com o preenchimento inteiro ao lado de duas linhas que morriam no
    // meio do desenho. Nenhum teste pegava, porque a geometria continuava
    // certa — só a pintura é que parava antes.
    expect(estado.tracos.every((d) => d === "none")).toBe(true);
  });

  test("a régua some onde não cabe", async ({ page }) => {
    // Abaixo de 1100px os rótulos não têm calha; uma régua sem rótulo é
    // enfeite ocupando a margem esquerda do texto.
    await page.setViewportSize({ width: 900, height: 800 });
    await page.goto("/tese");
    await expect(page.locator("nav[aria-label]")).toBeHidden();
  });
});

test.describe("o idioma", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("herda a escolha feita na home", async ({ page }) => {
    // Mesma chave de localStorage nas duas páginas: o idioma é uma escolha
    // sobre o SITE. Quem clicou EN na home não pode cair em português aqui.
    await semearIdioma(page, "en");
    await page.goto("/tese");
    await expect(
      page.getByRole("heading", { level: 1 }),
    ).toContainText(TESE.en.secoes[0].titulo[0]);
  });

  test("troca a página inteira e o título da aba, sem recarregar", async ({
    page,
  }) => {
    await page.goto("/tese");
    await expect(page).toHaveTitle(`202Lab — ${TESE.pt.rotuloPagina}`);

    await page.getByRole("button", { name: "EN" }).click();

    await expect(page).toHaveTitle(`202Lab — ${TESE.en.rotuloPagina}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      TESE.en.secoes[0].titulo[0],
    );
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("mantém os mesmos ids de âncora nos dois idiomas", async ({ page }) => {
    // Guardado em lib/tese.test.ts no nível dos dados; aqui no nível do DOM,
    // que é onde o link compartilhado de fato aterrissa.
    await page.goto("/tese");
    await page.getByRole("button", { name: "EN" }).click();
    const ids = await page.evaluate(() =>
      [...document.querySelectorAll("main section[id]")].map((no) => no.id),
    );
    expect(ids).toEqual([...IDS_SECOES]);
  });
});

test.describe("as saídas", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("a home leva para a tese, no idioma escolhido", async ({ page }) => {
    // O outro lado da ligação, e o motivo de este teste morar aqui e não em
    // layout.spec.ts: quem quebra o link é uma mudança na /tese (rota, nome),
    // não uma mudança na home.
    await page.goto("/");
    const link = page.locator("a[href='/tese']");
    await expect(link).toHaveText(new RegExp(TESE.pt.rotuloPagina));

    await page.getByRole("button", { name: "EN" }).click();
    await expect(link).toHaveText(new RegExp(TESE.en.rotuloPagina));

    // O clique espera a entrada assentar sozinho: durante a coreografia o link
    // está translatado para fora da tela, e Playwright só age em elemento
    // estável.
    await link.click();
    await expect(page).toHaveURL(/\/tese$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      TESE.en.secoes[0].titulo[0],
    );
  });

  test("o 202 do topo volta para a home", async ({ page }) => {
    await page.goto("/tese");
    await page.locator("header a[href='/']").click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("[data-logo]")).toBeVisible();
  });

  test("o fecho oferece a volta e, depois dela, o contato", async ({ page }) => {
    // A ordem é decisão de design, não acaso do JSX: a ← nasce à esquerda e a
    // ↗ à direita, e invertidas as duas setas se cruzam no meio da linha.
    await page.goto("/tese");
    const portas = page.locator("#fecho a");

    await expect(portas).toHaveCount(2);
    await expect(portas.nth(0)).toHaveAttribute("href", "/");
    await expect(portas.nth(1)).toHaveAttribute("href", /instagram\.com/);
    await expect(portas.nth(1)).toHaveAttribute("rel", "noopener noreferrer");
  });
});

test.describe("com animações reduzidas", () => {
  test.use({ colorScheme: "dark" });

  test("a página nasce inteira, sem nenhuma revelação pendente", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/tese");

    const invisiveis = await page.evaluate(() =>
      [...document.querySelectorAll("main [data-movimento]")].filter(
        (no) => Number(getComputedStyle(no).opacity) < 0.9,
      ).length,
    );
    expect(invisiveis, "algo continua escondido sem scroll").toBe(0);
  });

  test("os instrumentos nascem prontos, sem gatilho nenhum", async ({
    page,
  }) => {
    // Com movimento reduzido, `usaTocarAoVer` nunca escreve `data-toque` — e é
    // por isso que o estado final mora nas regras BASE do CSS, e não numa
    // keyframe. Se alguém inverter isso um dia (base vazia, keyframe cheia),
    // a página fica em branco para quem pediu menos movimento, e só aqui isso
    // aparece.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/tese");

    const estado = await page.evaluate(() => ({
      comGatilho: document.querySelectorAll("[data-toque]").length,
      // A barra da fronteira precisa estar inteira: em `scaleX(0)` ela teria
      // largura zero e o eixo apareceria vazio.
      percurso: Math.round(
        document
          .querySelector<HTMLElement>("[data-percurso]")
          ?.getBoundingClientRect().width ?? -1,
      ),
    }));

    expect(estado.comGatilho, "alguém armou um instrumento").toBe(0);
    expect(estado.percurso).toBeGreaterThan(100);
  });
});
