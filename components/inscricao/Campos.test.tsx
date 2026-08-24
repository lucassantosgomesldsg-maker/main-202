import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { COPY_INSCRICAO, FERRAMENTAS_AI, LIMITES, NIVEIS_AI } from "@/lib/inscricao";
import { CampoSelect, CampoTextoLongo, ListaEscolha, ListaMarcacao, opcoesDe } from "./Campos";

/**
 * Os tijolos do formulário. O que está testado aqui é o que eles fazem de
 * diferente de um `<input>` cru: a exclusividade lida do dado, o contador que
 * conta como a pessoa conta, e as amarras de acessibilidade que ninguém vê até
 * quebrarem.
 */

const NENHUMA = FERRAMENTAS_AI.find((f) => f.exclusiva === true);

function PalcoFerramentas({ inicial = [] as string[] }) {
  const [marcadas, setMarcadas] = useState<string[]>(inicial);
  return (
    <ListaMarcacao
      campo="ferramentas_ai"
      opcoes={FERRAMENTAS_AI}
      marcadas={marcadas}
      aoMudar={setMarcadas}
    />
  );
}

function PalcoTexto({ inicial = "" }: { inicial?: string }) {
  const [valor, setValor] = useState(inicial);
  return (
    <CampoTextoLongo
      campo="historia_ai"
      limite={LIMITES.textoLivre}
      valor={valor}
      aoMudar={setValor}
    />
  );
}

describe("o checklist de ferramentas", () => {
  it("tem uma opção exclusiva declarada no dado, e não no rótulo", () => {
    // O teste existe para o dia em que alguém trocar a palavra "Nenhuma" na
    // copy: a regra tem de continuar valendo, porque ela lê a flag.
    expect(NENHUMA, "nenhuma ferramenta marcada como exclusiva").toBeDefined();
  });

  it("marcar a exclusiva desmarca todas as outras", async () => {
    render(<PalcoFerramentas inicial={["CHATGPT", "CLAUDE"]} />);
    await userEvent.click(screen.getByRole("checkbox", { name: NENHUMA?.rotulo }));

    expect(screen.getByRole("checkbox", { name: NENHUMA?.rotulo })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "ChatGPT" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Claude" })).not.toBeChecked();
  });

  it("marcar qualquer outra desmarca a exclusiva", async () => {
    render(<PalcoFerramentas inicial={[NENHUMA?.id ?? ""]} />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Perplexity" }));

    expect(screen.getByRole("checkbox", { name: "Perplexity" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: NENHUMA?.rotulo })).not.toBeChecked();
  });

  it("agrupa as caixas sob a pergunta, para quem ouve a tela", () => {
    render(<PalcoFerramentas />);
    expect(
      screen.getByRole("group", { name: COPY_INSCRICAO.campos.ferramentas_ai.rotulo }),
    ).toBeInTheDocument();
  });
});

describe("as listas de escolha única", () => {
  it("torna a frase inteira clicável, e não só a bolinha", async () => {
    function Palco() {
      const [valor, setValor] = useState("");
      return (
        <ListaEscolha
          campo="nivel_ai"
          opcoes={opcoesDe(NIVEIS_AI)}
          valor={valor}
          aoMudar={setValor}
        />
      );
    }
    render(<Palco />);

    // Clicar no TEXTO do degrau — que é o alvo grande no celular — marca o rádio.
    await userEvent.click(screen.getByText(NIVEIS_AI[3].rotulo));
    expect(screen.getByRole("radio", { name: NIVEIS_AI[3].rotulo })).toBeChecked();
  });

  it("guarda o degrau 0 como resposta, e não como ausência de resposta", async () => {
    function Palco() {
      const [valor, setValor] = useState("");
      return (
        <ListaEscolha
          campo="nivel_ai"
          opcoes={opcoesDe(NIVEIS_AI)}
          valor={valor}
          aoMudar={setValor}
        />
      );
    }
    render(<Palco />);
    await userEvent.click(screen.getByRole("radio", { name: NIVEIS_AI[0].rotulo }));
    expect(screen.getByRole("radio", { name: NIVEIS_AI[0].rotulo })).toBeChecked();
  });
});

describe("o contador dos textos livres", () => {
  it("conta como a pessoa conta, e não em unidades UTF-16", async () => {
    // "👋".length é 2 em JavaScript. Um contador que anda dois passos por emoji
    // parece defeito — e recusaria um texto que o servidor aceitaria.
    render(<PalcoTexto />);
    await userEvent.click(screen.getByLabelText(COPY_INSCRICAO.campos.historia_ai.rotulo));
    await userEvent.paste("👋👋👋");

    expect(screen.getByText(`3 / ${LIMITES.textoLivre}`)).toBeInTheDocument();
  });

  it("muda de estado quando o limite se aproxima e quando ele é ultrapassado", async () => {
    const { container } = render(<PalcoTexto inicial={"a".repeat(10)} />);
    const contador = () => container.querySelector("[data-estado]");
    expect(contador()).toHaveAttribute("data-estado", "calmo");

    await userEvent.click(screen.getByLabelText(COPY_INSCRICAO.campos.historia_ai.rotulo));
    await userEvent.paste("b".repeat(LIMITES.textoLivre - 20));
    expect(contador()).toHaveAttribute("data-estado", "perto");

    await userEvent.paste("c".repeat(30));
    expect(contador()).toHaveAttribute("data-estado", "passou");
  });

  it("liga o campo ao contador e à ajuda por aria-describedby", () => {
    render(<PalcoTexto />);
    const area = screen.getByLabelText(COPY_INSCRICAO.campos.historia_ai.rotulo);
    const apoio = (area.getAttribute("aria-describedby") ?? "").split(" ");

    expect(apoio.length, "o campo precisa apontar para a ajuda e para o contador").toBe(2);
    for (const idApoio of apoio) {
      expect(document.getElementById(idApoio), `describedby aponta para o nada: ${idApoio}`)
        .not.toBeNull();
    }
  });
});

describe("o select nativo", () => {
  it("nasce sem escolha, e a ausência não tem texto inventado", () => {
    function Palco() {
      const [valor, setValor] = useState("");
      return (
        <CampoSelect
          campo="ai_estudos"
          opcoes={[
            { chave: "NUNCA", rotulo: "Nunca" },
            { chave: "AS_VEZES", rotulo: "Às vezes" },
          ]}
          valor={valor}
          aoMudar={setValor}
        />
      );
    }
    render(<Palco />);
    const select = screen.getByLabelText(COPY_INSCRICAO.campos.ai_estudos.rotulo);

    expect(select).toHaveValue("");
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("mostra o erro com TEXTO, e não só com a borda", () => {
    render(
      <CampoSelect
        campo="ai_estudos"
        opcoes={[{ chave: "NUNCA", rotulo: "Nunca" }]}
        valor=""
        aoMudar={() => {}}
        erro={COPY_INSCRICAO.erros.faltaEscolha}
      />,
    );
    const select = screen.getByLabelText(COPY_INSCRICAO.campos.ai_estudos.rotulo);

    expect(screen.getByText(COPY_INSCRICAO.erros.faltaEscolha)).toBeInTheDocument();
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(select.getAttribute("aria-describedby")).toContain("-erro");
  });
});
