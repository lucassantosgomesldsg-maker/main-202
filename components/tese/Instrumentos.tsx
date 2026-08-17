"use client";

import type { CSSProperties } from "react";
import type { Conteudo } from "@/lib/tese";
// Alias obrigatório — ver o comentário em lib/usaTocarAoVer.ts.
import { usaTocarAoVer as useTocarAoVer } from "@/lib/usaTocarAoVer";
import estilos from "./Instrumentos.module.css";

/**
 * Os instrumentos da tese: um desenho por crença.
 *
 * Cinco componentes num arquivo só, contra a convenção de "um componente por
 * arquivo" do resto do repo, e de propósito. Eles não são reutilizáveis — cada
 * um existe para sustentar uma seção específica desta página e nunca vai ser
 * importado de outro lugar. Separá-los criaria dez arquivos (cinco `.tsx` e
 * cinco `.module.css`) que só seriam abertos juntos, e a folha de estilo
 * compartilhada é o que garante que os cinco leiam como o mesmo instrumento:
 * mesmo fio de 1px, mesma escala de mono, mesma régua de espaço.
 *
 * Os cinco entram por `usaTocarAoVer`: quando o desenho aparece na tela, ele se
 * mostra. Três só surgem; a linha do tempo e o descompasso tocam uma
 * animação inteira. O que os cinco têm em comum é não depender do scroll — um
 * desenho dirigido pela roda do mouse pode ser parado no meio, e um gráfico
 * parado no meio é lido como resultado. Era literalmente o caso da primeira
 * versão: com a seção parada na posição natural de leitura, o instrumento
 * ficava a 40% de opacidade, mais apagado que o texto que ele deveria provar.
 *
 * A regra de cor, que vale para os cinco: **verde é a fronteira.** Ele marca o
 * que se move — as renovações na linha do tempo, a linha contínua do
 * descompasso, o lado que supera na comparação. Tudo que é estrutura, medida
 * ou institucional é branco ou cinza. Sem essa regra o verde vira enfeite e a
 * página perde o único código de cor que ela tem.
 */

/* ── 1 · A linha do tempo ──────────────────────────────────────────────────
   A peça central da página. Tudo é posicionado em porcentagem de 54 meses, o
   fim da terceira renovação — o eixo vai até lá, e não até 48, exatamente para
   que a graduação TERMINE ANTES do fim do desenho. É esse pedaço de eixo
   sobrando à direita que carrega o argumento; sem ele o diploma pareceria
   acompanhar a fronteira. */

const HORIZONTE = 54;
const RENOVACOES = [18, 36, 54];
const MARCAS = [0, 18, 36, 48, 54];
const GRADUACAO = 48;

/**
 * Onde um mês cai no instrumento — de 0 a 1.
 *
 * Vai para o CSS como `--fracao`, e lá serve para **duas** coisas: o `left` do
 * elemento e o instante em que ele entra na animação. Posição e tempo saem da
 * mesma conta, então não há como o desenho e o relógio divergirem: a marca do
 * mês 18 acende exatamente quando a barra verde passa por cima dela.
 */
const fracao = (mes: number) => mes / HORIZONTE;
const pct = (mes: number) => `${fracao(mes) * 100}%`;

/** `left` + `--fracao` de uma vez, que é como quase tudo aqui é posicionado. */
const em = (mes: number) =>
  ({ left: pct(mes), "--fracao": fracao(mes) }) as CSSProperties;

export function LinhaDoTempo({ t }: { t: Conteudo }) {
  const alvo = useTocarAoVer<HTMLElement>();

  return (
    <figure className={estilos.instrumento} ref={alvo}>
      <figcaption className={`label ${estilos.titulo}`}>
        {t.linhaDoTempo.titulo}
      </figcaption>

      <div className={estilos.tempo}>
        {/* A ordem no DOM é a ordem de empilhamento, sem `z-index`: o eixo é o
            chão, o percurso corre por cima dele, as renovações por cima dos
            dois. */}
        <span className={estilos.eixo} aria-hidden="true" />

        {/* A fronteira atravessando os 54 meses. É a barra de progresso do
            instrumento: enquanto ela corre, o eixo cinza à frente é o que
            ainda não aconteceu. */}
        {/* `data-percurso` não é enfeite de teste: é como e2e/tese.spec.ts
            pergunta "a barra chegou ao fim sozinha?" sem depender do nome
            sorteado pelo CSS Module. */}
        <span className={estilos.percurso} data-percurso aria-hidden="true" />

        {/* As renovações sobem do eixo, porque a fronteira sobe — a graduação,
            abaixo, desce. Cada uma acende no mês em que acontece. */}
        {RENOVACOES.map((mes) => (
          <span
            key={mes}
            className={estilos.renovacao}
            style={em(mes)}
            aria-hidden="true"
          />
        ))}

        {/* A barra da graduação corre à MESMA velocidade da fronteira e para
            em 48 de 54. Ver o comentário do movimento na folha de estilo: se
            as duas terminassem juntas, o desenho diria o contrário da seção. */}
        <span
          className={estilos.graduacao}
          style={{ width: pct(GRADUACAO), "--fracao": fracao(GRADUACAO) } as CSSProperties}
          aria-hidden="true"
        />

        {/* O rótulo fica FORA da barra, centrado no meio dela. Dentro dela ele
            era filho de um elemento em `scaleX`, e aparecia espremido durante
            toda a animação. Aparece no mês 48, quando a barra TERMINA — nomear
            a graduação antes de ela acabar entregaria o fim cedo demais. */}
        <span
          className={`label ${estilos.graduacaoRotulo}`}
          style={
            {
              left: pct(GRADUACAO / 2),
              "--fracao": fracao(GRADUACAO),
            } as CSSProperties
          }
        >
          {t.linhaDoTempo.graduacao}
        </span>

        {MARCAS.map((mes) => (
          <span
            key={mes}
            className={`label ${estilos.marca}`}
            style={em(mes)}
            data-fim={mes === HORIZONTE ? "sim" : undefined}
          >
            {mes}
          </span>
        ))}

        <span className={`label ${estilos.unidade}`}>
          {t.linhaDoTempo.unidade}
        </span>
      </div>

      <p className={`label ${estilos.conclusao}`}>{t.linhaDoTempo.conclusao}</p>
    </figure>
  );
}

/* ── 2 · O descompasso ─────────────────────────────────────────────────────
   Contínuo contra discreto. A reta verde sobe sem parar; a escada cinza sobe
   uma vez por ano e passa o resto do tempo parada. O que o desenho mostra não
   é que uma é mais alta que a outra — é que a ÁREA entre as duas cresce, e
   nunca fecha. Por isso o preenchimento entre elas existe: ele é o argumento,
   as linhas são só a borda dele. */

/**
 * O `id` do recorte que varre o gráfico. Constante de módulo porque `url(#…)`
 * precisa de um nome estável, e a seção existe uma vez só na página.
 */
const VARREDURA = "descompasso-varredura";

export function Descompasso({ t }: { t: Conteudo }) {
  const alvo = useTocarAoVer<HTMLElement>();

  return (
    <figure className={estilos.instrumento} ref={alvo}>
      <svg
        className={estilos.grafico}
        viewBox="0 0 600 200"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        {/* O desenho inteiro é revelado por uma frente vertical que corre da
            esquerda para a direita — o tempo passando. As duas curvas saem
            dela juntas, no mesmo instante e no mesmo x, que é o que faz a
            disputa entre elas ser visível enquanto acontece.

            Foi assim que este instrumento parou de depender de
            `stroke-dasharray`. A versão anterior desenhava com
            `pathLength="1"` + dasharray, e isso é INCOMPATÍVEL com
            `vector-effect: non-scaling-stroke`: o Chrome mede o traço em
            pixels de tela, e como o `preserveAspectRatio="none"` estica o eixo
            X em 1,44×, o traço cobria só ~71% da curva verde e ~74% da escada.
            Não era um defeito de animação — o estado FINAL ficava cortado, com
            o preenchimento inteiro ao lado de duas linhas que morriam no meio
            do gráfico. Recorte é geometria pura: não tem essa conversa. */}
        <defs>
          <clipPath id={VARREDURA} clipPathUnits="userSpaceOnUse">
            <rect className={estilos.varredura} x="0" y="-40" width="600" height="280" />
          </clipPath>
        </defs>

        <g clipPath={`url(#${VARREDURA})`}>
          {/* a distância entre as duas: o descompasso propriamente dito */}
          <path
            className={estilos.vao}
            d="M0,180 L600,20 L600,90 H450 V115 H300 V145 H150 V180 Z"
          />
          {/* o currículo: degraus, uma vez por ano */}
          <path
            className={estilos.escada}
            d="M0,180 H150 V145 H300 V115 H450 V90 H600"
          />
          {/* a fronteira: contínua */}
          <path className={estilos.continua} d="M0,180 L600,20" />
        </g>
      </svg>

      <div className={estilos.legendas}>
        <p className={estilos.legenda} data-tipo="fronteira">
          <span className={`label ${estilos.legendaNome}`}>
            {t.descompasso.rapido.nome}
          </span>
          <span className={estilos.legendaNota}>{t.descompasso.rapido.nota}</span>
        </p>
        <p className={estilos.legenda} data-tipo="instituicao">
          <span className={`label ${estilos.legendaNome}`}>
            {t.descompasso.lento.nome}
          </span>
          <span className={estilos.legendaNota}>{t.descompasso.lento.nota}</span>
        </p>
      </div>
    </figure>
  );
}

/* ── 3 · O que supera o quê ────────────────────────────────────────────────
   Duas colunas e um fio entre elas. O lado superado é desenhado no cinza da
   trama do fundo, com um risco atravessando: ele está sendo reabsorvido pelo
   fundo, que é literalmente o que a seção afirma. */

export function Comparacao({ t }: { t: Conteudo }) {
  const alvo = useTocarAoVer<HTMLElement>();

  return (
    <figure className={estilos.instrumento} ref={alvo}>
      <div className={estilos.comparacao}>
        <div className={estilos.lado} data-lado="superado">
          <span className={`label ${estilos.ladoRotulo}`}>
            {t.supera.superadoRotulo}
          </span>
          <p className={estilos.ladoValor}>
            <span className={estilos.riscado}>{t.supera.superadoValor}</span>
          </p>
        </div>
        <div className={estilos.lado} data-lado="supera">
          <span className={`label ${estilos.ladoRotulo}`}>
            {t.supera.superaRotulo}
          </span>
          <p className={estilos.ladoValor}>{t.supera.superaValor}</p>
        </div>
      </div>
    </figure>
  );
}

/* ── 4 · Os pilares ────────────────────────────────────────────────────────
   Três, sem numeração: eles não são etapas de um processo, são condições
   simultâneas. Numerá-los sugeriria ordem — e sugeriria que dá para começar
   pelo primeiro. A seção afirma o contrário. */

export function Pilares({ t }: { t: Conteudo }) {
  const alvo = useTocarAoVer<HTMLUListElement>();

  return (
    <ul className={estilos.pilares} ref={alvo}>
      {t.pilares.map((pilar) => (
        <li key={pilar.nome} className={estilos.pilar}>
          <h3 className={estilos.pilarNome}>{pilar.nome}</h3>
          <p className={estilos.pilarDefinicao}>{pilar.definicao}</p>
        </li>
      ))}
    </ul>
  );
}

/* ── 5 · As frentes ────────────────────────────────────────────────────────
   Cinco linhas de um razão: sigla, nome e o que é, separados por fio de 1px.
   A grade é o vocabulário construtivo da marca (design.md §5, "consultoria que
   constrói") aplicado ao único conteúdo da página que é, de fato, uma grade.

   Foram quatro células 2×2 até a alocação entrar como quinta frente. Cinco não
   cabem numa grade de duas colunas sem deixar um buraco, e um buraco lê como
   "falta uma". Espalhar a quinta pela largura inteira resolveria o buraco e
   criaria coisa pior: uma célula maior que as outras, afirmando uma hierarquia
   que a seção nega na frase acima dela ("rodando ao mesmo tempo"). Em linhas,
   todas têm exatamente o mesmo peso e uma sexta caberia sem redesenho. */

export function Frentes({ t }: { t: Conteudo }) {
  const alvo = useTocarAoVer<HTMLUListElement>();

  return (
    <ul className={estilos.frentes} ref={alvo}>
      {t.frentes.map((frente) => (
        <li key={frente.tag} className={estilos.frente}>
          <span className={`label ${estilos.frenteTag}`}>{frente.tag}</span>
          <h3 className={estilos.frenteNome}>{frente.nome}</h3>
          <p className={estilos.frenteTexto}>{frente.texto}</p>
        </li>
      ))}
    </ul>
  );
}
