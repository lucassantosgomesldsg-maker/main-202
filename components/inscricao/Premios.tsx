"use client";

import { useEffect, useRef } from "react";
import { COPY_INSCRICAO, LIMITES, contarCaracteres, textoContador } from "@/lib/inscricao";
import { Moldura, idDoCampo } from "./Campos";
import campos from "./Campos.module.css";
import estilos from "./Premios.module.css";

/**
 * O repeater de prêmios (spec §4.2).
 *
 * Três decisões que não são estéticas:
 *
 * **Começa com um campo, e o `+` só aparece depois que ele tem conteúdo.** Um
 * botão de adicionar visível ao lado de um campo vazio convida a criar linhas
 * em branco, e linha em branco é ruído que alguém vai ter de limpar depois — a
 * validação limpa, mas a pessoa vê a bagunça enquanto preenche.
 *
 * **Ao adicionar, o foco vai para o campo novo.** Sem isso a pessoa clica em
 * `+`, o cursor continua onde estava, nada *parece* ter acontecido, e ela
 * clica de novo — o defeito mais comum de repeater que existe.
 *
 * **Não existe "não tenho prêmio" para marcar** (spec §4.2). Quem não tem,
 * avança. Marcar a própria ausência é humilhante e não acrescenta dado nenhum.
 */
export default function Premios({
  valores,
  aoMudar,
  erro,
}: {
  valores: readonly string[];
  aoMudar: (valores: string[]) => void;
  erro?: string;
}) {
  const id = idDoCampo("premios");
  const copia = COPY_INSCRICAO.premios;

  /** Um rascunho corrompido pode devolver lista vazia; a tela nunca fica sem campo. */
  const linhas = valores.length === 0 ? [""] : valores;

  /**
   * O índice que acabou de nascer e precisa receber o foco.
   *
   * Um `ref` e não um `useState`: isto é uma ordem para o DOM, não um pedaço do
   * estado da tela — nada é desenhado diferente por causa dele. Guardá-lo em
   * estado obrigaria a zerá-lo com um `setState` dentro do efeito, que é a
   * cascata de render que o `react-hooks/set-state-in-effect` recusa. O efeito
   * roda depois de todo render, e quem o traz até aqui é o `aoMudar` que
   * acabou de acrescentar a linha.
   */
  const recemCriado = useRef<number | null>(null);

  const idDoItem = (i: number): string => (i === 0 ? id : `${id}-${i}`);

  useEffect(() => {
    const i = recemCriado.current;
    if (i === null) return;
    recemCriado.current = null;
    document.getElementById(idDoItem(i))?.focus();
  });

  const cheio = linhas.length >= LIMITES.maxPremios;
  const ultimoPreenchido = linhas[linhas.length - 1].trim() !== "";
  const podeAdicionar = !cheio && ultimoPreenchido;

  function trocar(i: number, texto: string): void {
    aoMudar(linhas.map((v, j) => (j === i ? texto : v)));
  }

  function remover(i: number): void {
    aoMudar(linhas.filter((_, j) => j !== i));
  }

  function adicionar(): void {
    aoMudar([...linhas, ""]);
    recemCriado.current = linhas.length;
  }

  return (
    <Moldura campo="premios" id={id} erro={erro} grupo>
      <ol className={estilos.lista}>
        {linhas.map((valor, i) => {
          const idItem = idDoItem(i);
          const nome = copia.rotuloItem.replace("{n}", String(i + 1));
          // O contador só acende nos últimos 40 caracteres. Num repeater de até
          // oito linhas, oito contadores permanentes viram ruído — e um prêmio
          // típico tem trinta caracteres, longe de qualquer limite.
          const usado = contarCaracteres(valor);
          const mostrarContador = usado > LIMITES.premio - 40;

          return (
            <li key={i} className={estilos.linha} data-premio>
              <input
                id={idItem}
                className={campos.controle}
                type="text"
                aria-label={nome}
                placeholder={i === 0 ? COPY_INSCRICAO.campos.premios.placeholder : undefined}
                value={valor}
                onChange={(e) => trocar(i, e.target.value)}
                aria-invalid={erro !== undefined || undefined}
                aria-describedby={mostrarContador ? `${idItem}-contador` : undefined}
              />
              {/* O `×` só existe quando há mais de uma linha: com uma linha só,
                  remover não teria o que fazer — apagar o texto é a mesma coisa
                  e é o gesto que a pessoa já conhece. */}
              {linhas.length > 1 && (
                <button
                  type="button"
                  className={estilos.remover}
                  onClick={() => remover(i)}
                  aria-label={`${copia.remover} ${nome}`}
                >
                  <span className={estilos.cruz} aria-hidden="true" />
                </button>
              )}
              {mostrarContador && (
                <p
                  id={`${idItem}-contador`}
                  className={estilos.contador}
                  data-estado={usado > LIMITES.premio ? "passou" : "perto"}
                >
                  {textoContador(valor, LIMITES.premio)}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      {podeAdicionar && (
        <button type="button" className={estilos.adicionar} onClick={adicionar}>
          {copia.adicionar}
        </button>
      )}
    </Moldura>
  );
}
