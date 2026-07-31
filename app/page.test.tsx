import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach } from "vitest";
import { INICIO_FRASE, INICIO_TOPO } from "@/lib/abertura";
import { __resetarParaTeste } from "@/lib/usaMotionUmaVez";
import Home from "./page";

// A guarda de módulo de usaMotionUmaVez e o sessionStorage sobrevivem entre
// casos do mesmo arquivo. Sem zerar os dois, o primeiro render decide por
// todos e as asserções sobre `data-abertura` passariam por ordem, não por
// comportamento.
beforeEach(() => {
  __resetarParaTeste();
  window.sessionStorage.clear();
});

/** A frase virou um <span> por caractere, e o `getByText` do testing-library
 *  só casa nós de texto DIRETOS de um elemento — por isso as asserções de
 *  frase passam a ser por linha, com toHaveTextContent. */
function linhas(container: HTMLElement) {
  return container.querySelectorAll("[data-linha]");
}

describe("a tela", () => {
  it("mostra o oneliner em português, quebrado em duas linhas", () => {
    const { container } = render(<Home />);
    expect(linhas(container)).toHaveLength(2);
    expect(linhas(container)[0]).toHaveTextContent("Potencializamos talentos e");
    expect(linhas(container)[1]).toHaveTextContent("construímos o futuro.");
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
    const { container } = render(<Home />);
    await userEvent.click(screen.getByRole("button", { name: "EN" }));
    expect(linhas(container)[0]).toHaveTextContent("We amplify talent.");
    expect(linhas(container)[1]).toHaveTextContent("We build the future.");
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
    const { container } = render(<Home />);
    expect(linhas(container)[0]).toHaveTextContent("Potencializamos talentos e");
  });

  it("restaura o idioma guardado numa visita seguinte", () => {
    window.localStorage.setItem("202:idioma", "en");
    const { container } = render(<Home />);
    expect(linhas(container)[0]).toHaveTextContent("We amplify talent.");
  });
});

describe("a abertura", () => {
  it("nasce tocando: o HTML do servidor não pula a entrada", () => {
    const { container } = render(<Home />);
    expect(container.querySelector("main")).toHaveAttribute(
      "data-abertura",
      "tocando",
    );
  });

  it("entrega os tempos da coreografia ao CSS, no <main>", () => {
    const { container } = render(<Home />);
    const tela = container.querySelector("main") as HTMLElement;

    // Os dois que carregam a ordem dos atos:
    expect(tela.style.getPropertyValue("--t-topo")).toBe(`${INICIO_TOPO}ms`);
    expect(tela.style.getPropertyValue("--t-frase")).toBe(`${INICIO_FRASE}ms`);
  });

  it("desenha o palco com o fundo e a logo dentro", () => {
    const { container } = render(<Home />);
    const palco = container.querySelector("[data-palco]");
    expect(palco).not.toBeNull();
    expect(palco!.querySelector("[data-logo]")).not.toBeNull();
    expect(palco!.querySelector("[data-lanterna]")).not.toBeNull();
  });
});
