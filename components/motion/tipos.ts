export type PropsMotion = {
  /** Quando true, renderiza o estado final imediatamente, sem animar.
   *  Usado por prefers-reduced-motion e por visitas repetidas na sessão. */
  estatico?: boolean;
};

/** Teto de duração acordado no spec §6. Nenhum candidato pode passar disso. */
export const DURACAO_MAXIMA_MS = 1800;
