import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { COPY_INSCRICAO, CURSOS } from "@/lib/inscricao";
import ComboboxCurso from "./ComboboxCurso";

/**
 * O combobox é o único widget custom da página e o único lugar onde ela pode
 * quebrar de verdade — daí um arquivo de teste só para ele.
 *
 * Tudo aqui é comportamento visto de fora: papéis ARIA, o que aparece na lista,
 * o que sobra no campo depois de sair. Nada olha estado interno, e nada procura
 * por classe de CSS Module (o nome é sorteado no build).
 */

const ROTULO = COPY_INSCRICAO.campos.curso.rotulo;

/** O pai controlado, que é como `Formulario` usa o componente. */
function Palco({ inicial = "" }: { inicial?: string }) {
  const [valor, setValor] = useState(inicial);
  return (
    <>
      <ComboboxCurso valor={valor} aoEscolher={setValor} />
      <button type="button">fora</button>
      <output data-escolhido>{valor}</output>
    </>
  );
}

function campo(): HTMLElement {
  return screen.getByRole("combobox", { name: ROTULO });
}

function escolhido(): string {
  return document.querySelector("[data-escolhido]")?.textContent ?? "";
}

describe("o combobox de cursos", () => {
  it("nasce fechado e abre ao clique, com a lista inteira", async () => {
    render(<Palco />);
    expect(campo()).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(campo());

    expect(campo()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("option")).toHaveLength(CURSOS.length);
  });

  it("filtra por pedaço do nome e não exige acento", async () => {
    // O teclado do celular não sugere acento no meio de palavra; se a busca
    // exigisse, metade da lista ficaria inalcançável.
    render(<Palco />);
    await userEvent.type(campo(), "eletrica");

    const opcoes = screen.getAllByRole("option").map((o) => o.textContent);
    expect(opcoes).toContain("Eng. Elétrica");
    expect(opcoes.length, "a busca precisa REDUZIR a lista").toBeLessThan(CURSOS.length);
  });

  it("“engenharia” por extenso encontra as habilitações abreviadas", async () => {
    // A armadilha que este teste guarda: com uma `Engenharia` genérica na lista
    // e a busca comparando só o rótulo, digitar "engenharia" devolvia UMA
    // opção — a genérica — e escondia as onze `Eng. …`. Quem faz Eng. de
    // Produção escolheria a genérica achando que era a única, e a ficha perderia
    // exatamente o que a distingue.
    render(<Palco />);
    await userEvent.type(campo(), "engenharia");

    const opcoes = screen.getAllByRole("option").map((o) => o.textContent);
    expect(opcoes).toContain("Engenharia");
    expect(opcoes).toContain("Eng. de Produção");
    expect(opcoes.length, "todas as habilitações precisam aparecer").toBeGreaterThan(5);
  });

  it("continua achando pelo rótulo abreviado, como está escrito na tela", async () => {
    render(<Palco />);
    await userEvent.type(campo(), "eng. de");

    const opcoes = screen.getAllByRole("option").map((o) => o.textContent);
    expect(opcoes.every((o) => o?.startsWith("Eng. de"))).toBe(true);
    expect(opcoes.length).toBeGreaterThan(0);
  });

  it("oferece Outro quando nada casa, para a pessoa não parar aqui", async () => {
    render(<Palco />);
    await userEvent.type(campo(), "cursologia quantica");

    const opcoes = screen.getAllByRole("option").map((o) => o.textContent);
    expect(opcoes).toEqual([CURSOS[CURSOS.length - 1].rotulo]);
  });

  it("escolhe pelo teclado: setas realçam e Enter confirma", async () => {
    render(<Palco />);
    campo().focus();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    expect(escolhido()).toBe(CURSOS[1].id);
    expect(campo()).toHaveValue(CURSOS[1].rotulo);
    expect(campo()).toHaveAttribute("aria-expanded", "false");
  });

  it("aponta a opção realçada com aria-activedescendant", async () => {
    render(<Palco />);
    campo().focus();
    await userEvent.keyboard("{ArrowDown}");

    const alvo = campo().getAttribute("aria-activedescendant");
    expect(alvo, "sem activedescendant o leitor de tela não lê a opção").not.toBeNull();
    expect(document.getElementById(alvo ?? "")).toHaveAttribute("role", "option");
  });

  it("Esc fecha e devolve o valor anterior", async () => {
    render(<Palco inicial="Direito" />);
    await userEvent.clear(campo());
    await userEvent.type(campo(), "medic");
    await userEvent.keyboard("{Escape}");

    expect(campo()).toHaveValue("Direito");
    expect(escolhido()).toBe("Direito");
    expect(campo()).toHaveAttribute("aria-expanded", "false");
  });

  it("Tab sai confirmando o que estiver realçado", async () => {
    render(<Palco />);
    await userEvent.type(campo(), "eletrica");
    await userEvent.tab();

    expect(escolhido()).toBe("Eng. Elétrica");
  });

  it("Tab num campo aberto e intocado não escolhe nada", async () => {
    // A armadilha do "Tab confirma": sem realce de verdade, tabular por cima do
    // campo escolheria o primeiro curso da lista para quem nem olhou.
    render(<Palco />);
    await userEvent.click(campo());
    await userEvent.tab();

    expect(escolhido()).toBe("");
    expect(campo()).toHaveValue("");
  });

  it("sair sem escolher não deixa lixo no campo", async () => {
    render(<Palco inicial="Direito" />);
    await userEvent.clear(campo());
    await userEvent.type(campo(), "não é curso nenhum");
    await userEvent.click(screen.getByRole("button", { name: "fora" }));

    expect(campo(), "o campo não pode mostrar o que o formulário não guarda").toHaveValue(
      "Direito",
    );
    expect(escolhido()).toBe("Direito");
  });

  it("sair com o nome exato de um curso vale como escolha", async () => {
    render(<Palco />);
    await userEvent.type(campo(), "engenharia");
    await userEvent.clear(campo());
    await userEvent.type(campo(), "MEDICINA");
    await userEvent.click(screen.getByRole("button", { name: "fora" }));

    expect(escolhido()).toBe("Medicina");
    expect(campo()).toHaveValue("Medicina");
  });

  it("escolhe com o mouse sem que o blur atrapalhe o clique", async () => {
    // O `blur` do input dispara ANTES do `click` da opção. Sem o
    // `preventDefault` no `mousedown` da lista, ela some antes do clique chegar.
    render(<Palco />);
    await userEvent.type(campo(), "psico");
    await userEvent.click(screen.getByRole("option", { name: "Psicologia" }));

    expect(escolhido()).toBe("Psicologia");
  });

  it("mostra o curso que veio de fora, como num rascunho restaurado", () => {
    render(<Palco inicial="Física" />);
    expect(campo()).toHaveValue("Física");
  });
});
