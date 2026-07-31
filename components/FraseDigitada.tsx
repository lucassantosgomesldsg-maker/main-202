import { Fragment, type CSSProperties } from "react";
import { COPY, type Idioma } from "@/lib/copy";
import estilos from "./FraseDigitada.module.css";

/**
 * A frase do rodapé, escrita caractere a caractere.
 *
 * Não há timer nem estado: cada caractere é um <span> que carrega o próprio
 * índice em `--i`, e o CSS deriva o atraso dele com
 * `calc(var(--t-frase) + var(--i) * var(--d-caractere))`. O escalonamento sai
 * da aritmética do CSS.
 *
 * Isso não é economia de linhas, são três propriedades boas de graça:
 * funciona com JavaScript desligado (animação CSS não depende de hidratação),
 * não existe piscada entre o HTML do servidor e o primeiro quadro do cliente,
 * e `prefers-reduced-motion` volta a ser tratado só por @media, como no resto
 * do projeto.
 *
 * A frase INTEIRA está no DOM desde o primeiro quadro — o textContent do <h1>
 * é a frase completa em qualquer estado. Os caracteres ainda não escritos são
 * `opacity: 0`, e NÃO `visibility: hidden`: visibility:hidden os tiraria da
 * árvore de acessibilidade, e um leitor de tela encontraria um <h1> vazio
 * durante os primeiros quatro segundos.
 *
 * Continua <h1> (é a única frase que descreve o que a 202 faz — o título da
 * página para leitor de tela e para busca) e continua sendo o ímã da lanterna
 * (`data-ima`). As duas coisas são decisões registradas no design; não são
 * detalhes de implementação.
 */
export default function FraseDigitada({
  idioma,
  estatica,
}: {
  idioma: Idioma;
  estatica: boolean;
}) {
  // Array.from e não split(""): conta code points. A mesma conta está em
  // `caracteres()` de lib/abertura.ts, e as duas PRECISAM bater — é o índice
  // do último caractere que diz onde o cursor some.
  const porLinha = COPY[idioma].onelinerLinhas.map((linha) => Array.from(linha));
  const total = porLinha.reduce((n, chars) => n + chars.length, 0);

  return (
    <h1
      className={`oneliner ${estilos.frase}`}
      data-ima="oneliner"
      data-estatica={String(estatica)}
    >
      {porLinha.map((chars, l) => {
        // O índice atravessa a quebra de linha: a linha 2 continua de onde a
        // linha 1 parou. Se reiniciasse, as duas se escreveriam ao mesmo tempo.
        const deslocamento = porLinha
          .slice(0, l)
          .reduce((n, anteriores) => n + anteriores.length, 0);

        return (
          <Fragment key={l}>
            {l > 0 && <br />}
            <span data-linha={l}>
              {chars.map((caractere, j) => {
                const i = deslocamento + j;
                return (
                  <span
                    key={i}
                    data-caractere=""
                    data-ultimo={i === total - 1 ? "true" : undefined}
                    className={estilos.caractere}
                    style={{ "--i": String(i) } as CSSProperties}
                  >
                    {caractere}
                  </span>
                );
              })}
            </span>
          </Fragment>
        );
      })}
    </h1>
  );
}
