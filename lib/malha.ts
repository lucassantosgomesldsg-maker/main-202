/**
 * A matemática da malha viva — sem DOM, sem canvas, sem navegador.
 *
 * Fica separada de `components/Malha.tsx` pelo mesmo motivo que `passo` fica
 * separada do componente da lanterna: é a única parte com lógica de verdade, e
 * é a única que dá para testar sem abrir um navegador. O componente vira só
 * pincel.
 *
 * Todos os valores vêm da referência `Hero 2020 Glow v2.dc.html`, conferida
 * rodando — ver o spec de 31/07/2026.
 */

/** Um número por parâmetro, num lugar só. Ajuste é troca de valor aqui. */
export const PARAMETROS = {
  /** Corpo da fonte da malha, em px. */
  tamanhoFonte: 18,
  /** Espaçamento entre caracteres, como fração do corpo. Negativo = mais junto. */
  trackingRelativo: -0.03,
  /** Entrelinha como fração do corpo. Abaixo de 1 as linhas se tocam. */
  alturaLinhaRelativa: 0.9,
  padX: 6,
  padY: 4,
  /** A malha apagada, sobre o preto da página. */
  corRepouso: "#171717",
  /** Quanto do caminho até a cor da luz um brilho 1.0 percorre. */
  intensidade: 0.85,
  /** Fração do brilho que sobrevive a cada quadro — é isto que vira rastro. */
  decaimento: 0.9,
  /** Teto da respiração em repouso. */
  amplitudeCintilacao: 0.035,
  /** Radianos por segundo da respiração. */
  velocidadeCintilacao: 0.8,
  /** Curva da queda com a distância. Acima de 1 concentra a luz no centro. */
  expoenteProximidade: 1.6,
  /** Abaixo disto a célula não é redesenhada. */
  limiarAceso: 0.02,
  /** A partir daqui a célula ganha halo. */
  limiarHalo: 0.25,
  /** Raio máximo do halo, em px. */
  haloMaximo: 9,
  /** Opacidade do halo, como fração do ganho. */
  opacidadeHalo: 0.7,
  /** Teto do device pixel ratio: acima de 2 o custo dobra sem ganho visível. */
  dprMaximo: 2,
} as const;

export type RGB = readonly [number, number, number];

export type Grade = { colunas: number; linhas: number; total: number };

export type Celulas = {
  /** Quanto cada célula acende no máximo — 0.5 a 1, sorteado uma vez. */
  fatores: Float32Array;
  /** Deslocamento da respiração, para as vizinhas não pulsarem juntas. */
  fases: Float32Array;
  /** 0 → "2", 1 → "0". */
  chars: Uint8Array;
  /** O brilho do quadro anterior. É a memória que produz o rastro. */
  brilhos: Float32Array;
};

const GRADE_VAZIA: Grade = { colunas: 0, linhas: 0, total: 0 };

/**
 * Quantas colunas e linhas cobrem a caixa. Uma a mais em cada eixo de
 * propósito: sem ela sobra uma faixa apagada na borda direita e embaixo.
 */
export function montarGrade(entrada: {
  larguraCss: number;
  alturaCss: number;
  larguraChar: number;
  alturaLinha: number;
}): Grade {
  const { larguraCss, alturaCss, larguraChar, alturaLinha } = entrada;
  if (!(larguraChar > 0) || !(alturaLinha > 0)) return GRADE_VAZIA;
  if (!(larguraCss > 0) || !(alturaCss > 0)) return GRADE_VAZIA;

  const colunas = Math.ceil((larguraCss - PARAMETROS.padX) / larguraChar) + 1;
  const linhas = Math.ceil((alturaCss - PARAMETROS.padY) / alturaLinha) + 1;
  return { colunas, linhas, total: colunas * linhas };
}

/**
 * Sorteia o que cada célula tem de próprio. `aleatorio` é injetado para o teste
 * ser determinístico — o componente não passa nada e cai no Math.random.
 */
export function semearCelulas(
  total: number,
  aleatorio: () => number = Math.random
): Celulas {
  const fatores = new Float32Array(total);
  const fases = new Float32Array(total);
  const chars = new Uint8Array(total);
  const brilhos = new Float32Array(total);

  for (let i = 0; i < total; i++) {
    fatores[i] = 0.5 + aleatorio() * 0.5;
    fases[i] = aleatorio() * Math.PI * 2;
    chars[i] = i % 2;
  }

  return { fatores, fases, chars, brilhos };
}

export type EntradaBrilho = {
  /** Brilho desta célula no quadro anterior. */
  anterior: number;
  fator: number;
  fase: number;
  /** Tempo em segundos desde o início da animação. */
  tempo: number;
  /** Distância² da célula até a luz, em px². Ao quadrado para evitar raiz. */
  distancia2: number;
  /** Raio² efetivo da luz, em px² — já multiplicado pela escala do ímã. */
  raio2: number;
  temLuz: boolean;
  cintila: boolean;
  /** Sobrescreve PARAMETROS.decaimento. Zero = sem rastro (movimento reduzido). */
  decaimento?: number;
};

/**
 * O brilho de uma célula neste quadro, entre 0 e 1.
 *
 * Três fontes disputam, e a maior vence: o que sobrou do quadro anterior (o
 * rastro), a respiração, e a proximidade da luz. A subida é instantânea de
 * propósito — quem suaviza o movimento é a lanterna, em `lib/usaLanterna.ts`;
 * suavizar de novo aqui deixaria a luz borrada.
 */
export function brilhoDaCelula(entrada: EntradaBrilho): number {
  const decaimento = entrada.decaimento ?? PARAMETROS.decaimento;
  let v = entrada.anterior * decaimento;

  if (entrada.cintila) {
    const respiracao =
      PARAMETROS.amplitudeCintilacao *
      entrada.fator *
      (0.5 +
        0.5 *
          Math.sin(entrada.tempo * PARAMETROS.velocidadeCintilacao + entrada.fase));
    if (respiracao > v) v = respiracao;
  }

  if (entrada.temLuz && entrada.raio2 > 0 && entrada.distancia2 < entrada.raio2) {
    // sqrt(d²)/raio é o mesmo que sqrt(d²/raio²), e assim o raio nunca precisa
    // sair do quadrado.
    const proximidade = 1 - Math.sqrt(entrada.distancia2 / entrada.raio2);
    const alvo =
      Math.pow(proximidade, PARAMETROS.expoenteProximidade) * entrada.fator;
    if (alvo > v) v = alvo;
  }

  return v;
}

/**
 * Este quadro pode ser descartado sem mudar nada na tela?
 *
 * Só quando a malha não respira (movimento reduzido), a luz não se mexeu e
 * ninguém pediu redesenho — aí o quadro anterior já É a imagem certa. É o que
 * faz "reduzir movimento" custar quase nada sem precisar de um segundo
 * mecanismo de notificação entre a lanterna e a malha.
 *
 * Mora aqui, e não dentro do componente, para ser testável: o jsdom não dá
 * contexto 2d, então nada que dependa do laço de desenho pode ser verificado
 * lá.
 */
export function devePular(entrada: {
  cintila: boolean;
  mudou: boolean;
  precisaDesenhar: boolean;
}): boolean {
  return !entrada.cintila && !entrada.mudou && !entrada.precisaDesenhar;
}

export function hexParaRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  return [
    Number.parseInt(h.slice(0, 2), 16),
    Number.parseInt(h.slice(2, 4), 16),
    Number.parseInt(h.slice(4, 6), 16),
  ] as const;
}

/** Interpola do repouso até a luz. `g` fora de [0,1] é responsabilidade de `ganho`. */
export function misturar(base: RGB, alvo: RGB, g: number): RGB {
  return [
    Math.round(base[0] + (alvo[0] - base[0]) * g),
    Math.round(base[1] + (alvo[1] - base[1]) * g),
    Math.round(base[2] + (alvo[2] - base[2]) * g),
  ] as const;
}

/** Quanto do caminho até a cor da luz este brilho percorre, saturando em 1. */
export function ganho(
  brilho: number,
  intensidade: number = PARAMETROS.intensidade
): number {
  return Math.min(1, brilho * intensidade);
}
