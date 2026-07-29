export type PropsMotion = {
  /** Quando true, renderiza o estado final imediatamente, sem animar.
   *  Usado por prefers-reduced-motion e por visitas repetidas na sessão. */
  estatico?: boolean;
};

/** Teto de duração acordado no spec §6. Nenhum candidato pode passar disso.
 *  Subiu de 1800 para 2000 na Task 6D: o candidato D são dois atos em
 *  sequência (a malha acende, só então a logo entra) e a tela não fica parada
 *  em instante nenhum — o visitante tem o que olhar desde os primeiros 100ms,
 *  que é exatamente o que a regra dos 1800ms protegia. */
export const DURACAO_MAXIMA_MS = 2000;
