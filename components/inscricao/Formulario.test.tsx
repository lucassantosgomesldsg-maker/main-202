import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AI_ESTUDOS,
  AI_TRABALHO,
  CAMPO_HONEYPOT,
  COPY_INSCRICAO,
  CURSOS,
  DISPONIBILIDADES,
  EMPREENDEDORISMO,
  ESTADOS,
  NIVEIS_AI,
  SITUACOES,
  TOTAL_BLOCOS,
  UNIDADES_USP,
  confirmacaoDe,
  textoProgresso,
} from "@/lib/inscricao";
import { URL_SITE } from "@/lib/site";
import Formulario from "./Formulario";

/**
 * O formulário visto de fora: o que a pessoa clica e o que aparece.
 *
 * Nada aqui olha `sessionStorage`, estado interno ou classe de CSS Module. As
 * duas exceções estão comentadas onde aparecem, e as duas são fronteira com o
 * navegador — o nome da chave guardada e o corpo do POST — que é justamente o
 * que precisa estar travado por teste.
 */

const C = COPY_INSCRICAO;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

/**
 * `delay: null` tira a espera de milissegundos que o userEvent põe entre uma
 * tecla e a seguinte. Não muda nada do que é exercitado — só o relógio: a
 * travessia completa do formulário passa de cem eventos, e com a espera padrão
 * ela sozinha estoura o tempo limite do vitest.
 */
function usuario(): UserEvent {
  return userEvent.setup({ delay: null });
}

function campo(nome: string): HTMLElement {
  return screen.getByLabelText(nome);
}

/**
 * O grupo de escolha única de um campo, pelo texto da `<legend>`.
 *
 * As listas de até seis opções não são `<select>`: são radios com a frase
 * inteira clicável (decisão de 21/08/2026), e um `<fieldset>` não responde a
 * `getByLabelText`. O papel `group` é o que o leitor de tela anuncia ao entrar,
 * então é por ele que o teste pergunta.
 */
function grupo(nome: string): HTMLElement | null {
  return screen.queryByRole("group", { name: nome });
}

/**
 * Escolhe num campo de lista, pelo VALOR de coluna — o que `selectOptions`
 * fazia enquanto o campo era um `<select>` nativo.
 *
 * Desde 01/09/2026 esses campos são um `listbox` próprio (`SelectLista`),
 * porque o popup de um `<select>` é desenhado pelo sistema operacional e não
 * aceita as cores da página. O gesto do teste passou a ser o gesto de uma
 * pessoa: abrir a lista e clicar na opção.
 *
 * A busca é por `data-valor`, e não pelo rótulo bonito, de propósito: os testes
 * afirmam `"USP"`, `"SP"`, `"INDICACAO"` porque é esse `id` que vai para o
 * banco — escrever o rótulo aqui deixaria o teste passar com a copy errada na
 * tela.
 */
async function escolherNaLista(user: UserEvent, rotulo: string, chave: string): Promise<void> {
  const botao = campo(rotulo);
  await user.click(botao);
  const lista = document.getElementById(botao.getAttribute("aria-controls") ?? "");
  const opcao = lista?.querySelector<HTMLElement>(`[data-valor="${chave}"]`);
  if (opcao === null || opcao === undefined) {
    throw new Error(`opção "${chave}" não existe na lista de "${rotulo}"`);
  }
  await user.click(opcao);
}

/** Clica numa opção exposta, pelo rótulo — que é o que a pessoa lê. */
async function escolher(user: UserEvent, rotulo: string): Promise<void> {
  await user.click(screen.getByRole("radio", { name: rotulo }));
}

/**
 * O rótulo de uma opção, a partir do `id` que o banco guarda.
 *
 * Vale a indireção: escrever "Uso e é aceito pelo time" à mão aqui faria o teste
 * passar com a copy errada na tela no dia em que alguém trocasse a frase em
 * `lib/inscricao.ts` e esquecesse do resto.
 */
function rotuloDe(
  lista: readonly { readonly id: string; readonly rotulo: string }[],
  id: string,
): string {
  const opcao = lista.find((o) => o.id === id);
  if (opcao === undefined) throw new Error(`não existe a opção ${id} nesta lista`);
  return opcao.rotulo;
}

function titulo(): string {
  return screen.getByRole("heading", { level: 1 }).textContent ?? "";
}

async function comecar(user: UserEvent): Promise<void> {
  await user.click(screen.getByRole("button", { name: C.abertura.botao }));
}

async function avancar(user: UserEvent): Promise<void> {
  await user.click(screen.getByRole("button", { name: C.navegacao.avancar }));
}

async function preencherQuemEVoce(user: UserEvent): Promise<void> {
  await user.type(campo(C.campos.nome.rotulo), "Maria Clara de Souza Almeida");
  await user.type(campo(C.campos.email.rotulo), "maria@exemplo.com");
  await user.type(campo(C.campos.whatsapp.rotulo), "11912345678");
  await user.type(campo(C.campos.idade.rotulo), "21");
  await escolherNaLista(user, C.campos.estado.rotulo, "SP");
  await user.type(campo(C.campos.cidade.rotulo), "São Paulo");
}

/** Do primeiro campo até o botão de enviar, sem enviar. */
async function atravessar(user: UserEvent): Promise<void> {
  await comecar(user);
  await preencherQuemEVoce(user);
  await avancar(user);

  await escolherNaLista(user, C.campos.instituicao.rotulo, "USP");
  await escolher(user, rotuloDe(UNIDADES_USP, "POLI"));
  await user.type(screen.getByRole("combobox", { name: C.campos.curso.rotulo }), "eletrica");
  await user.keyboard("{Enter}");
  await escolherNaLista(user, C.campos.ano_atual.rotulo, "3");
  await escolherNaLista(user, C.campos.conclusao_prevista.rotulo, "2028");
  await avancar(user);

  await user.click(screen.getByRole("radio", { name: NIVEIS_AI[2].rotulo }));
  await user.click(screen.getByRole("checkbox", { name: "Claude" }));
  await escolher(user, rotuloDe(AI_ESTUDOS, "AS_VEZES"));
  await avancar(user);

  await escolher(user, rotuloDe(SITUACOES, "ESTAGIO"));
  await escolher(user, rotuloDe(AI_TRABALHO, "ACEITO"));
  await user.click(screen.getByRole("radio", { name: EMPREENDEDORISMO[1].rotulo }));
  await avancar(user);

  await escolher(user, rotuloDe(DISPONIBILIDADES, "DE_10_A_20H"));
  await escolherNaLista(user, C.campos.origem.rotulo, "LINKEDIN");
  await avancar(user);

  // O bloco 6 é só recomendado: atravessar sem indicar ninguém tem de chegar
  // ao ENVIAR. Deixar as três linhas em branco aqui é de propósito — é este
  // caminho que a maioria vai fazer, e é ele que não pode travar.
  await user.click(screen.getByRole("checkbox", { name: C.aceite.rotulo }));
}

describe("a abertura", () => {
  it("só oferece portas para o formulário, e o COMEÇAR leva ao primeiro bloco", async () => {
    render(<Formulario />);
    expect(titulo()).toBe(C.abertura.titulo);

    // A regra original era "um botão só: sem link para a home, sem link para a
    // tese, sem troca de idioma — a página tem uma função". Em 19/09/2026 a
    // abertura passou a explicar a trilha e ficou mais alta que a tela, e um
    // botão só, no topo, obrigaria quem leu tudo a rolar de volta para se
    // inscrever. Hoje são três, e a regra segue valendo no que importa: NENHUM
    // deles leva para fora. Dois abrem o formulário; o do meio só rola a tela.
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual([
      C.abertura.botao,
      C.abertura.convite,
      C.abertura.fecho.botao,
    ]);

    // O link do logo entrou em 04/09/2026, com o redesenho da abertura, e é a
    // única exceção àquela regra. Ele existe porque esta página é `noindex` e
    // ninguém chega nela navegando: sem ele, quem abre o link sem contexto não
    // tem como descobrir de quem ele é. É UM link, e ele leva ao site — não à
    // tese, não a uma troca de idioma.
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", URL_SITE);
    expect(links[0]).toHaveAccessibleName(C.abertura.voltarAoSite);

    await comecar(usuario());
    expect(titulo()).toBe(C.blocos[0].titulo);
  });

  it("a porta do fim da explicação leva ao mesmo lugar que o COMEÇAR", async () => {
    // Quem leu até o fim não rola de volta: o botão do fecho abre o mesmo bloco
    // 1, pelo mesmo caminho.
    render(<Formulario />);
    await usuario().click(screen.getByRole("button", { name: C.abertura.fecho.botao }));
    expect(titulo()).toBe(C.blocos[0].titulo);
  });

  it("o convite rola a tela e não tira ninguém da abertura", async () => {
    // "COMO FUNCIONA" é o único botão da abertura que não abre o formulário. Se
    // um dia ele for ligado por engano ao mesmo `aoComecar` dos outros dois, a
    // pessoa que só queria ler cai no bloco 1 — e é isso que este teste pega.
    render(<Formulario />);
    await usuario().click(screen.getByRole("button", { name: C.abertura.convite }));
    expect(titulo()).toBe(C.abertura.titulo);
  });

  it("explica a trilha com um título por seção, e nenhum deles disputa o h1", () => {
    // `titulo()` — e o leitor de tela — acham a tela pelo h1. As seções da
    // explicação são h2; os itens dentro delas, h3.
    render(<Formulario />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      C.abertura.porQue.titulo,
      C.abertura.frentes.titulo,
      C.abertura.ai.titulo,
      C.abertura.percurso.titulo,
    ]);
    for (const etapa of C.abertura.percurso.etapas) {
      expect(screen.getByRole("heading", { level: 3, name: etapa.titulo })).toBeInTheDocument();
    }
  });

  it("devolve o foco ao COMEÇAR quando alguém volta do primeiro bloco", async () => {
    // VOLTAR no bloco 1 leva de volta à abertura, e é o único caminho de volta
    // que existe: a barra de progresso só pula entre blocos. Quando a abertura
    // deixou de ser JSX solto dentro do `Formulario` e virou o componente
    // `Abertura`, o `ref` que o efeito de foco usa ficou para trás — o efeito
    // procurava o primeiro campo focável DENTRO da tela e não achava tela
    // nenhuma. O foco caía no `body`: quem usa teclado voltava e tinha de
    // atravessar a página inteira de novo para chegar ao COMEÇAR.
    const user = usuario();
    render(<Formulario />);
    await comecar(user);
    await user.click(screen.getByRole("button", { name: C.navegacao.voltar }));

    expect(titulo()).toBe(C.abertura.titulo);
    expect(screen.getByRole("button", { name: C.abertura.botao })).toHaveFocus();
  });

  it("não mostra progresso enquanto não há passo", () => {
    render(<Formulario />);
    expect(screen.queryByText(textoProgresso(1))).not.toBeInTheDocument();
  });
});

describe("a navegação entre blocos", () => {
  it("recusa avançar com o bloco em branco e leva o foco ao primeiro erro", async () => {
    const user = usuario();
    render(<Formulario />);
    await comecar(user);
    await avancar(user);

    expect(titulo(), "não pode ter saído do bloco").toBe(C.blocos[0].titulo);
    expect(campo(C.campos.nome.rotulo)).toHaveFocus();
    expect(screen.getAllByText(C.erros.faltaTexto).length).toBeGreaterThan(0);
  });

  it("não acusa erro antes de a pessoa pedir para avançar", async () => {
    const user = usuario();
    render(<Formulario />);
    await comecar(user);
    // Um e-mail é inválido nos primeiros oito caracteres de qualquer e-mail
    // válido; acusar isso enquanto se digita é hostil.
    await user.type(campo(C.campos.email.rotulo), "mar");

    expect(screen.queryByText(C.erros.email)).not.toBeInTheDocument();
  });

  it("some com o erro no instante em que o campo é corrigido", async () => {
    const user = usuario();
    render(<Formulario />);
    await comecar(user);
    await avancar(user);
    expect(screen.getAllByText(C.erros.faltaTexto).length).toBeGreaterThan(0);

    await user.type(campo(C.campos.nome.rotulo), "Maria");
    const restantes = screen.getAllByText(C.erros.faltaTexto);
    expect(
      restantes.every((p) => p.id !== "insc-nome-erro"),
      "o erro do nome tinha de sumir",
    ).toBe(true);
  });

  it("devolve o foco ao primeiro campo do bloco novo", async () => {
    const user = usuario();
    render(<Formulario />);
    await comecar(user);
    await preencherQuemEVoce(user);
    await avancar(user);

    expect(titulo()).toBe(C.blocos[1].titulo);
    expect(campo(C.campos.instituicao.rotulo)).toHaveFocus();
  });

  it("voltar não perde o que já foi preenchido", async () => {
    const user = usuario();
    render(<Formulario />);
    await comecar(user);
    await preencherQuemEVoce(user);
    await avancar(user);
    await user.click(screen.getByRole("button", { name: C.navegacao.voltar }));

    expect(titulo()).toBe(C.blocos[0].titulo);
    expect(campo(C.campos.nome.rotulo)).toHaveValue("Maria Clara de Souza Almeida");
    // `toHaveValue` era para o `<select>`; o campo agora é um botão de listbox
    // (`SelectLista`), e o que se vê é o RÓTULO do estado. O nome vem de
    // `ESTADOS` e não escrito à mão: assim o teste segue a lista se ela mudar.
    //
    // Comparação EXATA, e não `toHaveTextContent` com string solta: aquele
    // matcher é substring, e com ele o botão podia mostrar "São Paulo LIXO" que
    // o teste continuava verde — verificado.
    expect(campo(C.campos.estado.rotulo).textContent?.trim()).toBe(
      ESTADOS.find((e) => e.sigla === "SP")!.nome,
    );
  });

  it("mostra o passo atual e deixa voltar pelo passo já cumprido", async () => {
    const user = usuario();
    render(<Formulario />);
    await comecar(user);
    expect(screen.getByText(textoProgresso(1))).toBeInTheDocument();

    await preencherQuemEVoce(user);
    await avancar(user);
    expect(screen.getByText(textoProgresso(2))).toBeInTheDocument();

    // O segmento cumprido é um atalho para o bloco dele, igual ao VOLTAR.
    await user.click(screen.getByRole("button", { name: C.blocos[0].rotulo }));
    expect(titulo()).toBe(C.blocos[0].titulo);
    expect(campo(C.campos.nome.rotulo)).toHaveValue("Maria Clara de Souza Almeida");
  });

  it("no último bloco o botão deixa de dizer AVANÇAR", async () => {
    const user = usuario();
    render(<Formulario />);
    await atravessar(user);

    expect(screen.getByText(textoProgresso(TOTAL_BLOCOS))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: C.navegacao.enviar })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: C.navegacao.avancar })).not.toBeInTheDocument();
  });
});

describe("os campos condicionais", () => {
  it("abre o campo da unidade só para quem é da USP", async () => {
    const user = usuario();
    render(<Formulario />);
    await comecar(user);
    await preencherQuemEVoce(user);
    await avancar(user);

    expect(grupo(C.campos.unidade_usp.rotulo)).not.toBeInTheDocument();
    await escolherNaLista(user, C.campos.instituicao.rotulo, "USP");
    expect(grupo(C.campos.unidade_usp.rotulo)).toBeInTheDocument();

    await escolherNaLista(user, C.campos.instituicao.rotulo, "OUTRA");
    expect(grupo(C.campos.unidade_usp.rotulo)).not.toBeInTheDocument();
    expect(screen.getByLabelText(C.campos.instituicao_outra.rotulo)).toBeInTheDocument();
  });

  it("cada “Outro” da página abre um campo para escrever", async () => {
    // A regra que estes três guardam: escolher "Outro" e não poder dizer *qual*
    // grava uma linha que o painel não sabe ler. Antes de 21/08/2026 só a
    // instituição e o curso abriam campo; a unidade da USP, a situação e a
    // origem engoliam a resposta.
    const user = usuario();
    render(<Formulario />);
    await comecar(user);
    await preencherQuemEVoce(user);
    await avancar(user);

    await escolherNaLista(user, C.campos.instituicao.rotulo, "USP");
    expect(screen.queryByLabelText(C.campos.unidade_usp_outra.rotulo)).not.toBeInTheDocument();
    await escolher(user, rotuloDe(UNIDADES_USP, "OUTRA"));
    expect(screen.getByLabelText(C.campos.unidade_usp_outra.rotulo)).toBeInTheDocument();
    // Voltar para uma unidade da lista fecha o campo de novo.
    await escolher(user, rotuloDe(UNIDADES_USP, "POLI"));
    expect(screen.queryByLabelText(C.campos.unidade_usp_outra.rotulo)).not.toBeInTheDocument();
  });

  it("“Outro” na situação e na origem também abre campo", async () => {
    const user = usuario();
    render(<Formulario />);
    await atravessar(user);
    // A travessia para no bloco 6 (indicações). A origem mora no 5.
    await user.click(screen.getByRole("button", { name: C.navegacao.voltar }));

    // Com a origem em LinkedIn: escolher "Outro" ali abre o campo, e escolher
    // outra origem o fecha.
    expect(screen.queryByLabelText(C.campos.origem_outra.rotulo)).not.toBeInTheDocument();
    await escolherNaLista(user, C.campos.origem.rotulo, "OUTRO");
    expect(screen.getByLabelText(C.campos.origem_outra.rotulo)).toBeInTheDocument();
    await escolherNaLista(user, C.campos.origem.rotulo, "INSTAGRAM");
    expect(screen.queryByLabelText(C.campos.origem_outra.rotulo)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: C.navegacao.voltar }));
    expect(screen.queryByLabelText(C.campos.situacao_outra.rotulo)).not.toBeInTheDocument();
    await escolher(user, rotuloDe(SITUACOES, "OUTRO"));
    expect(screen.getByLabelText(C.campos.situacao_outra.rotulo)).toBeInTheDocument();
  });

  it("cobra o texto de quem escolheu “Outro” e deixou em branco", async () => {
    const user = usuario();
    render(<Formulario />);
    await atravessar(user);
    await user.click(screen.getByRole("button", { name: C.navegacao.voltar }));
    await escolherNaLista(user, C.campos.origem.rotulo, "OUTRO");
    // AVANÇAR e não ENVIAR desde que a origem deixou de ser o último bloco. O
    // que se testa é o mesmo: a validação do bloco barra a saída dele e põe o
    // foco no campo que falta.
    await user.click(screen.getByRole("button", { name: C.navegacao.avancar }));

    expect(screen.getByText(C.erros.origemOutra)).toBeInTheDocument();
    expect(campo(C.campos.origem_outra.rotulo)).toHaveFocus();
  });
});

describe("a idade escrita", () => {
  it("aceita só dígitos, e para em três", async () => {
    const user = usuario();
    render(<Formulario />);
    await comecar(user);
    await user.type(campo(C.campos.idade.rotulo), "vinte e 2 anos");
    expect(campo(C.campos.idade.rotulo), "letra nenhuma entra").toHaveValue("2");

    await user.clear(campo(C.campos.idade.rotulo));
    await user.type(campo(C.campos.idade.rotulo), "2004");
    // Três dígitos, e não dois: `2004` cortado em `20` seria uma idade
    // plausível e errada, gravada sem ninguém notar. `200` é visivelmente
    // impossível, e a mensagem embaixo explica o que houve.
    expect(campo(C.campos.idade.rotulo)).toHaveValue("200");
  });

  it("recusa o ano de nascimento com uma frase que ensina", async () => {
    const user = usuario();
    render(<Formulario />);
    await comecar(user);
    await user.type(campo(C.campos.nome.rotulo), "Maria Clara de Souza Almeida");
    await user.type(campo(C.campos.email.rotulo), "maria@exemplo.com");
    await user.type(campo(C.campos.whatsapp.rotulo), "11912345678");
    await user.type(campo(C.campos.idade.rotulo), "2004");
    await escolherNaLista(user, C.campos.estado.rotulo, "SP");
    await user.type(campo(C.campos.cidade.rotulo), "São Paulo");
    await avancar(user);

    expect(screen.getByText(C.erros.idade)).toBeInTheDocument();
    expect(campo(C.campos.idade.rotulo)).toHaveFocus();
    expect(screen.getByText(textoProgresso(1)), "não avançou").toBeInTheDocument();
  });
});

describe("AI no que se entrega", () => {
  it("é perguntado a quem só estuda também", async () => {
    // Era condicional a trabalhar. Quem só estudava passava direto, e a coluna
    // vinha vazia para essa fatia inteira — que também entrega monitoria,
    // iniciação e TCC.
    const user = usuario();
    render(<Formulario />);
    await comecar(user);
    await preencherQuemEVoce(user);
    await avancar(user);
    await escolherNaLista(user, C.campos.instituicao.rotulo, "Insper");
    await user.type(screen.getByRole("combobox", { name: C.campos.curso.rotulo }), "eletrica");
    await user.keyboard("{Enter}");
    await escolherNaLista(user, C.campos.ano_atual.rotulo, "3");
    await escolherNaLista(user, C.campos.conclusao_prevista.rotulo, "2028");
    await avancar(user);
    await user.click(screen.getByRole("radio", { name: NIVEIS_AI[2].rotulo }));
    await user.click(screen.getByRole("checkbox", { name: "Claude" }));
    await escolher(user, rotuloDe(AI_ESTUDOS, "AS_VEZES"));
    await avancar(user);

    // Antes de escolher qualquer situação a pergunta já está na tela.
    expect(grupo(C.campos.ai_trabalho.rotulo)).toBeInTheDocument();
    await escolher(user, rotuloDe(SITUACOES, "SO_ESTUDO"));
    expect(grupo(C.campos.ai_trabalho.rotulo)).toBeInTheDocument();

    // E é obrigatória: deixar em branco não passa.
    await user.click(screen.getByRole("radio", { name: EMPREENDEDORISMO[1].rotulo }));
    await avancar(user);
    expect(screen.getByText(C.erros.faltaEscolha)).toBeInTheDocument();

    await escolher(user, rotuloDe(AI_TRABALHO, "NAO_USO"));
    await avancar(user);
    // Responder `ai_trabalho` deixa sair do bloco: a prova é ter chegado ao
    // seguinte. Pelo RÓTULO do bloco e não por "é o último" — esta asserção
    // quebrava toda vez que o formulário ganhava um bloco no fim, sem ter nada
    // a ver com o que ela testa.
    expect(screen.getByText(C.blocos[4].rotulo)).toBeInTheDocument();
  });
});

describe("a máscara do WhatsApp", () => {
  it("veste o número enquanto a pessoa digita", async () => {
    const user = usuario();
    render(<Formulario />);
    await comecar(user);
    await user.type(campo(C.campos.whatsapp.rotulo), "11912345678");

    expect(campo(C.campos.whatsapp.rotulo)).toHaveValue("(11) 91234-5678");
  });

  it("deixa o backspace apagar por cima de um caractere da máscara", async () => {
    // Sem tratamento, apagar o ")" não muda dígito nenhum, o campo se
    // reescreve idêntico e o backspace fica preso.
    const user = usuario();
    render(<Formulario />);
    await comecar(user);
    await user.type(campo(C.campos.whatsapp.rotulo), "119");
    expect(campo(C.campos.whatsapp.rotulo)).toHaveValue("(11) 9");

    await user.type(campo(C.campos.whatsapp.rotulo), "{Backspace}");
    expect(
      campo(C.campos.whatsapp.rotulo),
      "o campo não pode se reescrever igual e prender o backspace",
    ).toHaveValue("(11");
  });

  it("aceita o número colado do WhatsApp, com o +55 na frente", async () => {
    // O caso real: o botão "copiar número" do WhatsApp entrega `+55 11
    // 91234-5678`, e este formulário é distribuído por WhatsApp. Enquanto a
    // máscara recortava em 11 dígitos antes de ver o código de país, o campo
    // mostrava `(55) 1191-23456` e o bloco acusava "falta o 9 do celular".
    for (const colado of ["+55 11 98765-4321", "+5511987654321"]) {
      const user = usuario();
      const { unmount } = render(<Formulario />);
      await comecar(user);
      await user.click(campo(C.campos.whatsapp.rotulo));
      await user.paste(colado);

      expect(campo(C.campos.whatsapp.rotulo), colado).toHaveValue("(11) 98765-4321");
      unmount();
    }
  });

  it("colado, o número do WhatsApp passa no bloco em vez de acusar erro", async () => {
    const user = usuario();
    render(<Formulario />);
    await comecar(user);
    await user.type(campo(C.campos.nome.rotulo), "Maria Clara de Souza Almeida");
    await user.type(campo(C.campos.email.rotulo), "maria@exemplo.com");
    await user.click(campo(C.campos.whatsapp.rotulo));
    await user.paste("+55 11 98765-4321");
    await user.type(campo(C.campos.idade.rotulo), "21");
    await escolherNaLista(user, C.campos.estado.rotulo, "SP");
    await user.type(campo(C.campos.cidade.rotulo), "São Paulo");
    await avancar(user);

    expect(
      screen.queryByText(C.erros.whatsappNove),
      "um número certo não pode ser acusado de faltar o 9",
    ).not.toBeInTheDocument();
    expect(screen.getByText(textoProgresso(2))).toBeInTheDocument();
  });

  it("não corta o 55 de Santa Maria: 11 dígitos são o número inteiro", async () => {
    const user = usuario();
    render(<Formulario />);
    await comecar(user);
    await user.click(campo(C.campos.whatsapp.rotulo));
    await user.paste("55 98765-4321");

    expect(campo(C.campos.whatsapp.rotulo), "55 aqui é DDD, não código de país").toHaveValue(
      "(55) 98765-4321",
    );
  });

  it("tira o código de país de um gaúcho sem tirar o DDD dele", async () => {
    const user = usuario();
    render(<Formulario />);
    await comecar(user);
    await user.click(campo(C.campos.whatsapp.rotulo));
    await user.paste("+55 55 98765-4321");

    expect(campo(C.campos.whatsapp.rotulo), "13 dígitos: o primeiro 55 é país").toHaveValue(
      "(55) 98765-4321",
    );
  });

  it("uma tecla a mais num campo cheio não troca o número do gaúcho por outro", async () => {
    // A regressão que este teste guarda: quando a regra do código de país
    // rodava também na digitação, `55987654321` + uma tecla virava 12 dígitos
    // começando em `55`, o `55` era lido como país e sobrava `(98) 7654-3211`
    // — DDD de São Luís, número válido, pessoa errada, troca em silêncio.
    // Digitar acrescenta um dígito por vez; colar traz o número inteiro. É essa
    // diferença que `digitosDoWhatsapp` usa para decidir, e é ela que este
    // teste cobra.
    const user = usuario();
    render(<Formulario />);
    await comecar(user);
    await user.click(campo(C.campos.whatsapp.rotulo));
    await user.paste("55 98765-4321");
    await user.type(campo(C.campos.whatsapp.rotulo), "1");

    expect(
      campo(C.campos.whatsapp.rotulo),
      "o dígito que não cabe é descartado, e o número continua o mesmo",
    ).toHaveValue("(55) 98765-4321");
  });
});

describe("o campo-armadilha", () => {
  it("existe, fora do teclado e fora do leitor de tela", async () => {
    const user = usuario();
    render(<Formulario />);
    await comecar(user);

    const armadilha = document.querySelector(`input[name="${CAMPO_HONEYPOT}"]`);
    expect(armadilha, "o honeypot precisa existir no HTML para o robô achar").not.toBeNull();
    expect(armadilha).toHaveAttribute("tabindex", "-1");
    expect(armadilha).toHaveAttribute("aria-hidden", "true");
    // Que ele fica FORA DA TELA é CSS (a classe `.armadilha`, absoluta a
    // -10000px) e só um navegador de verdade pode provar: o jsdom não aplica
    // CSS Module. O que se garante aqui é o resto do contrato.
  });
});

describe("o envio", () => {
  it("manda o formulário inteiro e mostra a confirmação", async () => {
    const chamadas: { url: string; corpo: Record<string, unknown> }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        chamadas.push({ url, corpo: JSON.parse(String(init.body)) as Record<string, unknown> });
        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true, atualizada: false, emailAtivo: false }),
        };
      }),
    );

    const user = usuario();
    render(<Formulario />);
    await atravessar(user);
    await user.click(screen.getByRole("button", { name: C.navegacao.enviar }));

    expect(chamadas).toHaveLength(1);
    expect(chamadas[0].url).toBe("/trilha/inscricao/api");

    const corpo = chamadas[0].corpo;
    // A chave do honeypot vai sempre, mesmo vazia — é ela que o servidor lê.
    expect(Object.keys(corpo)).toContain(CAMPO_HONEYPOT);
    // E a chave da conclusão vai sempre, porque é o que separa "já formei" de
    // "não respondi".
    expect(Object.keys(corpo)).toContain("conclusao_prevista");
    expect(corpo.whatsapp, "o WhatsApp vai só com dígitos").toBe("11912345678");
    expect(corpo.curso).toBe("Eng. Elétrica");

    expect(titulo()).toBe(confirmacaoDe({ atualizada: false, emailAtivo: false }).titulo);
    expect(screen.getByRole("link", { name: C.confirmacao.tese.botao })).toHaveAttribute(
      "href",
      C.confirmacao.tese.href,
    );
  });

  it("diz o que houve quando a rede falha, sem perder o preenchimento", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("offline"))));

    const user = usuario();
    render(<Formulario />);
    await atravessar(user);
    await user.click(screen.getByRole("button", { name: C.navegacao.enviar }));

    expect(screen.getByRole("alert")).toHaveTextContent(C.envio.rede);
    expect(screen.getByRole("button", { name: C.navegacao.enviar })).toBeEnabled();

    // O preenchimento continua lá, inclusive o dos blocos anteriores — que é o
    // que a pessoa perderia de mais caro. A disponibilidade mora no bloco 5.
    await user.click(screen.getByRole("button", { name: C.navegacao.voltar }));
    expect(
      screen.getByRole("radio", { name: rotuloDe(DISPONIBILIDADES, "DE_10_A_20H") }),
    ).toBeChecked();
  });

  it("o ENVIAR confere tudo antes de gastar uma viagem ao servidor", async () => {
    // Buraco de cobertura provado: apagando o `validarInscricao` que roda dentro
    // de `enviar()`, a suíte inteira continuava verde. Ele é o gate rápido —
    // sem ele um formulário inválido sai pela rede e volta como 400, gastando o
    // tempo de quem preencheu para dizer o que já dava para ver na tela.
    //
    // O caminho que chega ao último bloco com um campo ANTERIOR inválido é o
    // rascunho guardado: ele devolve a pessoa ao passo em que estava, e o seu
    // conteúdo é editável (é `sessionStorage`) e sobrevive a um deploy que mudou
    // as listas. Aqui o `estado` guardado não existe mais na lista.
    const fetchFalso = vi.fn();
    vi.stubGlobal("fetch", fetchFalso);

    const rascunho: Record<string, unknown> = {
      nome: "Maria Clara de Souza Almeida",
      email: "maria@usp.br",
      whatsapp: "11912345678",
      idade: "21",
      estado: "ZZ", // não existe na lista de estados
      cidade: "São Paulo",
      linkedin: "",
      instituicao: "USP",
      instituicao_outra: "",
      unidade_usp: "POLI",
      unidade_usp_outra: "",
      curso: CURSOS[0].id,
      curso_outro: "",
      ano_atual: "3",
      conclusao_prevista: "2028",
      premios: [""],
      nivel_ai: "2",
      ferramentas_ai: ["CLAUDE"],
      ai_estudos: "AS_VEZES",
      historia_ai: "",
      situacao: "ESTAGIO",
      situacao_outra: "",
      ai_trabalho: "ACEITO",
      empreendedorismo: "1",
      disponibilidade: "DE_10_A_20H",
      origem: "LINKEDIN",
      origem_quem_indicou: "",
      origem_outra: "",
      origem_detalhe: "",
      algo_mais: "",
      indicacoes: [
        { nome: "", linkedin: "" },
        { nome: "", linkedin: "" },
        { nome: "", linkedin: "" },
      ],
      aceite_dados: true,
    };
    window.sessionStorage.setItem(
      "202:inscricao",
      JSON.stringify({ v: 2, passo: TOTAL_BLOCOS - 1, rascunho }),
    );

    const user = usuario();
    render(<Formulario />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: C.navegacao.enviar })).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: C.navegacao.enviar }));

    // Nada saiu pela rede: o gate local barrou antes.
    expect(fetchFalso).not.toHaveBeenCalled();
    // E a pessoa foi levada de volta ao bloco onde o campo mora, com o erro.
    expect(titulo()).toBe(C.blocos[0].titulo);
    expect(screen.getByText(C.erros.opcaoDesconhecida)).toBeInTheDocument();
  });

  it("um 400 do servidor devolve a pessoa ao bloco do campo, com o erro ao lado", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 400,
        json: async () => ({ ok: false, erros: { email: C.erros.email } }),
      })),
    );

    const user = usuario();
    render(<Formulario />);
    await atravessar(user);
    await user.click(screen.getByRole("button", { name: C.navegacao.enviar }));

    expect(titulo(), "o erro mora no bloco 1, e é para lá que ela volta").toBe(C.blocos[0].titulo);
    expect(screen.getByText(C.erros.email)).toBeInTheDocument();
    // O `waitFor` é por causa do relógio do React, não por incerteza: o efeito
    // que entrega o foco é passivo e roda um tique depois do commit que já
    // pintou o bloco novo.
    await waitFor(() => expect(campo(C.campos.email.rotulo)).toHaveFocus());
  });

  // Prazo próprio, e não o padrão de 5s: este é o único teste do arquivo que
  // atravessa o formulário INTEIRO três vezes, uma por status. Quando o
  // formulário ganhou o sexto bloco em 01/09/2026 cada travessia ficou um bloco
  // mais longa, e o total passou de 5s por pouco — rodando sozinho ele cabia, na
  // suíte inteira não. Um teste que passa isolado e falha em conjunto é pior do
  // que um teste lento: some e volta conforme a máquina, e ninguém confia nele.
  // 8s contra os ~2,4s medidos: folga para uma máquina carregada, sem virar um
  // teto tão alto que uma regressão de quatro vezes no tempo passe despercebida.
  it("traduz cada recusa do servidor numa frase diferente", { timeout: 8_000 }, async () => {
    const casos: [number, string][] = [
      [429, C.envio.limite],
      [409, C.envio.encerrado],
      [500, C.envio.servidor],
    ];

    for (const [status, frase] of casos) {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => ({ ok: false, status, json: async () => ({ ok: false }) })),
      );
      const user = usuario();
      const tela = render(<Formulario />);
      await atravessar(user);
      await user.click(screen.getByRole("button", { name: C.navegacao.enviar }));

      expect(screen.getByRole("alert"), `status ${status}`).toHaveTextContent(frase);
      tela.unmount();
      window.sessionStorage.clear();
    }
  });
});

describe("o rascunho guardado", () => {
  it("devolve o preenchimento e o bloco depois de um recarregamento", async () => {
    const user = usuario();
    const tela = render(<Formulario />);

    await comecar(user);
    await preencherQuemEVoce(user);
    await avancar(user);
    // A espera é o debounce de verdade, com o relógio de verdade. Ele é curto
    // de propósito: precisa sobreviver a uma notificação que troca de app no
    // meio da digitação, e relógio falso aqui trava o `act` do RTL.
    await act(async () => {
      await new Promise((pronto) => setTimeout(pronto, 500));
    });

    tela.unmount();
    render(<Formulario />);

    expect(titulo(), "voltou para o bloco em que ela estava").toBe(C.blocos[1].titulo);
    await user.click(screen.getByRole("button", { name: C.navegacao.voltar }));
    expect(campo(C.campos.nome.rotulo)).toHaveValue("Maria Clara de Souza Almeida");
  });

  it("um rascunho corrompido começa limpo, em silêncio", () => {
    // A chave é fronteira com o navegador, não detalhe interno: ela é o que o
    // e2e vai semear e o que sobrevive a um recarregamento de verdade.
    window.sessionStorage.setItem("202:inscricao", "{isto não é JSON");
    render(<Formulario />);

    expect(titulo()).toBe(C.abertura.titulo);
  });
});
