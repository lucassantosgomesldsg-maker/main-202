"use client";

import { useEffect, useState } from "react";

const CHAVE = "202:motion";

/** Guarda de módulo: o StrictMode monta duas vezes, mas esta carga da página
 *  só pode decidir uma vez. Um reload zera isto; o sessionStorage não. */
let decididoNestaCarga = false;

/** true quando a animação já rodou nesta sessão do navegador — ou seja,
 *  quando a logo deve aparecer já montada. Começa em false para que o
 *  HTML do servidor e o primeiro render do cliente sejam idênticos. */
export function usaMotionUmaVez(): boolean {
  const [jaRodou, setJaRodou] = useState(false);

  useEffect(() => {
    if (decididoNestaCarga) return;
    decididoNestaCarga = true;

    if (window.sessionStorage.getItem(CHAVE) === "1") {
      setJaRodou(true);
    } else {
      window.sessionStorage.setItem(CHAVE, "1");
    }
  }, []);

  return jaRodou;
}

/** Só para testes — zera a guarda de módulo entre casos. */
export function __resetarParaTeste() {
  decididoNestaCarga = false;
}
