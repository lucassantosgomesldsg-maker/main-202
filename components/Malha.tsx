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
 *             acima do limiar. É o que segura o custo: quase sempre são poucas.
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

    const corRepouso = hexParaRgb(
      lerCor(caixa, "--padrao-repouso", PARAMETROS.corRepouso)
    );
    const corLuz = hexParaRgb(lerCor(caixa, "--verde-codigo", "#28d305"));
    const corLuzCss = `${corLuz[0]},${corLuz[1]},${corLuz[2]}`;

    let grade: Grade = { colunas: 0, linhas: 0, total: 0 };
    let celulas: Celulas = semearCelulas(0);
    let base: HTMLCanvasElement | null = null;
    let larguraChar = 0;
    let alturaLinha = 0;
    let larguraCss = 0;
    let alturaCss = 0;
    let fonte = "";
    let raio = 300;
    let quadroId = 0;
    let alternado = false;
    let precisaDesenhar = true;
    // Mesmo padrão de `precisaMedir` em lib/usaLanterna.ts: o ResizeObserver só
    // marca; quem chama `construir()` de fato é o `quadro`, no máximo uma vez
    // por quadro — nunca uma vez por notificação do observador.
    let precisaConstruir = false;
    // A Promise de `document.fonts.load` pode resolver depois de desmontar
    // (ou, no StrictMode, sobre a closure de um efeito já descartado): sem
    // esta trava, o `.then` chamaria `construir()` sobre um canvas morto.
    let vivo = true;
    let ultima: PosicaoViva = { ...PARADA };

    const construir = () => {
      const r = caixa.getBoundingClientRect();
      larguraCss = r.width;
      alturaCss = r.height;
      if (!(larguraCss > 0) || !(alturaCss > 0)) return;

      const dpr = Math.min(window.devicePixelRatio || 1, PARAMETROS.dprMaximo);
      canvas.width = Math.round(larguraCss * dpr);
      canvas.height = Math.round(alturaCss * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // A família vem do CSS Module — ver o comentário em Malha.module.css.
      const familia = getComputedStyle(canvas).fontFamily || "Georgia, serif";
      fonte = `400 ${PARAMETROS.tamanhoFonte}px ${familia}`;
      ctx.font = fonte;

      const tracking = PARAMETROS.trackingRelativo * PARAMETROS.tamanhoFonte;
      larguraChar = ctx.measureText("0").width + tracking;
      alturaLinha = PARAMETROS.tamanhoFonte * PARAMETROS.alturaLinhaRelativa;
      raio = lerPx(caixa, "--raio-lanterna", 300);

      grade = montarGrade({ larguraCss, alturaCss, larguraChar, alturaLinha });
      celulas = semearCelulas(grade.total);

      base = document.createElement("canvas");
      base.width = canvas.width;
      base.height = canvas.height;
      const bctx = base.getContext("2d");
      if (!bctx) {
        base = null;
        return;
      }
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bctx.font = fonte;
      bctx.textBaseline = "alphabetic";
      // Fundo transparente de propósito: quem pinta o preto é o --preto-202 da
      // página, e assim o token continua sendo a fonte única daquela cor.
      bctx.fillStyle = PARAMETROS.corRepouso;
      for (let l = 0; l < grade.linhas; l++) {
        const y = PARAMETROS.padY + l * alturaLinha + PARAMETROS.tamanhoFonte;
        for (let c = 0; c < grade.colunas; c++) {
          const i = l * grade.colunas + c;
          bctx.fillText(celulas.chars[i] ? "0" : "2", PARAMETROS.padX + c * larguraChar, y);
        }
      }

      precisaDesenhar = true;
    };

    const desenhar = (t: number) => {
      if (!base || grade.total === 0) return;
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
      // inteira em milhares de `fillText`). Rodar aqui, e não dentro do
      // callback do observador, garante no máximo uma reconstrução por
      // quadro mesmo que o observador dispare várias notificações seguidas
      // (um arrasto de redimensionamento, ou a notificação inicial que todo
      // ResizeObserver dispara logo após `observe()`).
      if (precisaConstruir) {
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
          })
        : null;
    observador?.observe(caixa);

    document.addEventListener("visibilitychange", aoTrocarVisibilidade);

    // A métrica muda quando a The Seasons chega: sem remontar a base, a trama
    // fica desenhada com a largura da Fraunces e some o alinhamento. Guardado
    // por `vivo`: se o componente desmontar antes da Promise resolver, este
    // `.then` não pode chamar `construir()` sobre um canvas morto.
    if (typeof document !== "undefined" && document.fonts?.load) {
      document.fonts
        .load(`400 ${PARAMETROS.tamanhoFonte}px "The Seasons"`)
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
