export type PropsMotion = {
  /** Quando true, renderiza o estado final imediatamente, sem animar.
   *  Usado por prefers-reduced-motion e por visitas repetidas na sessão. */
  estatico?: boolean;
};

/** Teto de duração acordado no spec §6. Nenhum candidato pode passar disso.
 *  Subiu de 1800 para 2000 na Task 6D: o candidato D são dois atos em
 *  sequência (a malha acende, só então a logo entra) e a tela não fica parada
 *  em instante nenhum — o visitante tem o que olhar desde os primeiros 100ms,
 *  que é exatamente o que a regra dos 1800ms protegia.
 *
 *  31/07/2026 — este teto continua valendo para o Motion D, que está
 *  ARQUIVADO (ver o cabeçalho de MotionD.tsx). A abertura que a página roda
 *  hoje tem teto próprio, de 4800ms, em lib/abertura.ts. Os dois números são
 *  de coreografias diferentes e não devem ser unificados: subir este aqui
 *  faria o parágrafo acima mentir sobre um efeito que ninguém mais roda. */
export const DURACAO_MAXIMA_MS = 2000;
