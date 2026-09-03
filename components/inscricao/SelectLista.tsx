"use client";

import {
  type KeyboardEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { textoListaDeOpcoes, type Inscricao } from "@/lib/inscricao";
import { type OpcaoLista, descricaoDe } from "./Campos";
import campos from "./Campos.module.css";
import estilos from "./SelectLista.module.css";

/**
 * A lista de escolha única — o que substituiu o `<select>` nativo em 01/09/2026.
 *
 * **Por que deixou de ser nativo.** A spec §10 escolheu `<select>` nativo, e o
 * argumento dela continua bom: no celular a roda do sistema é melhor do que
 * qualquer coisa que se desenhe. O que a spec não previu é que o popup de um
 * `<select>` é desenhado pelo SISTEMA OPERACIONAL, e nenhum CSS o alcança: numa
 * página preta e verde, a opção sob o cursor aparecia com a faixa AZUL do
 * Windows e a barra de rolagem branca do sistema.
 *
 * Houve uma tentativa intermediária, registrada aqui porque quase deu certo:
 * `appearance: base-select` (Chrome 135+) faz o navegador desenhar o popup como
 * parte da página, e com ela as cores obedeciam. Só que **só no Chrome
 * recente** — em qualquer outro navegador o popup voltava a ser o do sistema, e
 * era exatamente isso que a pessoa que pediu a correção estava vendo. Uma
 * correção que depende do navegador de quem olha não é correção.
 *
 * **O preço, escrito para quem for reverter:** no celular isto é uma lista que
 * rola dentro da página, e não a roda nativa. É a mesma troca que
 * `ComboboxCurso` já fazia desde o início — este componente é irmão dele, com o
 * filtro de texto a menos —, então o padrão não é novo nesta página; passou a
 * valer para os cinco campos de escolha.
 *
 * O que **não** se perdeu: papéis ARIA de `listbox`, teclado inteiro (setas,
 * Home/End, Enter, Esc, Tab) e busca por digitação — que num campo de 27
 * estados é o que separa usável de inutilizável.
 */
export default function SelectLista({
  campo,
  id,
  opcoes,
  valor,
  aoMudar,
  erro,
}: {
  campo: keyof Inscricao;
  id: string;
  opcoes: readonly OpcaoLista[];
  valor: string;
  aoMudar: (valor: string) => void;
  erro?: string;
}) {
  const listaId = `${id}-lista`;
  const [aberta, setAberta] = useState(false);
  /** `null` = nada realçado. Impede um `Tab` distraído de escolher o primeiro item. */
  const [realce, setRealce] = useState<number | null>(null);
  /**
   * Para que lado a lista abre.
   *
   * O `<select>` nativo virava para cima sozinho quando não havia espaço
   * embaixo, e trocar o nativo por esta lista perdeu isso: com o campo perto do
   * rodapé da janela, abrir mostrava uma lista cortada — medido, 18px fora da
   * tela num caso comum, e a lista inteira nos piores. A pessoa clica, "não
   * acontece nada", e clica de novo.
   */
  const [paraCima, setParaCima] = useState(false);
  const caixaRef = useRef<HTMLDivElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);

  const escolhida = useMemo(() => opcoes.find((o) => o.chave === valor), [opcoes, valor]);
  const indiceAtual = opcoes.findIndex((o) => o.chave === valor);

  /**
   * O realce nunca aponta para fora da lista do render atual.
   *
   * O `opcoes.length === 0` primeiro não é zelo vão: sem ele o `Math.max(0, -1)`
   * colapsava em `0` e o `aria-activedescendant` passava a apontar para um id
   * que não existe no documento — um leitor de tela seguindo esse ponteiro não
   * acha nada. Nenhum dos cinco campos passa lista vazia hoje; a guarda é para o
   * dia em que uma lista vier filtrada ou do servidor.
   */
  const realceSeguro =
    realce === null || opcoes.length === 0
      ? null
      : Math.min(Math.max(realce, 0), opcoes.length - 1);

  /* Mantém a opção realçada visível na navegação por teclado. O `typeof` não é
     paranoia: o jsdom dos testes não implementa `scrollIntoView`. */
  useEffect(() => {
    if (!aberta || realceSeguro === null) return;
    const alvo = document.getElementById(`${listaId}-${realceSeguro}`);
    if (alvo !== null && typeof alvo.scrollIntoView === "function") {
      alvo.scrollIntoView({ block: "nearest" });
    }
  }, [aberta, realceSeguro, listaId]);

  /* Decide para que lado a lista abre. Vira para cima só quando não cabe
     embaixo E cabe melhor em cima — numa janela baixa demais para os dois
     lados, embaixo continua sendo o lugar menos ruim, porque é para onde a
     página rola.

     `useLayoutEffect` e não `useEffect`: o efeito comum roda DEPOIS da pintura,
     então a lista aparecia um quadro no lado errado antes de saltar para o
     certo, toda vez que abrisse perto do rodapé. */
  useLayoutEffect(() => {
    if (!aberta) return;

    function medir(): void {
      const caixa = caixaRef.current;
      const lista = listaRef.current;
      if (caixa === null || lista === null) return;
      const r = caixa.getBoundingClientRect();
      const altura = lista.offsetHeight;
      const abaixo = window.innerHeight - r.bottom;
      const acima = r.top;
      setParaCima(abaixo < altura && acima > abaixo);
    }

    medir();

    // E MEDE DE NOVO enquanto estiver aberta. A medição de uma vez só
    // envelhecia: com a lista aberta virada para cima, rolar a página (roda do
    // mouse fora da lista, teclado do celular abrindo, girar o aparelho) fazia
    // o campo subir e a lista continuar ancorada em cima — agora saindo pelo
    // TOPO da janela. Era o mesmo defeito que o `paraCima` existe para
    // consertar, na direção oposta.
    //
    // `capture` no scroll porque a página pode rolar num container interno, e
    // esse evento não borbulha até a window.
    window.addEventListener("scroll", medir, { passive: true, capture: true });
    window.addEventListener("resize", medir, { passive: true });
    return () => {
      window.removeEventListener("scroll", medir, { capture: true });
      window.removeEventListener("resize", medir);
    };
  }, [aberta]);

  /* Clicar fora fecha. Um `blur` no botão não bastaria: o clique numa opção
     passa pelo `mousedown`, e fechar ali mataria a própria escolha. */
  useEffect(() => {
    if (!aberta) return;
    function aoClicarFora(e: MouseEvent): void {
      const alvo = e.target as Node;
      if (caixaRef.current?.contains(alvo)) return;
      // O `<label for>` deste campo é IRMÃO da caixa, não descendente. Sem esta
      // linha, clicar no rótulo com a lista aberta fechava aqui no `mousedown`
      // e o `click` seguinte — que o navegador encaminha do rótulo para o
      // controle — lia "fechada" e REABRIA. A lista piscava e ficava aberta.
      if (alvo instanceof Element && alvo.closest(`label[for="${id}"]`) !== null) return;
      setAberta(false);
      setRealce(null);
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [aberta, id]);

  function fechar(): void {
    setAberta(false);
    setRealce(null);
  }

  function escolher(opcao: OpcaoLista): void {
    aoMudar(opcao.chave);
    fechar();
    document.getElementById(id)?.focus();
  }

  /**
   * Abre a lista. `realceInicial` é o que fazer quando ainda não há escolha, e
   * a diferença entre os dois casos é intenção: abrir CLICANDO não realça nada
   * (a pessoa só quis olhar); abrir com SETA já realça, porque seta é
   * navegação. Mesma regra do `ComboboxCurso`.
   */
  function abrir(realceInicial: number | null): void {
    setRealce(indiceAtual === -1 ? realceInicial : indiceAtual);
    setAberta(true);
  }

  /* ── Busca por digitação ───────────────────────────────────────────────────
     O `<select>` nativo dava isto de graça, e num campo de 27 estados é o que
     separa usável de inutilizável: digitar "ba" leva a Bahia sem rolar a lista.
     O buffer se apaga sozinho depois de um segundo parado, que é o intervalo
     que todo sistema usa para decidir que uma digitação acabou. */
  const digitado = useRef("");
  const relogioDigitacao = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (relogioDigitacao.current !== null) clearTimeout(relogioDigitacao.current);
    };
  }, []);

  /** Sem acento e em minúsculas — os dois lados da comparação. */
  function paraBusca(texto: string): string {
    return texto
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();
  }

  function procurarPorTexto(tecla: string): void {
    // A tecla passa pelo MESMO normalizador dos rótulos. Sem isso, digitar uma
    // letra acentuada procurava por ela numa lista já desacentuada e nunca
    // casava com nada.
    digitado.current += paraBusca(tecla);
    if (relogioDigitacao.current !== null) clearTimeout(relogioDigitacao.current);
    relogioDigitacao.current = setTimeout(() => {
      digitado.current = "";
    }, 1000);

    const busca = digitado.current;
    const achado = opcoes.findIndex((o) => paraBusca(o.rotulo).startsWith(busca));
    if (achado === -1) return;
    if (aberta) setRealce(achado);
    else aoMudar(opcoes[achado].chave);
  }

  function aoTeclar(evento: KeyboardEvent<HTMLButtonElement>): void {
    const ultimo = Math.max(0, opcoes.length - 1);

    switch (evento.key) {
      case "ArrowDown":
        evento.preventDefault();
        if (!aberta) return abrir(0);
        setRealce((r) => (r === null ? 0 : Math.min(r + 1, ultimo)));
        return;

      case "ArrowUp":
        evento.preventDefault();
        if (!aberta) return abrir(ultimo);
        setRealce((r) => (r === null ? ultimo : Math.max(r - 1, 0)));
        return;

      // Com a lista ABERTA, movem o realce. Com ela FECHADA, escolhem a
      // primeira/última opção — que é o que o `<select>` nativo fazia. Antes
      // desta correção o `return` acontecia ANTES do `preventDefault`, então a
      // tecla vazava para o navegador e a página saltava para o topo ou para o
      // rodapé: quem apertasse `End` esperando "Tocantins" perdia o lugar na
      // página.
      case "Home":
        evento.preventDefault();
        if (aberta) setRealce(0);
        else if (opcoes.length > 0) aoMudar(opcoes[0].chave);
        return;

      case "End":
        evento.preventDefault();
        if (aberta) setRealce(ultimo);
        else if (opcoes.length > 0) aoMudar(opcoes[ultimo].chave);
        return;

      case " ":
      case "Enter": {
        // Com a lista FECHADA: o Espaço abre, e o `Enter` avança de bloco.
        //
        // O `Enter` precisa ser PEDIDO explicitamente, e essa é a correção de um
        // bug real. Enquanto o campo era um `<select>`, o `Enter` disparava a
        // submissão implícita do formulário de graça. Este controle é um
        // `<button>`, e a ação padrão do `Enter` num botão é CLICAR nele — ou
        // seja, abrir a lista. Resultado medido no navegador: em nenhum dos
        // cinco campos de escolha o `Enter` avançava; ele só abria e fechava a
        // lista, para sempre. Quem usa teclado perdia o jeito mais rápido de
        // atravessar o formulário, e só num punhado de campos — pior que perder
        // em todos, porque parece defeito aleatório.
        //
        // `requestSubmit` e não `submit`: o primeiro passa pelo `onSubmit` do
        // React (que é quem chama `avancar`), o segundo o atropelaria.
        if (!aberta) {
          evento.preventDefault();
          if (evento.key === " ") abrir(0);
          else evento.currentTarget.form?.requestSubmit();
          return;
        }
        evento.preventDefault();
        const alvo = realceSeguro === null ? undefined : opcoes[realceSeguro];
        if (alvo !== undefined) escolher(alvo);
        return;
      }

      case "Escape":
        if (!aberta) return;
        evento.preventDefault();
        fechar();
        return;

      case "Tab":
        // Sai confirmando o realçado, mas só se houver realce de verdade:
        // tabular por uma lista aberta e intocada não pode escolher nada.
        //
        // Isto só é verdade porque `realce` é estado de TECLADO, e só dele.
        // Houve um `onMouseEnter` na `<li>` que escrevia em `realce`: com ele,
        // passar o cursor por cima de uma opção a caminho de outro ponto da
        // tela e depois tabular GRAVAVA aquela opção — medido no navegador,
        // "Bahia" escolhida sem nenhum clique. Quem pinta o hover agora é o
        // CSS (`.opcao:hover`), que não vira resposta.
        if (!aberta) return;
        if (realceSeguro !== null) aoMudar(opcoes[realceSeguro].chave);
        fechar();
        return;

      default:
        // Uma letra ou dígito: busca. Com modificador, não — `Ctrl+R` é do
        // navegador, e engoli-lo aqui quebraria o recarregamento da página.
        if (evento.key.length === 1 && !evento.ctrlKey && !evento.metaKey && !evento.altKey) {
          evento.preventDefault();
          procurarPorTexto(evento.key);
        }
        return;
    }
  }

  return (
    <div className={estilos.caixa} ref={caixaRef}>
      <button
        id={id}
        type="button"
        className={`${campos.controle} ${estilos.botao}`}
        role="combobox"
        aria-haspopup="listbox"
        /* Explícito, e não herdado do `<label for>`: para um `<button>`, o
           cálculo de nome aceitável prefere o conteúdo do próprio botão. Com
           uma escolha feita, o conteúdo é "Bahia" — e a pessoa ouviria o valor
           sem nunca ouvir a pergunta. Sem escolha, o conteúdo é um `<span>`
           vazio, e o controle ficaria anônimo. */
        aria-labelledby={`${id}-rotulo`}
        aria-expanded={aberta}
        aria-controls={listaId}
        aria-activedescendant={
          aberta && realceSeguro !== null ? `${listaId}-${realceSeguro}` : undefined
        }
        aria-invalid={erro !== undefined || undefined}
        aria-describedby={descricaoDe(campo, id, { erro: erro !== undefined })}
        onClick={() => (aberta ? fechar() : abrir(null))}
        onKeyDown={aoTeclar}
      >
        {/* O `<span>` vazio quando não há escolha guarda a altura da linha: sem
            ele o botão encolhe e a coluna de campos desalinha. */}
        <span className={estilos.escolhido}>{escolhida?.rotulo ?? ""}</span>
        <span className={estilos.seta} aria-hidden="true" />
      </button>

      {/* Sempre no DOM, escondida por `hidden`: `aria-controls` precisa apontar
          para um elemento que existe, e `hidden` a tira da árvore de
          acessibilidade sem tirá-la do documento. Mesma solução do
          `ComboboxCurso`. */}
      <ul
        id={listaId}
        ref={listaRef}
        role="listbox"
        /* Sem nome, o leitor de tela anuncia só "lista" e a pessoa não sabe de
           qual campo ela é — o `<select>` nativo herdava o rótulo de graça. O
           nome é o do campo MAIS um sufixo (ver `listaDeOpcoes` na copy): igual
           ao do botão, uma busca por rótulo acharia dois elementos. */
        aria-label={textoListaDeOpcoes(campo)}
        hidden={!aberta}
        data-direcao={paraCima ? "cima" : "baixo"}
        className={estilos.lista}
      >
        {opcoes.map((o, i) => (
          <li
            key={o.chave}
            id={`${listaId}-${i}`}
            role="option"
            aria-selected={o.chave === valor}
            data-realce={i === realceSeguro}
            /* O valor de coluna na tela, para o teste poder escolher por ele
               como fazia com `selectOptions` — os testes desta página afirmam
               `"USP"`, `"SP"`, `"INDICACAO"`, e não o rótulo bonito, porque é o
               `id` que vai para o banco. */
            data-valor={o.chave}
            className={estilos.opcao}
            onClick={() => escolher(o)}
          >
            {o.rotulo}
          </li>
        ))}
      </ul>
    </div>
  );
}
