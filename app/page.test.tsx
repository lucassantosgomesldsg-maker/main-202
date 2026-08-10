import { act } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  DURACAO_TOTAL_MAXIMA_MS,
  INICIO_FRASE,
  INICIO_TOPO,
  duracaoApagamento,
  duracaoEscrita,
} from "@/lib/abertura";
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

  // Finding 1 do review final (2026-08-02): `jaRodou` responde "já vi a
  // entrada NESTA SESSÃO?" — que só vira true numa carga SEGUINTE, nunca na
  // mesma. Numa primeira visita, `jaRodou` fica false a carga inteira, mesmo
  // muito depois de a coreografia ter terminado de verdade. Antes da
  // correção, `estatica` era literalmente `jaRodou`, e qualquer <span> de
  // caractere montado depois da troca de idioma (o índice global muda de
  // tamanho entre PT e EN) nascia sob a regra "tocando" — com um --atraso que
  // o relógio real já tinha passado, `forwards` (não `both`) deixando a regra
  // de repouso `opacity:0` valer indefinidamente. O <h1> ficava com pedaços
  // invisíveis por até ~4,2s depois de uma troca de idioma pós-entrada.
  //
  // O que `estatica` protege continua sendo exatamente isso, e a troca de
  // idioma que apaga e reescreve (02/08/2026) mantém a mesma dependência: é
  // `estatica` que diz à frase que ela está inteira, e portanto que a próxima
  // troca deve APAGAR em vez de cortar. A prova mudou de vocabulário —
  // `data-estatica` virou `data-fase`, com quatro valores — mas a armadilha é
  // a mesma: se a página não soubesse que a coreografia acabou, o clique
  // cairia no caminho de corte e a reescrita nasceria com o atraso da
  // abertura, já vencido.
  it("depois que a abertura termina de verdade, trocar de idioma apaga, reescreve e para — sem prender ninguém a um atraso já vencido", () => {
    vi.useFakeTimers();
    try {
      const { container } = render(<Home />);
      const h1 = container.querySelector("h1") as HTMLElement;

      // Avança bem além do pior caso entre os dois idiomas — a coreografia
      // já terminou de verdade nesta mesma carga.
      act(() => {
        vi.advanceTimersByTime(DURACAO_TOTAL_MAXIMA_MS);
      });

      // Se isto ainda fosse `jaRodou`, valeria "entrada": a troca acontece na
      // MESMA carga, e `jaRodou` só muda numa carga seguinte.
      expect(h1).toHaveAttribute("data-fase", "parada");

      fireEvent.click(screen.getByRole("button", { name: "EN" }));
      expect(h1).toHaveAttribute("data-fase", "apagando");

      act(() => {
        vi.advanceTimersByTime(duracaoApagamento("pt"));
      });
      expect(h1).toHaveAttribute("data-fase", "escrevendo");

      act(() => {
        vi.advanceTimersByTime(duracaoEscrita("en"));
      });
      expect(h1).toHaveAttribute("data-fase", "parada");
      expect(container.querySelector("main")).toHaveAttribute(
        "data-abertura",
        "estatica",
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
