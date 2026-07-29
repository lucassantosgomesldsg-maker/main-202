"use client";

import { useEffect, useState } from "react";

/**
 * A física da lanterna que segue o mouse — e que continua deslizando depois
 * que o mouse para.
 *
 * O passo de simulação (`passo`) é uma função pura, separada do componente de
 * propósito: é a única parte com lógica de verdade e a única testável sem
 * navegador (ver lib/usaLanterna.test.ts).
 */

/** Quanto da distância até o cursor a luz cobre por quadro, perseguindo. */
export const SEGUIMENTO = 0.18;
/** Peso da média móvel exponencial que estima a velocidade. */
export const PESO = 0.25;
/** Silêncio de mousemove que caracteriza "o mouse parou". */
export const PARADA_MS = 70;
/** Fração da velocidade que sobrevive a cada quadro de deslizamento. */
export const ATRITO = 0.94;
/** Abaixo disto (px por quadro de 60 fps) a luz para de vez. */
export const V_MINIMA = 0.02;
/** Quanto a luz pode sair da viewport sem sumir: -4rem = 64px. */
export const MARGEM_PX = 64;
/** Duração de um quadro a 60 fps, a unidade em que as constantes acima vivem. */
export const QUADRO_MS = 1000 / 60;
/** Teto do fator de quadro — evita um salto gigante ao voltar do segundo plano. */
export const FATOR_MAXIMO = 3;

/* ── O ímã ─────────────────────────────────────────────────────────────────
   Certos elementos capturam a luz: ela é puxada ao centro deles, cresce, e
   fica presa até o cursor ser puxado longe o bastante para arrancá-la. */

/** Quanto o retângulo do alvo é dilatado para CAPTURAR a luz. */
export const MARGEM_IMA = 24;
/**
 * Quanto ele é dilatado para SOLTAR. Maior que a de entrada de propósito: é
 * essa histerese que faz "puxar para sair". Com uma margem só, o cursor
 * parado na fronteira alterna entre preso e solto a cada quadro, e a luz
 * treme no lugar.
 */
export const MARGEM_ESCAPE = 64;
/** Fração da distância até o centro do alvo coberta por quadro, capturada. */
export const CAPTURA = 0.22;
/** Quantas vezes o raio da luz cresce ao capturar (medido na referência). */
export const ESCALA_IMA = 2;
/** Fração da diferença de escala coberta por quadro. */
export const RAIO_SEGUIMENTO = 0.15;

/**
 * Folgas de "chegou": a convergência é exponencial e nunca toca o alvo
 * exatamente, então sem um critério de parada o requestAnimationFrame giraria
 * para sempre movendo décimos de milésimo de pixel. Ficam fora de `passo` —
 * ele continua sendo pura interpolação — e valem só para `imaAssentado`, que
 * é quem o componente pergunta antes de agendar mais um quadro.
 */
const EPSILON_IMA = 0.05;
const EPSILON_ESCALA = 0.002;

/**
 * Ganho da forma fechada da velocidade na perseguição (dedução completa no
 * comentário dentro de `passo`). Exige PESO ≠ SEGUIMENTO — se alguém igualar
 * as duas constantes isto vira Infinity, e o teste
 * "PESO e SEGUIMENTO precisam continuar diferentes" quebra antes da tela.
 */
const GANHO_VELOCIDADE = (SEGUIMENTO * PESO) / (PESO - SEGUIMENTO);

export type EstadoLanterna = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alvoX: number;
  alvoY: number;
  ultimoMovimento: number;
  /** `id` do alvo que está segurando a luz, ou `null` se ela está livre. */
  capturado: string | null;
  /** Multiplicador do raio: 1 livre, tende a ESCALA_IMA capturada. */
  escala: number;
};

/**
 * Um alvo do ímã: um retângulo com nome, já no sistema de coordenadas da
 * lanterna (o mesmo de `x`/`y`). Quem mede é o componente, uma vez por
 * mudança de layout — nunca dentro do quadro.
 */
export type AlvoIma = {
  id: string;
  esquerda: number;
  topo: number;
  largura: number;
  altura: number;
};

export type Limites = { largura: number; altura: number };

/** Constante para não alocar um array novo a cada quadro sem ímã. */
const SEM_ALVOS: readonly AlvoIma[] = [];

export type PosicaoLanterna = {
  x: number;
  y: number;
  ativa: boolean;
  /** Callback ref: pendure no elemento que deve receber as variáveis. */
  ref: (elemento: HTMLElement | null) => void;
};

export function estadoInicial(x: number, y: number): EstadoLanterna {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    alvoX: x,
    alvoY: y,
    ultimoMovimento: 0,
    capturado: null,
    escala: 1,
  };
}

function limitar(valor: number, minimo: number, maximo: number) {
  return valor < minimo ? minimo : valor > maximo ? maximo : valor;
}

const centroX = (a: AlvoIma) => a.esquerda + a.largura / 2;
const centroY = (a: AlvoIma) => a.topo + a.altura / 2;

/** O retângulo de `a`, dilatado por `margem`, contém (x, y)? */
function contem(a: AlvoIma, x: number, y: number, margem: number) {
  return (
    x >= a.esquerda - margem &&
    x <= a.esquerda + a.largura + margem &&
    y >= a.topo - margem &&
    y <= a.topo + a.altura + margem
  );
}

/**
 * Qual alvo segura a luz neste quadro, olhando para onde o CURSOR está —
 * não para onde a luz está. Quem manda no ímã é a mão do visitante; a luz
 * apenas obedece.
 *
 * A ordem importa: enquanto um alvo segura a luz, ninguém mais disputa — o
 * quadro em que o cursor vence a margem de escape é um quadro de soltura
 * limpa (velocidade zerada), e só o quadro seguinte reabre a disputa. É essa
 * precedência que impede a luz de pular para um vizinho estando presa; e,
 * como MARGEM_ESCAPE > MARGEM_IMA, quem acabou de soltar não consegue
 * recapturá-la no quadro seguinte sem o cursor voltar de verdade.
 */
function alvoCapturado(
  estado: EstadoLanterna,
  alvos: readonly AlvoIma[]
): AlvoIma | null {
  const { alvoX: cursorX, alvoY: cursorY } = estado;

  if (estado.capturado !== null) {
    for (const a of alvos) {
      if (a.id !== estado.capturado) continue;
      return contem(a, cursorX, cursorY, MARGEM_ESCAPE) ? a : null;
    }
    // O alvo sumiu entre uma remedição e outra: isso conta como soltar.
  }

  let melhor: AlvoIma | null = null;
  let menorDistancia = Infinity;
  for (const a of alvos) {
    if (!contem(a, cursorX, cursorY, MARGEM_IMA)) continue;
    // Empate resolvido pelo centro mais próximo do cursor — dois alvos
    // sobrepostos não podem depender da ordem em que foram medidos.
    const distancia = Math.hypot(centroX(a) - cursorX, centroY(a) - cursorY);
    if (distancia < menorDistancia) {
      menorDistancia = distancia;
      melhor = a;
    }
  }
  return melhor;
}

/**
 * Não há mais nada a animar no ímã: a escala chegou na meta e, se a luz está
 * presa, ela já está no centro do alvo. É a pergunta que o componente faz
 * antes de decidir se agenda mais um quadro.
 */
export function imaAssentado(
  estado: EstadoLanterna,
  alvos: readonly AlvoIma[] = SEM_ALVOS
): boolean {
  const meta = estado.capturado === null ? 1 : ESCALA_IMA;
  if (Math.abs(estado.escala - meta) > EPSILON_ESCALA) return false;
  if (estado.capturado === null) return true;

  for (const a of alvos) {
    if (a.id !== estado.capturado) continue;
    return (
      Math.hypot(centroX(a) - estado.x, centroY(a) - estado.y) <= EPSILON_IMA
    );
  }
  return true; // alvo sumiu: o próximo quadro solta, não há o que esperar
}

/**
 * Um quadro de simulação. Puro: não lê relógio, não toca no DOM, devolve
 * sempre um estado novo.
 *
 * `fator` é o delta real do quadro normalizado para 60 fps
 * (`min(delta / 16.67, 3)`). Todas as constantes acima são "por quadro de
 * 60 fps"; as fórmulas abaixo as elevam a `fator` em vez de multiplicá-las
 * por ele, o que torna o resultado *exatamente* independente da taxa de
 * quadros — dois quadros de fator 1 levam a luz ao mesmo lugar que um de
 * fator 2, e com `fator = 1` cada fórmula se reduz literalmente à do brief
 * (`pos += (alvo - pos) * SEGUIMENTO` e `pos += v; v *= ATRITO`). O ímã
 * (captura e escala) segue exatamente a mesma regra.
 *
 * `alvos` são os retângulos que capturam a luz, já medidos. Sem eles — o
 * array vazio, ou nem passar o argumento — o resultado é bit a bit o mesmo de
 * antes do ímã existir; há um teste que confere isso contra uma cópia literal
 * da versão anterior.
 *
 * `instantaneo` é o modo `prefers-reduced-motion: reduce`: a luz vai direto
 * para o cursor (ou para o centro do alvo, se houver captura), sem
 * perseguição, sem deslizamento e sem crescimento gradual. Fica aqui, e não
 * no componente, para o comportamento reduzido ser testável sem navegador —
 * é o mesmo motivo de `passo` existir.
 */
export function passo(
  estado: EstadoLanterna,
  agora: number,
  fator: number,
  limites: Limites,
  alvos: readonly AlvoIma[] = SEM_ALVOS,
  instantaneo = false
): EstadoLanterna {
  if (!(fator > 0)) return { ...estado };

  const f = Math.min(fator, FATOR_MAXIMO);
  const preso = alvoCapturado(estado, alvos);
  const capturado = preso === null ? null : preso.id;
  // A luz acabou de ser arrancada de um alvo neste quadro.
  const soltou = estado.capturado !== null && capturado === null;
  const metaEscala = preso === null ? 1 : ESCALA_IMA;
  const parado = agora - estado.ultimoMovimento > PARADA_MS;

  let x: number;
  let y: number;
  let vx: number;
  let vy: number;
  // Mesma forma exponencial das outras: escala' = meta + (escala - meta)·r^f.
  // Compõe exatamente (r^f1·r^f2 = r^(f1+f2)) e, em f = 1, é literalmente
  // `escala += (meta - escala) * RAIO_SEGUIMENTO`. Sem alvo nenhum, meta = 1
  // e escala = 1: a conta devolve 1 sem tocar em nenhum bit.
  let escala =
    metaEscala + (estado.escala - metaEscala) * Math.pow(1 - RAIO_SEGUIMENTO, f);

  if (instantaneo) {
    // ── Sem animação ────────────────────────────────────────────────────
    x = preso === null ? estado.alvoX : centroX(preso);
    y = preso === null ? estado.alvoY : centroY(preso);
    vx = 0;
    vy = 0;
    escala = metaEscala;
  } else if (preso !== null) {
    // ── Capturada ───────────────────────────────────────────────────────
    // Converge ao centro do alvo, e só a ele: enquanto o ímã segura, o
    // cursor não puxa mais a luz e nenhuma inércia é acumulada — é isso que
    // faz a soltura sair limpa em vez de arremessar a luz.
    const k = 1 - Math.pow(1 - CAPTURA, f);
    x = estado.x + (centroX(preso) - estado.x) * k;
    y = estado.y + (centroY(preso) - estado.y) * k;
    vx = 0;
    vy = 0;
  } else if (parado) {
    // ── Deslizando ──────────────────────────────────────────────────────
    // A luz continua no rumo em que o cursor vinha, desacelerando.
    // O avanço é a soma exata do decaimento geométrico ao longo do quadro:
    // (1 - ATRITO^f) / (1 - ATRITO), que vale 1 quando f = 1.
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
    // ── Perseguindo ─────────────────────────────────────────────────────
    const restanteAlvo = Math.pow(1 - SEGUIMENTO, f); // β^f: distância que sobra
    const restanteFiltro = Math.pow(1 - PESO, f); // α^f: memória do filtro

    // Interpolação exponencial rumo ao cursor. Como k < 1 para qualquer
    // f <= FATOR_MAXIMO (1 - 0.82³ = 0.449), a luz nunca ultrapassa o alvo.
    const k = 1 - restanteAlvo;
    const distanciaX = estado.alvoX - estado.x;
    const distanciaY = estado.alvoY - estado.y;

    x = estado.x + distanciaX * k;
    y = estado.y + distanciaY * k;

    // Velocidade por média móvel exponencial dos deslocamentos, em px por
    // quadro de 60 fps — é ela que vira a inércia quando o mouse parar.
    //
    // A forma ingênua (`v*(1-peso) + distância*SEGUIMENTO*peso`, com
    // `peso = 1-(1-PESO)^f`) NÃO é componível: ela trata a distância como
    // constante durante o quadro, mas a distância decai enquanto a luz anda.
    // Dois quadros de fator 1 davam vx = 58,21 e um quadro de fator 2 dava
    // 64,69 — 11% de diferença, e num arrasto real a velocidade de escape
    // saía 5,5% maior a 144 Hz que a 60 Hz. Como é a velocidade de escape que
    // dimensiona o deslize inteiro, a luz era arremessada ~30px mais longe
    // num monitor rápido. O deslize tinha a forma certa e o tamanho errado.
    //
    // A correção: exigir composicionalidade e resolver para a única família
    // que a satisfaz. Com `v' = v*α^f + d*G(f)` e `d' = d*β^f`, compor dois
    // quadros dá `v'' = v*α^(f1+f2) + d*[G(f1)α^f2 + β^f1 G(f2)]`, então é
    // preciso `G(f1+f2) = G(f1)α^f2 + β^f1 G(f2)` — cuja solução geral é
    // `G(f) = C(β^f - α^f)`, com C livre. E C livre é a sorte aqui: dá para
    // escolhê-lo de modo que f = 1 reproduza *literalmente* a fórmula do
    // brief, `G(1) = SEGUIMENTO*PESO`. Como `β - α = PESO - SEGUIMENTO`:
    //
    //     C = SEGUIMENTO*PESO / (PESO - SEGUIMENTO)
    //
    // Resultado: componível ao nível do ponto flutuante E idêntica ao brief a
    // 60 fps — o comportamento que o Lucas já viu não muda em nada.
    const ganho = GANHO_VELOCIDADE * (restanteAlvo - restanteFiltro);
    vx = estado.vx * restanteFiltro + distanciaX * ganho;
    vy = estado.vy * restanteFiltro + distanciaY * ganho;
  }

  // Soltar zera a inércia. O quadro da soltura já é um quadro de perseguição
  // — a luz sai do centro do alvo rumo ao cursor — e a velocidade que essa
  // perseguição acabou de calcular vem da distância inteira até o cursor, que
  // por definição é grande (o cursor acabou de vencer MARGEM_ESCAPE). Levá-la
  // para o deslizamento arremessaria a luz para longe no instante do escape:
  // lê como bug, não como física.
  if (soltou) {
    vx = 0;
    vy = 0;
  }

  // A luz pode encostar na borda e sair um pouco, nunca sumir de vez.
  const xLimitado = limitar(x, -MARGEM_PX, limites.largura + MARGEM_PX);
  const yLimitado = limitar(y, -MARGEM_PX, limites.altura + MARGEM_PX);
  if (xLimitado !== x) vx = 0;
  if (yLimitado !== y) vy = 0;

  return {
    x: xLimitado,
    y: yLimitado,
    vx,
    vy,
    alvoX: estado.alvoX,
    alvoY: estado.alvoY,
    ultimoMovimento: estado.ultimoMovimento,
    capturado,
    escala,
  };
}

/**
 * Mede os alvos do ímã e os traduz para o sistema de coordenadas da lanterna.
 *
 * Roda uma vez por mudança de layout — montagem, resize, troca de idioma (o
 * oneliner muda de largura entre PT e EN), chegada das fontes — e NUNCA dentro
 * do quadro: `getBoundingClientRect` força o layout, e forçar layout 60 vezes
 * por segundo é o jeito conhecido de transformar uma máscara barata numa
 * página que trava.
 *
 * A busca é no documento inteiro de propósito: os alvos (`CONTATO`, o seletor
 * de idioma, o oneliner) vivem fora da árvore da lanterna — ela é o fundo, e
 * eles são o conteúdo. É o preço de o ímã ser declarado no JSX com um
 * atributo em vez de por prop.
 *
 * Alvos sem caixa (0x0, `display: none`) são ignorados: um elemento que não
 * ocupa espaço não tem centro para onde puxar.
 */
function medirImas(esquerdaDaCaixa: number, topoDaCaixa: number): AlvoIma[] {
  const alvos: AlvoIma[] = [];
  document.querySelectorAll<HTMLElement>("[data-ima]").forEach((no, i) => {
    const r = no.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    alvos.push({
      id: no.dataset.ima || `ima-${i}`,
      esquerda: r.left - esquerdaDaCaixa,
      topo: r.top - topoDaCaixa,
      largura: r.width,
      altura: r.height,
    });
  });
  return alvos;
}

function consulta(pergunta: string): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia(pergunta).matches;
}


/**
 * Liga a lanterna ao DOM.
 *
 * Pendure o `ref` devolvido no elemento que deve receber `--lanterna-x` /
 * `--lanterna-y` / `--escala-lanterna` — ele também é o sistema de coordenadas
 * da luz, o que faz a lanterna acertar o cursor tanto num fundo `fixed`
 * (caixa = viewport) quanto num fundo `absolute` dentro de um contêiner
 * rolável.
 *
 * Qualquer elemento da página com `data-ima` vira um ímã: a luz é capturada
 * por ele, puxada ao centro e crescida (`--escala-lanterna`, que o CSS
 * multiplica por `--raio-lanterna`) até o cursor ser puxado longe o bastante.
 * O atributo é só uma marca — nada de `pointer-events`, nada de listener no
 * alvo — então clique, foco e teclado do elemento marcado continuam
 * exatamente como eram.
 *
 * As variáveis CSS são escritas **dentro do requestAnimationFrame**; o handler
 * de `mousemove` só anota a posição crua do cursor e o instante. Em ponteiro
 * grosso nenhum listener é registrado e nenhum quadro é agendado.
 *
 * `x`/`y` são **a posição onde a luz parou** — publicados como estado do React
 * quando ela assenta, e não a cada quadro. A posição viva, quadro a quadro,
 * são as variáveis CSS: renderizar 60 vezes por segundo um par de números que
 * nada lê seria pagar caro por nada. Assim um gesto inteiro custa no máximo
 * duas renderizações (o primeiro movimento e o repouso), e quem quiser saber
 * "onde a luz ficou" — destacar o que está sob o foco, por exemplo — tem a
 * resposta sem instrumentar nada.
 *
 * A implementação se chama `useLanterna` só para o eslint: a regra
 * react-hooks/rules-of-hooks só reconhece hook com prefixo `use`, e sem esse
 * nome ela pararia de checar o corpo da função de verdade. O nome público
 * continua em português, como o resto do código.
 */
function useLanterna(): PosicaoLanterna {
  const [alvo, setAlvo] = useState<HTMLElement | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0, ativa: false });

  useEffect(() => {
    if (!alvo || typeof window === "undefined") return;
    // Ponteiro grosso: celular e tablet não têm cursor. Nenhum listener,
    // nenhum quadro — o fallback é puramente CSS (malha em --padrao-202020).
    if (consulta("(pointer: coarse)")) return;

    const semInercia = consulta("(prefers-reduced-motion: reduce)");

    let caixa = { left: 0, top: 0, largura: 0, altura: 0 };
    let imas: AlvoIma[] = [];
    let precisaMedir = false;
    let cursorX = 0;
    let cursorY = 0;
    let temCursor = false;
    let quadroId = 0;
    let ultimoQuadro = 0;
    let publicado = { x: 0, y: 0, ativa: false };

    const medir = () => {
      const r = alvo.getBoundingClientRect();
      caixa = { left: r.left, top: r.top, largura: r.width, altura: r.height };
      imas = medirImas(caixa.left, caixa.top);
      precisaMedir = false;
    };

    medir();
    // Começa no centro: antes do primeiro movimento a luz fica onde o CSS já
    // a desenha por padrão (50% 50%), sem salto na primeira perseguição.
    let estado = estadoInicial(caixa.largura / 2, caixa.altura / 2);

    const publicar = (ativa: boolean) => {
      if (
        publicado.ativa === ativa &&
        publicado.x === estado.x &&
        publicado.y === estado.y
      ) {
        return;
      }
      publicado = { x: estado.x, y: estado.y, ativa };
      setPos(publicado);
    };

    const quadro = (t: number) => {
      // Primeiro quadro da rodada: assume um quadro cheio em vez de delta 0.
      const delta = ultimoQuadro === 0 ? QUADRO_MS : t - ultimoQuadro;
      ultimoQuadro = t;
      const fator = Math.min(delta / QUADRO_MS, FATOR_MAXIMO);

      if (precisaMedir) medir();

      if (temCursor) {
        estado = {
          ...estado,
          alvoX: cursorX - caixa.left,
          alvoY: cursorY - caixa.top,
        };
      }

      // A preferência por menos movimento recusa justamente o que ninguém
      // pediu: com ela a luz vai direto para o cursor (ou para o centro do
      // alvo capturado), sem perseguição, sem deslizamento e sem crescimento
      // gradual. Quem decide isso é `passo`, não este laço.
      estado = passo(
        estado,
        t,
        fator,
        { largura: caixa.largura, altura: caixa.altura },
        imas,
        semInercia
      );

      alvo.style.setProperty("--lanterna-x", `${estado.x.toFixed(2)}px`);
      alvo.style.setProperty("--lanterna-y", `${estado.y.toFixed(2)}px`);
      alvo.style.setProperty("--escala-lanterna", estado.escala.toFixed(3));

      const aindaParado = t - estado.ultimoMovimento > PARADA_MS;
      const deslizando = Math.hypot(estado.vx, estado.vy) > 0;
      // O ímã tem uma animação própria (ir ao centro, crescer, encolher) que
      // pode continuar depois de o mouse parar — daí a terceira condição.
      if (!aindaParado || (deslizando && !semInercia) || !imaAssentado(estado, imas)) {
        quadroId = requestAnimationFrame(quadro);
      } else {
        // A luz assentou: é agora que vale publicar onde ela ficou.
        quadroId = 0;
        publicar(temCursor);
      }
    };

    const acordar = () => {
      if (quadroId !== 0) return;
      ultimoQuadro = 0;
      quadroId = requestAnimationFrame(quadro);
    };

    const aoMover = (ev: MouseEvent) => {
      // Só anotação: nenhuma leitura de layout, nenhuma escrita de estilo aqui.
      cursorX = ev.clientX;
      cursorY = ev.clientY;
      if (!temCursor) {
        temCursor = true;
        publicar(true); // uma vez por montagem: a lanterna saiu do repouso
      }
      estado = { ...estado, ultimoMovimento: performance.now() };
      acordar();
    };

    const aoRemedir = () => {
      precisaMedir = true;
      acordar();
    };

    window.addEventListener("mousemove", aoMover, { passive: true });
    window.addEventListener("resize", aoRemedir, { passive: true });
    window.addEventListener("scroll", aoRemedir, { passive: true, capture: true });

    // Os alvos do ímã mudam de caixa sem que a janela mude: a troca de idioma
    // reescreve o oneliner, as fontes chegam depois da primeira pintura. O
    // observador só marca a remedição — não acorda o laço de propósito. Se a
    // luz está dormindo, ninguém está olhando para ela, e o próximo quadro
    // (que só existe depois de um mousemove) mede antes de usar. Acordar aqui
    // custaria uma renderização do React a cada troca de idioma, para nada.
    const observador =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(() => {
            precisaMedir = true;
          })
        : null;
    if (observador) {
      observador.observe(alvo);
      document
        .querySelectorAll<HTMLElement>("[data-ima]")
        .forEach((no) => observador.observe(no));
    }

    return () => {
      window.removeEventListener("mousemove", aoMover);
      window.removeEventListener("resize", aoRemedir);
      window.removeEventListener("scroll", aoRemedir, { capture: true });
      observador?.disconnect();
      if (quadroId !== 0) cancelAnimationFrame(quadroId);
    };
  }, [alvo]);

  return { ...pos, ref: setAlvo };
}

export { useLanterna as usaLanterna };
