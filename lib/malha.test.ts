import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import {
  PARAMETROS,
  brilhoDaCelula,
  devePular,
  ganho,
  hexParaRgb,
  medirCelula,
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

    // A folga de VERDADE, que é o que o nome deste teste promete: a última
    // célula já começa fora da caixa. As duas asserções acima passam mesmo se o
    // `+ 1` de `montarGrade` for apagado — o `Math.ceil` sozinho já as
    // satisfaz — e aí sobraria a faixa apagada na borda que o `+ 1` existe
    // justamente para evitar. Estas duas caem sem ele (996 < 1000, 596 < 600).
    expect(PARAMETROS.padX + (g.colunas - 1) * 10).toBeGreaterThanOrEqual(1000);
    expect(PARAMETROS.padY + (g.linhas - 1) * 16).toBeGreaterThanOrEqual(600);
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

describe("medirCelula", () => {
  // As larguras reais da The Seasons a 12px de corpo, medidas no navegador em
  // 31/07/2026: o "2" é 27% mais estreito que o "0". É essa diferença que a
  // célula precisa absorver.
  const DOIS = 5.964;
  const ZERO = 8.184;
  const TRACKING = -0.36; // -0.03 × 12

  /** Onde cada glifo começa e termina, numa fileira alternando "2" e "0". */
  function fileira(m: ReturnType<typeof medirCelula>, larguras: readonly number[]) {
    return larguras.map((largura, c) => {
      const inicio = c * m.larguraChar + m.deslocamentos[c % 2];
      return { inicio, fim: inicio + largura };
    });
  }

  it("deixa o mesmo vão entre 2→0 e entre 0→2", () => {
    // O sintoma que este cálculo existe para matar: com avanço fixo e glifo
    // encostado na borda esquerda da célula, o "2" (mais estreito) sobra
    // espaço à direita e o par fica agrupado — "20 20 20" em vez de uma trama
    // regular. Como os vãos alternam, basta olhar dois seguidos.
    const m = medirCelula(DOIS, ZERO, TRACKING);
    const glifos = fileira(m, [DOIS, ZERO, DOIS, ZERO]);

    const vaos = glifos.slice(1).map((g, i) => g.inicio - glifos[i].fim);
    expect(vaos[0]).toBeCloseTo(vaos[1], 10);
    expect(vaos[1]).toBeCloseTo(vaos[2], 10);
  });

  it("não aperta a trama: o avanço continua o do glifo mais largo", () => {
    // O corolário de manter a densidade que já está aprovada. Trocar o avanço
    // pela média das duas larguras também emparelharia os vãos, mas encolheria
    // a coluna em 14% de brinde — e a contagem de células medida em
    // `limiarAceso` iria junto.
    const m = medirCelula(DOIS, ZERO, TRACKING);
    expect(m.larguraChar).toBeCloseTo(Math.max(DOIS, ZERO) + TRACKING, 10);
  });

  it("centraliza cada glifo na própria célula", () => {
    const m = medirCelula(DOIS, ZERO, TRACKING);
    const centro = m.larguraChar / 2;
    expect(m.deslocamentos[0] + DOIS / 2).toBeCloseTo(centro, 10);
    expect(m.deslocamentos[1] + ZERO / 2).toBeCloseTo(centro, 10);
  });

  it("com glifos de mesma largura, o vão é exatamente o tracking", () => {
    // A prova de que a correção não inventa espaçamento nenhum: numa fonte
    // monoespaçada os dois glifos recebem o MESMO deslocamento, e
    // `trackingRelativo` volta a significar literalmente o vão entre vizinhos.
    //
    // Esse deslocamento comum não é zero, e isso é o cálculo certo: com
    // tracking negativo a célula é mais estreita que o glifo, então centrar
    // deixa meio tracking pendurado para fora de cada lado. O que importa é
    // que os dois glifos pendurem igual — o vão continua sendo o tracking.
    const m = medirCelula(ZERO, ZERO, TRACKING);
    const glifos = fileira(m, [ZERO, ZERO, ZERO]);
    expect(glifos[1].inicio - glifos[0].fim).toBeCloseTo(TRACKING, 10);
    expect(m.deslocamentos[0]).toBeCloseTo(TRACKING / 2, 10);
    expect(m.deslocamentos[1]).toBeCloseTo(m.deslocamentos[0], 10);
  });

  it("aguenta métrica ainda não medida sem devolver NaN", () => {
    // `measureText` antes da fonte chegar pode devolver 0. A grade já trata
    // largura 0 (montarGrade devolve grade vazia); o que não pode é sair NaN
    // daqui e envenenar o `x` de todo `fillText` do quadro.
    const m = medirCelula(0, 0, TRACKING);
    expect(Number.isFinite(m.larguraChar)).toBe(true);
    expect(m.deslocamentos.every(Number.isFinite)).toBe(true);
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

/**
 * As relações entre os parâmetros que nenhum valor sozinho revela.
 *
 * Não travam valor nenhum — ajustar a malha continua sendo trocar um número em
 * `PARAMETROS`. O que travam é o que quebra em SILÊNCIO quando alguém troca só
 * um deles: um halo maior que a própria letra, um limiar que apaga o halo
 * inteiro sem erro nenhum, e o fallback de um token que já não é mais o valor
 * do token. Nada disso derruba teste, lint ou build — só aparece na tela, e
 * tarde.
 */
describe("as relações entre os PARAMETROS", () => {
  it("o halo não passa de metade do corpo da letra", () => {
    // O halo é `shadowBlur` em px, e o corpo da letra encolheu: com o halo
    // solto em px, diminuir a fonte transforma a luz num borrão verde sem
    // forma — o glifo some dentro do próprio brilho. Metade do corpo é o
    // limite em que ainda se lê "2" e "0" acesos em vez de manchas.
    expect(PARAMETROS.haloMaximo).toBeLessThanOrEqual(PARAMETROS.tamanhoFonte / 2);
  });

  it("o limiar do halo é alcançável — senão halo nenhum é desenhado", () => {
    // `ganho` satura em `brilho * intensidade`, e `brilho` vale no máximo 1
    // (fator máximo, no centro da luz). Se `limiarHalo` empatar ou passar
    // `intensidade`, a condição `g > limiarHalo` nunca é verdadeira: o halo
    // some da página inteira e `haloMaximo`/`opacidadeHalo` viram código
    // morto, sem um único sinal de que isso aconteceu.
    expect(ganho(1)).toBeGreaterThan(PARAMETROS.limiarHalo);
  });

  it("os fallbacks continuam iguais aos tokens do CSS", () => {
    // `corLuz`, `corRepouso` e `raioBase` são documentados como o padrão de
    // fallback dos tokens — o que só é verdade enquanto os dois lados tiverem
    // o mesmo valor. Divergir não quebra nada visível: a página usa o token, o
    // fallback só aparece em teste, em SSR e no dia em que o token sumir. É
    // exatamente por isso que a divergência sobrevive por meses.
    // Caminho a partir do cwd, e não de `import.meta.url`: sob o Vite o módulo
    // é servido, e `import.meta.url` não é um URL `file:` — `readFileSync`
    // recusa. O cwd do vitest é a raiz do projeto, onde o config vive.
    const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");
    const token = (nome: string) => {
      const m = new RegExp(`--${nome}:\\s*([^;]+);`).exec(css);
      return m?.[1].trim();
    };

    expect(token("verde-codigo")).toBe(PARAMETROS.corLuz);
    expect(token("padrao-repouso")).toBe(PARAMETROS.corRepouso);
    expect(token("raio-lanterna")).toBe(`${PARAMETROS.raioBase}px`);
  });
});
