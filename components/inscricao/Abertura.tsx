"use client";

import type { Ref } from "react";

import { COPY_INSCRICAO } from "@/lib/inscricao";
import { URL_SITE } from "@/lib/site";
import estilos from "./Abertura.module.css";

/**
 * A tela de abertura da inscrição — a única da página que é um cartaz, e não um
 * formulário.
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

  return (
    <section ref={ref} className={estilos.abertura} data-tela="abertura">
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

        <button type="button" className={estilos.comecar} onClick={aoComecar}>
          {a.botao}
          {/* `aria-hidden` obrigatório: sem ele a seta entraria no nome
              acessível do botão, e ele deixaria de se chamar "COMEÇAR" — que é
              como a página inteira, e os testes, se referem a ele. */}
          <svg
            className={estilos.seta}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M4 12h15" />
            <path d="m13 6 6 6-6 6" />
          </svg>
        </button>
      </div>

      {/* A arte da referência, e não um desenho aproximado dela: a montanha é um
          render com relevo e granulação que não se reproduz em `<path>`, e a
          tentativa de redesenhá-la em SVG ficou pior que a original.

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
    </section>
  );
}
