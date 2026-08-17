"use client";

import { type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import Fundo202020 from "@/components/Fundo202020";
import SeletorIdioma from "@/components/SeletorIdioma";
import Marca202 from "@/components/tese/Marca202";
import Regua from "@/components/tese/Regua";
import {
  Comparacao,
  Descompasso,
  Frentes,
  LinhaDoTempo,
  Pilares,
} from "@/components/tese/Instrumentos";
import { COPY, INSTAGRAM } from "@/lib/copy";
import { IDS_SECOES, TESE, tituloTese, type Conteudo, type Secao } from "@/lib/tese";
// Alias obrigatório, e não estilo: a regra `react-hooks/rules-of-hooks` só
// reconhece um hook pelo NOME no ponto da chamada. Sem o `use*` local, uma
// chamada condicional passa lint, tsc e build e só quebra no navegador — o
// mesmo tropeço já documentado em app/page.tsx e em components/Lanterna.tsx.
import { usaSecaoAtiva as useSecaoAtiva } from "@/lib/usaSecaoAtiva";
import { usaIdioma as useIdioma } from "@/lib/usaIdioma";
import estilos from "./tese.module.css";

/** Que desenho sustenta cada seção. Seções sem instrumento devolvem `null`. */
function instrumentoDe(id: string, t: Conteudo): ReactNode {
  switch (id) {
    // `ponto-de-partida` não tem desenho. Tinha dois, e os dois falharam pelo
    // mesmo motivo — nenhum conseguia dizer "conhecimento ficou abundante" sem
    // que o leitor precisasse ser ensinado a ler o gráfico antes. A frase da
    // seção já é forte sozinha; um instrumento que precisa de manual é pior do
    // que instrumento nenhum. (17/08/2026, 2ª rodada.)
    case "velocidade":
      return <LinhaDoTempo t={t} />;
    case "descompasso":
      return <Descompasso t={t} />;
    case "o-que-supera":
      return <Comparacao t={t} />;
    // `ecossistema` também está sem desenho, e este é temporário: entra a
    // tira de logos das universidades, que depende de arquivos de marca que o
    // Matheus vai fornecer. Até lá a seção fica na frase — melhor do que os
    // blocos anônimos que estavam aqui, que não diziam o que eram.
    // (17/08/2026, 2ª rodada.)
    case "pilares":
      return <Pilares t={t} />;
    case "frentes":
      return <Frentes t={t} />;
    default:
      return null;
  }
}

/**
 * A forma da seção. Três exceções e um padrão — não dez layouts artesanais.
 * A variedade da página vem dos instrumentos, que são radicalmente diferentes
 * entre si; se ela viesse também do enquadramento, cada tela pareceria de um
 * site diferente.
 */
const FORMA: Record<string, "capa" | "centro" | "fecho"> = {
  abertura: "capa",
  missao: "centro",
  fecho: "fecho",
};

/**
 * O statement da seção, quebrado nas linhas escritas em `lib/tese.ts`.
 *
 * A quebra é decisão de design e vive na copy — nunca no acaso da largura do
 * viewport. O ponto verde é desenhado aqui, uma vez por seção, e não digitado
 * dentro das strings: assim a regra "um verde por tela" é garantida pelo
 * código em vez de depender de quem edita o texto lembrar dela.
 */
function Statement({
  linhas,
  titulo,
  className,
}: {
  linhas: readonly string[];
  titulo: boolean;
  className: string;
}) {
  const Tag = titulo ? "h1" : "h2";
  return (
    <Tag
      className={`${estilos.statement} ${className}`}
      data-movimento
      style={{ "--ordem": 1 } as CSSProperties}
    >
      {linhas.map((linha, i) => (
        <span key={i} className={estilos.linha}>
          {linha}
          {i === linhas.length - 1 && (
            // `data-ponto` não é enfeite de teste: é como e2e/tese.spec.ts
            // conta os verdes da página sem depender do nome sorteado pelo CSS
            // Module. Aqui ele é inequívoco — a /tese não renderiza Logo202
            // (que usa a mesma marca), só Marca202, que é deliberadamente sem
            // ponto.
            <span data-ponto className={estilos.ponto} aria-hidden="true" />
          )}
        </span>
      ))}
    </Tag>
  );
}

export default function Tese() {
  const [idioma, trocarIdioma] = useIdioma();
  const t = TESE[idioma];
  const ativa = useSecaoAtiva(IDS_SECOES);

  return (
    <>
      {/* Dono único do <title> desta rota — ver o comentário em
          app/tese/layout.tsx. O React 19 hoista o elemento para o <head> de
          onde quer que ele esteja na árvore. */}
      <title>{tituloTese(idioma)}</title>

      {/* O fundo vivo da home, inteiro: malha, lanterna e vinheta. Ele já
          nasce `position: fixed` (Fundo202020.module.css) — quem o prende à
          seção é a home, com um override em Palco.module.css. Aqui ele fica
          preso à viewport, então o custo por quadro é o mesmo da home: o
          canvas mede a tela, nunca o comprimento da página.
          `lib/usaLanterna.ts` já escuta `scroll` em captura para remedir os
          ímãs, então a lanterna gruda certo mesmo com a página rolando. */}
      <Fundo202020 className={estilos.fundo} />

      <header className={estilos.topo}>
        <Marca202 rotulo={t.voltar} />
        <div className={estilos.topoDireita}>
          <SeletorIdioma idioma={idioma} aoTrocar={trocarIdioma} />
          <a
            className={`label ${estilos.contato}`}
            data-ima="contato"
            href={INSTAGRAM}
            target="_blank"
            rel="noopener noreferrer"
          >
            {COPY[idioma].contato} ↗
          </a>
        </div>
      </header>

      <Regua secoes={t.secoes} ativa={ativa} rotulo={t.rotuloPagina} />

      <main className={estilos.tese}>
        {t.secoes.map((secao: Secao, i) => {
          const forma = FORMA[secao.id];
          const instrumento = instrumentoDe(secao.id, t);

          // Três regimes de movimento, e a diferença entre eles não é gosto:
          // • a capa já está na tela quando a página carrega, então ela se
          //   monta no tempo (`.entra`);
          // • o miolo se monta conforme entra na tela (`.revela`, dirigido
          //   pelo scroll, sem JavaScript);
          // • o fecho não anima. Ele é a última tela do documento: um
          //   elemento na metade de baixo dela nunca chega ao fim da própria
          //   faixa de `view()`, porque não há mais para onde rolar — ficaria
          //   preso, invisível, para sempre. Estático é a única forma correta.
          const movimento =
            forma === "capa"
              ? estilos.entra
              : forma === "fecho"
                ? estilos.parado
                : estilos.revela;

          return (
            <section
              key={secao.id}
              id={secao.id}
              className={estilos.secao}
              data-forma={forma ?? "padrao"}
            >
              {/* `data-movimento` marca quem é animado. Não muda nada no
                  navegador: existe para e2e/tese.spec.ts poder perguntar
                  "sobrou alguma revelação presa em opacity: 0?" olhando
                  exatamente os elementos animados, em vez de varrer todo texto
                  da página — que pegaria de falso-positivo o lado esmaecido de
                  propósito da comparação da seção "o que supera". */}
              <div className={estilos.dentro}>
                <p
                  className={`label ${estilos.rotulo} ${movimento}`}
                  data-movimento
                  style={{ "--ordem": 0 } as CSSProperties}
                >
                  {secao.rotulo}
                </p>

                <Statement
                  linhas={secao.titulo}
                  titulo={i === 0}
                  className={movimento}
                />

                {secao.apoio && (
                  <p
                    className={`${estilos.apoio} ${movimento}`}
                    data-movimento
                    style={{ "--ordem": 2 } as CSSProperties}
                  >
                    {secao.apoio}
                  </p>
                )}

                {/* Sem `movimento`: o instrumento entra por conta própria, com
                    o mesmo gatilho que toca a animação dele (usaTocarAoVer).
                    Ele é o elemento mais baixo da seção, e numa faixa `cover`
                    isso significa estar sempre atrás do texto — com a seção
                    parada na posição de leitura ele ficava a 40% de opacidade.
                    O porquê inteiro está em Instrumentos.module.css. */}
                {instrumento && (
                  <div className={estilos.caixaInstrumento}>{instrumento}</div>
                )}

                {forma === "fecho" && (
                  /* Uma porta só: a volta para a home. O contato saiu daqui em
                     17/08/2026 — ele já está no cabeçalho fixo, presente na
                     tela inteira desde a primeira até a última seção, e
                     repeti-lo no fecho transformava a última linha da tese num
                     pedido. A frase acima não precisa de pedido nenhum. */
                  <div className={estilos.portas}>
                    <Link className={`label ${estilos.porta}`} href="/">
                      ← {t.voltar}
                    </Link>
                  </div>
                )}
              </div>

              {forma === "capa" && (
                <p
                  className={`label ${estilos.role} ${estilos.entra}`}
                  style={{ "--ordem": 4 } as CSSProperties}
                  aria-hidden="true"
                >
                  {t.role} ↓
                </p>
              )}
            </section>
          );
        })}
      </main>
    </>
  );
}
