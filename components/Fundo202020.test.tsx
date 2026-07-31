import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Fundo202020 from "./Fundo202020";

/**
 * O CSS Module da vinheta, lido como texto — ver o teste da vinheta.
 *
 * Pela raiz do projeto, e não por `import.meta.url`: sob o vitest o
 * `import.meta.url` do módulo transformado não é `file:`, e o `readFileSync`
 * recusa ("The URL must be of scheme file").
 */
const CSS_FUNDO = readFileSync(
  resolve(process.cwd(), "components/Fundo202020.module.css"),
  "utf8"
);

describe("Fundo202020", () => {
  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("é escondido de leitores de tela", () => {
    const { container } = render(<Fundo202020 />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("põe a malha dentro da lanterna, para ela receber a posição viva", () => {
    const { container } = render(<Fundo202020 />);
    const lanterna = container.querySelector("[data-lanterna]");
    expect(lanterna).not.toBeNull();
    expect(lanterna!.querySelector("canvas")).not.toBeNull();
  });

  it("o canvas é filho DIRETO de [data-lanterna], não apenas descendente", () => {
    // Esta distinção importa porque Malha.tsx usa `canvas.parentElement` como
    // sistema de coordenadas para calcular a posição da luz. Se qualquer
    // elemento posicionado for inserido entre a lanterna e o canvas (um wrapper,
    // uma div de layout), o cálculo passa a medir a caixa errada — a luz acende
    // no lugar errado — e nenhum teste que só verifique "descendente" pegaria
    // isso, porque `querySelector` enxerga através de qualquer profundidade.
    const { container } = render(<Fundo202020 />);
    const lanterna = container.querySelector("[data-lanterna]");
    const canvas = container.querySelector("canvas");
    expect(canvas).not.toBeNull();
    expect(canvas!.parentElement).toBe(lanterna);
  });

  it("tem a vinheta, e ela não intercepta o mouse", () => {
    const { container } = render(<Fundo202020 />);
    const vinheta = container.querySelector("[data-vinheta]");
    expect(vinheta).not.toBeNull();
    // A classe sai MESMO do CSS Module desta pasta, e não de um `className`
    // solto — é o que liga o elemento à regra conferida logo abaixo.
    expect(vinheta!.className).toMatch(/vinheta/);

    // `getComputedStyle` não serve aqui: este projeto não pede `css: true` ao
    // vitest, então `document.styleSheets.length` é 0 no jsdom e TODA
    // propriedade sai no valor inicial — `pointer-events: auto`. Uma asserção
    // sobre o computado passaria idêntica com a regra apagada, que é o
    // contrário do que este teste precisa provar. Quem guarda a regra é o
    // arquivo, então é o arquivo que se afirma.
    //
    // O que a regra faz, com precisão: ela é defesa em profundidade, NÃO o que
    // segura o clique hoje. `pointer-events` é herdada, e o `.fundo` — pai da
    // vinheta — já declara `none`. Conferido no navegador: com a declaração
    // própria da vinheta revertida, o computado dela continua `none`, herdado.
    // Apagar a linha do `.vinheta` não quebraria clique nenhum enquanto ela
    // morar dentro do `.fundo`. A regra existe para o dia em que ela não morar:
    // a vinheta é `position: absolute; inset: 0` e cobre a tela inteira, então
    // fora daquele pai ela viraria uma folha de vidro sobre o CONTATO e o
    // seletor de idioma. É barata, e o custo de descobrir isso pelo bug é alto.
    const regra = /\.vinheta\s*\{[^}]*\}/.exec(CSS_FUNDO)?.[0] ?? "";
    expect(regra, ".vinheta sumiu do CSS Module").not.toBe("");
    expect(regra).toMatch(/pointer-events:\s*none/);
  });

  it("não desenha mais a malha como texto no DOM", () => {
    const { container } = render(<Fundo202020 />);
    expect(container.textContent).toBe("");
  });
});
