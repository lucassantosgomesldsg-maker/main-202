"use client";

import { useEffect, useState } from "react";

const CHAVE = "202:motion";

/** Guarda de módulo: o StrictMode monta duas vezes, mas esta carga da página
 *  só pode decidir uma vez. Um reload zera isto; o sessionStorage não. */
let decididoNestaCarga = false;

/** true quando a animação já rodou nesta sessão do navegador — ou seja,
 *  quando a logo deve aparecer já montada. Começa em false para que o
 *  HTML do servidor e o primeiro render do cliente sejam idênticos.
 *
 * A implementação se chama `useMotionUmaVez` só para o eslint: a regra
 * react-hooks/rules-of-hooks decide "isto é um hook?" checando o nome com
 * a regex fixa /^use[A-Z0-9]/ (node_modules/eslint-plugin-react-hooks,
 * isHookName) — não há opção pra ensinar outro prefixo; a única opção do
 * schema, `additionalHooks`, serve pra outra coisa (marcar efeitos
 * customizados pro exhaustive-deps, não pra dizer "esta função é um
 * hook"). Sem o nome em "use" a regra pararia de checar o corpo de
 * verdade. O nome público continua em português — mesma técnica de
 * usaLanterna.ts, não invenção nova. */
function useMotionUmaVez(): boolean {
  const [jaRodou, setJaRodou] = useState(false);

  useEffect(() => {
    if (decididoNestaCarga) return;
    decididoNestaCarga = true;

    if (window.sessionStorage.getItem(CHAVE) === "1") {
      // Mesmo caso de app/page.tsx (ver comentário lá): jaRodou PRECISA
      // nascer false pro HTML do servidor bater com o primeiro render do
      // cliente, e só sessionStorage (inexistente no servidor) diz se deve
      // virar true. Sincronizar React com um sistema externo no mount, não
      // um derivado de outro estado React.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setJaRodou(true);
    } else {
      window.sessionStorage.setItem(CHAVE, "1");
    }
  }, []);

  return jaRodou;
}

export { useMotionUmaVez as usaMotionUmaVez };

/** Só para testes — zera a guarda de módulo entre casos. */
export function __resetarParaTeste() {
  decididoNestaCarga = false;
}
