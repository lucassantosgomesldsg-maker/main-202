import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * As duas listas suspensas da página têm de ser a MESMA coisa na tela.
 *
 * `ComboboxCurso` (44 cursos, com filtro de texto) e `SelectLista` (os cinco
 * campos de escolha) são componentes diferentes por dentro — um aceita
 * digitação, o outro não —, mas quem preenche o formulário não tem como saber
 * disso: para a pessoa, são duas listas que abrem embaixo de um campo.
 *
 * Este arquivo existe por causa de um defeito real, de 01/09/2026: a barra de
 * rolagem de um popup escuro entra BRANCA por padrão, e eu estilizei a de
 * `SelectLista` e esqueci a de `ComboboxCurso`. O resultado ficou visível na
 * mesma tela — dois campos vizinhos, um com a barra escura da paleta, outro com
 * a clara do sistema. Nenhum teste pegou, porque nenhum olhava as duas ao mesmo
 * tempo.
 *
 * **A primeira versão deste teste era estreita demais e foi reescrita em
 * 02/09/2026.** Ela comparava só três coisas — o topo do bloco `.lista{}`, as
 * regras de barra de rolagem e o realce — e passava verde com as duas listas
 * tendo altura de opção diferente, cor de fundo diferente sob `@media`, e um
 * `:hover` que só uma delas tinha. Agora a comparação é do CONJUNTO INTEIRO de
 * regras que desenham a lista e as opções.
 *
 * O que se compara é o BLOCO DECLARADO, e não o resultado renderizado: CSS
 * Module não expõe valor computado fora do navegador. É pouco, mas é
 * exatamente o bastante para pegar a classe de erro que aconteceu — mexer numa
 * lista e esquecer da outra.
 */

function css(arquivo: string): string {
  return readFileSync(join(process.cwd(), "components", "inscricao", arquivo), "utf8");
}

/**
 * Todas as regras cujo seletor menciona `.lista` ou `.opcao`, normalizadas.
 *
 * A varredura é por chave, e não por linha: assim ela enxerga regra indentada
 * dentro de `@media` — que a versão anterior ignorava, porque exigia a classe
 * no começo da linha. O `@media` que envolve a regra entra na chave, senão
 * duas listas com breakpoints diferentes ficariam "iguais".
 */
function regrasDaLista(fonte: string): string[] {
  const semComentarios = fonte.replace(/\/\*[\s\S]*?\*\//g, "");
  const regras: string[] = [];

  // Percorre o arquivo achando `<seletor> { <corpo> }`, guardando de que
  // `@media` cada um veio.
  const pilha: string[] = [];
  let i = 0;
  let inicio = 0;
  while (i < semComentarios.length) {
    const c = semComentarios[i];
    if (c === "{") {
      const cabecalho = semComentarios.slice(inicio, i).trim().replace(/\s+/g, " ");
      if (cabecalho.startsWith("@")) {
        pilha.push(cabecalho);
        i += 1;
        inicio = i;
        continue;
      }
      const fim = semComentarios.indexOf("}", i);
      const corpo = semComentarios.slice(i + 1, fim);
      if (/\.(lista|opcao)\b/.test(cabecalho)) {
        const declaracoes = corpo
          .split(";")
          .map((d) => d.trim().replace(/\s+/g, " "))
          .filter((d) => d !== "")
          .sort()
          .join("; ");
        regras.push(`${[...pilha, cabecalho].join(" ")} { ${declaracoes} }`);
      }
      i = fim + 1;
      inicio = i;
      continue;
    }
    if (c === "}") {
      pilha.pop();
      i += 1;
      inicio = i;
      continue;
    }
    i += 1;
  }
  return regras.sort();
}

describe("as duas listas suspensas", () => {
  const combobox = css("ComboboxCurso.module.css");
  const selectLista = css("SelectLista.module.css");

  it("desenham a lista e as opções com exatamente as mesmas regras", () => {
    // Uma comparação só, do conjunto inteiro: caixa, barra de rolagem, direção,
    // estado escondido, a opção, o separador, o realce, o hover e a escolhida.
    // Qualquer uma que exista num arquivo e não no outro reprova aqui.
    expect(regrasDaLista(combobox)).toEqual(regrasDaLista(selectLista));
  });

  it("declaram a barra de rolagem pelos dois caminhos", () => {
    // O defeito que motivou o arquivo. As duas famílias de propriedade contam:
    // `scrollbar-color` é o padrão moderno e as `::-webkit-scrollbar*` são o
    // caminho antigo — ter uma sem a outra faz a barra divergir num navegador e
    // não no outro, que é pior do que divergir nos dois.
    for (const fonte of [combobox, selectLista]) {
      const regras = regrasDaLista(fonte).join("\n");
      expect(regras).toContain("scrollbar-width: thin");
      expect(regras).toContain("scrollbar-color: var(--fio-estrutura) transparent");
      expect(regras).toMatch(/::-webkit-scrollbar-thumb \{/);
    }
  });

  it("a varredura enxerga regra dentro de @media", () => {
    // Guarda do próprio guarda: a versão anterior lia só o começo da linha e
    // era cega a tudo que estivesse indentado dentro de um `@media`. Sem este
    // teste, uma regressão da varredura passaria despercebida e levaria junto
    // toda a proteção acima.
    const comMedia = `
      .lista { color: red; }
      @media (max-width: 600px) {
        .lista { background: #ff00ff; }
      }
    `;
    const achadas = regrasDaLista(comMedia);
    expect(achadas).toHaveLength(2);
    expect(achadas.join("\n")).toContain("@media (max-width: 600px) .lista");
  });
});
