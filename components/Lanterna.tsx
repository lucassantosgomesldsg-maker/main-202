"use client";

import { type ReactNode } from "react";
// Alias obrigatório, não estilo: a regra react-hooks identifica hooks pelo
// NOME no ponto da chamada. Com `usaLanterna()` ela nem tenta — chamada
// condicional passava lint, tsc e build e quebrava a página em runtime. O
// export continua em português; só o identificador local vira `use*`.
import { usaLanterna as useLanterna } from "@/lib/usaLanterna";
import estilos from "./Lanterna.module.css";

/**
 * O cursor vira lanterna: este elemento carrega `--lanterna-x` /
 * `--lanterna-y`, e quem quiser ser iluminado é renderizado dentro dele e usa
 * essas variáveis na própria máscara (custom properties herdam).
 *
 * Por que um elemento e não `:root`: escrever no documento inteiro faria duas
 * lanternas na mesma página brigarem pelas mesmas variáveis, e amarraria as
 * coordenadas à viewport. Aqui o sistema de coordenadas é a caixa deste
 * elemento — o que faz a lanterna acertar o cursor tanto na página real
 * (fundo `fixed`, caixa = viewport) quanto na página de comparação (fundo
 * `absolute` dentro de uma seção rolável).
 *
 * Em ponteiro grosso o hook não registra listener nenhum e nenhum quadro é
 * agendado; o fallback visual é puramente CSS (ver Fundo202020.module.css).
 */
export default function Lanterna({ children }: { children?: ReactNode }) {
  const { ref, ativa } = useLanterna();

  return (
    <div
      ref={ref}
      data-lanterna
      data-ativa={String(ativa)}
      aria-hidden="true"
      className={estilos.lanterna}
    >
      {children}
    </div>
  );
}
