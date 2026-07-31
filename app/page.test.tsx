import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import Home from "./page";

describe("a tela", () => {
  it("mostra o oneliner em português, quebrado em duas linhas", () => {
    render(<Home />);
    expect(screen.getByText("Potencializamos talentos e")).toBeInTheDocument();
    expect(screen.getByText("construímos o futuro.")).toBeInTheDocument();
  });

  it("não mostra mais coordenadas nem cidade no rodapé", () => {
    render(<Home />);
    expect(screen.queryByText(/23°12'37"S/)).not.toBeInTheDocument();
    expect(screen.queryByText(/SÃO JOSÉ DOS CAMPOS/)).not.toBeInTheDocument();
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

describe("troca de idioma", () => {
  it("troca o oneliner e o rótulo de contato para inglês", async () => {
    render(<Home />);
    await userEvent.click(screen.getByRole("button", { name: "EN" }));
    expect(screen.getByText("We amplify talent.")).toBeInTheDocument();
    expect(screen.getByText("We build the future.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /CONTACT/ })).toBeInTheDocument();
  });

  it("guarda a escolha e o idioma do documento", async () => {
    render(<Home />);
    await userEvent.click(screen.getByRole("button", { name: "EN" }));
    expect(window.localStorage.getItem("202:idioma")).toBe("en");
    expect(document.documentElement.lang).toBe("en");
    expect(document.title).toBe("202Lab — We amplify talent. We build the future.");
  });

  it("começa em português mesmo que o navegador esteja em inglês", () => {
    render(<Home />);
    expect(screen.getByText("Potencializamos talentos e")).toBeInTheDocument();
  });

  it("restaura o idioma guardado numa visita seguinte", () => {
    window.localStorage.setItem("202:idioma", "en");
    render(<Home />);
    expect(screen.getByText("We amplify talent.")).toBeInTheDocument();
  });
});
