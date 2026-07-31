import { describe, it, expect } from "vitest";
import {
  PARAMETROS,
  brilhoDaCelula,
  devePular,
  ganho,
  hexParaRgb,
  misturar,
  montarGrade,
  semearCelulas,
} from "./malha";

/** Entrada mínima de `brilhoDaCelula`, para cada teste mudar só o que importa. */
function entrada(sobrescreve: Partial<Parameters<typeof brilhoDaCelula>[0]> = {}) {
  return {
    anterior: 0,
    fator: 1,
    fase: 0,
    tempo: 0,
    distancia2: 1e12,
    raio2: 90000,
    temLuz: false,
    cintila: false,
    ...sobrescreve,
  };
}

describe("montarGrade", () => {
  it("cobre a tela inteira, com folga de uma coluna e uma linha", () => {
    const g = montarGrade({
      larguraCss: 1000,
      alturaCss: 600,
      larguraChar: 10,
      alturaLinha: 16,
    });
    expect(g.colunas * 10).toBeGreaterThanOrEqual(1000 - PARAMETROS.padX);
    expect(g.linhas * 16).toBeGreaterThanOrEqual(600 - PARAMETROS.padY);
    expect(g.total).toBe(g.colunas * g.linhas);
  });

  it("devolve grade vazia quando a métrica ainda não existe", () => {
    const g = montarGrade({
      larguraCss: 1000,
      alturaCss: 600,
      larguraChar: 0,
      alturaLinha: 0,
    });
    expect(g).toEqual({ colunas: 0, linhas: 0, total: 0 });
  });
});

describe("semearCelulas", () => {
  it("alterna 2 e 0 célula a célula", () => {
    const c = semearCelulas(4, () => 0.5);
    expect(Array.from(c.chars)).toEqual([0, 1, 0, 1]);
  });

  it("mantém os fatores entre 0.5 e 1", () => {
    const c = semearCelulas(3, () => 1);
    expect(Array.from(c.fatores)).toEqual([1, 1, 1]);
    const d = semearCelulas(3, () => 0);
    expect(Array.from(d.fatores)).toEqual([0.5, 0.5, 0.5]);
  });

  it("começa com todos os brilhos zerados", () => {
    const c = semearCelulas(5);
    expect(Array.from(c.brilhos).every((v) => v === 0)).toBe(true);
  });
});

describe("brilhoDaCelula", () => {
  it("decai a 0.9 por quadro quando não há luz nem cintilação", () => {
    expect(brilhoDaCelula(entrada({ anterior: 1 }))).toBeCloseTo(0.9, 5);
    expect(brilhoDaCelula(entrada({ anterior: 0.9 }))).toBeCloseTo(0.81, 5);
  });

  it("apaga na hora quando o decaimento é zero (movimento reduzido)", () => {
    expect(brilhoDaCelula(entrada({ anterior: 1, decaimento: 0 }))).toBe(0);
  });

  it("acende a 1 no centro exato da luz", () => {
    const v = brilhoDaCelula(entrada({ temLuz: true, distancia2: 0 }));
    expect(v).toBeCloseTo(1, 5);
  });

  it("não acende nada fora do raio", () => {
    const v = brilhoDaCelula(entrada({ temLuz: true, distancia2: 90001, raio2: 90000 }));
    expect(v).toBe(0);
  });

  it("acende menos quanto mais longe do centro", () => {
    const perto = brilhoDaCelula(entrada({ temLuz: true, distancia2: 10000 }));
    const longe = brilhoDaCelula(entrada({ temLuz: true, distancia2: 40000 }));
    expect(perto).toBeGreaterThan(longe);
  });

  it("a cintilação nunca passa da amplitude", () => {
    for (let t = 0; t < 20; t += 0.37) {
      const v = brilhoDaCelula(entrada({ cintila: true, tempo: t }));
      expect(v).toBeLessThanOrEqual(PARAMETROS.amplitudeCintilacao + 1e-6);
    }
  });

  it("a luz vence a cintilação, e a cintilação vence o decaimento", () => {
    const so = brilhoDaCelula(entrada({ cintila: true, tempo: 1 }));
    const com = brilhoDaCelula(entrada({ cintila: true, tempo: 1, temLuz: true, distancia2: 0 }));
    expect(com).toBeGreaterThan(so);
    expect(brilhoDaCelula(entrada({ anterior: 0.001, cintila: true, tempo: 1 }))).toBe(so);
  });
});

describe("devePular", () => {
  it("nunca pula enquanto a malha cintila", () => {
    expect(devePular({ cintila: true, mudou: false, precisaDesenhar: false })).toBe(false);
  });

  it("pula quando não cintila, nada mudou e não há pedido de redesenho", () => {
    expect(devePular({ cintila: false, mudou: false, precisaDesenhar: false })).toBe(true);
  });

  it("não pula quando a luz se moveu", () => {
    expect(devePular({ cintila: false, mudou: true, precisaDesenhar: false })).toBe(false);
  });

  it("não pula quando alguém pediu redesenho (resize, fonte, volta de aba)", () => {
    expect(devePular({ cintila: false, mudou: false, precisaDesenhar: true })).toBe(false);
  });
});

describe("cor", () => {
  it("lê hexadecimal", () => {
    expect(hexParaRgb("#28d305")).toEqual([40, 211, 5]);
    expect(hexParaRgb("171717")).toEqual([23, 23, 23]);
  });

  it("mistura entre repouso e luz", () => {
    expect(misturar([23, 23, 23], [40, 211, 5], 0)).toEqual([23, 23, 23]);
    expect(misturar([23, 23, 23], [40, 211, 5], 1)).toEqual([40, 211, 5]);
  });

  it("o ganho satura em 1", () => {
    expect(ganho(1, 0.85)).toBeCloseTo(0.85, 5);
    expect(ganho(2, 0.85)).toBe(1);
  });
});
