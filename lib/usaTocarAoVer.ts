"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * Toca a animação de um elemento quando ele entra na tela — uma vez, no
 * relógio dela.
 *
 * Existe para substituir `animation-timeline: view()` nos instrumentos da
 * /tese. Uma animação dirigida pelo scroll herda a mão de quem rola: sai aos
 * trancos, e — o que é fatal para um gráfico — **qualquer parada no meio do
 * caminho vira um estado de repouso**. O leitor para de rolar, olha um desenho
 * pela metade, e lê aquilo como o resultado. Num instrumento de medida isso
 * não é um defeito de acabamento, é um dado errado na tela.
 *
 * O que o hook faz é só escrever `data-toque` no elemento; quem anima é o CSS.
 * São três valores, e os três precisam ser um estado correto da página:
 *
 * - **ausente** — sem JavaScript, sem `IntersectionObserver`, ou com movimento
 *   reduzido. O CSS base desenha o instrumento **completo**. Quem não vê a
 *   animação vê o resultado, que é a leitura certa.
 * - **`"armado"`** — escrito antes da primeira pintura, então ninguém vê o
 *   estado final piscar. O desenho está vazio, esperando.
 * - **`"tocando"`** — roda do começo ao fim, uma vez só. Não volta a tocar se
 *   o visitante subir e descer de novo: a segunda exibição seria ruído, e o
 *   estado final já conta a mesma coisa.
 *
 * Escreve no DOM em vez de devolver estado de propósito. `data-toque` é
 * aparência pura — o React não o conhece, então nem re-renderiza à toa nem
 * apaga o atributo quando a página troca de idioma.
 */

// `useLayoutEffect` roda antes da primeira pintura, que é exatamente o ponto:
// armar o instrumento tem que acontecer sem lampejo. No servidor ele não
// existe (o React avisa no console se for chamado lá), e `useEffect` também
// não roda no servidor — a troca é segura e não muda nada no navegador.
const useEfeitoDePintura =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

function useTocarAoVer<T extends HTMLElement>() {
  const alvo = useRef<T>(null);

  useEfeitoDePintura(() => {
    const no = alvo.current;
    if (!no) return;

    // Sem observador não há como saber a hora certa; sem movimento não deve
    // haver animação nenhuma. Nos dois casos o atributo nunca é escrito e o
    // CSS base entrega o desenho pronto.
    if (typeof IntersectionObserver !== "function") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;

    no.dataset.toque = "armado";

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (!entrada.isIntersecting) continue;
          no.dataset.toque = "tocando";
          observador.disconnect();
        }
      },
      // Um terço à vista: o instrumento precisa estar sendo olhado, não
      // raspando a borda de baixo da tela. Abaixo disso a animação começa
      // enquanto o leitor ainda está no statement da seção anterior.
      { threshold: 0.35 },
    );

    observador.observe(no);
    return () => observador.disconnect();
  }, []);

  return alvo;
}

// Alias obrigatório, e não estilo: `react-hooks/rules-of-hooks` só reconhece
// um hook pelo NOME, tanto na definição quanto na chamada. Mesma convenção de
// `usaLanterna` e `usaSecaoAtiva`.
export { useTocarAoVer as usaTocarAoVer };
