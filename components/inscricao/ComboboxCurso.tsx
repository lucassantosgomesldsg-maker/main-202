"use client";

import {
  type KeyboardEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CURSOS, textoListaDeOpcoes, type Opcao } from "@/lib/inscricao";
import { Moldura, descricaoDe, idDoCampo } from "./Campos";
import campos from "./Campos.module.css";
import estilos from "./ComboboxCurso.module.css";

/**
 * O campo de curso: uma lista com BUSCA por texto.
 *
 * Era "o único widget custom do formulário" até 01/09/2026; hoje divide esse
 * papel com `SelectLista`, que é este mesmo desenho sem o filtro. Os dois são
 * os lugares onde esta página pode quebrar de verdade, e `Listas.test.ts`
 * existe para que eles não divirjam em silêncio.
 *
 * Por que ele existe: são 44 cursos. (Até 01/09/2026 a frase aqui era "já que
 * a spec §10 manda usar `<select>` nativo em todo o resto" — não manda mais:
 * os cinco campos de escolha viraram `SelectLista`, irmão deste. O que
 * distingue este continua sendo a BUSCA, e não o fato de ser custom.)
 *
 * Um `<select>` com 44 opções depende de "digitar as primeiras letras", que
 * funciona diferente em cada navegador — no Chrome casa só o começo do
 * rótulo, então quem digita "eletrica" procurando
 * "Eng. Elétrica" não acha nada — e num `<datalist>` o comportamento no celular
 * é inconsistente a ponto de ser inútil. Busca por substring, sem acento, é o
 * que faz 44 opções caberem em dois segundos.
 *
 * O preço é ter de reimplementar à mão o que o navegador dá de graça: papéis
 * ARIA, teclado inteiro e — o detalhe que quase todo combobox da internet erra
 * — **não deixar lixo ao sair**. Um campo que aceita texto mas guarda um `id`
 * de lista tem um estado inválido possível: texto digitado que não é opção
 * nenhuma. Aqui esse estado nunca sobrevive ao `blur`.
 */

/**
 * `Outro` é sempre o último da lista — invariante garantida por
 * `lib/inscricao.test.ts` ("Outra/Outro sempre em último"). Ler pela posição, e
 * não pelo literal `"OUTRO"`, faz este componente seguir a lista se ela mudar.
 */
const OUTRO: Opcao = CURSOS[CURSOS.length - 1];

/**
 * Reduz um texto à forma em que a busca compara: sem acento e em minúsculas.
 *
 * `NFD` separa a letra do acento em dois pontos de código, e a faixa
 * `U+0300–U+036F` é a dos acentos soltos — tirá-los transforma "Elétrica" em
 * "eletrica". Sem isso, o teclado do celular (que não sugere acento no meio de
 * uma palavra) tornaria metade da lista inalcançável.
 */
function semAcento(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * A forma de busca de cada curso, calculada uma vez por módulo e não por tecla.
 *
 * As habilitações abreviadas ganham `engenharia` **por extenso, no fim**. O
 * motivo apareceu no dia em que a lista passou a ter uma `Engenharia` genérica:
 * quem digitava "engenharia" — que é como a pessoa chama o próprio curso —
 * recebia uma lista de um item só, e as habilitações `Eng. …` ficavam
 * invisíveis. Quem faz Eng. de Produção escolheria a genérica sem saber que a
 * dela estava ali, e o dado que se perde é exatamente o que distingue as
 * fichas.
 *
 * A palavra vai no fim, e não substituindo o `Eng.`: trocar apagaria a busca
 * por "eng. de", que é o que uma pessoa digita quando começa a escrever o
 * rótulo tal como ele aparece na tela.
 */
const BUSCAVEIS: readonly { readonly curso: Opcao; readonly busca: string }[] = CURSOS.map(
  (curso) => {
    const base = semAcento(curso.rotulo);
    return { curso, busca: base.startsWith("eng.") ? `${base} engenharia` : base };
  },
);

/** O rótulo de um curso escolhido, ou vazio quando não há escolha. */
function rotuloDe(id: string): string {
  return CURSOS.find((c) => c.id === id)?.rotulo ?? "";
}

export default function ComboboxCurso({
  valor,
  aoEscolher,
  erro,
}: {
  /** O `id` do curso escolhido, ou `""`. */
  valor: string;
  aoEscolher: (id: string) => void;
  erro?: string;
}) {
  const id = idDoCampo("curso");
  const listaId = `${id}-lista`;

  const [texto, setTexto] = useState(() => rotuloDe(valor));
  const [aberta, setAberta] = useState(false);
  /** `false` enquanto ninguém digitou: abrir a lista clicando mostra as 44. */
  const [filtrando, setFiltrando] = useState(false);
  /** `null` = nada realçado. É o que impede um `Tab` distraído de escolher o primeiro item. */
  const [realce, setRealce] = useState<number | null>(null);
  /**
   * Para que lado a lista abre. Mesmo mecanismo (e mesmo motivo) de
   * `SelectLista`: com o campo perto do rodapé da janela, abrir para baixo
   * mostra uma lista cortada. As duas listas da página têm de se comportar
   * igual — `Listas.test.ts` guarda a aparência; isto é a mesma promessa no
   * comportamento.
   */
  const [paraCima, setParaCima] = useState(false);
  const caixaRef = useRef<HTMLDivElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);

  /**
   * O valor pode mudar por fora — é o que acontece quando o `sessionStorage`
   * devolve um rascunho no mount. Sem isto, o campo mostraria vazio com um
   * curso escolhido por baixo.
   */
  const valorConhecido = useRef(valor);
  useEffect(() => {
    if (valorConhecido.current === valor) return;
    valorConhecido.current = valor;
    setTexto(rotuloDe(valor));
    setAberta(false);
    setFiltrando(false);
  }, [valor]);

  const filtradas = useMemo<readonly Opcao[]>(() => {
    if (!filtrando) return CURSOS;
    const busca = semAcento(texto.trim());
    if (busca === "") return CURSOS;
    const casam = BUSCAVEIS.filter((b) => b.busca.includes(busca)).map((b) => b.curso);
    // Nada casou: `Outro` continua ali, porque o curso da pessoa pode
    // simplesmente não estar na lista — e sem essa saída ela para aqui.
    return casam.length === 0 ? [OUTRO] : casam;
  }, [filtrando, texto]);

  /** O realce nunca pode apontar para fora da lista filtrada do render atual. */
  const realceSeguro =
    realce === null ? null : Math.min(realce, Math.max(0, filtradas.length - 1));

  /* Mantém a opção realçada visível quando a navegação é por teclado. O
     `typeof` não é paranoia: o jsdom dos testes não implementa
     `scrollIntoView`, e chamá-lo lá lançaria TypeError no meio do teste. */
  useEffect(() => {
    if (!aberta || realceSeguro === null) return;
    const alvo = document.getElementById(`${listaId}-${realceSeguro}`);
    if (alvo !== null && typeof alvo.scrollIntoView === "function") {
      alvo.scrollIntoView({ block: "nearest" });
    }
  }, [aberta, realceSeguro, listaId]);

  /* Decide para que lado a lista abre — mesma regra e mesmo motivo de
     `SelectLista`. `useLayoutEffect` para não pintar um quadro no lado errado. */
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
  }, [aberta, filtradas.length]);

  function escolher(curso: Opcao): void {
    valorConhecido.current = curso.id;
    setTexto(curso.rotulo);
    setFiltrando(false);
    setAberta(false);
    setRealce(null);
    aoEscolher(curso.id);
  }

  /**
   * Abre a lista. `realceInicial` é o que fazer quando ainda não há curso
   * escolhido — e a diferença entre os dois casos é intenção:
   *
   * abrir **clicando** não realça nada (`null`), porque a pessoa só quis olhar;
   * abrir com **seta** já realça, porque a seta é navegação. É essa distinção
   * que impede um `Tab` distraído de escolher "Administração" para quem abriu a
   * lista por curiosidade — ver o `case "Tab"` mais abaixo.
   */
  function abrir(realceInicial: number | null): void {
    setFiltrando(false);
    const atual = CURSOS.findIndex((c) => c.id === valor);
    setRealce(atual === -1 ? realceInicial : atual);
    setAberta(true);
  }

  /**
   * O fecho que não deixa lixo.
   *
   * Se o que está escrito é exatamente uma opção (ignorando acento e caixa),
   * vale como escolha — quem colou "engenharia civil" não deveria perder isso
   * por não ter clicado. Qualquer outra coisa volta ao último valor válido, ou
   * ao vazio. O que nunca acontece é o campo ficar mostrando um texto que o
   * formulário não guarda.
   */
  function fecharSemLixo(): void {
    setAberta(false);
    setFiltrando(false);
    setRealce(null);

    const escrito = semAcento(texto.trim());
    const exato = escrito === "" ? undefined : CURSOS.find((c) => semAcento(c.rotulo) === escrito);
    if (exato !== undefined) {
      setTexto(exato.rotulo);
      if (exato.id !== valor) {
        valorConhecido.current = exato.id;
        aoEscolher(exato.id);
      }
      return;
    }
    setTexto(rotuloDe(valor));
  }

  function aoTeclar(evento: KeyboardEvent<HTMLInputElement>): void {
    const ultimo = Math.max(0, filtradas.length - 1);

    switch (evento.key) {
      case "ArrowDown":
        evento.preventDefault();
        if (!aberta) return abrir(0);
        setRealce((r) => (r === null ? 0 : Math.min(r + 1, ultimo)));
        return;

      case "ArrowUp":
        evento.preventDefault();
        if (!aberta) return abrir(CURSOS.length - 1);
        setRealce((r) => (r === null ? ultimo : Math.max(r - 1, 0)));
        return;

      case "Home":
        if (!aberta) return;
        evento.preventDefault();
        setRealce(0);
        return;

      case "End":
        if (!aberta) return;
        evento.preventDefault();
        setRealce(ultimo);
        return;

      case "Enter": {
        // Com a lista fechada, `Enter` é do formulário: ele avança de bloco.
        if (!aberta) return;
        evento.preventDefault();
        const alvo = realceSeguro === null ? undefined : filtradas[realceSeguro];
        if (alvo !== undefined) escolher(alvo);
        return;
      }

      case "Escape":
        if (!aberta) return;
        evento.preventDefault();
        setAberta(false);
        setFiltrando(false);
        setRealce(null);
        // Devolve o valor anterior, que é o que `Esc` significa em toda parte.
        setTexto(rotuloDe(valor));
        return;

      case "Tab": {
        // Sai confirmando o realçado — mas só se houver realce de verdade.
        // Sem o `null`, tabular por um campo aberto e intocado escolheria
        // "Administração" para quem nunca olhou a lista.
        if (!aberta) return;
        const alvo = realceSeguro === null ? undefined : filtradas[realceSeguro];
        if (alvo !== undefined) escolher(alvo);
        return;
      }

      default:
        return;
    }
  }

  return (
    <Moldura campo="curso" id={id} erro={erro}>
      <div className={estilos.caixa} ref={caixaRef}>
        <input
          id={id}
          className={campos.controle}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-expanded={aberta}
          aria-controls={listaId}
          aria-autocomplete="list"
          aria-activedescendant={
            aberta && realceSeguro !== null ? `${listaId}-${realceSeguro}` : undefined
          }
          aria-invalid={erro !== undefined || undefined}
          aria-describedby={descricaoDe("curso", id, { erro: erro !== undefined })}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setFiltrando(true);
            setRealce(0);
            setAberta(true);
          }}
          onClick={() => {
            if (!aberta) abrir(null);
          }}
          onKeyDown={aoTeclar}
          onBlur={fecharSemLixo}
        />
        {/* Sempre no DOM, escondido por `hidden` quando fechada: `aria-controls`
            precisa apontar para um elemento que existe, e `hidden` é o que tira
            a lista fechada da árvore de acessibilidade sem tirá-la do documento.

            O `onMouseDown` com `preventDefault` é o que faz clicar numa opção
            funcionar: sem ele o `blur` do input dispara ANTES do clique, o
            `fecharSemLixo` desmonta a lista, e o clique cai no vazio. */}
        <ul
          id={listaId}
          ref={listaRef}
          role="listbox"
          /* Sem nome, o leitor de tela anuncia só "lista" e a pessoa não sabe
             de qual campo ela é. Com sufixo, pelo mesmo motivo de
             `SelectLista`: igual ao do campo, uma busca por rótulo acharia
             dois elementos. */
          aria-label={textoListaDeOpcoes("curso")}
          hidden={!aberta}
          data-direcao={paraCima ? "cima" : "baixo"}
          className={estilos.lista}
          onMouseDown={(e) => e.preventDefault()}
        >
          {filtradas.map((curso, i) => (
            <li
              key={curso.id}
              id={`${listaId}-${i}`}
              role="option"
              aria-selected={curso.id === valor}
              data-realce={i === realceSeguro}
              className={estilos.opcao}
              onClick={() => escolher(curso)}
            >
              {curso.rotulo}
            </li>
          ))}
        </ul>
      </div>
    </Moldura>
  );
}
