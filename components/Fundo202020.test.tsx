import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Fundo202020 from "./Fundo202020";

describe("Fundo202020", () => {
  it("é escondido de leitores de tela", () => {
    const { container } = render(<Fundo202020 />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("repete o padrão 202 muitas vezes", () => {
    const { container } = render(<Fundo202020 />);
    expect(container.textContent!.length).toBeGreaterThan(3000);
    expect(container.textContent!.startsWith("202202202")).toBe(true);
  });
});
