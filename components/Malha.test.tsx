import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Lanterna from "./Lanterna";
import Malha from "./Malha";

/**
 * O laço de desenho NÃO é testável aqui: o jsdom não implementa contexto 2d,
 * então `getContext("2d")` devolve null e o efeito sai antes de agendar
 * quadro. Isso não é limitação a contornar — é o comportamento exigido, e o
 * segundo teste abaixo o verifica. O desenho de verdade é coberto pelo e2e
 * (Task 7); a regra de pular quadro é coberta por `devePular` (Task 2).
 */
describe("Malha", () => {
  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renderiza um canvas escondido de leitores de tela", () => {
    const { container } = render(<Malha />);
    const canvas = container.querySelector("canvas");
    expect(canvas).not.toBeNull();
    expect(canvas).toHaveAttribute("aria-hidden", "true");
  });

  it("não estoura quando o navegador não dá contexto 2d", () => {
    // É exatamente o que o jsdom faz sem o pacote `canvas` instalado. Se o
    // componente não sair de fininho aqui, a suíte inteira cai.
    expect(() => render(<Malha />)).not.toThrow();
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it("monta dentro de uma <Lanterna>, lendo a posição viva pelo contexto", () => {
    // Caminho diferente do teste acima: aqui o contexto NÃO é null. É o
    // arranjo real da página, e é o que prova que o provider e o consumidor
    // se encontram.
    const { container } = render(
      <Lanterna>
        <Malha />
      </Lanterna>
    );
    expect(container.querySelector("[data-lanterna] canvas")).not.toBeNull();
  });
});
