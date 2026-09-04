import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { COPY_INSCRICAO, LIMITES } from "@/lib/inscricao";
import Premios from "./Premios";

const ADICIONAR = COPY_INSCRICAO.premios.adicionar;

/** O pai controlado, que é como `Formulario` usa o repeater. */
function Palco({ inicial = [""] }: { inicial?: string[] }) {
  const [valores, setValores] = useState<string[]>(inicial);
  return <Premios valores={valores} aoMudar={setValores} />;
}

function linha(n: number): HTMLElement {
  return screen.getByRole("textbox", {
    name: COPY_INSCRICAO.premios.rotuloItem.replace("{n}", String(n)),
  });
}

describe("o repeater de prêmios", () => {
  it("começa com um campo só, e sem convite para criar linha em branco", () => {
    render(<Palco />);
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: ADICIONAR })).not.toBeInTheDocument();
  });

  it("oferece o + assim que o campo atual tem conteúdo", async () => {
    render(<Palco />);
    await userEvent.type(linha(1), "Medalha de ouro na OBMEP 2023");
    expect(screen.getByRole("button", { name: ADICIONAR })).toBeInTheDocument();
  });

  it("esconde o + de novo quando o campo volta a ficar vazio", async () => {
    render(<Palco />);
    await userEvent.type(linha(1), "x");
    await userEvent.clear(linha(1));
    expect(screen.queryByRole("button", { name: ADICIONAR })).not.toBeInTheDocument();
  });

  it("põe o foco no campo novo ao adicionar", async () => {
    // Sem isto a pessoa clica em +, nada parece acontecer, e ela clica de novo.
    render(<Palco />);
    await userEvent.type(linha(1), "Primeiro");
    await userEvent.click(screen.getByRole("button", { name: ADICIONAR }));

    expect(linha(2)).toHaveFocus();
  });

  it("para de oferecer o + no teto de prêmios", async () => {
    const cheio = Array.from({ length: LIMITES.maxPremios }, (_, i) => `Prêmio ${i + 1}`);
    render(<Palco inicial={cheio} />);

    expect(screen.getAllByRole("textbox")).toHaveLength(LIMITES.maxPremios);
    expect(screen.queryByRole("button", { name: ADICIONAR })).not.toBeInTheDocument();
  });

  it("não oferece remover quando há uma linha só", () => {
    render(<Palco inicial={["Só este"]} />);
    expect(
      screen.queryByRole("button", { name: /Remover/ }),
      "com uma linha, remover não tem o que fazer",
    ).not.toBeInTheDocument();
  });

  it("remove a linha pedida e mantém as outras", async () => {
    render(<Palco inicial={["Um", "Dois", "Três"]} />);
    const nome = COPY_INSCRICAO.premios.rotuloItem.replace("{n}", "2");
    await userEvent.click(
      screen.getByRole("button", { name: `${COPY_INSCRICAO.premios.remover} ${nome}` }),
    );

    const restantes = screen.getAllByRole("textbox").map((i) => (i as HTMLInputElement).value);
    expect(restantes).toEqual(["Um", "Três"]);
  });

  it("acende o contador só quando o limite começa a importar", async () => {
    const quaseNoLimite = "a".repeat(LIMITES.premio - 5);
    render(<Palco inicial={["curto"]} />);
    expect(screen.queryByText(/\/ 120/)).not.toBeInTheDocument();

    await userEvent.clear(linha(1));
    await userEvent.paste(quaseNoLimite);
    expect(screen.getByText(`${LIMITES.premio - 5} / ${LIMITES.premio}`)).toBeInTheDocument();
  });
});
