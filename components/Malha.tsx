"use client";

import { useEffect, useRef } from "react";
import {
  PARAMETROS,
  brilhoDaCelula,
  devePular,
  ganho,
  hexParaRgb,
  misturar,
  montarGrade,
  semearCelulas,
  type Celulas,
  type Grade,
} from "@/lib/malha";
// Alias obrigatório, não estilo — mesma regra do resto do repo: a checagem
// react-hooks só reconhece hook pelo prefixo `use` no ponto da chamada.
import { usaLanternaViva as useLanternaViva } from "./Lanterna";
import estilos from "./Malha.module.css";
import type { PosicaoViva } from "@/lib/usaLanterna";

// `as const`: PARADA é o "sem luz" compartilhado por toda instância de
// `Malha` — precisa continuar somente-leitura para o tsc barrar qualquer
// `luz.x = ...` futuro dentro do laço de desenho, que envenenaria esse
// default de forma permanente e silenciosa entre quadros (e entre páginas,
// já que é um singleton de módulo). `ultima`, que É mutável de propósito,
// ganha o tipo largo (`PosicaoViva`) explicitamente em vez de herdar os
// literais por inferência — ver o comentário junto da declaração dela.
const PARADA = { x: 0, y: 0, escala: 1, ativa: false } as const;

/**
 * Quanto o redimensionamento precisa ficar quieto antes de a malha ser refeita.
 * ~120 ms: acima da cadência do arrasto (que notifica a cada quadro, ~17 ms) e
 * abaixo do que a mão percebe como demora ao soltar a borda da janela.
 */
const DEBOUNCE_RECONSTRUIR_MS = 120;

function consulta(pergunta: string): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia(pergunta).matches;
}

/**
 * Lê um comprimento de custom property, uma vez. Nunca dentro do quadro.
 *
 * Só aceita px. Custom property não é propriedade registrada (sem
 * `@property`), então o navegador NUNCA converte unidade — `getPropertyValue`
 * devolve o texto cru escrito no CSS. Se aceitássemos qualquer número, um
 * token escrito em `rem` (ou `em`, `%`, ...) daria `Number.parseFloat` feliz
 * e um valor silenciosamente errado — `"12rem"` vira `12`, um raio dez vezes
 * menor que o pretendido, sem erro nenhum e sem teste que pegue isso. Melhor
 * cair no padrão do que desenhar com a unidade trocada.
 */
export function lerPx(elemento: Element, nome: string, padrao: number): number {
  const bruto = getComputedStyle(elemento).getPropertyValue(nome).trim();
  const m = /^(-?\d+(?:\.\d+)?)px$/.exec(bruto);
  if (!m) return padrao;
  const n = Number.parseFloat(m[1]);
  return Number.isFinite(n) && n > 0 ? n : padrao;
}

/** Lê uma cor hexadecimal de custom property. Só aceita #rrggbb. */
function lerCor(elemento: Element, nome: string, padrao: string): string {
  const bruto = getComputedStyle(elemento).getPropertyValue(nome).trim();
  return /^#[0-9a-f]{6}$/i.test(bruto) ? bruto : padrao;
}

/**
 * A malha viva: a trama de "2" e "0" que é o papel de parede da marca.
 *
 * Duas camadas, como na versão em DOM que isto substitui:
 *
 *   base    — desenhada UMA vez por mudança de tamanho ou chegada de fonte,
 *             guardada num canvas fora da tela. É a trama apagada.
 *   acesos  — a cada quadro, copia a base e repinta por cima só as células
 *             acima do limiar. "Só as acesas" NÃO quer dizer "poucas": como
 *             a cintilação tem amplitude maior que o limiar, em repouso já
 *             são ~27% da malha, todo quadro. Os números medidos estão no
 *             comentário de `limiarAceso` em lib/malha.ts.
 *
 * O laço daqui é INDEPENDENTE do laço da lanterna. O da lanterna dorme quando a
 * luz assenta (economia deliberada, ver lib/usaLanterna.ts); a cintilação não
 * pode dormir. Esta malha nunca acorda a lanterna — só lê o ref dela, que
 * guarda a última posição mesmo enquanto ela dorme.
 */
export default function Malha() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viva = useLanternaViva();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    // O jsdom não implementa contexto 2d. Sem contexto não há o que desenhar, e
    // estourar aqui derrubaria a suíte inteira de testes de componente.
    if (!ctx) return;

    const caixa = canvas.parentElement ?? canvas;
    const cintila = !consulta("(prefers-reduced-motion: reduce)");
    const grosso = consulta("(pointer: coarse)");
    // Sem cintilação também não há rastro: a célula apaga no quadro em que a
    // luz sai. É o que "reduzir movimento" quer dizer aqui.
    const decaimento = cintila ? PARAMETROS.decaimento : 0;

    // Uma leitura só, guardada em texto E em número: a camada base pinta com o
    // texto e a interpolação do desenho parte do número. Antes a base usava
    // PARAMETROS.corRepouso e só a interpolação lia o CSS — coincidiam porque
    // os dois valores eram iguais. No dia em que `--padrao-repouso` mudasse, a
    // trama ficaria num cinza e a interpolação partiria de outro, e toda célula
    // que cruzasse o limiar saltaria de tom.
    const corRepousoCss = lerCor(caixa, "--padrao-repouso", PARAMETROS.corRepouso);
    const corRepouso = hexParaRgb(corRepousoCss);
    const corLuz = hexParaRgb(lerCor(caixa, "--verde-codigo", PARAMETROS.corLuz));
    const corLuzCss = `${corLuz[0]},${corLuz[1]},${corLuz[2]}`;

    let grade: Grade = { colunas: 0, linhas: 0, total: 0 };
    let celulas: Celulas = semearCelulas(0);
    // UM canvas de base para a vida inteira do efeito. Reconstruir reatribui
    // `width`/`height` — o que, por especificação, já apaga o bitmap inteiro —
    // em vez de criar um canvas novo. Numa tela 1440x900 com DPR 2 cada
    // `createElement("canvas")` alocava e descartava ~20 MB, e um arrasto de
    // redimensionamento faz dezenas de reconstruções: eram alguns GB de bitmap
    // no lixo por arrasto, e o coletor pagando por isso no meio da animação.
    const base = document.createElement("canvas");
    const bctx = base.getContext("2d");
    // A base já foi pintada ao menos uma vez? Substitui o antigo `base !== null`
    // como guarda do desenho: agora o canvas existe desde sempre, o que muda é
    // ele ter ou não conteúdo válido.
    let basePronta = false;
    let larguraChar = 0;
    let alturaLinha = 0;
    let larguraCss = 0;
    let alturaCss = 0;
    let fonte = "";
    // Anotado: `PARAMETROS` é `as const`, então sem o `: number` o tsc infere o
    // literal `300` e recusa a releitura do token logo abaixo.
    let raio: number = PARAMETROS.raioBase;
    let quadroId = 0;
    let alternado = false;
    let precisaDesenhar = true;
    // Mesmo padrão de `precisaMedir` em lib/usaLanterna.ts: o ResizeObserver só
    // marca; quem chama `construir()` de fato é o `quadro`.
    //
    // "No máximo uma vez por quadro" NÃO é mitigação: durante um arrasto de
    // redimensionamento o observador dispara a cada quadro, então uma vez por
    // quadro é justamente o PIOR caso — reconstruir a grade, re-sortear todas
    // as células e rasterizar milhares de `fillText` 60 vezes por segundo.
    //
    // Daí o debounce. Escolhi debounce em vez de "só reconstruir se o tamanho
    // mudou mais que uma célula" porque o critério de célula não segura um
    // arrasto lento (cada notificação passa de uma célula e reconstrói do
    // mesmo jeito) e ainda deixaria a malha errada num arrasto que termina
    // dentro da tolerância. O debounce limita o custo por QUALQUER arrasto, e
    // como cada notificação empurra o prazo para frente, quem sempre vence é a
    // última — o tamanho final. O preço é a trama ficar esticada pelo CSS
    // durante o arrasto e assentar ~120 ms depois que a mão para.
    let precisaConstruir = false;
    let marcadoEm = 0;
    // A Promise de `document.fonts.load` pode resolver depois de desmontar
    // (ou, no StrictMode, sobre a closure de um efeito já descartado): sem
    // esta trava, o `.then` chamaria `construir()` sobre um canvas morto.
    let vivo = true;
    let ultima: PosicaoViva = { ...PARADA };

    /**
     * A fonte que o canvas vai desenhar, em shorthand CSS.
     *
     * A família vem do CSS Module — ver o comentário em Malha.module.css, que
     * promete que nenhum nome de fonte fica repetido em dois lugares que podem
     * divergir. Esta função é o que torna a promessa verdadeira: ela é a ÚNICA
     * origem da string de fonte, usada tanto por `construir` quanto pelo
     * `document.fonts.load` lá embaixo — que antes tinha `"The Seasons"`
     * escrito à mão e ficaria pedindo a fonte errada se o CSS trocasse.
     */
    const fonteDoCanvas = () =>
      `400 ${PARAMETROS.tamanhoFonte}px ${
        getComputedStyle(canvas).fontFamily || "Georgia, serif"
      }`;

    const construir = () => {
      if (!bctx) return;
      const r = caixa.getBoundingClientRect();
      larguraCss = r.width;
      alturaCss = r.height;
      if (!(larguraCss > 0) || !(alturaCss > 0)) return;

      const dpr = Math.min(window.devicePixelRatio || 1, PARAMETROS.dprMaximo);
      canvas.width = Math.round(larguraCss * dpr);
      canvas.height = Math.round(alturaCss * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      fonte = fonteDoCanvas();
      ctx.font = fonte;

      const tracking = PARAMETROS.trackingRelativo * PARAMETROS.tamanhoFonte;
      larguraChar = ctx.measureText("0").width + tracking;
      alturaLinha = PARAMETROS.tamanhoFonte * PARAMETROS.alturaLinhaRelativa;
      raio = lerPx(caixa, "--raio-lanterna", PARAMETROS.raioBase);

      grade = montarGrade({ larguraCss, alturaCss, larguraChar, alturaLinha });
      celulas = semearCelulas(grade.total);

      // Reatribuir width/height é o que limpa a base — não há `clearRect` aqui
      // de propósito. Também zera o estado do contexto (transform, font,
      // fillStyle), por isso tudo abaixo é reaplicado a cada reconstrução.
      base.width = canvas.width;
      base.height = canvas.height;
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bctx.font = fonte;
      bctx.textBaseline = "alphabetic";
      // Fundo transparente de propósito: quem pinta o preto é o --preto-202 da
      // página, e assim o token continua sendo a fonte única daquela cor.
      bctx.fillStyle = corRepousoCss;
      for (let l = 0; l < grade.linhas; l++) {
        const y = PARAMETROS.padY + l * alturaLinha + PARAMETROS.tamanhoFonte;
        for (let c = 0; c < grade.colunas; c++) {
          const i = l * grade.colunas + c;
          bctx.fillText(celulas.chars[i] ? "0" : "2", PARAMETROS.padX + c * larguraChar, y);
        }
      }

      basePronta = true;
      precisaDesenhar = true;
    };

    const desenhar = (t: number) => {
      if (!basePronta || grade.total === 0) return;
      const tempo = t * 0.001;
      const luz = viva?.current ?? PARADA;
      const temLuz = luz.ativa;
      const raioEfetivo = raio * luz.escala;
      const raio2 = raioEfetivo * raioEfetivo;

      ctx.clearRect(0, 0, larguraCss, alturaCss);
      ctx.drawImage(base, 0, 0, larguraCss, alturaCss);
      ctx.font = fonte;
      ctx.textBaseline = "alphabetic";

      for (let l = 0; l < grade.linhas; l++) {
        const y = PARAMETROS.padY + l * alturaLinha + PARAMETROS.tamanhoFonte;
        // O centro ótico do caractere fica acima da linha de base.
        const cy = y - PARAMETROS.tamanhoFonte * 0.35;
        // O eixo horizontal NÃO tem correção equivalente (`x` é a borda
        // esquerda do glifo, não o centro): a assimetria de ~4px é diferida de
        // propósito, não é descuido — não "consertar" sem falar com o Lucas.
        for (let c = 0; c < grade.colunas; c++) {
          const i = l * grade.colunas + c;
          const x = PARAMETROS.padX + c * larguraChar;
          const dx = x - luz.x;
          const dy = cy - luz.y;

          const v = brilhoDaCelula({
            anterior: celulas.brilhos[i],
            fator: celulas.fatores[i],
            fase: celulas.fases[i],
            tempo,
            distancia2: dx * dx + dy * dy,
            raio2,
            temLuz,
            cintila,
            decaimento,
          });
          celulas.brilhos[i] = v;
          if (v < PARAMETROS.limiarAceso) continue;

          const g = ganho(v);
          const [rr, gg, bb] = misturar(corRepouso, corLuz, g);
          ctx.fillStyle = `rgb(${rr},${gg},${bb})`;
          if (g > PARAMETROS.limiarHalo) {
            ctx.shadowColor = `rgba(${corLuzCss},${(g * PARAMETROS.opacidadeHalo).toFixed(3)})`;
            ctx.shadowBlur = g * PARAMETROS.haloMaximo;
          } else {
            ctx.shadowBlur = 0;
          }
          ctx.fillText(celulas.chars[i] ? "0" : "2", x, y);
        }
      }
      ctx.shadowBlur = 0;
    };

    const quadro = (t: number) => {
      quadroId = requestAnimationFrame(quadro);

      // Redimensionar é raro e pesado (refaz a grade, re-sorteia as células —
      // apagando o rastro e as fases da cintilação — e rasteriza a trama
      // inteira em milhares de `fillText`). Reconstruir só depois de o
      // observador ficar DEBOUNCE_RECONSTRUIR_MS quieto transforma um arrasto
      // inteiro numa reconstrução só, em vez de uma por quadro. Ver a
      // declaração de `precisaConstruir` para o porquê da escolha.
      if (precisaConstruir && t - marcadoEm >= DEBOUNCE_RECONSTRUIR_MS) {
        precisaConstruir = false;
        construir();
      }

      // Ponteiro grosso: metade dos quadros. A respiração usa sin(t * 0.8) —
      // lenta o bastante para 30 quadros por segundo serem indistinguíveis de
      // 60, e o celular é justamente quem tem menos bateria para gastar.
      if (grosso) {
        alternado = !alternado;
        if (alternado) return;
      }

      const luz = viva?.current ?? PARADA;
      const mudou =
        luz.x !== ultima.x ||
        luz.y !== ultima.y ||
        luz.escala !== ultima.escala ||
        luz.ativa !== ultima.ativa;

      if (devePular({ cintila, mudou, precisaDesenhar })) return;

      ultima = { x: luz.x, y: luz.y, escala: luz.escala, ativa: luz.ativa };
      precisaDesenhar = false;
      desenhar(t);
    };

    const acordar = () => {
      if (quadroId === 0) quadroId = requestAnimationFrame(quadro);
    };

    const dormir = () => {
      if (quadroId !== 0) {
        cancelAnimationFrame(quadroId);
        quadroId = 0;
      }
    };

    const aoTrocarVisibilidade = () => {
      if (document.visibilityState === "hidden") {
        dormir();
      } else {
        precisaDesenhar = true;
        acordar();
      }
    };

    construir();
    acordar();

    const observador =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(() => {
            precisaConstruir = true;
            // Mesma base de tempo do `t` do requestAnimationFrame, então o
            // `quadro` pode comparar os dois direto. Cada notificação empurra
            // o prazo: quem vence é sempre a última, o tamanho final.
            marcadoEm = performance.now();
          })
        : null;
    observador?.observe(caixa);

    document.addEventListener("visibilitychange", aoTrocarVisibilidade);

    // A métrica muda quando a The Seasons chega: sem remontar a base, a trama
    // fica desenhada com a largura da Fraunces e some o alinhamento. Pedimos
    // exatamente a fonte que o canvas vai usar — `fonteDoCanvas()` resolve a
    // família pelo CSS Module — em vez de repetir "The Seasons" aqui: com o
    // nome escrito à mão, trocar a letra no CSS deixava este `load` esperando
    // uma fonte que a malha não desenha mais. Guardado por `vivo`: se o
    // componente desmontar antes da Promise resolver, este `.then` não pode
    // chamar `construir()` sobre um canvas morto.
    if (typeof document !== "undefined" && document.fonts?.load) {
      document.fonts
        .load(fonteDoCanvas())
        .then(() => {
          if (vivo) construir();
        })
        .catch(() => {});
    }

    return () => {
      vivo = false;
      dormir();
      observador?.disconnect();
      document.removeEventListener("visibilitychange", aoTrocarVisibilidade);
    };
  }, [viva]);

  return <canvas ref={canvasRef} aria-hidden="true" className={estilos.canvas} />;
}
