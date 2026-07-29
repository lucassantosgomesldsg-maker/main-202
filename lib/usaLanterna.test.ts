import { describe, it, expect } from "vitest";
import {
  passo,
  estadoInicial,
  imaAssentado,
  ATRITO,
  CAPTURA,
  ESCALA_IMA,
  FATOR_MAXIMO,
  MARGEM_ESCAPE,
  MARGEM_IMA,
  MARGEM_PX,
  PARADA_MS,
  PESO,
  QUADRO_MS,
  RAIO_SEGUIMENTO,
  SEGUIMENTO,
  V_MINIMA,
  type AlvoIma,
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

// ═══════════════════════════════════════════════════════════════════════════
// O ímã (Task 11): a luz gruda em alvos marcados e só sai se for puxada.
// ═══════════════════════════════════════════════════════════════════════════

/** Um alvo de 200x100 no meio da tela: centro exato em (500, 350). */
const IMA: AlvoIma = {
  id: "contato",
  esquerda: 400,
  topo: 300,
  largura: 200,
  altura: 100,
};

const centroDe = (a: AlvoIma) => ({
  x: a.esquerda + a.largura / 2,
  y: a.topo + a.altura / 2,
});

/** Estado já capturado por `a`, com o cursor onde o teste mandar. */
function preso(a: AlvoIma, parcial: Partial<EstadoLanterna> = {}): EstadoLanterna {
  const c = centroDe(a);
  return {
    ...estadoInicial(c.x, c.y),
    alvoX: c.x,
    alvoY: c.y,
    capturado: a.id,
    escala: ESCALA_IMA,
    ultimoMovimento: 1000,
    ...parcial,
  };
}

describe("ímã — captura", () => {
  it("puxa a luz até o centro do alvo, sem ultrapassar", () => {
    const c = centroDe(IMA);
    let e = perseguindo({ x: 60, y: 700, alvoX: c.x, alvoY: c.y });
    let distanciaAnterior = Math.hypot(c.x - e.x, c.y - e.y);

    for (let i = 0; i < 80; i++) {
      const anterior = e;
      e = passo(e, 1000, 1, LIMITES, [IMA]);

      expect(e.capturado).toBe("contato");

      const distancia = Math.hypot(c.x - e.x, c.y - e.y);
      expect(distancia).toBeLessThan(distanciaAnterior);
      distanciaAnterior = distancia;

      // Não ultrapassa: continua do mesmo lado do centro nos dois eixos.
      expect(Math.sign(c.x - e.x)).toBe(Math.sign(c.x - anterior.x));
      expect(Math.sign(c.y - e.y)).toBe(Math.sign(c.y - anterior.y));
    }

    expect(e.x).toBeCloseTo(c.x, 5);
    expect(e.y).toBeCloseTo(c.y, 5);
  });

  it("não ultrapassa nem com o fator de quadro no teto", () => {
    expect(1 - (1 - CAPTURA) ** FATOR_MAXIMO).toBeLessThan(1);

    const c = centroDe(IMA);
    let e = perseguindo({ x: 0, y: 0, alvoX: c.x, alvoY: c.y });
    for (let i = 0; i < 40; i++) {
      e = passo(e, 1000, FATOR_MAXIMO, LIMITES, [IMA]);
      expect(e.x).toBeLessThan(c.x);
      expect(e.y).toBeLessThan(c.y);
    }
  });

  it("captura mesmo com o cursor fora do retângulo, dentro da margem de entrada", () => {
    const dentro = perseguindo({
      x: 0,
      y: 0,
      alvoX: IMA.esquerda - (MARGEM_IMA - 1),
      alvoY: centroDe(IMA).y,
    });
    expect(passo(dentro, 1000, 1, LIMITES, [IMA]).capturado).toBe("contato");
  });

  it("não captura com o cursor além da margem de entrada", () => {
    const fora = perseguindo({
      x: 0,
      y: 0,
      alvoX: IMA.esquerda - (MARGEM_IMA + 1),
      alvoY: centroDe(IMA).y,
    });
    const depois = passo(fora, 1000, 1, LIMITES, [IMA]);
    expect(depois.capturado).toBeNull();
    expect(depois.escala).toBe(1);
    // E continua perseguindo o cursor como sempre fez.
    expect(depois.x).toBeCloseTo(fora.x + (fora.alvoX - fora.x) * SEGUIMENTO, 10);
  });

  it("a luz parada no alvo continua presa mesmo com o mouse parado há muito", () => {
    // Sem ímã este estado deslizaria; capturado, ele fica.
    const e = preso(IMA, { x: 200, y: 200, ultimoMovimento: 0, vx: 9, vy: 9 });
    const depois = passo(e, 99_999, 1, LIMITES, [IMA]);
    expect(depois.capturado).toBe("contato");
    expect(depois.x).toBeGreaterThan(e.x); // foi ao centro, não pelo deslize
    expect(depois.vx).toBe(0);
    expect(depois.vy).toBe(0);
  });
});

describe("ímã — desempate por centro mais próximo", () => {
  const A: AlvoIma = { id: "a", esquerda: 400, topo: 300, largura: 200, altura: 100 };
  const B: AlvoIma = { id: "b", esquerda: 560, topo: 300, largura: 200, altura: 100 };

  /** Qual alvo captura o cursor em (cx, cy), na ordem dada. */
  const vencedor = (cx: number, cy: number, alvos: AlvoIma[]) =>
    passo(perseguindo({ x: 0, y: 0, alvoX: cx, alvoY: cy }), 1000, 1, LIMITES, alvos)
      .capturado;

  it("com dois alvos sobrepostos vence o de centro mais próximo", () => {
    // (570, 350) está dentro dos dois retângulos dilatados: 70px do centro de
    // A (500) e 90px do de B (660).
    expect(vencedor(570, 350, [A, B])).toBe("a");
    // (620, 350): 120px de A, 40px de B.
    expect(vencedor(620, 350, [A, B])).toBe("b");
  });

  it("o desempate não depende da ordem do array", () => {
    expect(vencedor(570, 350, [B, A])).toBe("a");
    expect(vencedor(620, 350, [B, A])).toBe("b");
  });
});

describe("ímã — histerese e soltura", () => {
  const c = centroDe(IMA);
  /** 40px à esquerda do retângulo: além da entrada (24), aquém da escape (64). */
  const NO_MEIO = { x: IMA.esquerda - 40, y: c.y };

  it("a margem de escape é maior que a de entrada", () => {
    expect(MARGEM_ESCAPE).toBeGreaterThan(MARGEM_IMA);
  });

  it("o mesmo ponto não captura quando livre e não solta quando preso", () => {
    // É isto que faz "puxar para sair": a fronteira de entrada e a de saída
    // são diferentes, então não existe ponto onde a luz oscile entre os dois.
    const livre = perseguindo({ x: 0, y: 0, alvoX: NO_MEIO.x, alvoY: NO_MEIO.y });
    expect(passo(livre, 1000, 1, LIMITES, [IMA]).capturado).toBeNull();

    const capturada = preso(IMA, { alvoX: NO_MEIO.x, alvoY: NO_MEIO.y });
    expect(passo(capturada, 1000, 1, LIMITES, [IMA]).capturado).toBe("contato");
  });

  it("passear com o cursor dentro da margem de escape não solta", () => {
    const dentro = [
      { x: IMA.esquerda - (MARGEM_ESCAPE - 1), y: c.y },
      { x: IMA.esquerda + IMA.largura + (MARGEM_ESCAPE - 1), y: c.y },
      { x: c.x, y: IMA.topo - (MARGEM_ESCAPE - 1) },
      { x: c.x, y: IMA.topo + IMA.altura + (MARGEM_ESCAPE - 1) },
      { x: c.x, y: c.y },
    ];

    let e = preso(IMA);
    for (const ponto of dentro) {
      e = passo({ ...e, alvoX: ponto.x, alvoY: ponto.y }, 1000, 1, LIMITES, [IMA]);
      expect(e.capturado).toBe("contato");
      // E não saiu do centro: a luz fica onde estava, o cursor é que passeia.
      expect(e.x).toBeCloseTo(c.x, 10);
      expect(e.y).toBeCloseTo(c.y, 10);
    }
  });

  it("solta quando o cursor vence a margem de escape, com velocidade zerada", () => {
    // vx/vy entram não-nulos de propósito: o teste é que a soltura ZERA a
    // inércia. Preservá-la arremessaria a luz no instante do escape.
    const e = preso(IMA, {
      vx: 12,
      vy: -8,
      alvoX: IMA.esquerda - (MARGEM_ESCAPE + 1),
      alvoY: c.y,
    });
    const depois = passo(e, 1000, 1, LIMITES, [IMA]);

    expect(depois.capturado).toBeNull();
    expect(depois.vx).toBe(0);
    expect(depois.vy).toBe(0);
  });

  it("solta também na diagonal, pelo canto do retângulo", () => {
    const e = preso(IMA, {
      alvoX: IMA.esquerda - (MARGEM_ESCAPE + 1),
      alvoY: IMA.topo - (MARGEM_ESCAPE + 1),
    });
    expect(passo(e, 1000, 1, LIMITES, [IMA]).capturado).toBeNull();
  });

  it("solto, o quadro seguinte volta a perseguir normalmente", () => {
    const solto = passo(
      preso(IMA, { alvoX: IMA.esquerda - 200, alvoY: c.y }),
      1000,
      1,
      LIMITES,
      [IMA]
    );
    const seguinte = passo(solto, 1000, 1, LIMITES, [IMA]);
    expect(seguinte.x).toBeLessThan(solto.x); // andou rumo ao cursor, à esquerda
    expect(seguinte.vx).toBeLessThan(0);
  });

  it("some com o alvo (remedição sem ele) também solta e zera a velocidade", () => {
    const e = preso(IMA, { vx: 12, vy: -8 });
    const depois = passo(e, 1000, 1, LIMITES, []);
    expect(depois.capturado).toBeNull();
    expect(depois.vx).toBe(0);
    expect(depois.vy).toBe(0);
  });
});

describe("ímã — escala do raio", () => {
  const c = centroDe(IMA);

  it("cresce até ESCALA_IMA ao capturar e nunca ultrapassa", () => {
    let e = perseguindo({ x: c.x, y: c.y, alvoX: c.x, alvoY: c.y });
    expect(e.escala).toBe(1);

    let anterior = e.escala;
    for (let i = 0; i < 80; i++) {
      e = passo(e, 1000, 1, LIMITES, [IMA]);
      expect(e.escala).toBeGreaterThan(anterior);
      expect(e.escala).toBeLessThanOrEqual(ESCALA_IMA);
      anterior = e.escala;
    }
    expect(e.escala).toBeCloseTo(ESCALA_IMA, 5);
  });

  it("volta a 1 ao soltar e nunca cai abaixo", () => {
    let e = preso(IMA, { alvoX: 0, alvoY: 0 }); // cursor longe: solta já no 1º
    let anterior = e.escala;
    for (let i = 0; i < 80; i++) {
      e = passo(e, 1000, 1, LIMITES, [IMA]);
      expect(e.escala).toBeLessThan(anterior);
      expect(e.escala).toBeGreaterThanOrEqual(1);
      anterior = e.escala;
    }
    expect(e.escala).toBeCloseTo(1, 5);
  });

  it("com fator 1 a escala é literalmente a fórmula do brief", () => {
    const e = perseguindo({ x: c.x, y: c.y, alvoX: c.x, alvoY: c.y, escala: 1.4 });
    const depois = passo(e, 1000, 1, LIMITES, [IMA]);
    expect(depois.escala).toBeCloseTo(1.4 + (ESCALA_IMA - 1.4) * RAIO_SEGUIMENTO, 12);
  });
});

describe("ímã — independência de taxa de quadros", () => {
  const c = centroDe(IMA);

  /** Preso, longe do centro, escala no meio do caminho. */
  const inicial = (): EstadoLanterna =>
    preso(IMA, { x: c.x - 400, y: c.y - 300, escala: 1.3 });

  const aplicar = (fatores: number[]) =>
    fatores.reduce((e, f) => passo(e, 1000, f, LIMITES, [IMA]), inicial());

  it("dois quadros de fator 1 chegam ao mesmo estado que um de fator 2", () => {
    const dividido = aplicar([1, 1]);
    const inteiro = aplicar([2]);

    expect(inteiro.x).toBeCloseTo(dividido.x, 10);
    expect(inteiro.y).toBeCloseTo(dividido.y, 10);
    expect(inteiro.escala).toBeCloseTo(dividido.escala, 12);
  });

  it("quatro quadros de fator 0,5 chegam ao mesmo estado que um de fator 2", () => {
    const dividido = aplicar([0.5, 0.5, 0.5, 0.5]);
    const inteiro = aplicar([2]);

    expect(inteiro.x).toBeCloseTo(dividido.x, 10);
    expect(inteiro.y).toBeCloseTo(dividido.y, 10);
    expect(inteiro.escala).toBeCloseTo(dividido.escala, 12);
  });

  it("uma divisão irregular também compõe (0,3 + 0,7 + 1 = 2)", () => {
    const dividido = aplicar([0.3, 0.7, 1]);
    const inteiro = aplicar([2]);

    expect(inteiro.x).toBeCloseTo(dividido.x, 10);
    expect(inteiro.escala).toBeCloseTo(dividido.escala, 12);
  });

  it("com fator 1 a captura é literalmente a fórmula do brief", () => {
    const antes = inicial();
    const depois = passo(antes, 1000, 1, LIMITES, [IMA]);
    expect(depois.x).toBeCloseTo(antes.x + (c.x - antes.x) * CAPTURA, 10);
    expect(depois.y).toBeCloseTo(antes.y + (c.y - antes.y) * CAPTURA, 10);
  });

  it("a mesma captura em 250ms leva ao mesmo lugar a 60 e a 144 Hz", () => {
    const fator144 = (1000 / 144) / QUADRO_MS;
    let a60 = inicial();
    for (let i = 0; i < 15; i++) a60 = passo(a60, 1000, 1, LIMITES, [IMA]);

    let a144 = inicial();
    for (let i = 0; i < 36; i++) a144 = passo(a144, 1000, fator144, LIMITES, [IMA]);

    expect(a144.x).toBeCloseTo(a60.x, 5);
    expect(a144.y).toBeCloseTo(a60.y, 5);
    expect(a144.escala).toBeCloseTo(a60.escala, 5);
  });
});

/**
 * A regressão mais provável desta tarefa: mexer no ímã e mudar sem querer a
 * física que o Lucas já aprovou. O critério aqui não é "parecido": é
 * `toBe` — igualdade de ponto flutuante bit a bit — contra uma cópia literal
 * de `passo` como ele era antes do ímã.
 */
describe("passo — sem alvos, idêntico ao de antes do ímã", () => {
  const GANHO = (SEGUIMENTO * PESO) / (PESO - SEGUIMENTO);

  const limitar = (v: number, min: number, max: number) =>
    v < min ? min : v > max ? max : v;

  /** Cópia literal do corpo de `passo` no commit anterior a esta tarefa. */
  function passoAntesDoIma(
    estado: EstadoLanterna,
    agora: number,
    fator: number,
    limites: typeof LIMITES
  ) {
    if (!(fator > 0)) return { ...estado };

    const f = Math.min(fator, FATOR_MAXIMO);
    const parado = agora - estado.ultimoMovimento > PARADA_MS;

    let x: number;
    let y: number;
    let vx: number;
    let vy: number;

    if (parado) {
      const sobrevivente = Math.pow(ATRITO, f);
      const avanco = (1 - sobrevivente) / (1 - ATRITO);
      x = estado.x + estado.vx * avanco;
      y = estado.y + estado.vy * avanco;
      vx = estado.vx * sobrevivente;
      vy = estado.vy * sobrevivente;
      if (Math.hypot(vx, vy) < V_MINIMA) {
        vx = 0;
        vy = 0;
      }
    } else {
      const restanteAlvo = Math.pow(1 - SEGUIMENTO, f);
      const restanteFiltro = Math.pow(1 - PESO, f);
      const k = 1 - restanteAlvo;
      const distanciaX = estado.alvoX - estado.x;
      const distanciaY = estado.alvoY - estado.y;
      x = estado.x + distanciaX * k;
      y = estado.y + distanciaY * k;
      const ganho = GANHO * (restanteAlvo - restanteFiltro);
      vx = estado.vx * restanteFiltro + distanciaX * ganho;
      vy = estado.vy * restanteFiltro + distanciaY * ganho;
    }

    const xLimitado = limitar(x, -MARGEM_PX, limites.largura + MARGEM_PX);
    const yLimitado = limitar(y, -MARGEM_PX, limites.altura + MARGEM_PX);
    if (xLimitado !== x) vx = 0;
    if (yLimitado !== y) vy = 0;

    return { x: xLimitado, y: yLimitado, vx, vy };
  }

  /** PRNG determinístico (mulberry32): o mesmo sorteio em toda execução. */
  function aleatorio(semente: number) {
    let s = semente;
    return () => {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  it("bate bit a bit em 2000 estados sorteados, nos dois ramos e nas bordas", () => {
    const sorteio = aleatorio(202);
    let perseguicoes = 0;
    let deslizes = 0;
    let naBorda = 0;

    for (let i = 0; i < 2000; i++) {
      const estado: EstadoLanterna = {
        ...estadoInicial(0, 0),
        x: sorteio() * 1200 - 100,
        y: sorteio() * 1000 - 100,
        vx: sorteio() * 80 - 40,
        vy: sorteio() * 80 - 40,
        alvoX: sorteio() * 1000,
        alvoY: sorteio() * 800,
        ultimoMovimento: 1000,
      };
      const fator = sorteio() * 3.5 + 0.01;
      // Metade dos sorteios cai no ramo do deslizamento.
      const agora = i % 2 === 0 ? 1000 : 1000 + PARADA_MS + 1;
      if (i % 2 === 0) perseguicoes++;
      else deslizes++;

      const antigo = passoAntesDoIma(estado, agora, fator, LIMITES);
      const novo = passo(estado, agora, fator, LIMITES);
      const comArrayVazio = passo(estado, agora, fator, LIMITES, []);

      expect(novo.x).toBe(antigo.x);
      expect(novo.y).toBe(antigo.y);
      expect(novo.vx).toBe(antigo.vx);
      expect(novo.vy).toBe(antigo.vy);
      // Passar um array vazio é o mesmo que não passar nada.
      expect(comArrayVazio).toEqual(novo);
      // E os campos novos ficam no repouso.
      expect(novo.capturado).toBeNull();
      expect(novo.escala).toBe(1);

      if (
        novo.x === -MARGEM_PX ||
        novo.x === LIMITES.largura + MARGEM_PX ||
        novo.y === -MARGEM_PX ||
        novo.y === LIMITES.altura + MARGEM_PX
      ) {
        naBorda++;
      }
    }

    // Guarda contra um sorteio que, por azar, não exercite os três caminhos.
    expect(perseguicoes).toBe(1000);
    expect(deslizes).toBe(1000);
    expect(naBorda).toBeGreaterThan(0);
  });

  it("fator zero continua não movendo nada, com ou sem alvos", () => {
    const antes = preso(IMA, { x: 10, y: 20 });
    expect(passo(antes, 1000, 0, LIMITES, [IMA])).toEqual(antes);
  });

  it("continua pura com alvos na jogada", () => {
    const antes = preso(IMA, { x: 10, y: 20 });
    const copia = { ...antes };
    const alvos = [IMA];
    passo(antes, 1000, 1, LIMITES, alvos);
    expect(antes).toEqual(copia);
    expect(alvos).toEqual([IMA]);
  });
});

describe("ímã — captura instantânea (prefers-reduced-motion)", () => {
  const c = centroDe(IMA);

  it("gruda no centro e cresce em um único quadro", () => {
    const e = perseguindo({ x: 0, y: 0, alvoX: c.x, alvoY: c.y });
    const depois = passo(e, 1000, 1, LIMITES, [IMA], true);

    expect(depois.capturado).toBe("contato");
    expect(depois.x).toBe(c.x);
    expect(depois.y).toBe(c.y);
    expect(depois.escala).toBe(ESCALA_IMA);
    expect(depois.vx).toBe(0);
    expect(depois.vy).toBe(0);
  });

  it("sem alvo capturado vai direto para o cursor, sem inércia", () => {
    const e = perseguindo({ x: 0, y: 0, alvoX: 123, alvoY: 456, vx: 9, vy: 9 });
    const depois = passo(e, 1000, 1, LIMITES, [IMA], true);

    expect(depois.capturado).toBeNull();
    expect(depois.x).toBe(123);
    expect(depois.y).toBe(456);
    expect(depois.escala).toBe(1);
    expect(depois.vx).toBe(0);
    expect(depois.vy).toBe(0);
  });
});

describe("imaAssentado — quando não há mais nada a animar", () => {
  const c = centroDe(IMA);

  it("é verdadeiro no repouso, sem alvo nenhum", () => {
    expect(imaAssentado(estadoInicial(10, 10), [])).toBe(true);
  });

  it("é falso enquanto a escala ainda está no caminho", () => {
    const e = { ...preso(IMA), escala: 1.5 };
    expect(imaAssentado(e, [IMA])).toBe(false);
  });

  it("é falso enquanto a luz ainda está longe do centro", () => {
    const e = preso(IMA, { x: c.x - 50 });
    expect(imaAssentado(e, [IMA])).toBe(false);
  });

  it("vira verdadeiro quando a captura termina", () => {
    // O primeiro quadro é o que captura: antes dele a luz está livre e com
    // escala 1, ou seja, assentada de verdade — não há o que animar ainda.
    let e = passo(
      perseguindo({ x: 0, y: 0, alvoX: c.x, alvoY: c.y }),
      1000,
      1,
      LIMITES,
      [IMA]
    );
    let quadros = 1;
    while (!imaAssentado(e, [IMA]) && quadros < 600) {
      e = passo(e, 1000, 1, LIMITES, [IMA]);
      quadros++;
    }
    expect(quadros).toBeLessThan(600);
    expect(e.x).toBeCloseTo(c.x, 1);
    expect(e.escala).toBeCloseTo(ESCALA_IMA, 2);
  });

  it("as constantes do ímã são as combinadas no brief", () => {
    expect(MARGEM_IMA).toBe(24);
    expect(MARGEM_ESCAPE).toBe(64);
    expect(CAPTURA).toBe(0.22);
    expect(ESCALA_IMA).toBe(2);
    expect(RAIO_SEGUIMENTO).toBe(0.15);
  });
});
