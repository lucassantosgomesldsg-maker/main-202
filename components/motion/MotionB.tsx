"use client";

import Logo202 from "@/components/Logo202";
import type { PropsMotion } from "./tipos";
import { DURACAO_MAXIMA_MS } from "./tipos";
import estilos from "./MotionB.module.css";

/**
 * Linha do tempo (espelhada em MotionB.module.css — se um dos dois lados
 * mudar, o outro precisa acompanhar):
 *   glifo 0 — clip-path + translateY,  0ms  →  640ms
 *   glifo 1 — clip-path + translateY, 120ms →  760ms
 *   glifo 2 — clip-path + translateY, 240ms →  880ms
 *   ponto verde — opacity + scale,    940ms → 1360ms
 * Fim em 1360ms. A guarda abaixo usa DURACAO_MAXIMA_MS importado de ./tipos
 * (em vez de repetir "1800" num comentário) para falhar alto em dev se
 * alguém alterar o CSS e estourar o teto do spec §6.
 */
const DURACAO_TOTAL_MS = 1360;

if (DURACAO_TOTAL_MS > DURACAO_MAXIMA_MS) {
  throw new Error(
    `MotionB: duração total (${DURACAO_TOTAL_MS}ms) excede DURACAO_MAXIMA_MS (${DURACAO_MAXIMA_MS}ms)`
  );
}

export default function MotionB({ estatico = false }: PropsMotion) {
  return (
    <div
      data-motion="B"
      data-estatico={String(estatico)}
      className={estilos.palco}
    >
      <Logo202 className={estilos.logo} />
    </div>
  );
}
