"use client";

import { createContext, useContext, type ReactNode, type RefObject } from "react";
// Alias obrigatório, não estilo: a regra react-hooks identifica hooks pelo
// NOME no ponto da chamada. Com `usaLanterna()` ela nem tenta — chamada
// condicional passava lint, tsc e build e quebrava a página em runtime. O
// export continua em português; só o identificador local vira `use*`.
import { usaLanterna as useLanterna, type PosicaoViva } from "@/lib/usaLanterna";
import estilos from "./Lanterna.module.css";

type Viva = RefObject<PosicaoViva> | null;

const ContextoViva = createContext<Viva>(null);

/**
 * A posição viva da lanterna que envolve este componente, ou `null` se não há
 * lanterna nenhuma acima.
 *
 * `null` não é erro: a malha é fundo e precisa existir onde a lanterna não
 * existe — em ponteiro grosso, e em qualquer teste que renderize a malha
 * sozinha. Quem consome trata `null` como "sem luz", não como falha.
 *
 * O nome interno é `useLanternaViva` pelo mesmo motivo que `useLanterna` em
 * lib/usaLanterna.ts: a regra react-hooks identifica hook pelo PREFIXO do
 * nome. Uma função chamada `usaLanternaViva` que chama `useContext` é vista
 * como função comum chamando hook — que é erro de lint — e, pior, o corpo
 * deixa de ser checado. O nome público continua em português.
 */
function useLanternaViva(): Viva {
  return useContext(ContextoViva);
}

export { useLanternaViva as usaLanternaViva };

/**
 * O cursor vira lanterna: este elemento carrega `--lanterna-x` /
 * `--lanterna-y`, e quem quiser ser iluminado é renderizado dentro dele e usa
 * essas variáveis na própria máscara (custom properties herdam) — ou lê a
 * posição em número por `usaLanternaViva`, que é o que a malha em canvas faz.
 *
 * Por que um elemento e não `:root`: escrever no documento inteiro faria duas
 * lanternas na mesma página brigarem pelas mesmas variáveis, e amarraria as
 * coordenadas à viewport. Aqui o sistema de coordenadas é a caixa deste
 * elemento.
 *
 * Em ponteiro grosso o hook não registra listener nenhum e nenhum quadro é
 * agendado: `viva.ativa` fica `false` para sempre, e a malha desenha só a
 * textura e a cintilação.
 */
export default function Lanterna({ children }: { children?: ReactNode }) {
  const { ref, ativa, viva } = useLanterna();

  return (
    <div
      ref={ref}
      data-lanterna
      data-ativa={String(ativa)}
      aria-hidden="true"
      className={estilos.lanterna}
    >
      <ContextoViva.Provider value={viva}>{children}</ContextoViva.Provider>
    </div>
  );
}
