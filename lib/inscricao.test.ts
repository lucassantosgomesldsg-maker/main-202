import { describe, expect, it } from "vitest";
import {
  AI_ESTUDOS,
  AI_TRABALHO,
  ANOS_ATUAIS,
  blocoDoCampo,
  confirmacaoDe,
  CONCLUSOES_PREVISTAS,
  contarCaracteres,
  digitosDoTelefone,
  COPY_INSCRICAO,
  CURSOS,
  DISPONIBILIDADES,
  EMPREENDEDORISMO,
  ESTADOS,
  FERRAMENTAS_AI,
  INSTITUICOES,
  LIMITES,
  NIVEIS_AI,
  ORIGENS,
  primeiroBlocoComErro,
  SITUACOES,
  TOTAL_BLOCOS,
  textoProgresso,
  UNIDADES_USP,
  validarInscricao,
  type Inscricao,
} from "./inscricao";

/**
 * Um payload completo e válido, novo a cada chamada.
 *
 * Novo a cada chamada de propósito: um objeto compartilhado entre testes
 * deixaria a ordem de execução mudar o resultado, que é o pior tipo de teste
 * quebrado — o que só falha na máquina de outra pessoa.
 */
function inscricaoValida(): Record<string, unknown> {
  return {
    nome: "Maria Clara de Souza Almeida",
    email: "maria@usp.br",
    whatsapp: "(11) 91234-5678",
    idade: 21,
    estado: "SP",
    cidade: "São Paulo",
    linkedin: "",
    instituicao: "USP",
    instituicao_outra: "",
    unidade_usp: "POLI",
    curso: "Eng. de Computação",
    curso_outro: "",
    ano_atual: "3",
    conclusao_prevista: 2028,
    premios: [],
    nivel_ai: 3,
    ferramentas_ai: ["CLAUDE", "CHATGPT"],
    ai_estudos: "QUASE_TODO_DIA",
    historia_ai: "",
    situacao: "ESTAGIO",
    ai_trabalho: "ACEITO",
    empreendedorismo: 2,
    disponibilidade: "DE_10_A_20H",
    origem: "INDICACAO",
    origem_quem_indicou: "João Pedro",
    origem_detalhe: "",
    algo_mais: "",
    aceite_dados: true,
  };
}

/** O payload válido com um punhado de campos trocados. */
function com(mudancas: Record<string, unknown>): Record<string, unknown> {
  return { ...inscricaoValida(), ...mudancas };
}

/** Atalho para "esta inscrição passa, e me devolve o valor normalizado". */
function valorDe(dados: Record<string, unknown>): Inscricao {
  const r = validarInscricao(dados);
  expect(r.erros, "esperava uma inscrição válida").toEqual({});
  expect(r.ok).toBe(true);
  expect(r.valor).toBeDefined();
  return r.valor as Inscricao;
}

/** Todas as strings de um objeto aninhado, com o caminho de cada uma. */
function todasAsStrings(valor: unknown, caminho: string): [string, string][] {
  if (typeof valor === "string") return [[caminho, valor]];
  if (Array.isArray(valor)) {
    return valor.flatMap((item, i) => todasAsStrings(item, `${caminho}[${i}]`));
  }
  if (typeof valor === "object" && valor !== null) {
    return Object.entries(valor).flatMap(([chave, item]) =>
      todasAsStrings(item, `${caminho}.${chave}`),
    );
  }
  return [];
}

const LISTAS_DE_TEXTO = {
  INSTITUICOES,
  UNIDADES_USP,
  CURSOS,
  ANOS_ATUAIS,
  FERRAMENTAS_AI,
  AI_ESTUDOS,
  SITUACOES,
  AI_TRABALHO,
  DISPONIBILIDADES,
  ORIGENS,
} as const;

describe("as listas da inscrição", () => {
  it("não repete id nem rótulo, e não deixa nenhum dos dois em branco", () => {
    // As listas são o que o Matheus edita à mão (spec §5). Um id duplicado faz
    // duas opções gravarem o mesmo valor sem ninguém perceber, e um rótulo
    // vazio vira uma linha em branco no meio do select.
    for (const [nome, lista] of Object.entries(LISTAS_DE_TEXTO)) {
      const ids = lista.map((o) => o.id);
      const rotulos = lista.map((o) => o.rotulo);
      expect(new Set(ids).size, `${nome} repete um id`).toBe(ids.length);
      expect(new Set(rotulos).size, `${nome} repete um rótulo`).toBe(rotulos.length);
      for (const opcao of lista) {
        expect(opcao.id.trim(), `${nome} tem id vazio`).not.toBe("");
        expect(opcao.rotulo.trim(), `${nome} tem rótulo vazio`).not.toBe("");
      }
    }

    // As listas que não são guardadas como texto seguem a mesma regra: rótulo
    // que se repete é rótulo que faz a pessoa escolher a opção errada.
    for (const [nome, rotulos] of [
      ["NIVEIS_AI", NIVEIS_AI.map((o) => o.rotulo)],
      ["EMPREENDEDORISMO", EMPREENDEDORISMO.map((o) => o.rotulo)],
      ["CONCLUSOES_PREVISTAS", CONCLUSOES_PREVISTAS.map((o) => o.rotulo)],
      ["ESTADOS", ESTADOS.map((e) => e.nome)],
    ] as const) {
      expect(new Set(rotulos).size, `${nome} repete um rótulo`).toBe(rotulos.length);
      for (const rotulo of rotulos) {
        expect(rotulo.trim(), `${nome} tem rótulo vazio`).not.toBe("");
      }
    }
  });

  it("põe `Outra` e `Outro` sempre no fim da lista", () => {
    // "Outro" no meio quebra a varredura visual e sugere que a lista acabou ali.
    for (const [nome, lista] of Object.entries(LISTAS_DE_TEXTO)) {
      lista.forEach((opcao, i) => {
        if (/^outr[ao]$/i.test(opcao.rotulo)) {
          expect(i, `${nome} tem "${opcao.rotulo}" fora do fim`).toBe(lista.length - 1);
        }
      });
    }
  });

  it("numera o nível de AI de 0 a 4 e a escada de empreendedorismo de 0 a 5", () => {
    // Os dois viram `smallint` no banco (§6.3), e a ordem é a informação: o BI
    // filtra "quem já teve receita" como `>= 4`. Um buraco ou um fora de ordem
    // aqui apaga essa possibilidade em silêncio.
    expect(NIVEIS_AI.map((n) => n.valor)).toEqual([0, 1, 2, 3, 4]);
    expect(EMPREENDEDORISMO.map((e) => e.valor)).toEqual([0, 1, 2, 3, 4, 5]);
    for (const lista of [NIVEIS_AI, EMPREENDEDORISMO]) {
      for (const degrau of lista) {
        expect(degrau.rotulo.trim()).not.toBe("");
      }
    }
  });

  it("traz as 27 UFs, ordenadas por nome", () => {
    // Por nome porque é assim que alguém procura o próprio estado. E 27 porque
    // faltar uma significa uma pessoa que não consegue se inscrever.
    expect(ESTADOS).toHaveLength(27);
    expect(new Set(ESTADOS.map((e) => e.sigla)).size).toBe(27);
    for (const estado of ESTADOS) {
      expect(estado.sigla, `${estado.nome} com sigla estranha`).toMatch(/^[A-Z]{2}$/);
    }
    const porNome = [...ESTADOS].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    expect(ESTADOS.map((e) => e.nome)).toEqual(porNome.map((e) => e.nome));
    expect(ESTADOS.map((e) => e.sigla)).toContain("DF");
  });

  it("oferece a engenharia sem sobrenome, e não só as habilitações", () => {
    // Quem está no ciclo básico da Poli ou da Unicamp ainda não tem
    // habilitação. Sem esta linha, essa pessoa era obrigada a escolher um curso
    // que não faz — ou a cair em `Outro` e digitar "Engenharia" à mão.
    const generica = CURSOS.find((c) => c.id === "Engenharia");
    expect(generica, "sumiu a Engenharia genérica").toBeDefined();
    expect(generica?.rotulo).toBe("Engenharia");

    // Ela convive com as específicas, e não as substitui.
    expect(CURSOS.filter((c) => c.id.startsWith("Eng. ")).length).toBeGreaterThan(5);
  });

  it("lista instituições e cursos em ordem alfabética, com a exceção no fim", () => {
    for (const [nome, lista] of [
      ["INSTITUICOES", INSTITUICOES],
      ["CURSOS", CURSOS],
    ] as const) {
      const semExcecao = lista.slice(0, -1).map((o) => o.rotulo);
      const ordenada = [...semExcecao].sort((a, b) => a.localeCompare(b, "pt-BR"));
      expect(semExcecao, `${nome} fora de ordem alfabética`).toEqual(ordenada);
    }
  });

  it("marca `Nenhuma dessas` como a única exclusiva, e no fim", () => {
    const exclusivas = FERRAMENTAS_AI.filter((f) => f.exclusiva === true);
    expect(exclusivas).toHaveLength(1);
    expect(exclusivas[0].id).toBe("NENHUMA");
    expect(FERRAMENTAS_AI[FERRAMENTAS_AI.length - 1].id).toBe("NENHUMA");
    expect(FERRAMENTAS_AI).toHaveLength(12);
  });

  it("escreve as unidades da USP na forma longa", () => {
    // Guarda a decisão de 20/08/2026 (§15.1 da spec, resolvida): "San Fran" e
    // "Med Pinheiros" são apelidos de quem já está dentro, e a página vai ser
    // aberta por gente de fora de São Paulo. Voltar à forma curta é uma
    // regressão, não uma simplificação.
    for (const unidade of UNIDADES_USP) {
      if (unidade.id === "OUTRA") continue;
      expect(unidade.rotulo, `${unidade.id} sem a forma longa`).toMatch(/\(.+\)$/);
    }
    expect(UNIDADES_USP.map((u) => u.rotulo)).toEqual([
      "POLI (Engenharia)",
      "Medicina (Pinheiros)",
      "FEA (Economia e Administração)",
      "San Fran (Direito)",
      "Outra",
    ]);
  });

  it("conta como trabalho tudo que não é `Só estudo`", () => {
    // É `trabalha` que decide se a pergunta de AI no trabalho aparece. A régua
    // larga é deliberada: perguntar a mais custa um clique, perguntar a menos
    // perde o dado mais informativo do formulário (§5.7).
    const naoTrabalha = SITUACOES.filter((s) => !s.trabalha).map((s) => s.id);
    expect(naoTrabalha).toEqual(["SO_ESTUDO"]);
  });

  it("guarda `null` como ano de conclusão de quem já se formou", () => {
    const anos = CONCLUSOES_PREVISTAS.filter((c) => c.valor !== null).map((c) => c.valor);
    expect(anos).toEqual([2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033]);
    const formei = CONCLUSOES_PREVISTAS[CONCLUSOES_PREVISTAS.length - 1];
    expect(formei.id).toBe("FORMEI");
    expect(formei.valor).toBeNull();
  });

  it("a idade é escrita, e a faixa aceita é larga o bastante para não recusar ninguém", () => {
    // A faixa é corretor de engano de digitação, não regra de elegibilidade:
    // por isso 14 e 99 passam, e o que ela precisa pegar é o ano de nascimento.
    expect(LIMITES.idadeMin).toBeLessThanOrEqual(16);
    expect(LIMITES.idadeMax).toBeGreaterThanOrEqual(60);
    expect(valorDe(com({ idade: "14" })).idade).toBe(14);
    expect(valorDe(com({ idade: "99" })).idade).toBe(99);
  });

  it("recusa o ano de nascimento, o texto e o quebrado no campo da idade", () => {
    const E = COPY_INSCRICAO.erros;
    for (const bruto of ["2004", "13", "100", "vinte e dois", "22 anos", "22,5", "22.5"]) {
      expect(validarInscricao({ ...inscricaoValida(), idade: bruto }).erros.idade, bruto).toBe(
        E.idade,
      );
    }
    // Vazio é outra mensagem: não é engano de digitação, é campo em branco.
    expect(validarInscricao({ ...inscricaoValida(), idade: "" }).erros.idade).toBe(E.faltaTexto);

    // Número também é aceito, e não só a string que a tela produz.
    expect(valorDe(com({ idade: 22 as unknown as string })).idade).toBe(22);
  });

  it("cobre do 1º ao 6º ano, mais trancado e já formado", () => {
    expect(ANOS_ATUAIS).toHaveLength(8);
    expect(ANOS_ATUAIS.map((a) => a.id).slice(-2)).toEqual(["TRANCADO", "FORMADO"]);
  });
});

describe("a copy da inscrição", () => {
  it("não tem nenhuma string vazia", () => {
    // Uma string vazia na copy vira um rótulo invisível, um botão sem texto ou
    // uma mensagem de erro em branco — e nada disso aparece em screenshot.
    for (const [caminho, texto] of todasAsStrings(COPY_INSCRICAO, "COPY_INSCRICAO")) {
      expect(texto.trim(), `${caminho} está vazio`).not.toBe("");
    }
  });

  it("não afirma o formato da trilha na abertura", () => {
    // Este teste guarda a decisão da §4.0: o formato (remoto, presencial,
    // duração, calendário) NÃO está fechado, e nada nesta página pode ser
    // desmentido depois. A tentação de "só acrescentar um detalhezinho" volta
    // toda semana, e é aqui que ela para.
    const abertura = todasAsStrings(COPY_INSCRICAO.abertura, "abertura")
      .map(([, texto]) => texto)
      .join(" ")
      .toLowerCase();
    for (const proibida of [
      "remoto",
      "presencial",
      "híbrido",
      "hibrido",
      "semanas",
      "meses",
      "duração",
      "duracao",
    ]) {
      expect(abertura, `a abertura afirma o formato ao dizer "${proibida}"`).not.toContain(
        proibida,
      );
    }
  });

  it("diz que é gratuita, e diz cedo", () => {
    // É a primeira dúvida de todo mundo, e dizer cedo eleva o valor percebido
    // em vez de baixar (§4.0). "Cedo" aqui é medido: nas três primeiras linhas.
    const inicio = COPY_INSCRICAO.abertura.linhas.slice(0, 3).join(" ").toLowerCase();
    expect(inicio).toContain("gratuita");
  });

  it("dá rótulo a todos os campos do formulário", () => {
    const valor = valorDe(inscricaoValida());
    for (const campo of Object.keys(valor) as (keyof Inscricao)[]) {
      expect(COPY_INSCRICAO.campos[campo], `${campo} sem copy`).toBeDefined();
      expect(COPY_INSCRICAO.campos[campo].rotulo.trim(), `${campo} sem rótulo`).not.toBe("");
    }
  });

  it("usa os exemplos que a spec escolheu a dedo", () => {
    // O exemplo faz mais pelo formato da resposta do que qualquer instrução
    // (§4.2). Trocar estes dois placeholders é decisão de copy, não de código.
    expect(COPY_INSCRICAO.campos.premios.placeholder).toBe("Medalha de ouro na OBMEP 2023");
    expect(COPY_INSCRICAO.campos.historia_ai.placeholder).toBe(
      "A coisa mais interessante que você já fez com AI.",
    );
  });

  it("pede nome completo no rótulo, e não em algum lugar do JSX", () => {
    const nome = COPY_INSCRICAO.campos.nome;
    expect(`${nome.rotulo} ${nome.ajuda ?? ""}`.toLowerCase()).toContain("apelido");
  });

  it("diz no aceite o que coleta, para que serve, e a linha dos menores", () => {
    const aceite = COPY_INSCRICAO.aceite;
    const texto = `${aceite.texto} ${aceite.rotulo}`.toLowerCase();
    expect(texto).toContain("terceiros");
    expect(texto).toContain("trilha");
    // A linha dos menores resolve a §15.2, por decisão de 20/08/2026.
    expect(aceite.menores.toLowerCase()).toContain("18");
  });

  it("não escreve data nenhuma na tela de inscrições encerradas", () => {
    // §9.4: data visível cria urgência real, mas vira mentira no dia em que o
    // prazo for estendido — e ele vai ser.
    const encerrado = todasAsStrings(COPY_INSCRICAO.encerrado, "encerrado")
      .map(([, texto]) => texto)
      .join(" ");
    expect(encerrado).not.toMatch(/\b20\d{2}\b/);
  });

  it("tem cinco blocos e escreve o progresso como `3 de 5`", () => {
    expect(TOTAL_BLOCOS).toBe(5);
    expect(COPY_INSCRICAO.blocos).toHaveLength(5);
    expect(textoProgresso(3)).toBe("3 de 5");
  });

  it("convida para a tese nas três telas de confirmação", () => {
    // A pessoa acabou de dizer que quer entrar: é o minuto de maior atenção que
    // a 202 vai ter dela (§4.7).
    expect(COPY_INSCRICAO.confirmacao.tese.href).toBe("/tese");
  });

  it("escolhe a tela de confirmação certa nas três situações", () => {
    const comEmail = confirmacaoDe({ atualizada: false, emailAtivo: true });
    const semEmail = confirmacaoDe({ atualizada: false, emailAtivo: false });
    const atualizada = confirmacaoDe({ atualizada: true, emailAtivo: true });

    // Com o e-mail desligado (§7), a tela não pode prometer e-mail nenhum.
    expect(semEmail.linhas.join(" ").toLowerCase()).not.toContain("mandamos um e-mail");
    expect(comEmail.linhas.join(" ").toLowerCase()).toContain("e-mail");
    // E a reinscrição nunca tem cara de erro: a pessoa fez tudo certo duas vezes.
    expect(atualizada.titulo.toLowerCase()).toContain("atualizamos");
    expect(atualizada.titulo.toLowerCase()).not.toContain("já se inscreveu");
    expect(atualizada).not.toBe(comEmail);
  });
});

describe("os blocos do formulário", () => {
  it("dá um bloco de 0 a 4 a cada campo de Inscricao", () => {
    // `blocoDoCampo` é o que devolve a pessoa ao lugar do erro depois de um 400
    // do servidor (§4.6). Um campo sem bloco viraria um erro que a interface
    // não sabe mostrar em lugar nenhum.
    const valor = valorDe(inscricaoValida());
    const campos = Object.keys(valor) as (keyof Inscricao)[];
    expect(campos).toHaveLength(31);
    for (const campo of campos) {
      const bloco = blocoDoCampo(campo);
      expect(Number.isInteger(bloco), `${campo} sem bloco`).toBe(true);
      expect(bloco, `${campo} fora dos cinco blocos`).toBeGreaterThanOrEqual(0);
      expect(bloco).toBeLessThan(TOTAL_BLOCOS);
    }
    // E os cinco blocos existem de verdade: nenhum deles ficou vazio.
    const usados = new Set(campos.map(blocoDoCampo));
    expect(usados.size).toBe(TOTAL_BLOCOS);
  });

  it("leva de volta ao primeiro bloco com erro, não ao último", () => {
    expect(primeiroBlocoComErro({})).toBeNull();
    expect(primeiroBlocoComErro({ aceite_dados: "x", email: "y" })).toBe(0);
    expect(primeiroBlocoComErro({ aceite_dados: "x", curso: "y" })).toBe(1);
    expect(primeiroBlocoComErro({ aceite_dados: "x" })).toBe(4);
  });
});

describe("a validação da inscrição", () => {
  it("aceita uma inscrição completa e devolve o valor normalizado", () => {
    const valor = valorDe(inscricaoValida());
    expect(valor.email).toBe("maria@usp.br");
    expect(valor.whatsapp).toBe("11912345678");
    expect(valor.aceite_dados).toBe(true);
  });

  it("não lança com nada que chegue no lugar de um objeto", () => {
    // Ela roda na Route Handler, contra um corpo que pode ser qualquer coisa.
    // Uma exceção aqui vira 500, e 500 é indistinguível de "o banco caiu" para
    // quem for ler o log depois.
    for (const lixo of [
      null,
      undefined,
      "texto",
      42,
      [],
      [1, 2, 3],
      true,
      { nome: 42, email: [], premios: "não é lista", ferramentas_ai: 7 },
      { ...inscricaoValida(), idade: {}, estado: [], aceite_dados: "true" },
    ]) {
      expect(() => validarInscricao(lixo), `lançou com ${JSON.stringify(lixo)}`).not.toThrow();
      const r = validarInscricao(lixo);
      expect(r.ok, `aceitou ${JSON.stringify(lixo)}`).toBe(false);
      expect(r.valor).toBeUndefined();
      expect(Object.keys(r.erros).length).toBeGreaterThan(0);
    }
  });

  it("reprova em todo campo obrigatório quando não chega nada", () => {
    // O corolário do teste acima: um payload vazio tem de produzir a mensagem
    // certa em cada campo, e não uma só. É isso que garante que nenhum
    // validador devolve "faltando" em silêncio.
    const r = validarInscricao({});
    expect(r.ok).toBe(false);
    for (const campo of [
      "nome",
      "email",
      "whatsapp",
      "idade",
      "estado",
      "cidade",
      "instituicao",
      "curso",
      "ano_atual",
      "conclusao_prevista",
      "nivel_ai",
      "ferramentas_ai",
      "ai_estudos",
      "situacao",
      "empreendedorismo",
      "disponibilidade",
      "origem",
      "aceite_dados",
    ] as (keyof Inscricao)[]) {
      expect(r.erros[campo], `${campo} passou em branco`).toBeTruthy();
    }
    // E o que é opcional continua opcional, mesmo no payload vazio.
    expect(r.erros.linkedin).toBeUndefined();
    expect(r.erros.premios).toBeUndefined();
    expect(r.erros.historia_ai).toBeUndefined();
    expect(r.erros.algo_mais).toBeUndefined();
  });

  it("ignora os campos que não são do formulário", () => {
    // O honeypot (§8) e qualquer sujeira que venha junto não podem virar erro,
    // e muito menos entrar no valor gravado.
    const valor = valorDe(
      com({ sobrenome_confirmacao: "", status: "sim", nota: "aprovado", id: 1 }),
    );
    expect(Object.keys(valor)).not.toContain("status");
    expect(Object.keys(valor)).not.toContain("nota");
    expect(Object.keys(valor)).not.toContain("id");
  });
});

describe("a normalização", () => {
  it("guarda o WhatsApp só com dígitos, venha como vier", () => {
    for (const escrito of [
      "(11) 91234-5678",
      "11 91234 5678",
      "11912345678",
      "+55 (11) 91234-5678",
      "5511912345678",
    ]) {
      expect(valorDe(com({ whatsapp: escrito })).whatsapp, escrito).toBe("11912345678");
    }
  });

  it("não confunde o DDD 55 com o código do país", () => {
    // 55 é Santa Maria (RS). Cortar os dois primeiros dígitos de um número de
    // 11 apagaria o telefone de um gaúcho inteiro.
    expect(valorDe(com({ whatsapp: "55912345678" })).whatsapp).toBe("55912345678");
    expect(valorDe(com({ whatsapp: "+55 55 91234-5678" })).whatsapp).toBe("55912345678");
  });

  it("aceita o número colado do próprio WhatsApp, com o +55 e do jeito que vier", () => {
    // Este formulário vai ser distribuído por WhatsApp, e o botão "copiar
    // número" de lá entrega `+55 11 91234-5678`. Antes de `digitosDoTelefone`
    // existir, a máscara do campo recortava em 11 dígitos ANTES de a validação
    // ver o `+55`: sobrava `55119123456` e o formulário acusava "falta o 9 do
    // celular" num número perfeitamente certo.
    for (const colado of [
      "+55 11 98765-4321",
      "+5511987654321",
      "55 11 98765 4321",
      "+55 (11) 98765-4321",
    ]) {
      expect(valorDe(com({ whatsapp: colado })).whatsapp, colado).toBe("11987654321");
    }
  });

  it("tira o 55 do telefone só quando ele só pode ser código de país", () => {
    // A regra inteira, sem passar pela validação: 12 e 13 dígitos são código de
    // país; 10 e 11 são o número inteiro, e ali o 55 da frente é DDD.
    expect(digitosDoTelefone("+55 11 98765-4321"), "13 dígitos, celular").toBe("11987654321");
    expect(digitosDoTelefone("+55 11 3333-4444"), "12 dígitos, fixo").toBe("1133334444");
    expect(digitosDoTelefone("+55 55 98765-4321"), "Santa Maria com código de país").toBe(
      "55987654321",
    );
    expect(digitosDoTelefone("55 98765-4321"), "Santa Maria, 11 dígitos").toBe("55987654321");
    expect(digitosDoTelefone("55 3333-4444"), "Santa Maria, fixo, 10 dígitos").toBe("5533334444");
    expect(digitosDoTelefone("11987654321"), "sem código de país").toBe("11987654321");
    expect(digitosDoTelefone("abacaxi"), "sem dígito nenhum").toBe("");
  });

  it("não trunca o telefone: quantos dígitos cabem é decisão de quem valida", () => {
    // Se `digitosDoTelefone` cortasse em 11, um número longo demais viraria um
    // número plausível e o erro "esse número tem dígitos demais" nunca
    // apareceria — a pessoa seria inscrita com um telefone que não existe.
    expect(digitosDoTelefone("11 91234-56789"), "12 dígitos que não começam em 55").toBe(
      "119123456789",
    );
    expect(validarInscricao(com({ whatsapp: "119123456789" })).erros.whatsapp).toBe(
      COPY_INSCRICAO.erros.whatsappLongo,
    );
  });

  it("guarda o e-mail em minúsculas e sem espaço nas pontas", () => {
    // A coluna é `citext` e é a chave da inscrição (§6.4): "Ana@Gmail.com" e
    // "ana@gmail.com" são a mesma pessoa, e duas formas seriam duas fichas.
    expect(valorDe(com({ email: "  Maria.Silva+Trilha@USP.BR  " })).email).toBe(
      "maria.silva+trilha@usp.br",
    );
  });

  it("transforma texto livre só com espaço em `null`, e não em string vazia", () => {
    // "respondeu em branco" e "não respondeu" são coisas diferentes no banco.
    const valor = valorDe(
      com({ historia_ai: "   ", algo_mais: "\n\t ", origem_detalhe: "  no evento  " }),
    );
    expect(valor.historia_ai).toBeNull();
    expect(valor.algo_mais).toBeNull();
    expect(valor.origem_detalhe).toBe("no evento");
  });

  it("tira os prêmios vazios e mantém a ordem dos que sobraram", () => {
    const valor = valorDe(
      com({ premios: ["  ", "Medalha de ouro na OBMEP 2023", "", "  IMC 2024 "] }),
    );
    expect(valor.premios).toEqual(["Medalha de ouro na OBMEP 2023", "IMC 2024"]);
  });

  it("guarda as ferramentas na ordem da lista, sem repetição", () => {
    // A mesma resposta tem de virar sempre a mesma linha: `text[]` com
    // permutações faz qualquer comparação entre duas fichas mentir.
    const valor = valorDe(com({ ferramentas_ai: ["PERPLEXITY", "CHATGPT", "CHATGPT"] }));
    expect(valor.ferramentas_ai).toEqual(["CHATGPT", "PERPLEXITY"]);
  });

  it("aceita o número que um `<select>` devolve como string", () => {
    const valor = valorDe(
      com({ idade: "21", nivel_ai: "3", empreendedorismo: "0", conclusao_prevista: "2028" }),
    );
    expect(valor.idade).toBe(21);
    expect(valor.nivel_ai).toBe(3);
    expect(valor.empreendedorismo).toBe(0);
    expect(valor.conclusao_prevista).toBe(2028);
  });

  it("aceita o degrau 0 como resposta, e não como campo vazio", () => {
    // `0` é falso em JavaScript, e "nunca usei" é uma resposta legítima. Este
    // teste existe porque a versão errada disso — `if (!nivel)` — parece certa.
    const valor = valorDe(com({ nivel_ai: 0, empreendedorismo: 0 }));
    expect(valor.nivel_ai).toBe(0);
    expect(valor.empreendedorismo).toBe(0);
  });

  it("aceita a sigla do estado em minúscula", () => {
    expect(valorDe(com({ estado: "sp" })).estado).toBe("SP");
  });
});

describe("o WhatsApp", () => {
  const DDDS_QUE_EXISTEM = [
    11, 12, 19, 21, 22, 24, 27, 28, 31, 35, 37, 38, 41, 46, 47, 49, 51, 53, 54, 55, 61,
    62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87,
    88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
  ];

  // Os buracos de verdade da numeração brasileira. A lista existe porque
  // "entre 11 e 99" deixaria todos eles passarem.
  const DDDS_QUE_NAO_EXISTEM = [
    10, 20, 23, 25, 26, 29, 30, 36, 39, 40, 50, 52, 56, 57, 58, 59, 60, 70, 72, 76, 78,
    80, 90,
  ];

  it("aceita todo DDD que existe", () => {
    for (const ddd of DDDS_QUE_EXISTEM) {
      const r = validarInscricao(com({ whatsapp: `${ddd}912345678` }));
      expect(r.erros.whatsapp, `recusou o DDD ${ddd}`).toBeUndefined();
    }
  });

  it("recusa os DDDs que nunca foram atribuídos", () => {
    for (const ddd of DDDS_QUE_NAO_EXISTEM) {
      const r = validarInscricao(com({ whatsapp: `${ddd}912345678` }));
      expect(r.erros.whatsapp, `aceitou o DDD ${ddd}, que não existe`).toBe(
        COPY_INSCRICAO.erros.whatsappDdd,
      );
    }
  });

  it("aceita fixo de 10 dígitos", () => {
    expect(valorDe(com({ whatsapp: "(11) 3333-4444" })).whatsapp).toBe("1133334444");
  });

  it("cobra o 9 do celular quando ele falta", () => {
    const E = COPY_INSCRICAO.erros;
    expect(validarInscricao(com({ whatsapp: "11 81234-5678" })).erros.whatsapp).toBe(
      E.whatsappNove,
    );
    expect(validarInscricao(com({ whatsapp: "11 9123-4567" })).erros.whatsapp).toBe(
      E.whatsappNove,
    );
  });

  it("diz que faltou o DDD, e não `número inválido`", () => {
    // A mensagem específica é o que deixa a pessoa consertar sozinha.
    expect(validarInscricao(com({ whatsapp: "912345678" })).erros.whatsapp).toBe(
      COPY_INSCRICAO.erros.whatsappCurto,
    );
  });

  it("recusa dígito a mais e campo vazio", () => {
    const E = COPY_INSCRICAO.erros;
    expect(validarInscricao(com({ whatsapp: "119123456789" })).erros.whatsapp).toBe(
      E.whatsappLongo,
    );
    expect(validarInscricao(com({ whatsapp: "   " })).erros.whatsapp).toBe(E.whatsappFalta);
    expect(validarInscricao(com({ whatsapp: "abacaxi" })).erros.whatsapp).toBe(
      E.whatsappCurto,
    );
  });
});

describe("o e-mail", () => {
  it("aceita o que é obviamente válido", () => {
    for (const email of [
      "a@b.co",
      "maria@usp.br",
      "maria.silva+trilha@alunos.usp.br",
      "joao_pedro@gmail.com",
      "maria-clara@sub.dominio.com.br",
    ]) {
      expect(validarInscricao(com({ email })).erros.email, email).toBeUndefined();
    }
  });

  it("recusa o que é obviamente inválido", () => {
    for (const email of [
      "maria",
      "maria@",
      "@usp.br",
      "maria@usp",
      "maria usp@br.com",
      "maria@@usp.br",
      "maria@usp..br",
      "maria@.br",
      "maria@usp.br.",
    ]) {
      expect(validarInscricao(com({ email })).erros.email, `aceitou "${email}"`).toBe(
        COPY_INSCRICAO.erros.email,
      );
    }
  });

  it("recusa endereço maior do que a RFC permite", () => {
    const gigante = `${"a".repeat(250)}@usp.br`;
    expect(validarInscricao(com({ email: gigante })).erros.email).toBe(
      COPY_INSCRICAO.erros.emailLongo,
    );
  });
});

describe("o LinkedIn", () => {
  it("reduz todas as formas a uma só", () => {
    const esperado = "https://www.linkedin.com/in/matheus-sterzin";
    for (const escrito of [
      "https://www.linkedin.com/in/matheus-sterzin",
      "http://linkedin.com/in/matheus-sterzin",
      "www.linkedin.com/in/matheus-sterzin/",
      "linkedin.com/in/matheus-sterzin",
      "https://br.linkedin.com/in/matheus-sterzin?originalSubdomain=br",
      "  matheus-sterzin  ",
    ]) {
      expect(valorDe(com({ linkedin: escrito })).linkedin, escrito).toBe(esperado);
    }
  });

  it("é opcional de verdade", () => {
    // Ele trava quem é de 1º ano e ainda não tem perfil (§4.1).
    expect(valorDe(com({ linkedin: "" })).linkedin).toBeNull();
    expect(valorDe(com({ linkedin: "   " })).linkedin).toBeNull();
    const semChave = com({});
    delete semChave.linkedin;
    expect(valorDe(semChave).linkedin).toBeNull();
  });

  it("recusa o que não é um perfil de pessoa", () => {
    for (const escrito of [
      "linkedin.com/company/202lab",
      "https://twitter.com/202lab",
      "ab",
      "não é link nenhum",
    ]) {
      expect(validarInscricao(com({ linkedin: escrito })).erros.linkedin, escrito).toBe(
        COPY_INSCRICAO.erros.linkedin,
      );
    }
  });
});

describe("as regras condicionais", () => {
  it("exige o nome da instituição quando a resposta é `Outra`", () => {
    const semTexto = com({ instituicao: "OUTRA", unidade_usp: "", instituicao_outra: "" });
    expect(validarInscricao(semTexto).erros.instituicao_outra).toBe(
      COPY_INSCRICAO.erros.instituicaoOutra,
    );

    const comTexto = com({ instituicao: "OUTRA", instituicao_outra: "UFRGS" });
    expect(valorDe(comTexto).instituicao_outra).toBe("UFRGS");
  });

  it("descarta o `qual instituição` de quem escolheu uma da lista", () => {
    // Descartado em silêncio, e não recusado: a interface guarda o que a pessoa
    // digitou enquanto ela troca de opção e volta, e transformar isso em erro
    // puniria uma hesitação.
    const valor = valorDe(com({ instituicao: "FGV", instituicao_outra: "UFRGS" }));
    expect(valor.instituicao).toBe("FGV");
    expect(valor.instituicao_outra).toBeNull();
    expect(valor.unidade_usp).toBeNull();
  });

  it("exige a unidade quando a instituição é a USP", () => {
    const sem = com({ unidade_usp: "" });
    expect(validarInscricao(sem).erros.unidade_usp).toBe(COPY_INSCRICAO.erros.unidadeUsp);
    expect(valorDe(com({ unidade_usp: "SAN_FRAN" })).unidade_usp).toBe("SAN_FRAN");
  });

  it("exige o nome do curso quando a resposta é `Outro`", () => {
    const sem = com({ curso: "OUTRO", curso_outro: "" });
    expect(validarInscricao(sem).erros.curso_outro).toBe(COPY_INSCRICAO.erros.cursoOutro);
    expect(valorDe(com({ curso: "OUTRO", curso_outro: "Música" })).curso_outro).toBe("Música");
  });

  it("exige o nome da unidade quando a unidade da USP é `Outra`", () => {
    const sem = com({ unidade_usp: "OUTRA", unidade_usp_outra: "" });
    expect(validarInscricao(sem).erros.unidade_usp_outra).toBe(
      COPY_INSCRICAO.erros.unidadeUspOutra,
    );
    expect(valorDe(com({ unidade_usp: "OUTRA", unidade_usp_outra: "IME" })).unidade_usp_outra).toBe(
      "IME",
    );

    // A cascata: sem USP não há unidade, e sem unidade não há o que cobrar.
    // Este é o caso que uma condição escrita em cima de `d.unidade_usp` — o
    // bruto — em vez do valor já validado deixaria passar como erro fantasma
    // num bloco que a pessoa nem viu.
    const outraFaculdade = valorDe(
      com({ instituicao: "FGV", unidade_usp: "OUTRA", unidade_usp_outra: "sobra" }),
    );
    expect(outraFaculdade.unidade_usp).toBeNull();
    expect(outraFaculdade.unidade_usp_outra).toBeNull();
  });

  it("exige a descrição da situação quando ela é `Outro`", () => {
    const sem = com({ situacao: "OUTRO", situacao_outra: "" });
    expect(validarInscricao(sem).erros.situacao_outra).toBe(COPY_INSCRICAO.erros.situacaoOutra);

    // `Outro` conta como trabalho, então `ai_trabalho` continua obrigatório —
    // as duas regras convivem no mesmo bloco sem se atrapalhar.
    const valor = valorDe(
      com({ situacao: "OUTRO", situacao_outra: "Monitoria remunerada", ai_trabalho: "ACEITO" }),
    );
    expect(valor.situacao_outra).toBe("Monitoria remunerada");
    expect(valor.ai_trabalho).toBe("ACEITO");

    expect(valorDe(com({ situacao: "ESTAGIO", situacao_outra: "sobra" })).situacao_outra).toBeNull();
  });

  it("exige onde foi quando a origem é `Outro`", () => {
    const sem = com({ origem: "OUTRO", origem_outra: "" });
    expect(validarInscricao(sem).erros.origem_outra).toBe(COPY_INSCRICAO.erros.origemOutra);

    // Os dois condicionais da origem nunca convivem: `origem_quem_indicou` é de
    // `INDICACAO` e `origem_outra` é de `OUTRO`.
    const valor = valorDe(com({ origem: "OUTRO", origem_outra: "Podcast", origem_quem_indicou: "sobra" }));
    expect(valor.origem_outra).toBe("Podcast");
    expect(valor.origem_quem_indicou).toBeNull();

    expect(valorDe(com({ origem: "LINKEDIN", origem_outra: "sobra" })).origem_outra).toBeNull();
  });

  it("exige quem indicou quando a origem é indicação", () => {
    const sem = com({ origem: "INDICACAO", origem_quem_indicou: "" });
    expect(validarInscricao(sem).erros.origem_quem_indicou).toBe(
      COPY_INSCRICAO.erros.quemIndicou,
    );
    expect(valorDe(com({ origem: "LINKEDIN", origem_quem_indicou: "sobra" })).origem_quem_indicou).toBeNull();
  });

  it("pergunta AI no que se entrega a todo mundo, inclusive a quem só estuda", () => {
    // A pergunta deixou de ser condicional em 21/08/2026. O que ela ganha é
    // exatamente o dado que a condição escondia: quem só estuda também entrega
    // — monitoria, iniciação, TCC — e antes essa coluna vinha vazia para todos.
    const E = COPY_INSCRICAO.erros;

    for (const situacao of ["SO_ESTUDO", "CLT_PJ", "PESQUISA"]) {
      expect(
        validarInscricao(com({ situacao, ai_trabalho: "" })).erros.ai_trabalho,
        situacao,
      ).toBe(E.faltaEscolha);
    }

    // E `SO_ESTUDO` com resposta deixou de ser erro: é o caso que a mudança
    // existe para atender.
    expect(valorDe(com({ situacao: "SO_ESTUDO", ai_trabalho: "CENTRAL" })).ai_trabalho).toBe(
      "CENTRAL",
    );
    expect(valorDe(com({ situacao: "PESQUISA", ai_trabalho: "IMPLANTEI" })).ai_trabalho).toBe(
      "IMPLANTEI",
    );
  });

  it("aceita `null` como ano de conclusão de quem já se formou", () => {
    expect(valorDe(com({ ano_atual: "FORMADO", conclusao_prevista: null })).conclusao_prevista)
      .toBeNull();
    expect(valorDe(com({ conclusao_prevista: "FORMEI" })).conclusao_prevista).toBeNull();
  });

  it("cobra a resposta quando a chave nem vem", () => {
    // É o que separa "já formei" de "não respondi": os dois virariam `null`.
    const sem = com({});
    delete sem.conclusao_prevista;
    expect(validarInscricao(sem).erros.conclusao_prevista).toBe(
      COPY_INSCRICAO.erros.conclusao,
    );
    expect(validarInscricao(com({ conclusao_prevista: 2050 })).erros.conclusao_prevista).toBe(
      COPY_INSCRICAO.erros.conclusao,
    );
  });

  it("recusa opção que não está na lista", () => {
    const E = COPY_INSCRICAO.erros;
    for (const [campo, valor] of [
      ["instituicao", "Harvard"],
      ["curso", "Feitiçaria"],
      ["ano_atual", "12"],
      ["ai_estudos", "TALVEZ"],
      ["situacao", "APOSENTADO"],
      ["disponibilidade", "24H_POR_DIA"],
      ["origem", "TELEPATIA"],
      ["estado", "XX"],
    ] as const) {
      const r = validarInscricao(com({ [campo]: valor }));
      expect(r.erros[campo], `aceitou ${campo}=${valor}`).toBe(E.opcaoDesconhecida);
    }
    // A idade saiu daqui: ela não vem mais de uma lista, e o que a recusa é a
    // faixa — coberta pelo teste do ano de nascimento lá em cima.
    expect(validarInscricao(com({ nivel_ai: 9 })).erros.nivel_ai).toBe(E.opcaoDesconhecida);
  });
});

describe("as ferramentas de AI", () => {
  it("exige pelo menos uma", () => {
    const E = COPY_INSCRICAO.erros;
    expect(validarInscricao(com({ ferramentas_ai: [] })).erros.ferramentas_ai).toBe(
      E.ferramentasVazio,
    );
    expect(validarInscricao(com({ ferramentas_ai: "CHATGPT" })).erros.ferramentas_ai).toBe(
      E.ferramentasVazio,
    );
  });

  it("trata `Nenhuma dessas` como exclusiva", () => {
    // Marcar a caixa desmarca as outras na interface, mas um payload montado à
    // mão chega com as duas coisas — e "nenhuma ferramenta + ChatGPT" no banco
    // é um dado que ninguém consegue interpretar depois.
    expect(
      validarInscricao(com({ ferramentas_ai: ["NENHUMA", "CHATGPT"] })).erros.ferramentas_ai,
    ).toBe(COPY_INSCRICAO.erros.ferramentasExclusiva);
    expect(valorDe(com({ ferramentas_ai: ["NENHUMA"] })).ferramentas_ai).toEqual(["NENHUMA"]);
  });

  it("recusa ferramenta que não está na lista", () => {
    expect(
      validarInscricao(com({ ferramentas_ai: ["CHATGPT", "CLIPPY"] })).erros.ferramentas_ai,
    ).toBe(COPY_INSCRICAO.erros.opcaoDesconhecida);
  });
});

describe("os limites", () => {
  it("conta caracteres como a pessoa conta", () => {
    // `"👋".length` é 2 em JavaScript. Um contador que desce dois por emoji
    // parece defeito, e a validação do servidor recusaria o que o contador do
    // navegador dizia caber.
    expect(contarCaracteres("abc")).toBe(3);
    expect(contarCaracteres("👋")).toBe(1);
  });

  it("recusa texto livre acima de 300", () => {
    const E = COPY_INSCRICAO.erros;
    const esperado = E.textoLongo.replace("{limite}", String(LIMITES.textoLivre));
    for (const campo of ["historia_ai", "origem_detalhe", "algo_mais"] as const) {
      const r = validarInscricao(com({ [campo]: "a".repeat(LIMITES.textoLivre + 1) }));
      expect(r.erros[campo], `${campo} passou do limite`).toBe(esperado);
      expect(
        validarInscricao(com({ [campo]: "a".repeat(LIMITES.textoLivre) })).erros[campo],
      ).toBeUndefined();
    }
  });

  it("recusa prêmio acima de 120 e lista acima de 8", () => {
    const E = COPY_INSCRICAO.erros;
    expect(
      validarInscricao(com({ premios: ["a".repeat(LIMITES.premio + 1)] })).erros.premios,
    ).toBe(E.premioLongo.replace("{limite}", String(LIMITES.premio)));

    const nove = Array.from({ length: LIMITES.maxPremios + 1 }, (_, i) => `Prêmio ${i}`);
    expect(validarInscricao(com({ premios: nove })).erros.premios).toBe(
      E.premiosDemais.replace("{limite}", String(LIMITES.maxPremios)),
    );

    // O teto conta depois de tirar os vazios: três campos em branco não podem
    // custar três vagas.
    const oitoComSobra = [...nove.slice(0, LIMITES.maxPremios), "  ", ""];
    expect(valorDe(com({ premios: oitoComSobra })).premios).toHaveLength(LIMITES.maxPremios);
  });

  it("recusa uma lista de prêmios que não é uma lista de textos", () => {
    const E = COPY_INSCRICAO.erros;
    expect(validarInscricao(com({ premios: "Medalha" })).erros.premios).toBe(E.premiosTipo);
    expect(validarInscricao(com({ premios: [1, 2] })).erros.premios).toBe(E.premiosTipo);
  });

  it("recusa nome e cidade grandes demais", () => {
    const esperado = COPY_INSCRICAO.erros.textoLongo.replace(
      "{limite}",
      String(LIMITES.textoCurto),
    );
    expect(validarInscricao(com({ nome: "a".repeat(121) })).erros.nome).toBe(esperado);
    expect(validarInscricao(com({ cidade: "a".repeat(121) })).erros.cidade).toBe(esperado);
  });
});

describe("o aceite de dados", () => {
  it("só passa com `true`, e reclama com mensagem própria", () => {
    const E = COPY_INSCRICAO.erros;
    for (const valor of [false, undefined, null, 0, "", "true", "false", 1]) {
      const r = validarInscricao(com({ aceite_dados: valor }));
      expect(r.erros.aceite_dados, `aceitou ${JSON.stringify(valor)}`).toBe(E.aceite);
    }
    expect(E.aceite).not.toBe(E.faltaEscolha);
    expect(valorDe(com({ aceite_dados: true })).aceite_dados).toBe(true);
  });
});
