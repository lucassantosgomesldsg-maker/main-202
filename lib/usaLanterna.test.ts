import { describe, it, expect } from "vitest";
import {
  passo,
  estadoInicial,
  ATRITO,
  MARGEM_PX,
  PARADA_MS,
  PESO,
  QUADRO_MS,
  SEGUIMENTO,
  V_MINIMA,
  type EstadoLanterna,
} from "./usaLanterna";

const LIMITES = { largura: 1000, altura: 800 };

/** Estado com o mouse tendo se movido "agora mesmo" (perseguindo). */
function perseguindo(parcial: Partial<EstadoLanterna> = {}): EstadoLanterna {
  return {
    ...estadoInicial(0, 0),
    ultimoMovimento: 1000,
    ...parcial,
  };
}

const velocidade = (e: EstadoLanterna) => Math.hypot(e.vx, e.vy);

describe("passo — perseguindo o cursor", () => {
  it("se aproxima do alvo a cada quadro e nunca o ultrapassa", () => {
    let e = perseguindo({ x: 100, y: 100, alvoX: 900, alvoY: 700 });
    let distanciaAnterior = Math.hypot(e.alvoX - e.x, e.alvoY - e.y);

    for (let i = 0; i < 60; i++) {
      const anterior = e;
      e = passo(e, 1000, 1, LIMITES);

      const distancia = Math.hypot(e.alvoX - e.x, e.alvoY - e.y);
      expect(distancia).toBeLessThan(distanciaAnterior);
      distanciaAnterior = distancia;

      // Nunca ultrapassa: continua do mesmo lado do alvo nos dois eixos.
      expect(Math.sign(e.alvoX - e.x)).toBe(Math.sign(anterior.alvoX - anterior.x));
      expect(Math.sign(e.alvoY - e.y)).toBe(Math.sign(anterior.alvoY - anterior.y));
    }
  });

  it("não ultrapassa nem com o fator de quadro no teto (3)", () => {
    // A garantia: a fração coberta num quadro de fator 3 ainda é < 1.
    expect(1 - (1 - SEGUIMENTO) ** 3).toBeLessThan(1);

    let e = perseguindo({ x: 0, y: 0, alvoX: 500, alvoY: 500 });
    for (let i = 0; i < 40; i++) {
      e = passo(e, 1000, 3, LIMITES);
      expect(e.x).toBeLessThan(e.alvoX);
      expect(e.y).toBeLessThan(e.alvoY);
    }
  });

  it("acumula velocidade no sentido do movimento", () => {
    let e = perseguindo({ x: 500, y: 400, alvoX: 900, alvoY: 100 });
    for (let i = 0; i < 10; i++) e = passo(e, 1000, 1, LIMITES);

    expect(e.vx).toBeGreaterThan(0); // indo para a direita
    expect(e.vy).toBeLessThan(0); // indo para cima
  });

  it("um fator maior avança mais a luz no mesmo passo", () => {
    const base = perseguindo({ x: 0, y: 0, alvoX: 1000, alvoY: 800 });

    const lento = passo(base, 1000, 0.5, LIMITES);
    const normal = passo(base, 1000, 1, LIMITES);
    const rapido = passo(base, 1000, 2, LIMITES);

    expect(lento.x).toBeLessThan(normal.x);
    expect(normal.x).toBeLessThan(rapido.x);
  });
});

describe("passo — deslizando por inércia", () => {
  /** Constrói um estado já deslizando, com velocidade conhecida. */
  function deslizando(vx: number, vy: number): EstadoLanterna {
    return {
      ...estadoInicial(500, 400),
      vx,
      vy,
      alvoX: 500,
      alvoY: 400,
      ultimoMovimento: 0,
    };
  }

  it("continua andando no mesmo sentido em que vinha", () => {
    const antes = deslizando(6, -4);
    const agora = 0 + PARADA_MS + 1; // mouse parado há mais que PARADA_MS

    const depois = passo(antes, agora, 1, LIMITES);

    // O sinal da velocidade se mantém no primeiro quadro de deslizamento…
    expect(Math.sign(depois.vx)).toBe(Math.sign(antes.vx));
    expect(Math.sign(depois.vy)).toBe(Math.sign(antes.vy));
    // …e a posição de fato andou nesse mesmo rumo, longe do alvo (que está
    // exatamente onde a luz estava — se estivesse perseguindo, não sairia dali).
    expect(depois.x).toBeGreaterThan(antes.x);
    expect(depois.y).toBeLessThan(antes.y);
  });

  it("preserva a direção do vetor ao longo de todo o deslizamento", () => {
    let e = deslizando(6, -4);
    const anguloInicial = Math.atan2(e.vy, e.vx);

    for (let i = 0; i < 20; i++) {
      e = passo(e, 5000, 1, LIMITES);
      if (velocidade(e) === 0) break;
      expect(Math.atan2(e.vy, e.vx)).toBeCloseTo(anguloInicial, 6);
    }
  });

  it("desacelera monotonicamente até parar de vez", () => {
    let e = deslizando(9, 5);
    let anterior = velocidade(e);
    let parouEm = -1;

    for (let i = 0; i < 500; i++) {
      e = passo(e, 5000, 1, LIMITES);
      const v = velocidade(e);
      expect(v).toBeLessThanOrEqual(anterior);
      anterior = v;
      if (v === 0) {
        parouEm = i;
        break;
      }
    }

    expect(parouEm).toBeGreaterThan(0);
    expect(e.vx).toBe(0);
    expect(e.vy).toBe(0);
  });

  it("zera a velocidade assim que ela cai abaixo de V_MINIMA", () => {
    const e = passo(deslizando(V_MINIMA * 0.9, 0), 5000, 1, LIMITES);
    expect(e.vx).toBe(0);
    expect(e.vy).toBe(0);
  });

  it("um mousemove novo no meio do deslizamento volta a perseguir", () => {
    let e = deslizando(8, 0); // deslizando para a direita
    e = passo(e, 5000, 1, LIMITES);
    expect(e.x).toBeGreaterThan(500);

    // Chega um mousemove: alvo à esquerda, e ultimoMovimento = agora.
    const agora = 6000;
    const retomado = passo(
      { ...e, alvoX: 0, alvoY: 400, ultimoMovimento: agora },
      agora,
      1,
      LIMITES
    );

    // Perseguindo: anda na direção do alvo (esquerda), ignorando a inércia
    // que apontava para a direita.
    expect(retomado.x).toBeLessThan(e.x);
  });

  // ATENÇÃO: este teste cobre SÓ o ramo do atrito. Com ultimoMovimento = 0 e
  // `agora` fixo, `passo` nunca sai de "deslizando" — ele não diz nada sobre a
  // perseguição, que é onde a velocidade de escape nasce. A independência de
  // taxa de quadros do ramo de perseguição está no describe seguinte.
  it("o deslizamento em si independe da taxa de quadros", () => {
    // Mesmos 500 ms de deslizamento, a 60 fps e a 120 fps.
    const inicial = deslizando(10, 6);

    let a60 = inicial;
    for (let i = 0; i < 30; i++) a60 = passo(a60, 5000, 1, LIMITES);

    let a120 = inicial;
    for (let i = 0; i < 60; i++) a120 = passo(a120, 5000, 0.5, LIMITES);

    // Um monitor de 144 Hz não pode deslizar mais longe que um de 60 Hz.
    // A precisão é alta de propósito: o esquema é exatamente componível, não
    // só aproximadamente — dois quadros de fator 1 == um quadro de fator 2.
    expect(a120.x).toBeCloseTo(a60.x, 5);
    expect(a120.y).toBeCloseTo(a60.y, 5);
    expect(velocidade(a120)).toBeCloseTo(velocidade(a60), 5);
  });
});

/**
 * A parte que mais importa e a que menos se vê: a velocidade de ESCAPE — a
 * que a luz leva para o deslizamento — nasce toda no ramo de perseguição. Se
 * ela depender da taxa de quadros, o deslize tem a forma certa e o tamanho
 * errado, e um monitor de 144 Hz joga a luz mais longe que um de 60 Hz.
 *
 * O critério aqui é composicionalidade: dividir um quadro em pedaços tem que
 * dar exatamente o mesmo resultado que dar o quadro inteiro de uma vez —
 * para x/y E para vx/vy.
 */
describe("passo — independência de taxa de quadros na perseguição", () => {
  const perseguindoRapido = (): EstadoLanterna => ({
    ...estadoInicial(0, 0),
    x: 100,
    y: 80,
    vx: 3,
    vy: -2,
    alvoX: 900,
    alvoY: 700,
    ultimoMovimento: 1000,
  });

  /** Aplica uma sequência de fatores a partir do mesmo estado. */
  const aplicar = (fatores: number[]) =>
    fatores.reduce((e, f) => passo(e, 1000, f, LIMITES), perseguindoRapido());

  it("dois quadros de fator 1 chegam ao mesmo estado que um de fator 2", () => {
    const dividido = aplicar([1, 1]);
    const inteiro = aplicar([2]);

    expect(inteiro.x).toBeCloseTo(dividido.x, 10);
    expect(inteiro.y).toBeCloseTo(dividido.y, 10);
    // Estes dois são os que quebravam: a posição já compunha, a velocidade não.
    expect(inteiro.vx).toBeCloseTo(dividido.vx, 10);
    expect(inteiro.vy).toBeCloseTo(dividido.vy, 10);
  });

  it("quatro quadros de fator 0,5 chegam ao mesmo estado que um de fator 2", () => {
    const dividido = aplicar([0.5, 0.5, 0.5, 0.5]);
    const inteiro = aplicar([2]);

    expect(inteiro.x).toBeCloseTo(dividido.x, 10);
    expect(inteiro.vx).toBeCloseTo(dividido.vx, 10);
    expect(inteiro.vy).toBeCloseTo(dividido.vy, 10);
  });

  it("uma divisão irregular também compõe (0,3 + 0,7 + 1 = 2)", () => {
    // Quadros reais nunca chegam em tamanhos redondos — é este o caso de uso.
    const dividido = aplicar([0.3, 0.7, 1]);
    const inteiro = aplicar([2]);

    expect(inteiro.x).toBeCloseTo(dividido.x, 10);
    expect(inteiro.vx).toBeCloseTo(dividido.vx, 10);
    expect(inteiro.vy).toBeCloseTo(dividido.vy, 10);
  });

  it("com fator 1 a fórmula continua sendo literalmente a do brief", () => {
    // A independência de taxa de quadros não pode custar o comportamento a
    // 60 fps: aqui a conta tem que bater com `v = v*(1-PESO) + d*SEGUIMENTO*PESO`.
    const antes = perseguindoRapido();
    const depois = passo(antes, 1000, 1, LIMITES);

    const distanciaX = antes.alvoX - antes.x;
    const distanciaY = antes.alvoY - antes.y;

    expect(depois.x).toBeCloseTo(antes.x + distanciaX * SEGUIMENTO, 10);
    expect(depois.vx).toBeCloseTo(
      antes.vx * (1 - PESO) + distanciaX * SEGUIMENTO * PESO,
      10
    );
    expect(depois.vy).toBeCloseTo(
      antes.vy * (1 - PESO) + distanciaY * SEGUIMENTO * PESO,
      10
    );
  });

  /** Arrasto em velocidade constante, amostrado na taxa de quadros dada. */
  function arrastar(fps: number, duracaoMs: number, pxPorMs: number) {
    const dt = 1000 / fps;
    const fator = dt / QUADRO_MS;
    let estado = estadoInicial(0, 0);
    for (let t = dt; t <= duracaoMs; t += dt) {
      estado = passo(
        { ...estado, alvoX: pxPorMs * t, alvoY: 0, ultimoMovimento: t },
        t,
        fator,
        { largura: 1e6, altura: 1e6 }
      );
    }
    return estado;
  }

  /** Solta o estado no deslizamento e mede o quanto a luz ainda anda. */
  function deslizeTotal(estado: EstadoLanterna) {
    let e: EstadoLanterna = { ...estado, ultimoMovimento: -1e6 };
    const x0 = e.x;
    for (let i = 0; i < 5000 && (e.vx !== 0 || e.vy !== 0); i++) {
      e = passo(e, 0, 1, { largura: 1e6, altura: 1e6 });
    }
    return e.x - x0;
  }

  it("um arrasto constante entrega a mesma velocidade de escape a 60 e a 144 Hz", () => {
    const a60 = arrastar(60, 500, 1.2);
    const a144 = arrastar(144, 500, 1.2);

    const diferenca = Math.abs(a144.vx - a60.vx) / a60.vx;
    // Sobra só o erro de amostragem do alvo (o cursor é lido uma vez por
    // quadro e tratado como parado dentro dele), que não dá para eliminar sem
    // conhecer a velocidade do cursor. Antes da correção este número era ~5,5%.
    expect(diferenca).toBeLessThan(0.01);
  });

  it("e portanto o mesmo deslize total depois que o cursor para", () => {
    const d60 = deslizeTotal(arrastar(60, 500, 1.2));
    const d144 = deslizeTotal(arrastar(144, 500, 1.2));

    expect(Math.abs(d144 - d60) / d60).toBeLessThan(0.01);
    // E em pixels, que é o que o visitante enxerga: antes eram ~30px de
    // diferença no arremesso da luz entre um monitor e outro.
    expect(Math.abs(d144 - d60)).toBeLessThan(3);
  });

  it("PESO e SEGUIMENTO precisam continuar diferentes", () => {
    // A forma fechada da velocidade divide por (PESO - SEGUIMENTO). Se alguém
    // igualar as duas constantes, o termo degenera — melhor quebrar aqui do
    // que virar NaN na tela.
    expect(PESO).not.toBe(SEGUIMENTO);
  });
});

describe("passo — limites da viewport", () => {
  it("não deixa a luz escapar mais que a margem permitida", () => {
    let e: EstadoLanterna = {
      ...estadoInicial(990, 790),
      vx: 40,
      vy: 40,
      alvoX: 990,
      alvoY: 790,
      ultimoMovimento: 0,
    };

    for (let i = 0; i < 200; i++) {
      e = passo(e, 5000, 1, LIMITES);
      expect(e.x).toBeLessThanOrEqual(LIMITES.largura + MARGEM_PX);
      expect(e.y).toBeLessThanOrEqual(LIMITES.altura + MARGEM_PX);
      expect(e.x).toBeGreaterThanOrEqual(-MARGEM_PX);
      expect(e.y).toBeGreaterThanOrEqual(-MARGEM_PX);
    }
  });

  it("segura a luz na borda de baixo/esquerda também", () => {
    let e: EstadoLanterna = {
      ...estadoInicial(5, 5),
      vx: -40,
      vy: -40,
      alvoX: 5,
      alvoY: 5,
      ultimoMovimento: 0,
    };
    for (let i = 0; i < 200; i++) {
      e = passo(e, 5000, 1, LIMITES);
      expect(e.x).toBeGreaterThanOrEqual(-MARGEM_PX);
      expect(e.y).toBeGreaterThanOrEqual(-MARGEM_PX);
    }
  });
});

describe("passo — bordas de contrato", () => {
  it("fator zero não move nada", () => {
    const antes = perseguindo({ x: 10, y: 20, alvoX: 900, alvoY: 900 });
    const depois = passo(antes, 1000, 0, LIMITES);
    expect(depois.x).toBe(antes.x);
    expect(depois.y).toBe(antes.y);
  });

  it("não muda o estado de entrada (função pura)", () => {
    const antes = perseguindo({ x: 10, y: 20, alvoX: 900, alvoY: 900 });
    const copia = { ...antes };
    passo(antes, 1000, 1, LIMITES);
    expect(antes).toEqual(copia);
  });

  it("as constantes são as combinadas no brief", () => {
    expect(SEGUIMENTO).toBe(0.18);
    expect(ATRITO).toBe(0.94);
    expect(PARADA_MS).toBe(70);
    expect(V_MINIMA).toBe(0.02);
  });
});
