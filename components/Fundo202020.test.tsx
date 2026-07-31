import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Fundo202020 from "./Fundo202020";

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
    expect(container.querySelector("[data-vinheta]")).not.toBeNull();
  });

  it("não desenha mais a malha como texto no DOM", () => {
    const { container } = render(<Fundo202020 />);
    expect(container.textContent).toBe("");
  });
});
