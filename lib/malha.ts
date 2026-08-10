/**
 * A matemática da malha viva — sem DOM, sem canvas, sem navegador.
 *
 * Fica separada de `components/Malha.tsx` pelo mesmo motivo que `passo` fica
 * separada do componente da lanterna: é a única parte com lógica de verdade, e
 * é a única que dá para testar sem abrir um navegador. O componente vira só
 * pincel.
 *
 * Os valores nasceram da referência `Hero 2020 Glow v2.dc.html`, conferida
 * rodando — ver o spec de 31/07/2026. Os que hoje divergem dela estão marcados
 * um a um abaixo: trama mais densa e luz mais suave, ajuste pedido na revisão
 * do fundo em 31/07/2026. O spec continua registrando o ponto de partida.
 */

/** Um número por parâmetro, num lugar só. Ajuste é troca de valor aqui. */
export const PARAMETROS = {
  /**
   * Corpo da fonte da malha, em px.
   *
   * 31/07/2026 — de 18 para 12. É ele sozinho quem manda na densidade: a
   * largura do caractere e a entrelinha são frações deste número, então a
   * contagem de células cresce com o QUADRADO da redução (18→12 é 2,25x mais
   * células por área). Quem mexer aqui mexe direto no custo por quadro medido
   * em `limiarAceso` — e no halo, que é medido em px e por isso tem o teto
   * amarrado a este corpo em lib/malha.test.ts.
   */
  tamanhoFonte: 12,
  /** Espaçamento entre caracteres, como fração do corpo. Negativo = mais junto. */
  trackingRelativo: -0.03,
  /** Entrelinha como fração do corpo. Abaixo de 1 as linhas se tocam. */
  alturaLinhaRelativa: 0.9,
  padX: 6,
  padY: 4,
  /** A malha apagada, sobre o preto da página. */
  corRepouso: "#171717",
  /**
   * A cor da luz. Padrão de fallback do token `--verde-codigo`, igual ao que
   * `corRepouso` é para `--padrao-repouso`: quem manda é o CSS, este valor só
   * vale se o token sumir ou vier num formato que não seja `#rrggbb`.
   */
  corLuz: "#28d305",
  /**
   * Raio da luz em px, antes da escala do ímã. Padrão de fallback do token
   * `--raio-lanterna`, pela mesma regra das cores acima.
   *
   * 31/07/2026 — de 300 para 210. Este é o raio onde a luz zera; o que se VÊ
   * acesso é menor, porque `expoenteProximidade` derruba o brilho abaixo de
   * `limiarAceso` antes da borda (hoje por volta de 0,84·raio ≈ 176px, contra
   * ~274px na composição anterior). Os dois números precisam ser lidos juntos.
   */
  raioBase: 210,
  /**
   * Quanto do caminho até a cor da luz um brilho 1.0 percorre.
   *
   * 31/07/2026 — de 0.85 para 0.6, e no mesmo dia para 0.35. É o teto do
   * verde: no centro da luz a célula chega a rgb(29,89,17) em vez de quase o
   * `corLuz` cheio. Precisa continuar ACIMA de `limiarHalo`, senão nenhuma
   * célula ganha halo — há teste para isso, e foi por causa dele que
   * `limiarHalo` desceu junto nesta última mexida.
   */
  intensidade: 0.35,
  /** Fração do brilho que sobrevive a cada quadro — é isto que vira rastro. */
  decaimento: 0.9,
  /**
   * Teto da respiração em repouso.
   *
   * Repare que é MAIOR que `limiarAceso` (0.035 contra 0.02), e isso não é
   * descuido: os dois vieram da referência aprovada. A consequência está
   * documentada em `limiarAceso` — em repouso absoluto a cintilação sozinha
   * já acende cerca de um quarto da malha, todo quadro, para sempre.
   */
  amplitudeCintilacao: 0.035,
  /** Radianos por segundo da respiração. */
  velocidadeCintilacao: 0.8,
  /**
   * Curva da queda com a distância. Acima de 1 concentra a luz no centro.
   *
   * 31/07/2026 — de 1.6 para 2.1. É o parâmetro da SUAVIDADE, e faz duas
   * coisas de uma vez: encolhe a área acesa (o brilho cruza `limiarAceso` mais
   * cedo) e achata a chegada na borda — a derivada de `p^n` tende a zero
   * quando `p` tende a zero, então a luz termina sem contorno em vez de
   * terminar num anel.
   */
  expoenteProximidade: 2.1,
  /**
   * Abaixo disto a célula não é redesenhada.
   *
   * NÃO conte com ele para "quase nada é redesenhado" — essa afirmação já
   * esteve escrita aqui e no spec §8, e é falsa nesta composição. Como
   * `amplitudeCintilacao` (0.035) é maior que este limiar (0.02), a própria
   * respiração empurra boa parte das células acima dele mesmo sem mouse
   * nenhum. O que ele de fato faz é cortar a cauda do rastro e as células de
   * fator baixo — não transformar o quadro num punhado de `fillText`.
   *
   * Re-medido em 31/07/2026 na página real, depois de a fonte cair para 12px
   * (Chromium headless, 1440x900, DPR 2, malha de 15.540 células), média por
   * quadro — e ao lado, o MESMO instrumento rodando o código anterior, de
   * 18px e 7.068 células. As duas colunas saíram da mesma máquina na mesma
   * sessão; a tabela que estava aqui antes vinha de outra máquina, e por isso
   * os milissegundos dela não comparam com estes.
   *
   *                       antes (18px)              agora (12px)
   *   repouso sem mouse   1.904 cél (27%),  0 halos  → 4.35k (28%),   0 halos
   *   lanterna livre      3.471 cél (49%), 343 halos → 6.10k (40%),  ~55 halos
   *   presa num ímã (2x)  3.059 cél (43%), 486 halos → 5.53k (36%), ~130 halos
   *   tempo (pior caso)   3,66 ms (p95 4,7)          → 5,8-7,4 (p95 7,1-8,2)
   *
   * As contagens repetem entre rodadas; os milissegundos não — variam uns 25%
   * de uma rodada para outra nesta máquina (três rodadas), daí a faixa.
   * Qualquer leitura fina do tipo "subiu 1,6x e não 1,75x" não se sustenta
   * nesse ruído; o que se sustenta é o seguinte.
   *
   * A contagem de células cresceu 2,2x — é o preço da trama mais densa — e o
   * pior caso ainda cabe em metade do orçamento de 16,7 ms. Os HALOS caíram
   * para um sexto, e é isso que impede o tempo de crescer mais que as células:
   * `shadowBlur` é a parte cara do laço, e o limiar mais alto junto do raio
   * menor tirou o halo de quase todo o disco de luz. Densidade e suavidade
   * puxam o custo em direções opostas, e nesta composição elas se pagam.
   *
   * A conclusão antiga continua valendo: o custo é alto em número de células e
   * folgado em tempo, e a folga vem de `fillText` ser barato — não de o limiar
   * estar segurando o trabalho. Quem mexer em `amplitudeCintilacao`, no
   * tamanho da fonte ou em `limiarHalo` mexe direto nesses números.
   */
  limiarAceso: 0.02,
  /**
   * A partir daqui a célula ganha halo.
   *
   * 31/07/2026 — de 0.25 para 0.32 e, quando `intensidade` caiu para 0.35,
   * para 0.19. Este número NÃO é independente de `intensidade`: o ganho satura
   * nela, então o que importa é a razão entre os dois (aqui, 0.53). Deixá-lo
   * em 0.32 com intensidade 0.35 teria sobrado uma folga de 0.03 — halo em
   * praticamente célula nenhuma, o efeito sumindo em vez de suavizar. Mantida
   * a razão, o halo continua sendo privilégio do miolo da luz (uns 55px do
   * centro, contra o disco quase inteiro antes de 31/07) — é o que tira o
   * brilho de "farol" e devolve "reflexo". Encostar em `intensidade` apaga o
   * halo da página inteira, em silêncio; o teste em malha.test.ts existe para
   * isso.
   */
  limiarHalo: 0.19,
  /**
   * Raio máximo do halo, em px.
   *
   * 31/07/2026 — de 9 para 5. Não é só gosto: com a letra em 12px um halo de
   * 9px é mais largo que o próprio glifo, e o miolo da luz vira mancha em vez
   * de "2" e "0" acesos. O teto está amarrado a metade do corpo da fonte por
   * teste.
   */
  haloMaximo: 5,
  /**
   * Opacidade do halo, como fração do ganho.
   *
   * 31/07/2026 — de 0.7 para 0.45.
   */
  opacidadeHalo: 0.45,
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

/** O avanço de uma célula e onde cada glifo se apoia dentro dela. */
export type Metrica = {
  larguraChar: number;
  /** Deslocamento horizontal por glifo, no índice de `Celulas.chars`: 0="2", 1="0". */
  deslocamentos: readonly [number, number];
};

/**
 * Como uma célula acomoda dois glifos de larguras diferentes.
 *
 * A malha é uma GRADE: o avanço é o mesmo para toda célula, senão as colunas
 * deixam de se alinhar entre as fileiras (o caractere de cada célula alterna
 * pelo índice, então fileiras de largura ímpar começam trocadas). Só que "2" e
 * "0" não têm a mesma largura — na The Seasons o "2" é 27% mais estreito que o
 * "0" —, e um avanço fixo com o glifo encostado na borda esquerda da célula
 * joga toda essa diferença no vão à direita do "2". O olho lê o resultado como
 * pares: "20 20 20", em vez de uma trama regular.
 *
 * A correção é centrar cada glifo na própria célula. Aí o vão entre vizinhos
 * vira `larguraChar - (largura2 + largura0) / 2` — a mesma conta nos dois
 * sentidos, porque é simétrica nas duas larguras — e o ritmo fica uniforme.
 *
 * O avanço continua sendo o do glifo MAIS LARGO mais o tracking, que é o que a
 * malha já usava (por acaso: ela media o "0", que é justamente o mais largo).
 * Assim a densidade da trama não muda com esta correção — o que muda é só onde
 * cada glifo se apoia dentro da célula que já existia.
 */
export function medirCelula(
  larguraDoDois: number,
  larguraDoZero: number,
  tracking: number
): Metrica {
  const larguraChar = Math.max(larguraDoDois, larguraDoZero) + tracking;
  return {
    larguraChar,
    deslocamentos: [
      (larguraChar - larguraDoDois) / 2,
      (larguraChar - larguraDoZero) / 2,
    ],
  };
}

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
