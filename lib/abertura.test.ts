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
    expect(duracaoTotal("pt")).toBe(4484);
    expect(duracaoTotal("en")).toBe(4178);
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

describe("o que o CSS recebe", () => {
  it("entrega só tempos derivados, nenhum número solto", () => {
    expect(TEMPOS["--t-pulso"]).toBe(`${INICIO_PULSO}ms`);
    expect(TEMPOS["--t-topo"]).toBe(`${INICIO_TOPO}ms`);
    expect(TEMPOS["--t-frase"]).toBe(`${INICIO_FRASE}ms`);
    expect(TEMPOS["--d-caractere"]).toBe(`${ATOS.msPorCaractere}ms`);
  });

  it("entrega exatamente os tempos que o CSS consome, nem a mais nem a menos", () => {
    expect(Object.keys(TEMPOS).sort()).toEqual([
      "--d-caractere",
      "--d-crescimento",
      "--d-cursor",
      "--d-pulso",
      "--d-topo",
      "--t-frase",
      "--t-pulso",
      "--t-topo",
    ]);
  });
});
