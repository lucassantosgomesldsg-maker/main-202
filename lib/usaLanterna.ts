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
};

export type Limites = { largura: number; altura: number };

export type PosicaoLanterna = {
  x: number;
  y: number;
  ativa: boolean;
  /** Callback ref: pendure no elemento que deve receber as variáveis. */
  ref: (elemento: HTMLElement | null) => void;
};

export function estadoInicial(x: number, y: number): EstadoLanterna {
  return { x, y, vx: 0, vy: 0, alvoX: x, alvoY: y, ultimoMovimento: 0 };
}

function limitar(valor: number, minimo: number, maximo: number) {
  return valor < minimo ? minimo : valor > maximo ? maximo : valor;
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
 * (`pos += (alvo - pos) * SEGUIMENTO` e `pos += v; v *= ATRITO`).
 */
export function passo(
  estado: EstadoLanterna,
  agora: number,
  fator: number,
  limites: Limites
): EstadoLanterna {
  if (!(fator > 0)) return { ...estado };

  const f = Math.min(fator, FATOR_MAXIMO);
  const parado = agora - estado.ultimoMovimento > PARADA_MS;

  let x: number;
  let y: number;
  let vx: number;
  let vy: number;

  if (parado) {
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
  };
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
 * `--lanterna-y` — ele também é o sistema de coordenadas da luz, o que faz a
 * lanterna acertar o cursor tanto num fundo `fixed` (caixa = viewport) quanto
 * num fundo `absolute` dentro de um contêiner rolável.
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

      if (semInercia) {
        // A preferência recusa justamente o movimento que ninguém pediu:
        // a luz vai direto para o cursor, sem perseguição e sem deslizamento.
        estado = { ...estado, x: estado.alvoX, y: estado.alvoY, vx: 0, vy: 0 };
      } else {
        estado = passo(estado, t, fator, {
          largura: caixa.largura,
          altura: caixa.altura,
        });
      }

      alvo.style.setProperty("--lanterna-x", `${estado.x.toFixed(2)}px`);
      alvo.style.setProperty("--lanterna-y", `${estado.y.toFixed(2)}px`);

      const aindaParado = t - estado.ultimoMovimento > PARADA_MS;
      const deslizando = Math.hypot(estado.vx, estado.vy) > 0;
      if (!aindaParado || (deslizando && !semInercia)) {
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

    return () => {
      window.removeEventListener("mousemove", aoMover);
      window.removeEventListener("resize", aoRemedir);
      window.removeEventListener("scroll", aoRemedir, { capture: true });
      if (quadroId !== 0) cancelAnimationFrame(quadroId);
    };
  }, [alvo]);

  return { ...pos, ref: setAlvo };
}

export { useLanterna as usaLanterna };
