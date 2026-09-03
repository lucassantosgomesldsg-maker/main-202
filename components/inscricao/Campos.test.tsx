import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  COPY_INSCRICAO,
  FERRAMENTAS_AI,
  LIMITES,
  NIVEIS_AI,
  textoListaDeOpcoes,
} from "@/lib/inscricao";
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

describe("o campo de lista", () => {
  it("nasce sem escolha, e a ausência não tem texto inventado", async () => {
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
    const botao = screen.getByLabelText(COPY_INSCRICAO.campos.ai_estudos.rotulo);

    // Vazio de verdade: nem "Selecione…", nem a primeira opção escolhida por
    // conta própria. A ausência de resposta é uma resposta, e quem a cobra é o
    // AVANÇAR.
    expect(botao).toHaveTextContent("");
    // Fechada ao nascer, e por isso nenhuma opção na árvore de acessibilidade.
    expect(botao).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryAllByRole("option")).toHaveLength(0);

    // Aberta, são exatamente as duas opções passadas — sem a linha em branco
    // que o `<select>` nativo precisava ter para poder nascer sem escolha.
    await userEvent.click(botao);
    expect(botao).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("option")).toHaveLength(2);
  });

  it("dá à lista aberta um nome próprio, diferente do nome do campo", async () => {
    // Duas coisas de uma vez, e as duas já quebraram:
    //
    // 1. A `listbox` PRECISA de nome. Sem ele o leitor de tela anuncia "lista"
    //    seca e a pessoa não sabe de qual campo — o `<select>` nativo herdava o
    //    rótulo de graça, e substituí-lo perdeu isso.
    // 2. O nome precisa ser DIFERENTE do nome do campo. Quando os dois eram
    //    "Estado", `getByLabelText` achava dois elementos para uma pergunta só
    //    e 18 testes quebraram de uma vez.
    function Palco() {
      const [valor, setValor] = useState("");
      return (
        <CampoSelect
          campo="ai_estudos"
          opcoes={[{ chave: "NUNCA", rotulo: "Nunca" }]}
          valor={valor}
          aoMudar={setValor}
        />
      );
    }
    render(<Palco />);
    const rotulo = COPY_INSCRICAO.campos.ai_estudos.rotulo;

    // O rótulo do campo acha UM elemento: o controle.
    expect(screen.getByLabelText(rotulo).tagName).toBe("BUTTON");

    await userEvent.click(screen.getByLabelText(rotulo));
    const lista = screen.getByRole("listbox");
    expect(lista).toHaveAccessibleName(textoListaDeOpcoes("ai_estudos"));
    expect(lista).not.toHaveAccessibleName(rotulo);
  });

  it("fecha a lista ao escolher com o mouse, e guarda a escolha", async () => {
    // Buraco de cobertura provado: nenhum teste afirmava o FECHAMENTO. Removendo
    // o `fechar()` do `escolher()` a suíte inteira continuava verde, com a lista
    // presa aberta depois de toda escolha — e o caminho de mouse é o que os
    // helpers dos outros arquivos exercitam dezenas de vezes.
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
    const botao = screen.getByLabelText(COPY_INSCRICAO.campos.ai_estudos.rotulo);

    await userEvent.click(botao);
    await userEvent.click(screen.getByRole("option", { name: "Às vezes" }));

    expect(botao).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(botao.textContent?.trim()).toBe("Às vezes");
    // E o foco volta para o campo: quem escolheu com o mouse continua no lugar
    // para tabular adiante.
    expect(botao).toHaveFocus();
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
