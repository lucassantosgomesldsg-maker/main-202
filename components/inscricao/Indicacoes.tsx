"use client";

import { COPY_INSCRICAO, LIMITES } from "@/lib/inscricao";
import { Moldura, idDoCampo } from "./Campos";
import campos from "./Campos.module.css";
import estilos from "./Indicacoes.module.css";

/** Uma linha da tela: os dois campos como strings, um deles possivelmente vazio. */
export type LinhaIndicacao = { nome: string; linkedin: string };

/**
 * As três indicações (spec §4.6).
 *
 * É primo do repeater de prêmios, e as diferenças com ele são todas
 * deliberadas:
 *
 * **Três linhas fixas, sem `+` e sem `×`.** A pergunta pede três pessoas, e
 * três caixas na tela dizem isso sem precisar de frase. Um repeater que começa
 * com uma linha comunica "quantas você quiser" — a pergunta errada. Sem
 * botão de adicionar, também não há botão de remover: esvaziar os dois campos
 * é o gesto, e ele é o mesmo que a pessoa já usa em qualquer campo opcional.
 *
 * **O par nunca se separa.** Nome e LinkedIn moram no mesmo objeto desde a
 * tela até o banco (ver `Indicacao` em `lib/inscricao.ts`). Duas listas
 * paralelas deixariam o nome de uma pessoa colar no link de outra no dia em
 * que uma delas chegasse com um item a menos.
 *
 * **Sem contador.** Os prêmios têm um porque um prêmio é frase livre que
 * cresce; um nome não. O limite de `textoCurto` existe contra robô, e a
 * validação avisa se alguém chegar perto — pôr seis contadores na tela para um
 * caso que não acontece é o ruído que a §10 não quer.
 */
export default function Indicacoes({
  valores,
  aoMudar,
  erro,
}: {
  valores: readonly LinhaIndicacao[];
  aoMudar: (valores: LinhaIndicacao[]) => void;
  erro?: string;
}) {
  const id = idDoCampo("indicacoes");
  const copia = COPY_INSCRICAO.indicacoes;

  /* Um rascunho corrompido pode devolver menos linhas; a tela mostra sempre as
     três. Mesmo princípio do `valores.length === 0 ? [""] : valores` dos
     prêmios: a interface não pergunta quantas linhas tem, ela sabe. */
  const linhas: LinhaIndicacao[] = Array.from(
    { length: LIMITES.maxIndicacoes },
    (_, i) => valores[i] ?? { nome: "", linkedin: "" },
  );

  function trocar(i: number, parte: keyof LinhaIndicacao, texto: string): void {
    aoMudar(linhas.map((linha, j) => (j === i ? { ...linha, [parte]: texto } : linha)));
  }

  return (
    <Moldura campo="indicacoes" id={id} erro={erro} grupo>
      <ol className={estilos.lista}>
        {linhas.map((linha, i) => {
          // A caixa do NOME da primeira pessoa carrega o id "pelado" do campo.
          // Não é estilo: `Formulario` devolve o foco ao campo com erro fazendo
          // `document.getElementById(idDoCampo("indicacoes"))`, e o erro daqui
          // é do GRUPO — não existe um id por linha para ele apontar. Sem esta
          // linha o `getElementById` devolve `null`, o efeito de foco desiste
          // em silêncio (`if (alvo === null) return`), e quem preencheu só o
          // nome vê o formulário recusar o envio sem levar a lugar nenhum —
          // verificado no navegador antes de existir esta linha. Mesma
          // convenção do repeater de prêmios (`idDoItem`).
          const idNome = i === 0 ? id : `${id}-${i}-nome`;
          const idLinkedin = `${id}-${i}-linkedin`;
          const pessoa = copia.rotuloItem.replace("{n}", String(i + 1));

          return (
            <li key={i} className={estilos.pessoa} data-indicacao>
              {/* `aria-hidden` porque o mesmo texto já vai, inteiro, no
                  `aria-label` de cada campo ("Pessoa 1 — Nome"). Sem isso o
                  leitor de tela anuncia "Pessoa 1" solto antes de cada par, e
                  a pessoa ouve o rótulo duas vezes por campo. */}
              <p className={estilos.ordem} aria-hidden="true">
                {pessoa}
              </p>

              <input
                id={idNome}
                className={campos.controle}
                type="text"
                aria-label={`${pessoa} — ${copia.nome}`}
                placeholder={copia.placeholderNome}
                value={linha.nome}
                onChange={(e) => trocar(i, "nome", e.target.value)}
                aria-invalid={erro !== undefined || undefined}
              />

              {/* `type="text"` e não `type="url"`: a validação nativa do
                  navegador para `url` exige o esquema (`https://`) e recusa
                  `linkedin.com/in/fulano` — que é exatamente a forma que a
                  pessoa cola. Quem entende as seis formas é
                  `normalizarLinkedin`, no servidor e no cliente, igual ao
                  campo `linkedin` de quem se inscreve. */}
              <input
                id={idLinkedin}
                className={campos.controle}
                type="text"
                inputMode="url"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                aria-label={`${pessoa} — ${copia.linkedin}`}
                placeholder={copia.placeholderLinkedin}
                value={linha.linkedin}
                onChange={(e) => trocar(i, "linkedin", e.target.value)}
                aria-invalid={erro !== undefined || undefined}
              />
            </li>
          );
        })}
      </ol>
    </Moldura>
  );
}
