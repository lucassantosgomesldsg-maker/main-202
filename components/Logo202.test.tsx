import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Logo202 from "./Logo202";

describe("Logo202", () => {
  it("é anunciada como imagem chamada 202Lab", () => {
    render(<Logo202 />);
    expect(screen.getByRole("img", { name: "202Lab" })).toBeInTheDocument();
  });

  it("desenha os três glifos, indexados", () => {
    const { container } = render(<Logo202 />);
    const glifos = container.querySelectorAll("[data-glifo]");
    expect(glifos).toHaveLength(3);
    expect([...glifos].map((g) => g.getAttribute("data-indice"))).toEqual(["0", "1", "2"]);
  });

  it("tem exatamente um ponto verde", () => {
    const { container } = render(<Logo202 />);
    expect(container.querySelectorAll("[data-ponto]")).toHaveLength(1);
  });

  it("aceita uma classe externa na raiz", () => {
    const { container } = render(<Logo202 className="xyz" />);
    expect(container.querySelector("[data-logo]")).toHaveClass("xyz");
  });
});
