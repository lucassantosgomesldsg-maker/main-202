"use client";

import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { duracaoApagamento, duracaoEscrita } from "@/lib/abertura";
import { COPY, type Idioma } from "@/lib/copy";
import estilos from "./FraseDigitada.module.css";

/**
 * As quatro situações em que a frase pode estar. É UM atributo com quatro
 * valores, e não dois booleanos: `estatica` + `apagando` deixaria escrever
 * combinações impossíveis, e o CSS teria que desempatar.
 *
 * - `entrada`    — a abertura da página; atraso base `--t-frase`.
 * - `apagando`   — a frase antiga saindo, do último caractere para o primeiro.
 * - `escrevendo` — a frase nova sendo escrita; atraso base `--t-troca`.
 * - `parada`     — repouso: tudo aceso, sem cursor, sem animação nenhuma.
 */
type Fase = "entrada" | "apagando" | "escrevendo" | "parada";

/** Uma tomada da frase: o que está no DOM, em que fase, e qual gravação.
 *  Os três juntos num estado só porque eles mudam sempre juntos — separados,
 *  um render intermediário poderia mostrar a fase nova com o texto velho. */
type Ciclo = { texto: Idioma; fase: Fase; tomada: number };

/** Mesmo helper de components/Malha.tsx e lib/usaLanterna.ts. Sem matchMedia
 *  (jsdom, servidor) devolve false — o caminho com animação. */
function consulta(pergunta: string): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia(pergunta).matches;
}

/**
 * A frase do rodapé, escrita caractere a caractere.
 *
 * Não há timer para a DIGITAÇÃO: cada caractere é um <span> que carrega o
 * próprio índice em `--i`, e o CSS deriva o atraso dele com
 * `calc(var(--t-base) + var(--i) * var(--d-caractere))`. O escalonamento sai
 * da aritmética do CSS.
 *
 * Isso não é economia de linhas, são três propriedades boas de graça:
 * funciona com JavaScript desligado (animação CSS não depende de hidratação),
 * não existe piscada entre o HTML do servidor e o primeiro quadro do cliente,
 * e `prefers-reduced-motion` volta a ser tratado só por @media, como no resto
 * do projeto.
 *
 * O JavaScript daqui NÃO anima: ele só decide QUAL fase está valendo e quando
 * ela acabou (os dois `setTimeout` abaixo). Com JS desligado a página nunca
 * troca de idioma — não há como — então a entrada, que é o único caminho sem
 * JS, continua sendo CSS puro do começo ao fim.
 *
 * A frase INTEIRA está no DOM desde o primeiro quadro — o textContent do <h1>
 * é a frase completa em qualquer estado, inclusive durante o apagamento. Os
 * caracteres apagados são `opacity: 0`, e NÃO `visibility: hidden`:
 * visibility:hidden os tiraria da árvore de acessibilidade, e um leitor de
 * tela encontraria um <h1> vazio.
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
  const [ciclo, setCiclo] = useState<Ciclo>({
    texto: idioma,
    fase: "entrada",
    tomada: 0,
  });

  // Quem sabe que a abertura acabou é a página (ela é dona do relógio da
  // coreografia inteira), então "entrada" só termina quando `estatica` chega.
  // As outras três fases terminam sozinhas, pelos timers daqui.
  const fase: Fase = ciclo.fase === "entrada" && estatica ? "parada" : ciclo.fase;

  // O idioma pedido mais recente, para o fim do apagamento ler. É um ref e não
  // uma dependência do efeito de propósito: clicar durante o apagamento não
  // pode reiniciar o timer dele, senão martelar PT/EN empurraria o fim do
  // apagamento para sempre e a frase nunca voltaria.
  const alvo = useRef(idioma);
  useEffect(() => {
    alvo.current = idioma;
  }, [idioma]);

  // Ajuste de estado durante o render — o padrão que a doc do React indica
  // para "reagir a uma prop que mudou", e não um efeito: um efeito renderizaria
  // uma vez com a fase velha antes de corrigir, e essa passada extra é
  // exatamente um quadro de frase errada.
  if (idioma !== ciclo.texto && ciclo.fase !== "apagando") {
    // Com a frase inteira acesa há o que apagar, e o texto VELHO fica no DOM
    // até o apagamento terminar. No meio de uma escrita não há: os caracteres
    // ainda não escritos teriam que ACENDER para poderem apagar (a fase
    // `apagando` nasce com tudo em opacity 1) — um flash. Frase incompleta se
    // corta e recomeça.
    setCiclo(
      fase === "parada"
        ? { texto: ciclo.texto, fase: "apagando", tomada: ciclo.tomada + 1 }
        : { texto: idioma, fase: "escrevendo", tomada: ciclo.tomada + 1 },
    );
  }

  useEffect(() => {
    if (ciclo.fase !== "apagando" && ciclo.fase !== "escrevendo") return;

    // O @media zera as animações, mas não zeraria ESTES timers: quem pediu
    // menos movimento veria o texto antigo parado por ~0,8s antes de trocar —
    // pior que a troca seca de antes. Com duração 0 a troca é imediata.
    const reduzido = consulta("(prefers-reduced-motion: reduce)");
    const ms = reduzido
      ? 0
      : ciclo.fase === "apagando"
        ? duracaoApagamento(ciclo.texto)
        : duracaoEscrita(ciclo.texto);

    const fim = setTimeout(() => {
      setCiclo((atual) => {
        // Fim da escrita. Sem tomada nova: a frase já está inteira acesa e
        // `parada` a mantém assim — remontar aqui daria uma piscada de graça.
        if (atual.fase !== "apagando") return { ...atual, fase: "parada" };

        // O alvo do MOMENTO, não o de quando o apagamento começou. Se o
        // visitante voltou para o idioma que já estava, isto reescreve o mesmo
        // texto — apagou, escreve de novo, que é o que ele viu acontecer.
        //
        // Com movimento reduzido não há escrita nenhuma pela frente (o @media
        // já deixa todo caractere aceso), então a frase nova entra direto em
        // `parada`: uma troca, e não duas.
        return {
          texto: alvo.current,
          fase: reduzido ? "parada" : "escrevendo",
          tomada: atual.tomada + 1,
        };
      });
    }, ms);

    return () => clearTimeout(fim);
    // `ciclo.tomada` entra nas dependências para o caso de dois cortes
    // seguidos caírem na mesma fase com o mesmo texto (PT→EN→PT no meio da
    // escrita): sem ela o efeito não reiniciaria e o timer da tomada anterior
    // encerraria a nova cedo demais.
  }, [ciclo.fase, ciclo.texto, ciclo.tomada]);

  // Array.from e não split(""): conta code points. A mesma conta está em
  // `caracteres()` de lib/abertura.ts, e as duas PRECISAM bater — é o índice
  // do último caractere que diz onde o cursor some.
  const porLinha = COPY[ciclo.texto].onelinerLinhas.map((linha) =>
    Array.from(linha),
  );
  const total = porLinha.reduce((n, chars) => n + chars.length, 0);

  return (
    <h1
      className={`oneliner ${estilos.frase}`}
      data-ima="oneliner"
      data-fase={fase}
      // O apagamento anda de trás para frente, e quem sabe onde é "trás" é o
      // total. Uma custom property no pai, e não mais uma em cada um dos 47
      // <span>: o CSS faz `--n - 1 - --i` sozinho.
      style={{ "--n": String(total) } as CSSProperties}
    >
      {porLinha.map((chars, l) => {
        // O índice atravessa a quebra de linha: a linha 2 continua de onde a
        // linha 1 parou. Se reiniciasse, as duas se escreveriam ao mesmo tempo.
        const deslocamento = porLinha
          .slice(0, l)
          .reduce((n, anteriores) => n + anteriores.length, 0);

        return (
          // A `key` carrega a tomada, e isso é o que faz a reescrita reiniciar
          // de verdade: trocar o texto de um <span> NÃO reinicia a animação
          // CSS dele. Num corte `escrevendo → escrevendo` o animation-name
          // sequer muda, então sem nós novos a frase nova apareceria pela
          // metade, herdando o relógio da anterior.
          <Fragment key={`${ciclo.tomada}-${l}`}>
            {l > 0 && <br />}
            <span data-linha={l}>
              {chars.map((caractere, j) => {
                const i = deslocamento + j;
                return (
                  <span
                    key={`${ciclo.tomada}-${i}`}
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
