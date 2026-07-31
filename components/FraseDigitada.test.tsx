import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import FraseDigitada from "./FraseDigitada";
import { caracteres } from "@/lib/abertura";

function linhas(container: HTMLElement) {
  return container.querySelectorAll("[data-linha]");
}

describe("FraseDigitada", () => {
  it("tem a frase inteira no DOM antes de escrever qualquer caractere", () => {
    // O <h1> é a única frase da página que descreve o que a 202 faz — para
    // leitor de tela e para busca ela precisa estar completa desde o primeiro
    // quadro, com ou sem animação.
    const { container } = render(<FraseDigitada idioma="pt" estatica={false} />);
    expect(linhas(container)).toHaveLength(2);
    expect(linhas(container)[0]).toHaveTextContent("Potencializamos talentos e");
    expect(linhas(container)[1]).toHaveTextContent("construímos o futuro.");
  });

  it("desenha um span por caractere, com o índice contínuo entre as linhas", () => {
    const { container } = render(<FraseDigitada idioma="pt" estatica={false} />);
    const spans = container.querySelectorAll("[data-caractere]");

    expect(spans).toHaveLength(caracteres("pt"));
    spans.forEach((span, i) => {
      expect((span as HTMLElement).style.getPropertyValue("--i")).toBe(String(i));
    });
  });

  it("marca só o último caractere da frase inteira, na segunda linha", () => {
    // Se o índice reiniciasse a cada linha, a segunda se escreveria junto com
    // a primeira e o cursor sumiria no meio da frase.
    const { container } = render(<FraseDigitada idioma="pt" estatica={false} />);
    const marcados = container.querySelectorAll("[data-ultimo='true']");

    expect(marcados).toHaveLength(1);
    expect(marcados[0]).toHaveTextContent(".");
    expect(marcados[0].closest("[data-linha]")).toHaveAttribute("data-linha", "1");
  });

  it("mantém a frase completa também no modo estático", () => {
    const { container } = render(<FraseDigitada idioma="pt" estatica />);
    expect(container.querySelector("h1")).toHaveAttribute("data-estatica", "true");
    expect(linhas(container)[0]).toHaveTextContent("Potencializamos talentos e");
  });

  it("remonta a frase inteira ao trocar de idioma", () => {
    const { container, rerender } = render(
      <FraseDigitada idioma="pt" estatica={false} />,
    );
    rerender(<FraseDigitada idioma="en" estatica={false} />);

    expect(linhas(container)[0]).toHaveTextContent("We amplify talent.");
    expect(linhas(container)[1]).toHaveTextContent("We build the future.");
    expect(container.querySelectorAll("[data-caractere]")).toHaveLength(
      caracteres("en"),
    );
    expect(container.querySelectorAll("[data-ultimo='true']")).toHaveLength(1);
  });

  it("continua sendo o h1 e continua sendo o ímã da lanterna", () => {
    const { container } = render(<FraseDigitada idioma="pt" estatica={false} />);
    const h1 = container.querySelector("h1") as HTMLElement;

    expect(h1).toHaveClass("oneliner");
    expect(h1).toHaveAttribute("data-ima", "oneliner");
  });
});
