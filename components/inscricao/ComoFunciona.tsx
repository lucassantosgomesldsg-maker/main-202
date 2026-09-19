import type { CSSProperties, Ref } from "react";

import { COPY_INSCRICAO, type SecaoAbertura } from "@/lib/inscricao";
import Seta from "./Seta";
import estilos from "./ComoFunciona.module.css";

/**
 * A explicação da trilha, abaixo do cartaz da abertura.
 *
 * Entrou em 19/09/2026, a pedido do Pedro: a abertura dizia "retornaremos com
 * mais informações", e a informação chegou. O texto de origem são seis
 * parágrafos dele; a copy (`COPY_INSCRICAO.abertura`) é esse texto condensado,
 * e este componente só o desenha.
 *
 * O desenho tem UMA ideia, tirada da arte do cartaz: a trilha é uma linha que
 * sobe até uma bandeira. As seções de texto são quietas — rótulo na margem,
 * título, parágrafos, fio em cima — e o percurso, no fim, é essa linha de novo:
 * quatro degraus que sobem da esquerda para a direita, acendem conforme sobem e
 * terminam numa bandeira. A numeração existe porque as etapas são uma sequência
 * de verdade (inscrição → trilha → time → empresas parceiras), e só por isso.
 *
 * Não há animação nenhuma aqui. O cartaz já não tinha, e uma explicação que a
 * pessoa lê rolando não ganha nada com parágrafo entrando de lado.
 */
export default function ComoFunciona({
  aoComecar,
  ref,
}: {
  aoComecar: () => void;
  /**
   * O alvo do botão "COMO FUNCIONA" do cartaz: é para cá que a tela rola, e é
   * aqui que o foco pousa. Por isso o `tabIndex={-1}` abaixo — sem ele um
   * `<div>` não aceita `focus()`, o foco ficaria no botão que acabou de sair da
   * tela, e o próximo Tab de quem usa teclado começaria lá de cima.
   *
   * `-1` e não `0`: a região é alvo de foco PROGRAMADO, não uma parada de Tab.
   * O percurso de teclado da abertura continua sendo logo → COMEÇAR (guardado
   * por `e2e/inscricao.spec.ts`).
   */
  ref?: Ref<HTMLDivElement>;
}) {
  const a = COPY_INSCRICAO.abertura;

  return (
    <div
      ref={ref}
      className={estilos.explicacao}
      tabIndex={-1}
      // Com nome e papel, o leitor de tela anuncia ONDE o foco pousou depois do
      // "COMO FUNCIONA" — sem isto ele cairia num contêiner anônimo e começaria
      // a ler do nada. O nome é o mesmo do botão que trouxe a pessoa até aqui.
      role="region"
      aria-label={a.convite}
    >
      <Secao secao={a.porQue} />

      <section className={estilos.secao}>
        <p className={`label ${estilos.rotulo}`}>{a.frentes.rotulo}</p>
        <div>
          <h2 className={estilos.titulo}>{a.frentes.titulo}</h2>
          <div className={estilos.frentes}>
            {a.frentes.itens.map((frente) => (
              <div key={frente.tag} className={estilos.frente}>
                <p className={`label ${estilos.tag}`}>{frente.tag}</p>
                <h3 className={estilos.subtitulo}>{frente.titulo}</h3>
                <p className={estilos.paragrafo}>{frente.texto}</p>
              </div>
            ))}
          </div>
          <p className={estilos.ligacao}>{a.frentes.ligacao}</p>
        </div>
      </section>

      <Secao secao={a.ai} />

      {/* O percurso ocupa a largura toda — o rótulo sobe para cima do título em
          vez de ficar na margem —, porque a subida precisa de chão: quatro
          colunas dentro da coluna de texto ficariam com 9rem cada. */}
      <section className={estilos.secao} data-forma="larga">
        <p className={`label ${estilos.rotulo}`}>{a.percurso.rotulo}</p>
        <div>
          <h2 className={estilos.titulo}>{a.percurso.titulo}</h2>
          <ol className={estilos.percurso}>
            {a.percurso.etapas.map((etapa, i) => {
              const ultima = i === a.percurso.etapas.length - 1;
              return (
                <li
                  key={etapa.titulo}
                  className={estilos.etapa}
                  // `--i` é o degrau: o CSS tira dele a altura da subida e o
                  // quanto a linha acende. Vai por variável porque é um número
                  // por item, e a alternativa seria um seletor `:nth-child`
                  // para cada um — quatro regras dizendo a mesma conta.
                  style={{ "--i": i } as CSSProperties}
                  data-ultima={ultima || undefined}
                >
                  <span className={`label ${estilos.numero}`}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className={estilos.subtitulo}>{etapa.titulo}</h3>
                  <p className={estilos.paragrafo}>{etapa.texto}</p>
                  {ultima && <Bandeira />}
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* `<div>` e não `<section>`: as seções daqui abrem com um h2, e isto é a
          coda da página — uma frase e a segunda porta —, não mais um capítulo. */}
      <div className={estilos.fecho}>
        <p className={estilos.fechoTexto}>{a.fecho.texto}</p>
        <button type="button" className={estilos.comecar} onClick={aoComecar}>
          {a.fecho.botao}
          <Seta className={estilos.seta} />
        </button>
      </div>
    </div>
  );
}

/** Uma seção de texto corrido: rótulo na margem, título e parágrafos. */
function Secao({ secao }: { secao: SecaoAbertura }) {
  return (
    <section className={estilos.secao}>
      <p className={`label ${estilos.rotulo}`}>{secao.rotulo}</p>
      <div>
        <h2 className={estilos.titulo}>{secao.titulo}</h2>
        <div className={estilos.texto}>
          {secao.texto.map((paragrafo) => (
            <p key={paragrafo} className={estilos.paragrafo}>
              {paragrafo}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * A bandeira do fim do percurso.
 *
 * É um eco da bandeira da arte do cartaz, e não uma cópia dela: aquela é um
 * render com brilho e granulação, esta são três traços. O que as liga é a forma
 * (mastro à esquerda, flâmula ondulada terminando em ponta) e o verde.
 *
 * Decorativa: o que ela diz — "aqui é o fim da subida" — a lista numerada já
 * diz para quem não a vê.
 */
function Bandeira() {
  return (
    <svg
      className={estilos.bandeira}
      viewBox="0 0 40 56"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M8 3v51" />
      <path d="M4 54h8" />
      <path d="M8 5c5-2.5 8 2.5 13 0.5s9-0.5 15 4c-6 1.5-9 0.5-13 3s-9 4-15 5" />
    </svg>
  );
}
