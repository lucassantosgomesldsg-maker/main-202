"use client";

import Fundo202020 from "@/components/Fundo202020";
import Logo202 from "@/components/Logo202";
import { DURACAO_MAXIMA_MS, type PropsMotion } from "./tipos";
import estilos from "./MotionD.module.css";

/**
 * Candidato D — a malha acende, depois a logo, e o cursor vira lanterna.
 *
 * Dois atos, nunca simultâneos:
 *
 *   0    → 900ms   a malha `202` cresce do centro para fora até cobrir a tela
 *   900  → 1600ms  só então a logo entra, aberta do meio para os lados
 *   1600 → 2000ms  o ponto verde acende, por último
 *
 * A expansão da malha é `clip-path: circle(0% → 150% at 50% 50%)`: está na
 * lista de propriedades permitidas, roda na GPU e é literalmente "partindo do
 * meio". A abertura da logo repete esse gesto no eixo horizontal, para os dois
 * atos lerem como o mesmo movimento em escalas diferentes.
 *
 * A lanterna não faz parte da entrada: ela é interação, vem dentro do
 * <Fundo202020/> e continua funcionando em modo estático.
 *
 * Linha do tempo completa em MotionD.module.css. Fim real: 2000ms — a guarda
 * abaixo confere isso contra DURACAO_MAXIMA_MS (./tipos) em tempo de execução,
 * mesmo padrão de MotionA e MotionB.
 */
const DURACAO_TOTAL_MS = 2000;

if (DURACAO_TOTAL_MS > DURACAO_MAXIMA_MS) {
  throw new Error(
    `MotionD: duração total (${DURACAO_TOTAL_MS}ms) excede DURACAO_MAXIMA_MS (${DURACAO_MAXIMA_MS}ms)`
  );
}

export default function MotionD({ estatico = false }: PropsMotion) {
  return (
    <div
      data-motion="D"
      data-estatico={String(estatico)}
      className={estilos.palco}
    >
      <Fundo202020 className={estilos.fundo} />
      <Logo202 className={estilos.logo} />
    </div>
  );
}
