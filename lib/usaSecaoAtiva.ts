import { useEffect, useState } from "react";

/**
 * Qual seção está sendo lida agora.
 *
 * A pergunta é "qual seção cruza o meio da tela?", e é isso que o
 * `rootMargin: "-50% 0px -50% 0px"` pergunta: ele encolhe a área de observação
 * até virar uma linha de um pixel na metade da viewport, de modo que
 * exatamente uma seção de tela cheia esteja intersectando por vez. Sem isso
 * seria preciso comparar `intersectionRatio` entre entradas e desempatar na
 * mão — mais código para chegar no mesmo lugar, e com empate possível quando
 * duas seções aparecem pela metade.
 *
 * `ids` precisa ter identidade estável entre renders (ver `IDS_SECOES` em
 * lib/tese.ts): ele é dependência do efeito, e uma lista nova a cada render
 * desconectaria e reconectaria o observador a cada quadro.
 *
 * Sem `IntersectionObserver` (jsdom, navegador antigo) o hook devolve a
 * primeira seção para sempre. A régua continua desenhada e navegável — ela só
 * para de acompanhar a leitura, que é degradação aceitável para um indicador.
 *
 * Declarado como `useSecaoAtiva` e exportado como `usaSecaoAtiva`, igual a
 * `usaLanterna` e `usaMotionUmaVez`: a regra `react-hooks/rules-of-hooks`
 * identifica um hook pelo PREFIXO do nome, e com o nome em português ela nem
 * checa o corpo da função — o que deixa passar chamada condicional que só
 * quebra no navegador.
 */
function useSecaoAtiva(ids: readonly string[]): string {
  const [ativa, setAtiva] = useState(ids[0] ?? "");

  useEffect(() => {
    if (typeof IntersectionObserver !== "function") return;

    const alvos = ids
      .map((id) => document.getElementById(id))
      .filter((no): no is HTMLElement => no !== null);
    if (alvos.length === 0) return;

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) setAtiva(entrada.target.id);
        }
      },
      { rootMargin: "-50% 0px -50% 0px", threshold: 0 },
    );

    alvos.forEach((no) => observador.observe(no));
    return () => observador.disconnect();
  }, [ids]);

  return ativa;
}

export { useSecaoAtiva as usaSecaoAtiva };
