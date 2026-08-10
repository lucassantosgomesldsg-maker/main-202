import { describe, it, expect } from "vitest";
import {
  ATOS,
  DURACAO_MAXIMA_MS,
  DURACAO_TOTAL_MAXIMA_MS,
  INICIO_FRASE,
  INICIO_PULSO,
  INICIO_TOPO,
  TEMPOS,
  caracteres,
  duracaoApagamento,
  duracaoEscrita,
  duracaoTotal,
} from "./abertura";
import { IDIOMAS } from "./copy";

/**
 * A ordem dos atos é a regra dura da coreografia. Estes testes existem para
 * que mexer numa duração não quebre a ordem em silêncio — o CSS não tem
 * nenhum tempo literal, ele consome exatamente estas variáveis.
 */
describe("a ordem dos atos", () => {
  it("faz o ponto pulsar exatamente quando o crescimento termina", () => {
    expect(INICIO_PULSO).toBe(ATOS.crescimento);
  });

  it("faz o topo entrar depois do pulso e da espera, nunca durante", () => {
    expect(INICIO_TOPO).toBe(ATOS.crescimento + ATOS.pulso + ATOS.esperaTopo);
    expect(INICIO_TOPO).toBeGreaterThan(INICIO_PULSO + ATOS.pulso);
  });

  it("faz a frase começar depois do topo entrar inteiro", () => {
    expect(INICIO_FRASE).toBe(INICIO_TOPO + ATOS.topo + ATOS.esperaFrase);
    expect(INICIO_FRASE).toBeGreaterThan(INICIO_TOPO + ATOS.topo);
  });
});

describe("a contagem da frase", () => {
  // Números conferidos à mão contra lib/copy.ts. Se um deles mudar, alguém
  // mexeu na copy — e aí o teto precisa ser reconferido, que é exatamente o
  // que este teste existe para forçar.
  it("conta os code points das duas linhas, nos dois idiomas", () => {
    expect(caracteres("pt")).toBe(47);
    expect(caracteres("en")).toBe(38);
  });
});

describe("a duração total", () => {
  it("conta n-1 intervalos entre n caracteres — o primeiro tem índice zero", () => {
    expect(duracaoTotal("pt")).toBe(
      INICIO_FRASE + 46 * ATOS.msPorCaractere + ATOS.saidaCursor,
    );
    // Números absolutos, conferidos à mão — a segunda conta, independente da
    // fórmula da linha acima. 02/08/2026: caíram 370ms com o corte de
    // `esperaTopo` (400→150) e `esperaFrase` (200→80). PT = 2310 + 46×34 +
    // 240; EN = 2310 + 37×34 + 240.
    expect(duracaoTotal("pt")).toBe(4114);
    expect(duracaoTotal("en")).toBe(3808);
  });

  it("mede o pior caso entre TODOS os idiomas, não só o português", () => {
    expect(DURACAO_TOTAL_MAXIMA_MS).toBe(
      Math.max(...IDIOMAS.map((idioma) => duracaoTotal(idioma))),
    );
  });

  it("cabe no teto", () => {
    expect(DURACAO_TOTAL_MAXIMA_MS).toBeLessThanOrEqual(DURACAO_MAXIMA_MS);
  });
});

/**
 * A troca de idioma: apagar a frase antiga e escrever a nova. Não faz parte da
 * entrada — é resposta a um clique — mas sai da mesma fonte de verdade, porque
 * é o mesmo CSS que consome os dois conjuntos de tempos.
 */
describe("a duração da troca de idioma", () => {
  it("apaga em n fatias, e não em n-1 como a digitação", () => {
    // A diferença é proposital: na digitação o caractere 0 SURGE em t=0, então
    // entre n caracteres há n-1 intervalos. No apagamento cada caractere ocupa
    // uma fatia inteira ANTES de sumir — se fosse n-1, o último sumiria no
    // mesmo quadro do clique e a frase perderia uma letra de graça.
    expect(duracaoApagamento("pt")).toBe(
      caracteres("pt") * ATOS.msPorCaractereApagando,
    );
    expect(duracaoApagamento("en")).toBe(
      caracteres("en") * ATOS.msPorCaractereApagando,
    );
  });

  it("apaga mais rápido do que escreve — é um backspace, não uma segunda escrita", () => {
    expect(ATOS.msPorCaractereApagando).toBeLessThan(ATOS.msPorCaractere);
    for (const idioma of IDIOMAS) {
      expect(duracaoApagamento(idioma)).toBeLessThan(duracaoEscrita(idioma));
    }
  });

  it("a reescrita não repete a espera da abertura", () => {
    // INICIO_FRASE existe para deixar a logo e o topo entrarem primeiro. Numa
    // troca não há nada disso acontecendo: quem entra no lugar é `esperaTroca`.
    for (const idioma of IDIOMAS) {
      expect(duracaoEscrita(idioma)).toBe(
        ATOS.esperaTroca +
          (caracteres(idioma) - 1) * ATOS.msPorCaractere +
          ATOS.saidaCursor,
      );
      expect(duracaoEscrita(idioma)).toBeLessThan(duracaoTotal(idioma));
    }
  });

  it("a troca inteira cabe em menos tempo que a abertura", () => {
    // Não é um teto arbitrário: se apagar + reescrever passasse da própria
    // entrada, a troca de idioma seria a coisa mais lenta da página.
    for (const idioma of IDIOMAS) {
      expect(duracaoApagamento(idioma) + duracaoEscrita(idioma)).toBeLessThan(
        DURACAO_TOTAL_MAXIMA_MS,
      );
    }
  });
});

describe("o que o CSS recebe", () => {
  it("entrega só tempos derivados, nenhum número solto", () => {
    expect(TEMPOS["--t-pulso"]).toBe(`${INICIO_PULSO}ms`);
    expect(TEMPOS["--t-topo"]).toBe(`${INICIO_TOPO}ms`);
    expect(TEMPOS["--t-frase"]).toBe(`${INICIO_FRASE}ms`);
    expect(TEMPOS["--d-caractere"]).toBe(`${ATOS.msPorCaractere}ms`);
    expect(TEMPOS["--d-apagar"]).toBe(`${ATOS.msPorCaractereApagando}ms`);
    expect(TEMPOS["--t-troca"]).toBe(`${ATOS.esperaTroca}ms`);
  });

  it("entrega exatamente os tempos que o CSS consome, nem a mais nem a menos", () => {
    expect(Object.keys(TEMPOS).sort()).toEqual([
      "--d-apagar",
      "--d-caractere",
      "--d-crescimento",
      "--d-cursor",
      "--d-pulso",
      "--d-topo",
      "--t-frase",
      "--t-pulso",
      "--t-topo",
      "--t-troca",
    ]);
  });
});
