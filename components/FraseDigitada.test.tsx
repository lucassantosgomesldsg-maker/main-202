import { act } from "react";
import { render } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import FraseDigitada from "./FraseDigitada";
import { caracteres, duracaoApagamento, duracaoEscrita } from "@/lib/abertura";

function linhas(container: HTMLElement) {
  return container.querySelectorAll("[data-linha]");
}

function fase(container: HTMLElement) {
  return container.querySelector("h1")!.getAttribute("data-fase");
}

function texto(container: HTMLElement) {
  return linhas(container)[0].textContent;
}

/** Avança o relógio falso e deixa o React processar o setState do timer. */
function avancar(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

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

  it("entrega o total de caracteres ao CSS — é dele que sai a ordem inversa", () => {
    // Sem --n o apagamento não tem como saber onde é o "fim" da frase para
    // começar por ele.
    const { container } = render(<FraseDigitada idioma="pt" estatica={false} />);
    const h1 = container.querySelector("h1") as HTMLElement;
    expect(h1.style.getPropertyValue("--n")).toBe(String(caracteres("pt")));
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

  it("nasce na entrada, e a página é quem diz que ela acabou", () => {
    const { container, rerender } = render(
      <FraseDigitada idioma="pt" estatica={false} />,
    );
    expect(fase(container)).toBe("entrada");

    rerender(<FraseDigitada idioma="pt" estatica />);
    expect(fase(container)).toBe("parada");
  });

  it("mantém a frase completa também no modo estático", () => {
    const { container } = render(<FraseDigitada idioma="pt" estatica />);
    expect(fase(container)).toBe("parada");
    expect(linhas(container)[0]).toHaveTextContent("Potencializamos talentos e");
  });

  it("continua sendo o h1 e continua sendo o ímã da lanterna", () => {
    const { container } = render(<FraseDigitada idioma="pt" estatica={false} />);
    const h1 = container.querySelector("h1") as HTMLElement;

    expect(h1).toHaveClass("oneliner");
    expect(h1).toHaveAttribute("data-ima", "oneliner");
  });
});

describe("a troca de idioma com a frase pronta", () => {
  it("apaga a frase antiga antes de escrever a nova", () => {
    vi.useFakeTimers();
    const { container, rerender } = render(
      <FraseDigitada idioma="pt" estatica />,
    );

    rerender(<FraseDigitada idioma="en" estatica />);

    // O texto ANTIGO continua no DOM: é ele que está sendo apagado. Trocar o
    // texto aqui faria a frase nova aparecer inteira e sumir de trás para
    // frente — o filme ao contrário.
    expect(fase(container)).toBe("apagando");
    expect(texto(container)).toBe("Potencializamos talentos e");

    avancar(duracaoApagamento("pt"));
    expect(fase(container)).toBe("escrevendo");
    expect(texto(container)).toBe("We amplify talent.");

    avancar(duracaoEscrita("en"));
    expect(fase(container)).toBe("parada");
    expect(linhas(container)[1]).toHaveTextContent("We build the future.");
    expect(container.querySelectorAll("[data-caractere]")).toHaveLength(
      caracteres("en"),
    );
    expect(container.querySelectorAll("[data-ultimo='true']")).toHaveLength(1);
  });

  it("remonta os <span> a cada tomada — é o que reinicia a animação", () => {
    // Trocar o textContent de um <span> NÃO reinicia a animação CSS dele. Sem
    // nós novos, a frase nova apareceria pela metade, herdando o relógio da
    // anterior. Este teste prova a identidade dos nós, que é o mecanismo.
    vi.useFakeTimers();
    const { container, rerender } = render(
      <FraseDigitada idioma="pt" estatica />,
    );
    const primeiro = container.querySelector("[data-caractere]");

    rerender(<FraseDigitada idioma="en" estatica />);
    avancar(duracaoApagamento("pt"));

    expect(container.querySelector("[data-caractere]")).not.toBe(primeiro);
  });

  it("volta para parada só depois da escrita inteira", () => {
    vi.useFakeTimers();
    const { container, rerender } = render(
      <FraseDigitada idioma="pt" estatica />,
    );
    rerender(<FraseDigitada idioma="en" estatica />);
    avancar(duracaoApagamento("pt"));

    avancar(duracaoEscrita("en") - 1);
    expect(fase(container)).toBe("escrevendo");

    avancar(1);
    expect(fase(container)).toBe("parada");
  });
});

describe("a troca de idioma no meio de uma escrita", () => {
  it("corta e recomeça, sem passar pelo apagamento", () => {
    // Uma frase incompleta não tem o que apagar: os caracteres que ainda não
    // foram escritos teriam que ACENDER para poder sumir (a fase `apagando`
    // nasce com tudo em opacity 1), o que seria um flash.
    vi.useFakeTimers();
    const { container, rerender } = render(
      <FraseDigitada idioma="pt" estatica={false} />,
    );
    expect(fase(container)).toBe("entrada");

    rerender(<FraseDigitada idioma="en" estatica={false} />);
    expect(fase(container)).toBe("escrevendo");
    expect(texto(container)).toBe("We amplify talent.");

    avancar(duracaoEscrita("en"));
    expect(fase(container)).toBe("parada");
  });

  it("depois de uma troca, a frase não volta a esperar a abertura", () => {
    // A armadilha: `estatica` ainda é false (a página só vira a chave no fim
    // do relógio da abertura). Se o repouso pós-troca caísse em `entrada`, o
    // atraso base voltaria a ser --t-frase e a frase INTEIRA sumiria à espera
    // de um começo que já passou.
    vi.useFakeTimers();
    const { container, rerender } = render(
      <FraseDigitada idioma="pt" estatica={false} />,
    );
    rerender(<FraseDigitada idioma="en" estatica={false} />);
    avancar(duracaoEscrita("en"));

    expect(fase(container)).toBe("parada");
  });
});

describe("a troca de idioma martelada", () => {
  it("clicar durante o apagamento não reinicia nem prolonga o apagamento", () => {
    vi.useFakeTimers();
    const { container, rerender } = render(
      <FraseDigitada idioma="pt" estatica />,
    );

    rerender(<FraseDigitada idioma="en" estatica />);
    avancar(duracaoApagamento("pt") - 10);

    // Mais três cliques em cima da hora, todos durante o apagamento.
    rerender(<FraseDigitada idioma="pt" estatica />);
    rerender(<FraseDigitada idioma="en" estatica />);
    rerender(<FraseDigitada idioma="pt" estatica />);
    expect(fase(container)).toBe("apagando");

    // O apagamento termina no tempo original, não 10ms depois de cada clique.
    avancar(10);
    expect(fase(container)).toBe("escrevendo");
    // E escreve o ÚLTIMO idioma pedido — que aqui é o mesmo de antes: apagou,
    // escreve de novo, exatamente o que o visitante viu acontecer.
    expect(texto(container)).toBe("Potencializamos talentos e");

    avancar(duracaoEscrita("pt"));
    expect(fase(container)).toBe("parada");
  });

  it("PT/EN/PT/EN sem parar termina na língua do último clique, e parada", () => {
    vi.useFakeTimers();
    const { container, rerender } = render(
      <FraseDigitada idioma="pt" estatica />,
    );

    // Cada clique cai numa fase diferente de propósito: no meio do apagamento,
    // no meio da escrita, no comecinho da próxima.
    rerender(<FraseDigitada idioma="en" estatica />);
    avancar(60);
    rerender(<FraseDigitada idioma="pt" estatica />);
    avancar(duracaoApagamento("pt"));
    rerender(<FraseDigitada idioma="en" estatica />);
    avancar(120);
    rerender(<FraseDigitada idioma="pt" estatica />);
    avancar(30);
    rerender(<FraseDigitada idioma="en" estatica />);

    // Nada de timer órfão: o relógio anda até o fim do pior caso possível
    // (apagar + escrever) e a frase tem que estar inteira, na língua certa.
    avancar(duracaoApagamento("pt") + duracaoEscrita("en"));

    expect(fase(container)).toBe("parada");
    expect(texto(container)).toBe("We amplify talent.");
    expect(container.querySelectorAll("[data-caractere]")).toHaveLength(
      caracteres("en"),
    );
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clicar no idioma que já está escrito não faz nada", () => {
    vi.useFakeTimers();
    const { container, rerender } = render(
      <FraseDigitada idioma="pt" estatica />,
    );
    const primeiro = container.querySelector("[data-caractere]");

    rerender(<FraseDigitada idioma="pt" estatica />);

    expect(fase(container)).toBe("parada");
    expect(container.querySelector("[data-caractere]")).toBe(primeiro);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("a troca de idioma com movimento reduzido", () => {
  it("troca na hora, sem apagar nem escrever", () => {
    // O @media zera as animações, mas não alcança os setTimeout que dividem as
    // fases. Sem este caminho, quem pediu MENOS movimento esperaria ~0,8s
    // olhando para o texto antigo, parado, antes de ele trocar.
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", (pergunta: string) => ({
      matches: pergunta.includes("prefers-reduced-motion"),
      media: pergunta,
      addEventListener() {},
      removeEventListener() {},
    }));

    const { container, rerender } = render(
      <FraseDigitada idioma="pt" estatica />,
    );
    rerender(<FraseDigitada idioma="en" estatica />);

    // Zero, e não a duração do apagamento: os dois timers vencem no mesmo
    // instante em que foram marcados.
    avancar(0);

    expect(texto(container)).toBe("We amplify talent.");
    expect(fase(container)).toBe("parada");
  });
});
