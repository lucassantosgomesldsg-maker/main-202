"use client";

import { useRef, type Ref } from "react";

import { COPY_INSCRICAO } from "@/lib/inscricao";
import { URL_SITE } from "@/lib/site";
import ComoFunciona from "./ComoFunciona";
import Seta from "./Seta";
import estilos from "./Abertura.module.css";

/**
 * A tela de abertura da inscrição — a única da página que começa com um cartaz,
 * e não com um formulário.
 *
 * **Desde 19/09/2026 ela tem duas partes**, a pedido do Pedro: o CARTAZ, que
 * ocupa a primeira dobra (marca, título, o que é a trilha em duas linhas, três
 * fatos, o COMEÇAR e a arte da bandeira), e a EXPLICAÇÃO (`ComoFunciona`), que
 * vem abaixo dele e se lê rolando. Antes disso a tela era só o cartaz, dizia
 * "retornaremos com mais informações" e cabia em 100dvh sem rolar.
 *
 * A arte da bandeira é a mesma, no mesmo enquadramento. O que mudou nela foi o
 * endereço: ela era filha da tela inteira e agora é filha do cartaz, para
 * continuar ancorada na primeira dobra em vez de escorregar para o pé de uma
 * tela que ficou cinco vezes mais alta.
 *
 * Redesenhada em 04/09/2026 a partir de duas referências (uma de desktop, uma
 * de celular). O que veio de lá e o que **não** veio:
 *
 * - **A arte da montanha veio como imagem**, recortada das próprias
 *   referências, porque era a única forma de "idêntico" significar idêntico:
 *   é um render, não algo que se desenhe em CSS. Ver `Abertura.module.css`
 *   para o porquê do `mix-blend-mode`.
 * - **As fontes NÃO vieram** — decisão explícita de quem pediu. O título usa a
 *   `--fonte-display` do sistema, o corpo a `--fonte-corpo`, o rótulo e o botão
 *   a `--fonte-mono`. As referências foram geradas com outras fontes.
 * - **As cores são os tokens do site**, e não os pixels da referência. Aquelas
 *   imagens são um render aproximando a marca: o verde delas mede `#c0fa33`
 *   contra o `--verde-sinal` `#c6ff3e`, e o fundo `#050505` contra o
 *   `--preto-202` `#0a0a0a`. Seguir o pixel deixaria esta página com um verde e
 *   um preto que nenhuma outra do site usa, para ganhar uma diferença que
 *   ninguém enxerga.
 * - **O menu-sanduíche da referência de celular não veio.** Ele não abre nada:
 *   esta página não tem navegação. Um controle que não faz nada é pior do que
 *   um espaço vazio.
 *
 * A estrutura é `position: fixed` de propósito. Esta tela é a única que precisa
 * ocupar a viewport inteira, e ela vive dentro da coluna de 34rem que o resto
 * do formulário usa — sair do fluxo é o que a liberta sem mexer no `layout` da
 * página nem no de nenhum bloco.
 */
export default function Abertura({
  aoComecar,
  ref,
}: {
  aoComecar: () => void;
  /**
   * A tela, para quem cuida do foco.
   *
   * Não é enfeite: o `Formulario` aponta um `ref` para a tela ATUAL e, a cada
   * troca de bloco, foca o primeiro campo focável dentro dela. A abertura entra
   * nessa conta porque VOLTAR no primeiro bloco traz de volta para cá — e sem o
   * `ref` o efeito não acha tela nenhuma, o foco cai no `body`, e quem usa
   * teclado precisa reatravessar a página para achar o COMEÇAR. Guardado por
   * `Formulario.test.tsx`.
   *
   * Em React 19 o `ref` é uma prop comum: não há `forwardRef` aqui.
   */
  ref?: Ref<HTMLElement>;
}) {
  const a = COPY_INSCRICAO.abertura;

  /*
   * O "202" do título em verde.
   *
   * A copy continua UMA string — o título é uma frase, e quebrá-la em duas
   * chaves faria a próxima pessoa editar metade dela. Aqui só se pergunta se
   * ela termina com a marca; se um dia não terminar, o título aparece inteiro
   * em branco e nada quebra.
   *
   * Repare que o texto renderizado continua idêntico ao da copy, sem espaço a
   * mais: `titulo()` nos testes compara `textContent` com `a.titulo`.
   */
  const MARCA = "202";
  const terminaComAMarca = a.titulo.endsWith(MARCA);
  const inicioDoTitulo = terminaComAMarca ? a.titulo.slice(0, -MARCA.length) : a.titulo;

  /*
   * O "COMO FUNCIONA" do pé do cartaz rola até a explicação.
   *
   * É um `<button>` com `scrollIntoView`, e não um `<a href="#...">`, por causa
   * do histórico: a regra desta rota é que o VOLTAR do navegador SAI da página
   * (ver o cabeçalho de `Formulario.tsx`), e uma âncora empilharia uma entrada
   * — o primeiro VOLTAR só tiraria o `#` do endereço.
   *
   * O foco vai junto com a rolagem, senão ele ficaria num botão que saiu da
   * tela. `preventScroll` porque quem rola é a linha de baixo: deixar o `focus`
   * rolar também daria dois movimentos, e o dele ignora o `scroll-behavior`.
   *
   * A rolagem suave — e o desligá-la para quem pediu menos movimento — mora no
   * CSS (`scroll-behavior` em `.abertura`), então aqui não se passa `behavior`.
   * O `?.` no método é para o jsdom dos testes, que não o implementa.
   */
  const explicacaoRef = useRef<HTMLDivElement>(null);
  function irParaAExplicacao() {
    const alvo = explicacaoRef.current;
    if (alvo === null) return;
    alvo.focus({ preventScroll: true });
    alvo.scrollIntoView?.({ block: "start" });
  }

  return (
    <section ref={ref} className={estilos.abertura} data-tela="abertura">
      <div className={estilos.cartaz}>
        {/* O logo leva ao site, e é o único caminho de volta desta página: ela é
            `noindex` e ninguém chega nela navegando. `rel=home` diz isso à
            máquina; o `aria-label` diz à pessoa que usa leitor de tela, porque
            "202Lab" sozinho nomeia a marca e não o destino. */}
        <a className={estilos.marcaTopo} href={URL_SITE} rel="home" aria-label={a.voltarAoSite}>
          {/* Um `<img>` e não o componente `Logo202`: o arquivo é gerado dos
              MESMOS glifos (`scripts/gerar-logo-marca.mjs` lê `lib/logo-paths.ts`,
              que é a fonte do componente), e um nó só no lugar de três `<path>`
              longos. Medido: montar o componente aqui empurrou seis testes de
              travessia do formulário para além do limite de 5s no jsdom. O
              `alt=""` é correto — quem nomeia o link é o `aria-label` do `<a>`. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- `next/image`
              não otimiza SVG sem `dangerouslyAllowSVG`, e este arquivo tem 5,6 KB:
              o componente só acrescentaria runtime para entregar o mesmo byte. */}
          <img src="/202-marca.svg" alt="" width={731} height={305} />
        </a>

        <div className={estilos.conteudo}>
          <p className={`label ${estilos.rotulo}`}>{a.rotulo}</p>

          <h1 className={estilos.titulo}>
            {inicioDoTitulo}
            {terminaComAMarca && <span className={estilos.marcaNoTitulo}>{MARCA}</span>}
          </h1>

          <div className={estilos.linhas}>
            {a.linhas.map((linha) => (
              <p key={linha} className={estilos.linha}>
                {linha}
              </p>
            ))}
          </div>

          {/* Os fatos. `<dl>` porque é isso que eles são — pares de nome e
              valor —, e é assim que um leitor de tela os anuncia. O `<div>` em
              volta de cada par é HTML válido dentro de `<dl>` e existe só para o
              par quebrar de linha inteiro, nunca o rótulo longe do valor. */}
          <dl className={estilos.dados}>
            {a.dados.map((dado) => (
              <div key={dado.rotulo} className={estilos.dado}>
                <dt className="label">{dado.rotulo}</dt>
                <dd>{dado.valor}</dd>
              </div>
            ))}
          </dl>

          <button type="button" className={estilos.comecar} onClick={aoComecar}>
            {a.botao}
            <Seta className={estilos.seta} />
          </button>
        </div>

        {/* Depois do COMEÇAR no DOM, e isso importa duas vezes: o Tab segue a
            leitura (logo → COMEÇAR → este), e o `Formulario` devolve o foco ao
            PRIMEIRO botão da tela quando alguém volta do bloco 1 — que precisa
            continuar sendo o COMEÇAR. */}
        <button type="button" className={`label ${estilos.convite}`} onClick={irParaAExplicacao}>
          {a.convite}
          <Seta direcao="baixo" className={estilos.setaConvite} />
        </button>

        {/* A arte da referência, e não um desenho aproximado dela: a montanha é
            um render com relevo e granulação que não se reproduz em `<path>`, e
            a tentativa de redesenhá-la em SVG ficou pior que a original.

            O que fazia a versão anterior parecer "figura colada" não era a
            posição: era a BORDA do recorte, visível como um retângulo contra o
            preto. Agora as bordas de corte dissolvem dentro do próprio arquivo
            (rampa de opacidade nos lados cortados), e o `mix-blend-mode: screen`
            faz o preto do arquivo não somar nada — sobra só o brilho.

            `<picture>` e não duas `<img>` escondidas por CSS: assim o navegador
            baixa UMA das duas, e o celular não paga pelo arquivo do desktop. */}
        <picture className={estilos.arte}>
          <source media="(max-width: 899px)" srcSet="/trilha-arte-mobile.webp" />
          <img src="/trilha-arte.webp" alt="" aria-hidden="true" />
        </picture>
      </div>

      <ComoFunciona ref={explicacaoRef} aoComecar={aoComecar} />
    </section>
  );
}
