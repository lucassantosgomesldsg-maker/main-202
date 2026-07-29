"use client";

import Logo202 from "@/components/Logo202";
import { DURACAO_MAXIMA_MS } from "./tipos";
import type { PropsMotion } from "./tipos";
import estilos from "./MotionC.module.css";

// Linha do tempo completa (ver MotionC.module.css para os keyframes e o valor
// exato por glifo): o traço desenha cada contorno, se retrai/apaga enquanto o
// preenchimento branco surge por baixo, e o ponto verde acende por último.
// Estas constantes existem para checar em runtime, contra o teto real do
// spec (importado de ./tipos), em vez de deixar o número solto num comentário.
const ULTIMO_ELEMENTO_ATRASO_MS = 1270; // atraso do [data-ponto], o último a animar
const ULTIMO_ELEMENTO_DURACAO_MS = 300;
const DURACAO_TOTAL_MS = ULTIMO_ELEMENTO_ATRASO_MS + ULTIMO_ELEMENTO_DURACAO_MS;

if (process.env.NODE_ENV !== "production" && DURACAO_TOTAL_MS > DURACAO_MAXIMA_MS) {
  // Se alguém alterar os tempos no CSS sem atualizar as constantes acima, ou
  // empurrar a animação além do teto acordado no spec §6, isso acende aqui.
  console.warn(
    `MotionC: duração total (${DURACAO_TOTAL_MS}ms) excede DURACAO_MAXIMA_MS (${DURACAO_MAXIMA_MS}ms).`
  );
}

export default function MotionC({ estatico = false }: PropsMotion) {
  return (
    <div data-motion="C" data-estatico={String(estatico)} className={estilos.raiz}>
      <Logo202 />
    </div>
  );
}
