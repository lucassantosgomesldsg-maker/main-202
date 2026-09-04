"use client";

import { COPY_INSCRICAO, textoProgresso } from "@/lib/inscricao";
import estilos from "./Progresso.module.css";

/**
 * Cinco segmentos e uma frase: quanto falta, e de que se trata o passo atual.
 *
 * "Quanto falta" é a única pergunta que a pessoa faz num formulário de três
 * minutos, e uma barra contínua não responde — ela mostra uma proporção, não um
 * número. Cinco segmentos contáveis mais `3 de 5` respondem.
 *
 * **A região `role="status"` é o motivo de este componente existir mesmo na
 * abertura**, vazio. Um leitor de tela só anuncia a mudança de um `aria-live`
 * se a região já estivesse no documento **antes** da mudança; se ela nascesse
 * junto com o primeiro bloco, quem clicasse em COMEÇAR não ouviria nada e não
 * saberia se o botão funcionou.
 *
 * Segmento cumprido volta para o bloco dele — é o mesmo que o botão VOLTAR faz,
 * e nunca perde o preenchido. Segmento futuro não é clicável, porque pular um
 * bloco obrigatório só levaria a um erro de validação alguns cliques depois.
 */
export default function Progresso({
  atual,
  aoVoltarPara,
}: {
  /** O bloco atual (0..4), ou `null` na abertura e na confirmação — onde não há passo. */
  atual: number | null;
  aoVoltarPara: (bloco: number) => void;
}) {
  return (
    <div className={estilos.progresso} data-vazio={atual === null}>
      {atual !== null && (
        <nav aria-label={COPY_INSCRICAO.progresso.rotulo}>
          <ol className={estilos.trilho}>
            {COPY_INSCRICAO.blocos.map((bloco, i) => {
              const estado = i < atual ? "cumprido" : i === atual ? "atual" : "futuro";
              return (
                <li
                  key={bloco.rotulo}
                  className={estilos.segmento}
                  data-estado={estado}
                  aria-current={estado === "atual" ? "step" : undefined}
                >
                  {estado === "cumprido" ? (
                    <button
                      type="button"
                      className={estilos.alvo}
                      aria-label={bloco.rotulo}
                      onClick={() => aoVoltarPara(i)}
                    >
                      <span className={estilos.barra} aria-hidden="true" />
                    </button>
                  ) : (
                    <span className={estilos.alvo}>
                      <span className={estilos.barra} aria-hidden="true" />
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      <p className={estilos.rotulo} role="status" data-progresso>
        {atual !== null && (
          <>
            <span>{textoProgresso(atual + 1)}</span>
            {/* O separador é um fio desenhado, e não um "·" digitado dentro da
                copy — mesma regra do ponto verde da /tese: o que é desenho é
                responsabilidade do componente, e assim ele não some no dia em
                que alguém editar o texto. */}
            <span className={estilos.fio} aria-hidden="true" />
            <span>{COPY_INSCRICAO.blocos[atual].rotulo}</span>
          </>
        )}
      </p>
    </div>
  );
}
