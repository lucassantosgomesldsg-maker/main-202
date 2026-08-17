"use client";

import { useEffect, useState } from "react";
import type { Idioma } from "./copy";

/**
 * A escolha de idioma do visitante — do SITE, não de uma página.
 *
 * Existe desde 17/08/2026, quando a home passou a linkar para a `/tese`. Até
 * ali as duas páginas carregavam cópias idênticas deste bloco, e a duplicação
 * estava documentada como consciente e temporária: extrair mexia em
 * `app/page.tsx`, guardada por 68 testes e2e, antes de a tese existir de fato.
 * Com as duas ligadas, o visitante atravessa de uma para a outra e a escolha
 * precisa atravessar junto — aí a regra passa a ser uma só, num lugar só.
 */

/**
 * A chave no localStorage. Mesma para as duas páginas, e é esse o ponto: quem
 * escolheu EN na home chega em EN na tese, e volta em EN.
 */
const CHAVE = "202:idioma";

function useIdioma(): [Idioma, (novo: Idioma) => void] {
  const [idioma, setIdioma] = useState<Idioma>("pt");

  useEffect(() => {
    const guardado = window.localStorage.getItem(CHAVE);
    // Proposital, e já aceito em três revisões: o estado PRECISA nascer "pt"
    // para o HTML do servidor bater com o primeiro render do cliente
    // (hidratação), e só o localStorage — que não existe no servidor — sabe se
    // deve virar "en". É sincronizar o React com um sistema externo, o próprio
    // caso de uso que a doc da regra aceita, e não derivar estado de estado.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (guardado === "en" || guardado === "pt") setIdioma(guardado);
  }, []);

  // O `lang` do documento é o que leitor de tela e tradutor automático leem.
  // Fica aqui, e não no layout, porque a escolha é do cliente e o layout é
  // renderizado no servidor.
  useEffect(() => {
    document.documentElement.lang = idioma === "pt" ? "pt-BR" : "en";
  }, [idioma]);

  // Nunca detecta o idioma do navegador: a página abre em português e só muda
  // se o visitante disser. Decisão de marca, não limitação.
  function trocar(novo: Idioma) {
    setIdioma(novo);
    window.localStorage.setItem(CHAVE, novo);
  }

  return [idioma, trocar];
}

// Alias obrigatório, e não estilo: `react-hooks/rules-of-hooks` só reconhece um
// hook pelo NOME, na definição e na chamada. Mesma convenção de `usaLanterna`,
// `usaSecaoAtiva` e `usaTocarAoVer`.
export { useIdioma as usaIdioma };
