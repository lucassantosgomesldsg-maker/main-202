"use client";

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
 * Linha do tempo completa em MotionA.module.css. Fim real: 1650ms — a guarda
 * abaixo confere isso contra DURACAO_MAXIMA_MS (./tipos) em tempo de execução,
 * em vez de deixar o teto do spec §6 sem checagem. Mesmo padrão de MotionB.
 */
const DURACAO_TOTAL_MS = 1650;

if (DURACAO_TOTAL_MS > DURACAO_MAXIMA_MS) {
  throw new Error(
    `MotionA: duração total (${DURACAO_TOTAL_MS}ms) excede DURACAO_MAXIMA_MS (${DURACAO_MAXIMA_MS}ms)`
  );
}

export default function MotionA({ estatico = false }: PropsMotion) {
  return (
    <div
      data-motion="A"
      data-estatico={String(estatico)}
      className={estilos.palco}
    >
      <span className={estilos.linhaH} aria-hidden="true" />
      <span className={estilos.linhaV} aria-hidden="true" />
      <Logo202 className={estilos.logo} />
    </div>
  );
}
