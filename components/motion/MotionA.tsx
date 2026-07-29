"use client";

import type { CSSProperties } from "react";
import Logo202 from "@/components/Logo202";
import { DURACAO_MAXIMA_MS, type PropsMotion } from "./tipos";
import estilos from "./MotionA.module.css";

/**
 * Candidato A — linhas construtivas.
 *
 * Uma hairline horizontal e uma vertical (1px, --cinza-linha) crescem do centro
 * até atravessar o palco inteiro, se cruzando sobre a logo. Os glifos são
 * revelados a partir dessa interseção via clip-path. As linhas então recuam e
 * somem; o ponto verde acende por último. É o elemento gráfico nº3 do
 * design.md ("consultoria que constrói") em movimento.
 *
 * O teto de duração (DURACAO_MAXIMA_MS, ./tipos) é injetado como a variável
 * CSS --duracao-max abaixo — o CSS Module comenta o orçamento a partir dela
 * em vez de repetir "1800" como número solto.
 */
export default function MotionA({ estatico = false }: PropsMotion) {
  return (
    <div
      data-motion="A"
      data-estatico={String(estatico)}
      className={estilos.palco}
      style={{ "--duracao-max": `${DURACAO_MAXIMA_MS}ms` } as CSSProperties}
    >
      <span className={estilos.linhaH} aria-hidden="true" />
      <span className={estilos.linhaV} aria-hidden="true" />
      <Logo202 className={estilos.logo} />
    </div>
  );
}
