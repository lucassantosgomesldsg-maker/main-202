import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { COPY_INSCRICAO, LIMITES } from "@/lib/inscricao";
import { idDoCampo } from "./Campos";
import Indicacoes, { type LinhaIndicacao } from "./Indicacoes";

const C = COPY_INSCRICAO.indicacoes;

/** O pai controlado, que é como `Formulario` usa o bloco. */
function Palco({ inicial }: { inicial?: LinhaIndicacao[] }) {
  const [valores, setValores] = useState<LinhaIndicacao[]>(
    inicial ?? Array.from({ length: LIMITES.maxIndicacoes }, () => ({ nome: "", linkedin: "" })),
  );
  return <Indicacoes valores={valores} aoMudar={setValores} />;
}

function caixa(n: number, parte: "nome" | "linkedin"): HTMLElement {
  const pessoa = C.rotuloItem.replace("{n}", String(n));
  return screen.getByRole("textbox", {
    name: `${pessoa} — ${parte === "nome" ? C.nome : C.linkedin}`,
  });
}

describe("as três indicações", () => {
  it("mostra as três pessoas desde o início, sem botão de adicionar", () => {
    render(<Palco />);

    // Três pares, seis caixas. É a tela que diz "três" — não há texto pedindo.
    expect(screen.getAllByRole("textbox")).toHaveLength(LIMITES.maxIndicacoes * 2);
    for (let n = 1; n <= LIMITES.maxIndicacoes; n++) {
      expect(caixa(n, "nome")).toBeInTheDocument();
      expect(caixa(n, "linkedin")).toBeInTheDocument();
    }
  });

  it("diz que é recomendado, e não que é opcional", () => {
    // A diferença é o campo inteiro: os outros campos opcionais desta página
    // dizem "Opcional." e significam "tanto faz". Este pede um favor.
    render(<Palco />);
    const ajuda = COPY_INSCRICAO.campos.indicacoes.ajuda ?? "";
    expect(ajuda).toMatch(/Recomendado/);
    expect(ajuda).not.toMatch(/Opcional/);
    expect(screen.getByText(ajuda)).toBeInTheDocument();
  });

  it("mantém o nome com o LinkedIn da mesma pessoa", async () => {
    // O defeito que duas listas paralelas teriam: escrever na linha 2 e o valor
    // aparecer colado no par de outra pessoa.
    const user = userEvent.setup();
    render(<Palco />);

    await user.type(caixa(2, "nome"), "Ana Prado");
    await user.type(caixa(2, "linkedin"), "linkedin.com/in/anaprado");

    expect(caixa(2, "nome")).toHaveValue("Ana Prado");
    expect(caixa(2, "linkedin")).toHaveValue("linkedin.com/in/anaprado");
    expect(caixa(1, "nome")).toHaveValue("");
    expect(caixa(3, "linkedin")).toHaveValue("");
  });

  it("completa as três linhas quando o rascunho guardado trouxe menos", () => {
    // `sessionStorage` é editável à mão e sobrevive a um deploy. A tela nunca
    // pode desenhar duas caixas porque o que estava guardado tinha uma linha.
    render(<Palco inicial={[{ nome: "Ana", linkedin: "linkedin.com/in/ana" }]} />);
    expect(screen.getAllByRole("textbox")).toHaveLength(LIMITES.maxIndicacoes * 2);
    expect(caixa(1, "nome")).toHaveValue("Ana");
    expect(caixa(3, "nome")).toHaveValue("");
  });

  it("dá ao grupo um alvo de foco: a primeira caixa carrega o id do campo", () => {
    // `Formulario` leva o foco ao campo com erro por
    // `document.getElementById(idDoCampo(campo))`. O erro das indicações é do
    // GRUPO, então alguém tem de carregar o id "pelado" — sem isso o
    // `getElementById` devolve `null` e o efeito de foco desiste em silêncio,
    // deixando quem preencheu metade de uma indicação sem saber para onde ir.
    // Bug que existiu de verdade, verificado no navegador.
    render(<Palco />);
    const alvo = document.getElementById(idDoCampo("indicacoes"));
    expect(alvo).not.toBeNull();
    expect(alvo).toBe(caixa(1, "nome"));
  });

  it("mostra o erro do grupo uma vez só, e com texto", async () => {
    const erro = COPY_INSCRICAO.erros.indicacaoIncompleta;
    render(
      <Indicacoes
        valores={[{ nome: "Ana", linkedin: "" }]}
        aoMudar={() => {}}
        erro={erro}
      />,
    );

    // Um erro para o grupo inteiro, não um por caixa: a mensagem fala do par.
    expect(screen.getAllByText(erro)).toHaveLength(1);
    for (const c of screen.getAllByRole("textbox")) {
      expect(c).toHaveAttribute("aria-invalid", "true");
    }
  });
});
