import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Home from "./page";
import { COORDENADAS, LOCAL } from "@/lib/copy";

describe("a tela", () => {
  it("mostra o oneliner em português, quebrado em duas linhas", () => {
    render(<Home />);
    expect(screen.getByText("Potencializamos talentos e")).toBeInTheDocument();
    expect(screen.getByText("construímos o futuro.")).toBeInTheDocument();
  });

  it("mostra as coordenadas do ITA e a cidade", () => {
    render(<Home />);
    expect(screen.getByText(COORDENADAS)).toBeInTheDocument();
    expect(screen.getByText(LOCAL)).toBeInTheDocument();
  });

  it("leva ao Instagram da 202, em aba nova e sem vazar referência", () => {
    render(<Home />);
    const link = screen.getByRole("link", { name: /CONTATO/ });
    expect(link).toHaveAttribute("href", "https://www.instagram.com/202lab.br/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("mostra a logo", () => {
    render(<Home />);
    expect(screen.getByRole("img", { name: "202Lab" })).toBeInTheDocument();
  });
});
