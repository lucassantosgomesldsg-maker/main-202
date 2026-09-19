/**
 * A fundação da página /trilha/inscricao: as listas, a copy, os limites e a
 * validação.
 *
 * Vive num arquivo só, e não espalhado entre a página e a rota de API, por dois
 * motivos que se sustentam sozinhos.
 *
 * O primeiro é a regra do repo — **nenhum texto de marca no JSX**. Rótulo de
 * campo, placeholder, mensagem de erro e texto de botão são copy tanto quanto o
 * statement da /tese, e a spec (§5) diz explicitamente que o Matheus tem de
 * conseguir editar as opções sem abrir um `.tsx`. Se uma string visível nascer
 * dentro de um componente, ela some do alcance dele.
 *
 * O segundo é a **validação única**. `validarInscricao` roda no navegador,
 * antes de enviar, e roda de novo dentro da Route Handler, contra um payload
 * que pode ter vindo de qualquer lugar. São os mesmos limites e as mesmas
 * frases nos dois lados de propósito: duas cópias das regras divergem — sempre
 * divergem — e o defeito que isso produz é o pior tipo, o formulário que deixa
 * enviar e o servidor recusa sem dizer por quê. Por isso a função recebe
 * `unknown` e não um tipo já confiável: no servidor ela **não tem** um tipo
 * confiável para receber.
 *
 * Os `id` das opções são separados do rótulo visível onde o banco guarda algo
 * diferente do que a pessoa lê. Não é indireção gratuita: `nivel_ai` e
 * `empreendedorismo` são `smallint` no schema (§6.3), e as listas de frase
 * longa (situação, disponibilidade, AI no trabalho) viram token curto porque o
 * painel de BI agrupa por elas — consertar uma vírgula do rótulo não pode
 * reparticionar o gráfico da semana passada. Onde o schema manda guardar o
 * próprio nome (`instituicao`, `curso`), o `id` **é** o nome.
 */

/* ── Formas das opções ────────────────────────────────────────────────────── */

/** Uma opção guardada como texto: `id` vai para o banco, `rotulo` para a tela. */
export type Opcao = {
  readonly id: string;
  readonly rotulo: string;
};

/** Uma opção guardada como número (`smallint` no schema). A ordem é o dado. */
export type OpcaoNumerica = {
  readonly valor: number;
  readonly rotulo: string;
};

/** Uma ferramenta de AI. `exclusiva` marca a opção que anula todas as outras. */
export type Ferramenta = Opcao & {
  readonly exclusiva?: boolean;
};

/** Uma situação de hoje. `trabalha` é o que decide se `ai_trabalho` é perguntado. */
export type Situacao = Opcao & {
  readonly trabalha: boolean;
};

/** Uma UF. `sigla` é o que o banco guarda (`char(2)`), `nome` é o que se lê. */
export type Estado = {
  readonly sigla: string;
  readonly nome: string;
};

/** Ano de conclusão. `valor: null` é "já formei" — e `null` é o que vai ao banco. */
export type Conclusao = {
  readonly id: string;
  readonly valor: number | null;
  readonly rotulo: string;
};

/* ── §5.1 Instituições ────────────────────────────────────────────────────── */

/**
 * As nove, em ordem alfabética, mais `Outra`.
 *
 * Alfabética e não "por prestígio": a lista existe para ser varrida com o olho
 * em dois segundos, e qualquer outra ordem obriga a ler todas. O `id` é o
 * próprio nome porque o schema (§6.3) diz "um dos 9 ou `OUTRA`" — é essa coluna
 * que o BI agrupa, e ela fica legível no painel do Supabase sem tradução.
 */
export const INSTITUICOES: readonly Opcao[] = [
  { id: "FGV", rotulo: "FGV" },
  { id: "IME", rotulo: "IME" },
  { id: "Insper", rotulo: "Insper" },
  { id: "Inteli", rotulo: "Inteli" },
  { id: "ITA", rotulo: "ITA" },
  { id: "Link", rotulo: "Link" },
  { id: "Mackenzie", rotulo: "Mackenzie" },
  { id: "Unicamp", rotulo: "Unicamp" },
  { id: "Unifesp", rotulo: "Unifesp" },
  { id: "USP", rotulo: "USP" },
  { id: "OUTRA", rotulo: "Outra" },
] as const;

/* ── §5.2 Unidades da USP ─────────────────────────────────────────────────── */

/**
 * Só aparece quando a instituição é `USP`.
 *
 * Os rótulos estão na **forma longa** por decisão do Matheus de 20/08/2026, que
 * resolve a pergunta em aberto da §15.1 da spec. O motivo é o público: "San
 * Fran" e "Med Pinheiros" são apelidos que só funcionam para quem já está
 * dentro, e a página vai ser aberta por gente de fora de São Paulo. O apelido
 * fica na frente, que é como quem é de dentro procura; o curso entra entre
 * parênteses, para quem não é.
 *
 * O `id` é token curto e não o rótulo justamente porque o rótulo ainda pode
 * mudar de forma — trocar "(Economia e Administração)" por outra coisa não pode
 * partir a série histórica.
 */
export const UNIDADES_USP: readonly Opcao[] = [
  { id: "POLI", rotulo: "POLI (Engenharia)" },
  { id: "MEDICINA", rotulo: "Medicina (Pinheiros)" },
  { id: "FEA", rotulo: "FEA (Economia e Administração)" },
  { id: "SAN_FRAN", rotulo: "San Fran (Direito)" },
  { id: "OUTRA", rotulo: "Outra" },
] as const;

/* ── §5.3 Cursos ──────────────────────────────────────────────────────────── */

/**
 * Os cursos, em ordem alfabética, mais `Outro`.
 *
 * A lista é longa demais para um `select` cru — a spec pede busca por digitação
 * (§4.2), e duas letras já filtram. Como em `INSTITUICOES`, o `id` é o próprio
 * nome: é assim que o painel agrupa, e "Eng. de Produção" no gráfico vale mais
 * do que `ENG_PRODUCAO`.
 *
 * A §15.3 da spec anota que esta lista é rascunho e deve ser revista pelo
 * Matheus antes do go-live — em particular se Link e Inteli têm cursos com nome
 * próprio que não estão aqui. Nada no código depende de um item específico:
 * acrescentar uma linha aqui basta.
 */
export const CURSOS: readonly Opcao[] = [
  { id: "Administração", rotulo: "Administração" },
  { id: "Arquitetura e Urbanismo", rotulo: "Arquitetura e Urbanismo" },
  { id: "Biomedicina", rotulo: "Biomedicina" },
  { id: "Ciência da Computação", rotulo: "Ciência da Computação" },
  { id: "Ciência de Dados", rotulo: "Ciência de Dados" },
  { id: "Ciências Atuariais", rotulo: "Ciências Atuariais" },
  { id: "Ciências Contábeis", rotulo: "Ciências Contábeis" },
  { id: "Ciências Econômicas", rotulo: "Ciências Econômicas" },
  { id: "Ciências Sociais", rotulo: "Ciências Sociais" },
  { id: "Design", rotulo: "Design" },
  { id: "Direito", rotulo: "Direito" },
  { id: "Educação Física", rotulo: "Educação Física" },
  { id: "Enfermagem", rotulo: "Enfermagem" },
  { id: "Eng. Aeronáutica", rotulo: "Eng. Aeronáutica" },
  { id: "Eng. Ambiental", rotulo: "Eng. Ambiental" },
  { id: "Eng. Civil", rotulo: "Eng. Civil" },
  { id: "Eng. de Computação", rotulo: "Eng. de Computação" },
  { id: "Eng. de Controle e Automação", rotulo: "Eng. de Controle e Automação" },
  { id: "Eng. de Materiais", rotulo: "Eng. de Materiais" },
  { id: "Eng. de Produção", rotulo: "Eng. de Produção" },
  { id: "Eng. de Software", rotulo: "Eng. de Software" },
  { id: "Eng. Elétrica", rotulo: "Eng. Elétrica" },
  { id: "Eng. Mecânica", rotulo: "Eng. Mecânica" },
  { id: "Eng. Mecatrônica", rotulo: "Eng. Mecatrônica" },
  { id: "Eng. Naval", rotulo: "Eng. Naval" },
  { id: "Eng. Química", rotulo: "Eng. Química" },
  // A engenharia sem sobrenome, e não um esquecimento: quem entra no ciclo
  // básico da Poli ou da Unicamp ainda não tem habilitação, e as específicas
  // acima obrigariam essa pessoa a escolher um curso que ela não faz. Vem
  // depois de todas as `Eng. …` porque o ponto ordena antes da letra.
  { id: "Engenharia", rotulo: "Engenharia" },
  { id: "Estatística", rotulo: "Estatística" },
  { id: "Farmácia", rotulo: "Farmácia" },
  { id: "Física", rotulo: "Física" },
  { id: "Fisioterapia", rotulo: "Fisioterapia" },
  { id: "Geologia", rotulo: "Geologia" },
  { id: "Jornalismo", rotulo: "Jornalismo" },
  { id: "Letras", rotulo: "Letras" },
  { id: "Matemática", rotulo: "Matemática" },
  { id: "Matemática Aplicada", rotulo: "Matemática Aplicada" },
  { id: "Medicina", rotulo: "Medicina" },
  { id: "Medicina Veterinária", rotulo: "Medicina Veterinária" },
  { id: "Nutrição", rotulo: "Nutrição" },
  { id: "Odontologia", rotulo: "Odontologia" },
  { id: "Psicologia", rotulo: "Psicologia" },
  { id: "Publicidade e Propaganda", rotulo: "Publicidade e Propaganda" },
  { id: "Química", rotulo: "Química" },
  { id: "Relações Internacionais", rotulo: "Relações Internacionais" },
  { id: "Sistemas de Informação", rotulo: "Sistemas de Informação" },
  { id: "OUTRO", rotulo: "Outro" },
] as const;

/* ── §4.2 Ano atual e conclusão prevista ──────────────────────────────────── */

/**
 * O ano em que a pessoa está.
 *
 * `Trancado` e `Já formado` existem porque a pergunta seguinte (conclusão
 * prevista) precisa fazer sentido para os dois casos — e porque um formulário
 * que só oferece "1º a 6º" força quem trancou a mentir.
 */
export const ANOS_ATUAIS: readonly Opcao[] = [
  { id: "1", rotulo: "1º ano" },
  { id: "2", rotulo: "2º ano" },
  { id: "3", rotulo: "3º ano" },
  { id: "4", rotulo: "4º ano" },
  { id: "5", rotulo: "5º ano" },
  { id: "6", rotulo: "6º ano" },
  { id: "TRANCADO", rotulo: "Trancado" },
  { id: "FORMADO", rotulo: "Já formado" },
] as const;

/**
 * O ano de conclusão. É o único dos dois campos que não envelhece (§4.2).
 *
 * "Já formei" guarda `null`, e não um número sentinela como `0` ou `9999`:
 * `conclusao_prevista` é `smallint, null` no schema, e `null` é a única forma
 * de o painel calcular "média de anos até a formatura" sem filtrar lixo antes.
 * O `id` existe porque um `<select>` só devolve string — a interface manda o
 * `id`, e `validarInscricao` traduz para o `valor`.
 */
export const CONCLUSOES_PREVISTAS: readonly Conclusao[] = [
  { id: "2026", valor: 2026, rotulo: "2026" },
  { id: "2027", valor: 2027, rotulo: "2027" },
  { id: "2028", valor: 2028, rotulo: "2028" },
  { id: "2029", valor: 2029, rotulo: "2029" },
  { id: "2030", valor: 2030, rotulo: "2030" },
  { id: "2031", valor: 2031, rotulo: "2031" },
  { id: "2032", valor: 2032, rotulo: "2032" },
  { id: "2033", valor: 2033, rotulo: "2033" },
  { id: "FORMEI", valor: null, rotulo: "Já formei" },
] as const;

/* ── §5.4 Nível de AI ─────────────────────────────────────────────────────── */

/**
 * A escala de cinco degraus, guardada como `0`–`4`.
 *
 * Cada degrau é uma frase sobre o que a pessoa **faz**, e não um adjetivo:
 * "iniciante / intermediário / avançado" mede autoconfiança, e nota de 1 a 10
 * empilha metade das respostas no 7. O checklist de ferramentas (§5.5) serve de
 * contraprova — quem se declara no degrau 4 e marca só ChatGPT está dizendo
 * outra coisa.
 */
export const NIVEIS_AI: readonly OpcaoNumerica[] = [
  { valor: 0, rotulo: "Nunca usei, ou usei uma ou duas vezes" },
  { valor: 1, rotulo: "Uso de vez em quando, para tirar dúvida" },
  {
    valor: 2,
    rotulo:
      "Uso quase todo dia no estudo ou no trabalho, e sei escrever um bom prompt",
  },
  {
    valor: 3,
    rotulo:
      "Já construí algo com AI além do chat — automação, integração via API, agente, ou programo com AI dentro do editor",
  },
  {
    valor: 4,
    rotulo:
      "É o meu trabalho, ou perto disso — construo produto ou sistema com AI, ou levo isso para outras pessoas",
  },
] as const;

/* ── §5.5 Ferramentas de AI ───────────────────────────────────────────────── */

/**
 * Múltipla escolha, mínimo uma.
 *
 * `Nenhuma dessas` é **exclusiva**, e a exclusividade é validada aqui e não só
 * no clique: marcar a caixa desmarca as outras na interface, mas um payload
 * montado à mão pode chegar com as duas coisas, e "nenhuma ferramenta + ChatGPT"
 * no banco é um dado que ninguém consegue interpretar depois.
 *
 * O `id` é token curto porque esta coluna é `text[]` justamente para ser
 * agregada com `unnest` (§6.3) — o nome comercial de uma ferramenta muda, o
 * eixo do gráfico não pode mudar junto.
 */
export const FERRAMENTAS_AI: readonly Ferramenta[] = [
  { id: "CHATGPT", rotulo: "ChatGPT" },
  { id: "CLAUDE", rotulo: "Claude" },
  { id: "GEMINI", rotulo: "Gemini" },
  { id: "COPILOT", rotulo: "Copilot no editor" },
  { id: "EDITOR_AGENTE", rotulo: "Cursor / Windsurf / Claude Code" },
  { id: "AUTOMACAO", rotulo: "n8n / Make / Zapier com AI" },
  { id: "API", rotulo: "API da OpenAI, Anthropic ou Google" },
  { id: "IMAGEM", rotulo: "Geração de imagem (Midjourney, etc.)" },
  { id: "NOTEBOOKLM", rotulo: "NotebookLM" },
  { id: "PERPLEXITY", rotulo: "Perplexity" },
  { id: "PROPRIA", rotulo: "Alguma que eu mesmo construí" },
  { id: "NENHUMA", rotulo: "Nenhuma dessas", exclusiva: true },
] as const;

/* ── §4.3 AI nos estudos ──────────────────────────────────────────────────── */

/** Frequência, e não intensidade: é a pergunta que a pessoa sabe responder. */
export const AI_ESTUDOS: readonly Opcao[] = [
  { id: "NUNCA", rotulo: "Nunca" },
  { id: "AS_VEZES", rotulo: "Às vezes" },
  { id: "QUASE_TODO_DIA", rotulo: "Quase todo dia" },
  { id: "PRINCIPAL", rotulo: "É o meu principal jeito de estudar" },
] as const;

/* ── §5.6 Situação hoje ───────────────────────────────────────────────────── */

/**
 * O que a pessoa faz hoje, e se isso conta como trabalho.
 *
 * `trabalha` **já foi** o interruptor de `ai_trabalho` (§5.7). Desde 21/08/2026
 * não é mais: a pergunta sobre AI é feita a todo mundo, trabalhe ou não. A flag
 * fica como o que sempre foi por baixo — a classificação de cada situação — e é
 * dela que o painel tira "quantos inscritos já estão dentro de uma organização"
 * sem alguém recompor a lista à mão numa consulta. A régua é larga: só
 * `Só estudo` fica de fora, e iniciação científica entra porque tem orientador
 * esperando entrega.
 */
export const SITUACOES: readonly Situacao[] = [
  { id: "SO_ESTUDO", rotulo: "Só estudo", trabalha: false },
  { id: "ESTAGIO", rotulo: "Estágio", trabalha: true },
  { id: "CLT_PJ", rotulo: "CLT ou PJ", trabalha: true },
  { id: "FREELA", rotulo: "Freelancer", trabalha: true },
  { id: "PESQUISA", rotulo: "Iniciação científica ou pesquisa", trabalha: true },
  { id: "EMPRESA_PROPRIA", rotulo: "Tenho empresa própria", trabalha: true },
  { id: "OUTRO", rotulo: "Outro", trabalha: true },
] as const;

/* ── §5.7 AI no trabalho ──────────────────────────────────────────────────── */

/**
 * Perguntada a **todo mundo**, e diferente de "nível de AI" de propósito.
 *
 * Usar AI sob pressão de entrega, num lugar onde outra pessoa depende do
 * resultado, é outro dado — e o último degrau é o mais informativo do
 * formulário inteiro.
 *
 * Era condicional a trabalhar até 21/08/2026. Deixou de ser porque a condição
 * comprava um clique a menos e pagava com um buraco: quem só estuda também
 * entrega — monitoria, iniciação, trabalho de grupo, TCC — e o formulário não
 * tinha como saber disso. Os rótulos dizem "onde eu estou" e "meu time ou
 * grupo", e não "o time", justamente para caber nos dois casos sem obrigar
 * ninguém a traduzir a pergunta antes de responder.
 */
export const AI_TRABALHO: readonly Opcao[] = [
  { id: "NAO_USO", rotulo: "Não uso" },
  { id: "NAO_OFICIAL", rotulo: "Uso, mas não é oficial" },
  { id: "ACEITO", rotulo: "Uso, e é aceito onde eu estou" },
  { id: "CENTRAL", rotulo: "É central para o que eu entrego" },
  { id: "IMPLANTEI", rotulo: "Eu levei AI para o meu time ou grupo" },
] as const;

/* ── §5.8 Empreendedorismo ────────────────────────────────────────────────── */

/**
 * Uma escada, guardada como `0`–`5`, e a ordem é a informação.
 *
 * Cada degrau pressupõe o anterior — de "nunca pensei nisso" a "já levantei
 * investimento". É isso que deixa agrupar no BI sem inventar critério depois:
 * "quem já teve receita" é `>= 4`, e não uma lista de rótulos que alguém
 * recompõe à mão a cada consulta.
 */
export const EMPREENDEDORISMO: readonly OpcaoNumerica[] = [
  { valor: 0, rotulo: "Nunca pensei nisso" },
  { valor: 1, rotulo: "Já pensei, nunca tirei do papel" },
  { valor: 2, rotulo: "Já tentei algo que não foi para a frente" },
  { valor: 3, rotulo: "Tenho algo rodando hoje, ainda sem receita" },
  { valor: 4, rotulo: "Já tenho receita, com cliente pagante" },
  { valor: 5, rotulo: "Já levantei investimento" },
] as const;

/* ── §4.5 Disponibilidade ─────────────────────────────────────────────────── */

/**
 * Faixa, e não número.
 *
 * "10–20h" é uma resposta honesta; "14h" é chute com cara de precisão. E faixa
 * é um clique, o que importa num formulário que promete três minutos.
 */
export const DISPONIBILIDADES: readonly Opcao[] = [
  { id: "ATE_5H", rotulo: "Até 5h por semana" },
  { id: "DE_5_A_10H", rotulo: "5 a 10h por semana" },
  { id: "DE_10_A_20H", rotulo: "10 a 20h por semana" },
  { id: "DE_20_A_30H", rotulo: "20 a 30h por semana" },
  { id: "MAIS_DE_30H", rotulo: "Mais de 30h por semana" },
] as const;

/* ── §5.9 Como conheceu a 202 ─────────────────────────────────────────────── */

/**
 * `INDICACAO` abre o campo "quem te indicou".
 *
 * É a única informação do formulário que **só dá para coletar na hora**:
 * perguntar depois, na conversa, ninguém lembra. E é ela que mostra quais
 * pessoas estão trazendo outras.
 */
export const ORIGENS: readonly Opcao[] = [
  { id: "INDICACAO", rotulo: "Indicação de alguém" },
  { id: "LINKEDIN", rotulo: "LinkedIn" },
  { id: "INSTAGRAM", rotulo: "Instagram" },
  { id: "EVENTO", rotulo: "Evento ou palestra" },
  { id: "COMUNIDADE", rotulo: "Grupo ou comunidade" },
  { id: "JA_CONHECIA", rotulo: "Já conhecia a 202" },
  { id: "OUTRO", rotulo: "Outro" },
] as const;

/* ── §4.1 Estados e idade ─────────────────────────────────────────────────── */

/**
 * As 27 UFs, ordenadas por **nome** e não por sigla.
 *
 * Quem procura o próprio estado numa lista procura por "São Paulo", não por
 * "SP" — e uma lista ordenada por sigla joga o Amazonas (AM) na frente do Acre
 * (AC) invertido, Alagoas no meio dos Amapás, e obriga a ler as 27.
 */
export const ESTADOS: readonly Estado[] = [
  { sigla: "AC", nome: "Acre" },
  { sigla: "AL", nome: "Alagoas" },
  { sigla: "AP", nome: "Amapá" },
  { sigla: "AM", nome: "Amazonas" },
  { sigla: "BA", nome: "Bahia" },
  { sigla: "CE", nome: "Ceará" },
  { sigla: "DF", nome: "Distrito Federal" },
  { sigla: "ES", nome: "Espírito Santo" },
  { sigla: "GO", nome: "Goiás" },
  { sigla: "MA", nome: "Maranhão" },
  { sigla: "MT", nome: "Mato Grosso" },
  { sigla: "MS", nome: "Mato Grosso do Sul" },
  { sigla: "MG", nome: "Minas Gerais" },
  { sigla: "PA", nome: "Pará" },
  { sigla: "PB", nome: "Paraíba" },
  { sigla: "PR", nome: "Paraná" },
  { sigla: "PE", nome: "Pernambuco" },
  { sigla: "PI", nome: "Piauí" },
  { sigla: "RJ", nome: "Rio de Janeiro" },
  { sigla: "RN", nome: "Rio Grande do Norte" },
  { sigla: "RS", nome: "Rio Grande do Sul" },
  { sigla: "RO", nome: "Rondônia" },
  { sigla: "RR", nome: "Roraima" },
  { sigla: "SC", nome: "Santa Catarina" },
  { sigla: "SP", nome: "São Paulo" },
  { sigla: "SE", nome: "Sergipe" },
  { sigla: "TO", nome: "Tocantins" },
] as const;

/**
 * A idade é **escrita**, e não escolhida numa lista (decisão do Matheus de
 * 21/08/2026).
 *
 * O que se perde é o guarda-corpo do `<select>`, que só produzia número da
 * lista. O que se ganha é a idade de verdade: o `31+` de antes achatava todo
 * mundo acima de 30 num valor só, e o painel não conseguia distinguir quem tem
 * 31 de quem tem 45.
 *
 * A faixa aceita é larga de propósito — ela é um **corretor de engano de
 * digitação**, não uma regra de quem pode se inscrever. O erro clássico de
 * campo de idade é receber o ano de nascimento, e é isso que o teto de 99 pega.
 * Uma faixa apertada em cima da idade "esperada" recusaria gente real por não
 * caber num palpite nosso.
 */

/* ── O formulário preenchido ──────────────────────────────────────────────── */

/**
 * Exatamente o que o cliente envia como JSON, e exatamente as colunas graváveis
 * da §6.3.
 *
 * Os nomes são os das colunas, em `snake_case`, e não `camelCase` "de front".
 * A tradução entre os dois estilos teria de existir em algum lugar, e todo
 * lugar onde ela existisse seria um lugar onde alguém erraria um campo sem o
 * compilador perceber — o objeto validado vai direto para o corpo do `POST` do
 * Supabase.
 *
 * As colunas que o cliente **não** escreve ficam de fora de propósito: `id`,
 * `criado_em`, `atualizado_em`, `aceite_em`, `ip_hash` são do servidor, e
 * `status`, `nota` e `avaliado_em` são da fase 2. Se alguma delas aparecesse
 * aqui, um payload malicioso poderia se autoavaliar como `sim`.
 */
/**
 * Uma pessoa indicada: quem é, e onde ela está.
 *
 * Os dois campos juntos e não duas listas paralelas (`nomes[]` + `links[]`)
 * porque paralelismo é uma promessa que nada garante — bastaria uma lista
 * chegar com um item a menos, de um rascunho velho ou de um POST torto, para o
 * nome de uma pessoa colar no LinkedIn de outra. Aqui o par nasce junto e não
 * tem como desalinhar.
 *
 * `linkedin` é sempre a URL completa normalizada por `normalizarLinkedin` —
 * mesmo tratamento do `linkedin` de quem se inscreve, pelo mesmo motivo: é ela
 * que se clica no painel.
 */
export type Indicacao = {
  readonly nome: string;
  readonly linkedin: string;
};

export type Inscricao = {
  readonly nome: string;
  readonly email: string;
  /** Só dígitos, 10 ou 11. A máscara é coisa da interface (§6.3). */
  readonly whatsapp: string;
  /** A idade em anos, escrita pela pessoa. Inteira, entre `idadeMin` e `idadeMax`. */
  readonly idade: number;
  readonly estado: string;
  readonly cidade: string;
  readonly linkedin: string | null;
  readonly instituicao: string;
  readonly instituicao_outra: string | null;
  readonly unidade_usp: string | null;
  readonly unidade_usp_outra: string | null;
  readonly curso: string;
  readonly curso_outro: string | null;
  readonly ano_atual: string;
  /**
   * `null` = já formado. A chave precisa **existir** no payload mesmo assim —
   * é o que separa "já formei" de "não respondi" (ver `validarInscricao`).
   */
  readonly conclusao_prevista: number | null;
  /** `[]` quando não há nenhum. Não existe "nenhum ainda" para marcar (§4.2). */
  readonly premios: readonly string[];
  readonly nivel_ai: number;
  readonly ferramentas_ai: readonly string[];
  readonly ai_estudos: string;
  readonly historia_ai: string | null;
  readonly situacao: string;
  readonly situacao_outra: string | null;
  /** Sempre respondido: a pergunta não depende mais de a pessoa trabalhar. */
  readonly ai_trabalho: string;
  readonly empreendedorismo: number;
  readonly disponibilidade: string;
  readonly origem: string;
  readonly origem_quem_indicou: string | null;
  readonly origem_outra: string | null;
  readonly origem_detalhe: string | null;
  readonly algo_mais: string | null;
  /**
   * Até três pessoas indicadas. `[]` quando ninguém foi indicado — o campo é
   * recomendado, nunca obrigatório (§4.6).
   *
   * Entrada pela metade não chega aqui: ou o par tem nome e LinkedIn, ou a
   * validação o descarta (os dois em branco) ou recusa (só um preenchido).
   */
  readonly indicacoes: readonly Indicacao[];
  /** Sempre `true` quando a validação passa. A coluna existe para registrar (§8). */
  readonly aceite_dados: boolean;
};

/** O resultado da validação. Chave = nome do campo, valor = mensagem em PT. */
export type ErrosInscricao = Partial<Record<keyof Inscricao, string>>;

/* ── Limites ──────────────────────────────────────────────────────────────── */

/**
 * Os limites, num lugar só.
 *
 * O contador é quem impede o textão — pedir "seja breve" não funciona (§4.8).
 * O teto de 8 prêmios não existe para limitar quem tem muitos: quem tem 8 já
 * disse tudo que precisa para ser lido por um humano.
 *
 * **`textoLivre` foi de 300 para 500 em 01/09/2026.** A spec §4.8 fechou em 300
 * com o argumento de que 300 basta para uma coisa boa e não dá para uma
 * redação. O número subiu por decisão de produto: o campo que mais sofria era
 * "a sua história com AI", onde 300 obriga a cortar justamente o final — o
 * resultado. O que **não** mudou é o mecanismo: o contador continua visível,
 * continua acendendo perto do fim, e continua sendo ele, e não um `maxLength`,
 * quem segura. Este único número governa `historia_ai`, `origem_detalhe` e
 * `algo_mais` — mexer aqui mexe nos três, que é a intenção.
 *
 * `textoCurto` cobre nome, cidade e "quem te indicou". Não vem da spec: vem de
 * que campo de texto sem teto é campo de texto que um robô enche com 40 KB.
 *
 * `maxIndicacoes` é 3 porque a pergunta pede três (§4.6). Não é "até 8, mas
 * mostramos 3": a tela desenha exatamente três pares, e o teto aqui existe para
 * que um POST fora da tela não consiga mandar trinta.
 */
export const LIMITES = {
  textoLivre: 500,
  premio: 120,
  maxPremios: 8,
  maxIndicacoes: 3,
  textoCurto: 120,
  idadeMin: 14,
  idadeMax: 99,
} as const;

/**
 * Conta caracteres do jeito que a pessoa conta.
 *
 * `"👋".length` é 2 em JavaScript, porque a string é medida em unidades UTF-16.
 * Um contador que desce dando dois passos por emoji parece defeito — e,
 * pior, a validação do servidor recusaria um texto que o contador do navegador
 * dizia caber. Esta função é exportada exatamente para que a interface e a
 * validação contem a mesma coisa. Ela ainda não junta cluster de grafema
 * (bandeira, família), mas erra do lado generoso e não do lado que recusa.
 */
export function contarCaracteres(texto: string): number {
  return Array.from(texto).length;
}

/* ── A copy ───────────────────────────────────────────────────────────────── */

/** Um campo na tela: rótulo sempre, ajuda e placeholder quando acrescentam algo. */
export type CopyCampo = {
  readonly rotulo: string;
  readonly ajuda?: string;
  readonly placeholder?: string;
};

/** Uma tela de fim de percurso: título e algumas linhas. */
export type TelaCopy = {
  readonly titulo: string;
  readonly linhas: readonly string[];
};

/** Uma seção de texto corrido da abertura: rótulo, título e parágrafos. */
export type SecaoAbertura = {
  readonly rotulo: string;
  readonly titulo: string;
  readonly texto: readonly string[];
};

/** Tudo que a página /trilha/inscricao diz. */
export type CopyInscricao = {
  readonly rotuloPagina: string;
  readonly tituloAba: string;
  readonly abertura: {
    readonly rotulo: string;
    readonly titulo: string;
    readonly voltarAoSite: string;
    /** O que se lê no cartaz, ao lado do COMEÇAR. `linhas[1]` é a descrição da página. */
    readonly linhas: readonly string[];
    /** Os fatos do cartaz: o que cabe num par rótulo–valor. */
    readonly dados: readonly { readonly rotulo: string; readonly valor: string }[];
    readonly botao: string;
    /** O botão do pé do cartaz, que rola até a explicação. */
    readonly convite: string;
    readonly porQue: SecaoAbertura;
    readonly frentes: {
      readonly rotulo: string;
      readonly titulo: string;
      readonly itens: readonly {
        readonly tag: string;
        readonly titulo: string;
        readonly texto: string;
      }[];
      readonly ligacao: string;
    };
    readonly ai: SecaoAbertura;
    readonly percurso: {
      readonly rotulo: string;
      readonly titulo: string;
      readonly etapas: readonly { readonly titulo: string; readonly texto: string }[];
    };
    readonly fecho: {
      readonly texto: string;
      readonly botao: string;
    };
  };
  readonly blocos: readonly {
    readonly rotulo: string;
    readonly titulo: string;
  }[];
  readonly progresso: {
    readonly formato: string;
    readonly rotulo: string;
  };
  readonly navegacao: {
    readonly voltar: string;
    readonly avancar: string;
    readonly enviar: string;
    readonly enviando: string;
  };
  readonly campos: Record<keyof Inscricao, CopyCampo>;
  readonly premios: {
    readonly adicionar: string;
    readonly remover: string;
    readonly rotuloItem: string;
  };
  readonly indicacoes: {
    readonly rotuloItem: string;
    readonly nome: string;
    readonly linkedin: string;
    readonly placeholderNome: string;
    readonly placeholderLinkedin: string;
  };
  readonly contador: string;
  /**
   * O nome que o leitor de tela dá à lista aberta de um campo de escolha.
   *
   * Existe porque uma `listbox` sem nome é anunciada como "lista" seca, e a
   * pessoa não sabe de qual campo ela é — o `<select>` nativo herdava o rótulo
   * de graça, e substituí-lo perdeu isso.
   *
   * O sufixo não é enfeite: o nome da lista precisa ser DIFERENTE do nome do
   * campo. Iguais, qualquer busca por rótulo — a de um teste ou a de uma
   * extensão de acessibilidade — acha dois elementos para uma pergunta só, e
   * não tem como saber qual é o controle.
   */
  readonly listaDeOpcoes: string;
  readonly opcional: string;
  readonly aceite: {
    readonly rotulo: string;
    readonly texto: string;
    readonly menores: string;
  };
  readonly confirmacao: {
    readonly rotulo: string;
    readonly comEmail: TelaCopy;
    readonly semEmail: TelaCopy;
    readonly atualizada: TelaCopy;
    readonly tese: {
      readonly convite: string;
      readonly botao: string;
      readonly href: string;
    };
  };
  readonly encerrado: {
    readonly rotulo: string;
    readonly titulo: string;
    readonly linhas: readonly string[];
  };
  readonly envio: {
    readonly rede: string;
    readonly servidor: string;
    readonly invalido: string;
    readonly limite: string;
    readonly encerrado: string;
  };
  readonly erros: {
    readonly faltaTexto: string;
    readonly faltaEscolha: string;
    readonly opcaoDesconhecida: string;
    readonly textoLongo: string;
    readonly email: string;
    readonly emailLongo: string;
    readonly whatsappFalta: string;
    readonly whatsappCurto: string;
    readonly whatsappLongo: string;
    readonly whatsappDdd: string;
    readonly whatsappNove: string;
    readonly linkedin: string;
    readonly idade: string;
    readonly instituicaoOutra: string;
    readonly unidadeUsp: string;
    readonly unidadeUspOutra: string;
    readonly cursoOutro: string;
    readonly conclusao: string;
    readonly premiosTipo: string;
    readonly premioLongo: string;
    readonly premiosDemais: string;
    readonly indicacoesTipo: string;
    readonly indicacaoIncompleta: string;
    readonly indicacaoLinkedin: string;
    readonly indicacaoNomeLongo: string;
    readonly indicacoesDemais: string;
    readonly ferramentasVazio: string;
    readonly ferramentasExclusiva: string;
    readonly situacaoOutra: string;
    readonly quemIndicou: string;
    readonly origemOutra: string;
    readonly aceite: string;
  };
};

/**
 * A copy inteira da página.
 *
 * Só PT — esta é a primeira página monolíngue do site (spec §2), então não há o
 * par `{pt, en}` de `lib/tese.ts` nem seletor de idioma. O objeto é um só, com
 * `as const satisfies` pelo mesmo motivo de lá: `as const` trava os literais e
 * `satisfies` confere contra o tipo sem alargar. O `Record<keyof Inscricao,
 * CopyCampo>` de `campos` é o que garante, em tempo de compilação, que nenhum
 * campo do formulário chegue à tela sem rótulo.
 *
 * **Sobre a abertura (§4.0).** Ela teve quatro formas. Nasceu descrevendo a
 * trilha em quatro linhas; em 24/08/2026 o Matheus a cortou para duas que não
 * descreviam nada ("Retornaremos com mais informações em um futuro breve");
 * em 19/09/2026, com a trilha desenhada, o Pedro pediu o contrário: que a tela
 * explique como a trilha funciona, e escreveu seis parágrafos. No mesmo dia o
 * Matheus revisou essa copy em três direções, e é a forma que está aqui:
 *
 * - **Voz de startup, e não de mercado corporativo.** A primeira condensação
 *   falava em "liderar projetos", "posições de destaque", "ferramentas
 *   modernas de forma estratégica". A trilha forma builders AI-native para
 *   startups, produtos e tecnologia, e a página diz isso com as palavras da
 *   tese do site.
 * - **A prática descrita como ela é.** Não há "demandas reais de empresas
 *   parceiras": as práticas são fixas e iguais para todo mundo, feitas numa
 *   pasta da própria pessoa, corrigidas por um agente do Claude contra
 *   critérios definidos antes, com feedback ponto a ponto. A fonte é o
 *   repositório da trilha (`~/orca/trilha`, `MAPA-DE-CONTEUDO.md` e o
 *   `README.md` que o aluno recebe), não o texto do Pedro.
 * - **Menos travessão e menos frase de AI.** Nenhum travessão dentro da copy,
 *   e o padrão "não é X, é Y" saiu da cadeia de títulos.
 *
 * Para quem for mexer:
 *
 * - **Duração e início são previsão, e a copy diz isso** ("cerca de", "previsto").
 *   É como o Pedro os passou. `lib/inscricao.test.ts` guarda a ressalva.
 * - **A modalidade segue em aberto.** Ninguém disse se há encontro presencial,
 *   então a página não diz "remoto" nem "presencial" — o teste de palavras
 *   proibidas continua lá, só mais curto.
 * - **As ressalvas do que vem depois ficam.** "Pode ser convidado", "pode
 *   apresentar". Ninguém prometeu vaga nem contratação, e a página também não.
 *   Quem encurtar uma frase daqui confere se não cortou justamente o "pode".
 * - **O que a página afirma sobre o funcionamento** (o Claude é o professor,
 *   uma aula por conversa de cerca de uma hora, prática corrigida por outro
 *   Claude com critérios prévios, a oficina que acumula, a 202 acompanha) está
 *   no `README.md` da trilha, que é público. A lista das práticas segue o mapa
 *   de conteúdo de 19/09; se o mapa mudar, ela muda junto.
 * - **"AI", e não "IA".** O site inteiro (a tese, o bloco 3 deste formulário)
 *   usa "AI", e uma página não troca de grafia no meio.
 *
 * A gratuidade, que a primeira forma afirmava, **não voltou**: ninguém a
 * reafirmou. Carga horária diária e critério de seleção também não estão na
 * página: existem no planejamento, mas ninguém os fechou para o público.
 */
const copy = {
  rotuloPagina: "A TRILHA · INSCRIÇÃO",
  tituloAba: "202Lab — A TRILHA",

  abertura: {
    rotulo: "A TRILHA · INSCRIÇÃO",
    titulo: "A próxima trilha da 202",
    /**
     * O nome do link do logo, no canto superior esquerdo.
     *
     * O `Logo202` já se anuncia como "202Lab", mas isso descreve a MARCA, não o
     * destino — e quem ouve "202Lab, link" não sabe para onde vai. Esta frase
     * diz as duas coisas.
     */
    voltarAoSite: "202Lab — voltar ao site",
    /**
     * O cartaz. A segunda linha é também a `description` da página
     * (`app/trilha/inscricao/layout.tsx` lê `linhas[1]`), então ela precisa
     * fazer sentido sozinha, embaixo de um link no WhatsApp.
     */
    linhas: [
      "Seis semanas para virar builder AI-native: você aprende dentro do Claude Code, com o Claude como professor, e constrói algo de verdade a cada módulo.",
      "Para quem está nas universidades de São Paulo e quer construir startups, produtos e tecnologia, não só estudar sobre isso.",
    ],
    dados: [
      { rotulo: "INÍCIO PREVISTO", valor: "Começo de outubro" },
      { rotulo: "DURAÇÃO", valor: "Cerca de 6 semanas" },
      { rotulo: "A SALA DE AULA", valor: "O Claude Code" },
    ],
    botao: "COMEÇAR",
    convite: "COMO FUNCIONA",

    porQue: {
      rotulo: "POR QUE EXISTE",
      titulo: "Construir com AI virou a vantagem que nenhum diploma dá.",
      texto: [
        "A fronteira da tecnologia se renova mais rápido do que qualquer grade curricular. Quem sabe construir com AI tira uma ideia do papel em dias, testa com gente de verdade e aprende com o que volta. Isso hoje vale mais do que repertório.",
        "A trilha é o percurso que a 202 criou para encontrar, formar e acompanhar quem tem esse potencial nas universidades de São Paulo. A proposta é formar builders AI-native e, depois, conectar quem se destacar às startups e empresas parceiras que procuram exatamente esse perfil.",
      ],
    },

    frentes: {
      rotulo: "COMO FUNCIONA",
      titulo: "Aula e oficina, na mesma ferramenta",
      itens: [
        {
          tag: "TEORIA",
          titulo: "Aula com o Claude, no seu ritmo",
          texto:
            "A sala de aula é o Claude Code, na sua máquina. O Claude é o professor: conduz cada aula numa conversa de cerca de uma hora, explica sem assumir que você já sabe, cita a grande referência de cada tema e só avança quando você mostra que entendeu. Fechou o computador, ele retoma de onde parou.",
        },
        {
          tag: "PRÁTICA",
          titulo: "Entregas fixas, corrigidas uma a uma",
          texto:
            "Cada módulo termina com uma prática igual para todo mundo: uma página no ar, um sistema pequeno com dado público, uma feature com AI, um plano de negócio, um produto que cobra. Você constrói numa pasta sua, entrega, e um agente do Claude corrige contra critérios definidos antes. O feedback volta para você, ponto a ponto, e as aulas seguintes partem do que você fez.",
        },
      ],
      ligacao:
        "A oficina acumula: o que você constrói numa aula continua na seguinte. No fim da trilha, o que você tem é um portfólio de coisas no ar, feitas por você.",
    },

    ai: {
      rotulo: "A AI COMO MÉTODO",
      titulo: "O que a trilha ensina é dirigir a AI.",
      texto: [
        "Você não precisa saber programar para começar. O que se aprende é conduzir um agente: descrever bem o problema, dar contexto, pedir evidência em vez de acreditar, testar, revisar. É assim que a 202 constrói para os clientes dela, e é assim que uma pessoa sozinha faz hoje o que antes pedia um time.",
        "Por isso a trilha mistura engenharia, produto e startup desde a primeira semana: como um software roda, como saber se você está no problema certo, quanto custa conquistar um cliente e o que separa uma startup de um negócio pequeno.",
      ],
    },

    /**
     * As etapas são uma SEQUÊNCIA de verdade, e é só por isso que a tela as
     * numera e as desenha como subida. São quatro porque a grade do CSS tem
     * quatro colunas (`ComoFunciona.module.css`) — o teste de copy confere.
     *
     * Repare nos verbos das duas últimas: "pode ser convidado", "pode
     * apresentar". Ninguém promete vaga nem contratação, e esta página também
     * não.
     */
    percurso: {
      rotulo: "O PERCURSO",
      titulo: "Da inscrição ao que vem depois",
      etapas: [
        {
          titulo: "Inscrição e seleção",
          texto:
            "Começa por este formulário. A 202 procura gente de alto potencial nas universidades de São Paulo, com ou sem código.",
        },
        {
          titulo: "A trilha",
          texto:
            "Cerca de seis semanas de aulas e práticas dentro do Claude Code. A 202 acompanha o ritmo, as entregas e o jeito de pensar de cada pessoa ao longo do caminho.",
        },
        {
          titulo: "O time da 202",
          texto:
            "Quem se destacar pode ser convidado a continuar no time, construindo produto, AI e negócio para clientes, parceiros e para as apostas da própria 202.",
        },
        {
          titulo: "Startups e empresas parceiras",
          texto:
            "Quando a equipe enxerga em alguém o perfil que uma startup ou empresa parceira procura, pode apresentar essa pessoa: para construir, para liderar ou para fundar a próxima.",
        },
      ],
    },

    fecho: {
      texto:
        "A trilha é aula, oficina, correção e acompanhamento ao mesmo tempo. O que sai dela é gente que constrói: entende o problema, dirige a AI e coloca no ar.",
      botao: "COMEÇAR A INSCRIÇÃO",
    },
  },

  blocos: [
    { rotulo: "QUEM É VOCÊ", titulo: "Quem é você" },
    { rotulo: "UNIVERSIDADE", titulo: "Universidade e méritos" },
    { rotulo: "AI", titulo: "A sua relação com AI" },
    { rotulo: "TRABALHO", titulo: "Trabalho e empreendedorismo" },
    { rotulo: "A TRILHA", titulo: "A trilha" },
    // "QUEM VOCÊ CONHECE" e não "INDICAÇÕES": o rótulo do bloco é lido na régua
    // de progresso, ao lado de "6 DE 6", e "indicações" é a palavra do
    // FORMULÁRIO para o que está sendo coletado — não a palavra de quem
    // responde. Este par também fecha o percurso: o bloco 1 pergunta "QUEM É
    // VOCÊ" e o último pergunta "QUEM VOCÊ CONHECE", que é exatamente o arco do
    // formulário.
    //
    // O título era "Quem mais deveria estar aqui" e foi trocado em 05/09/2026:
    // ele pedia para INDICAR alguém para a trilha — "quem mais deveria estar
    // AQUI", nesta lista, neste programa —, e isso põe quem responde no papel
    // de quem faz campanha por um terceiro. Não é o que este bloco coleta. Ele
    // coleta o entorno de quem se inscreve, que é informação sobre ELA: com
    // quem anda, quem considera bom.
    //
    // O título agora diz por que a pergunta existe, em vez de fazer o pedido:
    // se você é a média de quem está por perto, as três pessoas abaixo dizem
    // algo sobre QUEM RESPONDE — e responder deixa de ser favor e passa a ser
    // parte da própria inscrição. É o único título do formulário que afirma em
    // vez de nomear um assunto, e é de propósito: ele é a premissa da pergunta
    // que vem logo abaixo. O pedido de fato — as três pessoas e o LinkedIn —
    // continua onde sempre esteve, no rótulo do campo.
    //
    // "com quem convive" e não "com quem você convive": o "você" já abre a
    // frase, e repeti-lo emperra a leitura sem acrescentar nada.
    { rotulo: "QUEM VOCÊ CONHECE", titulo: "Você é a média das pessoas com quem convive" },
  ],

  progresso: {
    formato: "{atual} de {total}",
    rotulo: "Progresso",
  },

  navegacao: {
    voltar: "VOLTAR",
    avancar: "AVANÇAR",
    enviar: "ENVIAR INSCRIÇÃO",
    enviando: "ENVIANDO…",
  },

  campos: {
    nome: {
      rotulo: "Nome completo",
      ajuda: "Nome completo mesmo, não apelido.",
      placeholder: "Maria Clara de Souza Almeida",
    },
    email: {
      rotulo: "E-mail",
      ajuda: "É por aqui que a gente responde.",
      placeholder: "voce@email.com",
    },
    whatsapp: {
      rotulo: "WhatsApp",
      placeholder: "(11) 91234-5678",
    },
    idade: { rotulo: "Idade", placeholder: "22" },
    estado: { rotulo: "Estado" },
    cidade: { rotulo: "Cidade", placeholder: "São Paulo" },
    linkedin: {
      rotulo: "LinkedIn",
      ajuda: "Opcional. Cole o endereço do perfil ou escreva só o seu usuário.",
      placeholder: "linkedin.com/in/seu-usuario",
    },
    instituicao: { rotulo: "Instituição" },
    instituicao_outra: {
      rotulo: "Qual instituição",
      placeholder: "Nome da instituição",
    },
    unidade_usp: { rotulo: "Unidade da USP" },
    unidade_usp_outra: {
      rotulo: "Qual unidade",
      placeholder: "Nome da unidade ou do instituto",
    },
    curso: { rotulo: "Curso", ajuda: "Digite para filtrar a lista." },
    curso_outro: { rotulo: "Qual curso", placeholder: "Nome do curso" },
    ano_atual: { rotulo: "Ano atual" },
    conclusao_prevista: { rotulo: "Conclusão prevista" },
    premios: {
      rotulo: "Prêmios e honrarias",
      ajuda: "Opcional. Um por linha.",
      placeholder: "Medalha de ouro na OBMEP 2023",
    },
    nivel_ai: {
      rotulo: "O seu nível com AI hoje",
      ajuda: "Escolha a frase que mais parece com você.",
    },
    ferramentas_ai: {
      rotulo: "Ferramentas que você já usou",
      ajuda: "Marque todas que valem.",
    },
    ai_estudos: { rotulo: "AI nos estudos" },
    historia_ai: {
      rotulo: "Sua história com AI",
      ajuda: "Opcional.",
      placeholder: "A coisa mais interessante que você já fez com AI.",
    },
    situacao: { rotulo: "Situação hoje" },
    situacao_outra: {
      rotulo: "Qual é a sua situação",
      placeholder: "Em uma linha.",
    },
    ai_trabalho: {
      rotulo: "AI no que você entrega",
      ajuda:
        "Vale estágio, emprego, pesquisa, monitoria, trabalho de faculdade — qualquer lugar onde outra pessoa depende do que você faz.",
    },
    empreendedorismo: { rotulo: "Empreendedorismo" },
    disponibilidade: {
      rotulo: "Disponibilidade",
      ajuda: "Horas por semana que você consegue dedicar de verdade.",
    },
    origem: { rotulo: "Como você conheceu a 202" },
    origem_quem_indicou: {
      rotulo: "Quem te indicou",
      placeholder: "Nome de quem te falou da 202",
    },
    origem_outra: {
      rotulo: "Onde foi",
      placeholder: "Podcast, professor, matéria, grupo…",
    },
    origem_detalhe: {
      rotulo: "Quer detalhar?",
      ajuda: "Opcional.",
      placeholder: "Onde foi, quando foi, com quem.",
    },
    algo_mais: {
      rotulo: "Algo que a gente deveria saber e não perguntou",
      ajuda: "Opcional.",
      placeholder: "O campo é seu.",
    },
    indicacoes: {
      // Pergunta, e não ordem. "Indique até 3 pessoas excepcionais" mandava a
      // pessoa fazer uma tarefa; "quem são as 3 melhores pessoas que você
      // conhece?" faz uma pergunta que ela já sabe responder de cabeça — e o
      // formulário inteiro é mais fácil de preencher quando o campo pergunta em
      // vez de instruir.
      rotulo: "Quem são as 3 melhores pessoas que você conhece?",
      // "Recomendado" e não "Opcional", e a diferença é o ponto do campo: os
      // outros campos opcionais desta página dizem "Opcional." e significam
      // "tanto faz". Este é o único lugar do formulário onde a 202 pede um
      // favor — e pedir sem dizer que importa é o jeito mais rápido de não
      // receber. O segundo período dá o critério, porque "excepcional" sozinho
      // é vago e vago não preenche campo.
      ajuda:
        "Recomendado. Gente que você chamaria para um projeto seu — e o LinkedIn de cada uma.",
    },
    aceite_dados: { rotulo: "Aceite de dados" },
  },

  premios: {
    adicionar: "+ ADICIONAR PRÊMIO",
    remover: "Remover",
    rotuloItem: "Prêmio {n}",
  },

  indicacoes: {
    rotuloItem: "Pessoa {n}",
    nome: "Nome",
    linkedin: "LinkedIn",
    // Diz o que se espera, em vez de mostrar um exemplo. É a exceção à convenção
    // de placeholder desta página (`nome` mostra "Maria Clara de Souza
    // Almeida", `premios` mostra "Medalha de ouro na OBMEP 2023"), e a exceção
    // é deliberada: nome de exemplo aqui é o nome de OUTRA pessoa, e três
    // caixas repetindo o mesmo nome inventado leem como se algo já estivesse
    // preenchido. "Nome e sobrenome" ainda diz o essencial — que o sobrenome
    // importa —, que é o que faz a indicação ser encontrável.
    placeholderNome: "Nome e sobrenome",
    placeholderLinkedin: "linkedin.com/in/usuario",
  },

  contador: "{usado} / {limite}",
  listaDeOpcoes: "{campo} — opções",
  opcional: "opcional",

  aceite: {
    rotulo: "Li e aceito que a 202 guarde estes dados para falar comigo sobre a trilha.",
    // A enumeração do que é coletado saiu por decisão do Matheus de 21/08/2026.
    // O que a §8 pede continua escrito: a finalidade está no `rotulo` logo
    // acima ("para falar comigo sobre a trilha") e o não-repasse está aqui. A
    // lista de categorias era a única parte redundante — ela repetia, em prosa,
    // os campos que a pessoa acabou de preencher e estão na tela atrás dela.
    texto: "Nada é repassado a terceiros e nada é vendido.",
    // A linha dos menores resolve a §15.2 da spec, por decisão do Matheus de
    // 20/08/2026. Ela não acrescenta campo e não bloqueia ninguém: parte do
    // público tem 16 ou 17 anos, e a alternativa — pedir dado do responsável —
    // coletaria informação de terceiro que a 202 não vai usar para nada.
    menores:
      "Se você tem menos de 18 anos, ao marcar aqui você confirma que quem responde por você sabe desta inscrição.",
  },

  confirmacao: {
    rotulo: "INSCRIÇÃO ENVIADA",
    comEmail: {
      titulo: "Recebemos a sua inscrição.",
      linhas: [
        "Mandamos um e-mail confirmando. Se não chegar em alguns minutos, olhe o spam.",
        "A gente lê tudo e entra em contato.",
      ],
    },
    // Sem o e-mail ligado (§7), esta tela não promete e-mail nenhum. Prometer e
    // não cumprir custa mais do que não prometer.
    semEmail: {
      titulo: "Recebemos a sua inscrição.",
      linhas: ["A gente lê tudo e entra em contato pelo WhatsApp ou pelo e-mail que você deixou."],
    },
    // Reinscrição nunca tem cara de erro: a pessoa fez tudo certo duas vezes.
    atualizada: {
      titulo: "Atualizamos a sua inscrição.",
      linhas: [
        "Você já tinha se inscrito com este e-mail, e agora vale o que você acabou de mandar.",
        "A gente lê tudo e entra em contato.",
      ],
    },
    tese: {
      convite: "Enquanto isso, o argumento inteiro da 202 está escrito numa página só.",
      botao: "LER A TESE",
      href: "/tese",
    },
  },

  // §9.4: nenhuma data aparece aqui. Data visível cria urgência real, mas vira
  // mentira no dia em que o prazo for estendido — e ele vai ser.
  encerrado: {
    rotulo: "INSCRIÇÕES ENCERRADAS",
    titulo: "As inscrições desta trilha estão fechadas.",
    linhas: [
      "Chegou tarde desta vez. Vai ter outra.",
      "Enquanto isso, o argumento inteiro da 202 está escrito numa página só.",
    ],
  },

  envio: {
    rede: "Não deu para enviar agora, e parece ser a conexão. O que você escreveu continua aqui — tente de novo.",
    servidor: "Deu um problema do nosso lado. Nada do que você escreveu se perdeu; tente de novo em um minuto.",
    invalido: "Alguns campos precisam de um ajuste. A gente marcou onde.",
    limite: "Chegaram muitas inscrições deste mesmo lugar em pouco tempo. Tente de novo daqui a pouco.",
    encerrado: "As inscrições foram encerradas enquanto você preenchia.",
  },

  erros: {
    faltaTexto: "Falta preencher.",
    faltaEscolha: "Escolha uma das opções.",
    opcaoDesconhecida: "Essa opção não está na lista.",
    textoLongo: "Passou de {limite} caracteres.",
    email: "Confira o e-mail: falta o @ ou o domínio.",
    emailLongo: "Esse e-mail é comprido demais para ser real.",
    whatsappFalta: "Falta o WhatsApp.",
    whatsappCurto: "Faltou o DDD — escreva os dois dígitos na frente do número.",
    whatsappLongo: "Sobraram dígitos: com o DDD são 10 ou 11 ao todo.",
    whatsappDdd: "Esse DDD não existe no Brasil.",
    whatsappNove: "Falta o 9 do celular, logo depois do DDD.",
    linkedin: "Não reconheci esse endereço. Use algo como linkedin.com/in/seu-usuario, ou só o seu usuário.",
    idade: "Escreva a idade em números — 22, por exemplo, e não o ano em que você nasceu.",
    instituicaoOutra: "Escreva o nome da sua instituição.",
    unidadeUsp: "Escolha a sua unidade da USP.",
    unidadeUspOutra: "Escreva o nome da sua unidade.",
    cursoOutro: "Escreva o nome do seu curso.",
    conclusao: "Escolha o ano de conclusão, ou “Já formei”.",
    premiosTipo: "Não consegui ler a lista de prêmios.",
    premioLongo: "Cada prêmio cabe em {limite} caracteres.",
    premiosDemais: "Dá para listar até {limite} prêmios. Deixe os mais fortes.",
    indicacoesTipo: "Não consegui ler as indicações.",
    indicacaoIncompleta: "Cada indicação precisa do nome E do LinkedIn — ou deixe a linha em branco.",
    indicacaoLinkedin:
      "Não reconheci um dos endereços. Use algo como linkedin.com/in/usuario, ou só o usuário.",
    indicacaoNomeLongo: "Um dos nomes passou de {limite} caracteres.",
    indicacoesDemais: "Cabem até {limite} indicações.",
    ferramentasVazio: "Marque pelo menos uma. Se nenhuma serve, marque “Nenhuma dessas”.",
    ferramentasExclusiva: "“Nenhuma dessas” não combina com as outras — desmarque uma coisa ou outra.",
    situacaoOutra: "Escreva em uma linha o que você faz hoje.",
    quemIndicou: "Escreva o nome de quem te indicou.",
    origemOutra: "Escreva onde você ouviu falar da 202.",
    aceite: "Sem esse aceite a gente não pode guardar os seus dados.",
  },
} as const satisfies CopyInscricao;

/**
 * O ponto único de consumo da copy — o mesmo par que `lib/tese.ts` faz com `pt`
 * e `TESE`.
 *
 * O literal acima é `as const satisfies`, que trava as strings e confere cada
 * uma contra o tipo. A exportação **alarga** de volta para `CopyInscricao`, e
 * isso não é desleixo: sem alargar, `campos.idade` teria o tipo exato
 * `{ rotulo: "Idade" }`, e escrever `campos[campo].placeholder` num componente
 * genérico viraria erro de compilação em metade dos campos. A interface precisa
 * poder perguntar por `ajuda` e `placeholder` sem saber de antemão quais campos
 * têm um e quais têm o outro.
 */
export const COPY_INSCRICAO: CopyInscricao = copy;

/* ── Os cinco blocos ──────────────────────────────────────────────────────── */

/**
 * Em que bloco mora cada campo.
 *
 * `satisfies Record<keyof Inscricao, number>` é o ponto do objeto: acrescentar
 * um campo em `Inscricao` e esquecer de dizer onde ele aparece vira erro de
 * compilação, e não um campo invisível que ninguém preenche.
 */
const BLOCO_DO_CAMPO = {
  nome: 0,
  email: 0,
  whatsapp: 0,
  idade: 0,
  estado: 0,
  cidade: 0,
  linkedin: 0,

  instituicao: 1,
  instituicao_outra: 1,
  unidade_usp: 1,
  unidade_usp_outra: 1,
  curso: 1,
  curso_outro: 1,
  ano_atual: 1,
  conclusao_prevista: 1,
  premios: 1,

  nivel_ai: 2,
  ferramentas_ai: 2,
  ai_estudos: 2,
  historia_ai: 2,

  situacao: 3,
  situacao_outra: 3,
  ai_trabalho: 3,
  empreendedorismo: 3,

  disponibilidade: 4,
  origem: 4,
  origem_quem_indicou: 4,
  origem_outra: 4,
  origem_detalhe: 4,
  algo_mais: 4,

  // O aceite mudou de bloco em 01/09/2026, junto com a chegada das indicações.
  // Ele não "pertence" às indicações: pertence ao FIM. O aceite é a última
  // coisa que a pessoa faz antes de ENVIAR, e um bloco novo depois dele
  // significaria pedir consentimento e só então continuar perguntando — que é
  // exatamente o que a §8 não quer.
  indicacoes: 5,
  aceite_dados: 5,
} as const satisfies Record<keyof Inscricao, number>;

/** Quantos blocos o formulário tem, contados a partir da própria copy. */
export const TOTAL_BLOCOS: number = COPY_INSCRICAO.blocos.length;

/**
 * O bloco (0..5) de um campo. Erro do servidor volta para o bloco onde o campo
 * mora, e não para uma lista no fim (§4.6).
 */
export function blocoDoCampo(campo: keyof Inscricao): number {
  return BLOCO_DO_CAMPO[campo];
}

/**
 * O primeiro bloco que tem erro, ou `null` se não houver nenhum.
 *
 * É o que a interface precisa depois de um `400` do servidor: levar a pessoa de
 * volta ao **primeiro** ponto em que ela precisa mexer, e não ao último campo
 * que por acaso foi validado por último.
 */
export function primeiroBlocoComErro(erros: ErrosInscricao): number | null {
  const blocos = (Object.keys(erros) as (keyof Inscricao)[])
    .filter((campo) => campo in BLOCO_DO_CAMPO)
    .map(blocoDoCampo);
  return blocos.length === 0 ? null : Math.min(...blocos);
}

/* ── Pequenos formatadores de copy ────────────────────────────────────────── */

/** `3 de 5`. O formato mora na copy; a substituição mora aqui, uma vez só. */
export function textoProgresso(atual: number): string {
  return COPY_INSCRICAO.progresso.formato
    .replace("{atual}", String(atual))
    .replace("{total}", String(TOTAL_BLOCOS));
}

/** `Estado — opções`. O nome da lista aberta, para o leitor de tela. */
export function textoListaDeOpcoes(campo: keyof Inscricao): string {
  return COPY_INSCRICAO.listaDeOpcoes.replace("{campo}", COPY_INSCRICAO.campos[campo].rotulo);
}

/** `142 / 500`, contando como a pessoa conta (ver `contarCaracteres`). */
export function textoContador(texto: string, limite: number): string {
  return COPY_INSCRICAO.contador
    .replace("{usado}", String(contarCaracteres(texto)))
    .replace("{limite}", String(limite));
}

/**
 * Qual das três telas de confirmação mostrar (§4.7).
 *
 * A escolha vive aqui e não no JSX porque as três variações existem por motivos
 * diferentes — o e-mail é um interruptor de ambiente (§7) e a reinscrição é uma
 * resposta do servidor — e um `? :` aninhado dentro de um componente é onde a
 * variação errada aparece sem ninguém notar.
 */
export function confirmacaoDe(opcoes: {
  atualizada: boolean;
  emailAtivo: boolean;
}): TelaCopy {
  if (opcoes.atualizada) return COPY_INSCRICAO.confirmacao.atualizada;
  return opcoes.emailAtivo
    ? COPY_INSCRICAO.confirmacao.comEmail
    : COPY_INSCRICAO.confirmacao.semEmail;
}

/**
 * O nome do campo-armadilha da §8.
 *
 * Fica aqui, e não repetido na página e na rota, porque um honeypot com nome
 * diferente dos dois lados é um honeypot desligado — e desligado em silêncio,
 * que é o único jeito de ninguém perceber. O nome parece um campo de verdade de
 * propósito: robô preenche o que tem cara de formulário.
 */
export const CAMPO_HONEYPOT = "sobrenome_confirmacao";

/* ── Validação ────────────────────────────────────────────────────────────── */

/**
 * Os DDDs que existem de verdade.
 *
 * A faixa 11–99 tem buracos — 20, 23, 25, 26, 29, 30, 36, 39, 40, 50, 52, 56 a
 * 60, 70, 72, 76, 78, 80 e 90 nunca foram atribuídos. Validar só "dois dígitos
 * entre 11 e 99" deixaria passar um telefone que não pode existir, e o custo de
 * descobrir isso é uma pessoa que não atende quando a 202 liga. Repare que 55
 * **existe** (Santa Maria, RS): é o buraco que quase todo mundo cria ao
 * confundir DDD com código do país.
 */
const DDDS_VALIDOS: ReadonlySet<number> = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, // SP
  21, 22, 24, // RJ
  27, 28, // ES
  31, 32, 33, 34, 35, 37, 38, // MG
  41, 42, 43, 44, 45, 46, // PR
  47, 48, 49, // SC
  51, 53, 54, 55, // RS
  61, // DF e entorno
  62, 64, // GO
  63, // TO
  65, 66, // MT
  67, // MS
  68, // AC
  69, // RO
  71, 73, 74, 75, 77, // BA
  79, // SE
  81, 87, // PE
  82, // AL
  83, // PB
  84, // RN
  85, 88, // CE
  86, 89, // PI
  91, 93, 94, // PA
  92, 97, // AM
  95, // RR
  96, // AP
  98, 99, // MA
]);

/**
 * A validação de e-mail, deliberadamente sóbria.
 *
 * A regex da RFC 5322 tem mais de 400 caracteres, aceita coisas que nenhum
 * provedor emite e mesmo assim não prova que o endereço existe. A única prova
 * de verdade é mandar um e-mail e ele chegar — e é isso que o Resend faz depois
 * (§7). O papel desta regex é outro e menor: pegar o erro de digitação que a
 * pessoa consegue consertar sozinha ali na hora — o `@` que faltou, o espaço no
 * meio, o domínio sem ponto, o `.com.` com ponto sobrando.
 *
 * Ela é frouxa de propósito com o resto: `+`, apóstrofo e acento no lado
 * esquerdo passam, porque endereços assim existem e recusar um endereço válido
 * custa uma inscrição inteira, enquanto aceitar um inválido custa um e-mail que
 * volta.
 */
const EMAIL = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

/** O limite de tamanho de um endereço de e-mail, pela RFC 5321. */
const EMAIL_MAX = 254;

/** O que um usuário do LinkedIn pode ter: letras (com acento), dígitos, hífen. */
const USUARIO_LINKEDIN = /^[a-z0-9\-_%À-ÿ]{3,100}$/i;

/** Objeto de verdade — não `null`, não array, não string, não número. */
function ehObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * O texto de um campo, ou `undefined` quando ele não veio.
 *
 * Tipo errado vira "não veio" de propósito: `nome: 42` só chega aqui vindo de
 * robô ou de bug, e nos dois casos "falta preencher" é a resposta certa — não
 * vale uma segunda família de mensagens ("esperava texto") que nenhum humano
 * jamais vai ler.
 */
function textoDe(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const limpo = v.replace(CONTROLES, "").trim();
  return limpo === "" ? undefined : limpo;
}

/**
 * Caracteres de controle C0/C7F, **menos** tabulação, nova linha e retorno.
 *
 * Existe por causa do `\u0000`. Ele não é espaço em branco, então `trim()` não
 * o remove e ele atravessava a validação inteira — até o Postgres, que **recusa
 * `\u0000` dentro de `jsonb`**. Como o payload todo vira um parâmetro `jsonb`
 * na função de upsert, um único NUL em qualquer campo derrubava a gravação
 * inteira, e a pessoa recebia um 500 genérico sem nada a corrigir na tela.
 *
 * Os três preservados não são exceção descuidada: `historia_ai`,
 * `origem_detalhe` e `algo_mais` são `<textarea>`, e apagar `\n` ali
 * amassaria o texto que a pessoa escreveu em parágrafos.
 */
const CONTROLES = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/**
 * O número de um campo, aceitando também a string que todo `<select>` devolve.
 *
 * Sem isso, `idade: "22"` — que é literalmente o que um `<select>` produz —
 * seria recusado pelo servidor depois de passar no cliente, que é o defeito
 * exato que a validação única existe para não ter.
 */
function numeroDe(v: unknown): number | undefined {
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/** Substitui `{limite}` na mensagem. Os números moram em `LIMITES`, não na copy. */
function comLimite(modelo: string, limite: number): string {
  return modelo.replace("{limite}", String(limite));
}

/**
 * Os dígitos de um telefone brasileiro, sem o código de país.
 *
 * Quem copia o número do próprio WhatsApp copia com o `+55` — é literalmente o
 * que o botão "copiar número" entrega, e este formulário vai ser distribuído
 * por WhatsApp. Só tiramos o 55 em números de 12 ou 13 dígitos, onde ele **só**
 * pode ser código de país: em 11 dígitos, `55` na frente é o DDD de Santa Maria
 * (RS), e cortar ali apagaria o telefone de um gaúcho inteiro.
 *
 * Não trunca nada de propósito. Quantos dígitos cabem é decisão de quem digita
 * e de quem valida o tamanho; a regra do código de país é só esta. Está aqui, e
 * exportada, porque a máscara do campo precisa dela **antes** de recortar o que
 * mostra — se o recorte vier primeiro, `+55 11 91234-5678` vira onze dígitos
 * que começam em `55`, e o formulário acusa "falta o 9 do celular" num número
 * perfeitamente certo. Duplicar a regra no componente resolveria o sintoma e
 * quebraria o princípio desta página: uma validação só, cliente e servidor.
 */
export function digitosDoTelefone(bruto: string): string {
  const digitos = bruto.replace(/\D/g, "");
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith("55")) {
    return digitos.slice(2);
  }
  return digitos;
}

/**
 * Reduz o LinkedIn a uma forma só.
 *
 * A pessoa cola o que o app dela deu: com `https://`, sem, com `www.`, com
 * `br.`, com `?originalSubdomain=br` no fim, ou só o usuário — a spec (§4.1)
 * diz que aceitar "só o usuário" é obrigatório. Guardar as seis formas no banco
 * significaria que ninguém consegue clicar direto no painel e que o mesmo
 * perfil apareceria como duas pessoas. A saída é sempre a URL completa, porque
 * é ela que se clica.
 *
 * Devolve `null` quando o que veio não é um perfil reconhecível — inclusive
 * `/company/`, que é página de empresa e não de pessoa.
 */
function normalizarLinkedin(bruto: string): string | null {
  // Só `trim`, e não "tirar todo espaço": apagar espaço do meio transformaria
  // "não é link nenhum" num usuário perfeitamente válido chamado
  // "nãoélinknenhum". Espaço no meio de uma URL é sinal de que o que veio não é
  // uma URL, e a pessoa precisa saber disso.
  let s = bruto.trim();
  s = s.replace(/^https?:\/\//i, "");
  s = s.replace(/^(?:[a-z]{2,3}\.)?linkedin\.com\//i, "");
  s = s.replace(/^in\//i, "");
  s = s.split(/[?#]/)[0];
  s = s.replace(/\/+$/, "");
  if (!USUARIO_LINKEDIN.test(s)) return null;
  return `https://www.linkedin.com/in/${s}`;
}

/**
 * A validação única — a mesma no navegador e na Route Handler.
 *
 * Recebe `unknown` porque no servidor ela recebe mesmo: o corpo de um `POST`
 * pode ser `null`, um número, uma lista, um objeto com metade dos campos do
 * tipo errado. Nada disso pode lançar exceção — uma exceção aqui vira `500`, e
 * um `500` é indistinguível de "o banco caiu" para quem estiver lendo o log
 * depois. Por isso o primeiro passo é o mais bruto possível: o que não for
 * objeto vira `{}`, e o objeto vazio já produz, sozinho, a mensagem certa em
 * cada campo obrigatório.
 *
 * Quando `ok` é `true`, `valor` vem **normalizado**: WhatsApp só com dígitos,
 * e-mail em minúsculas, todo texto livre com `trim`, texto livre vazio virando
 * `null` (e não `""`, que no banco seria um dado falso — "respondeu em branco"
 * é diferente de "não respondeu"), prêmios sem entradas vazias e ferramentas na
 * ordem da lista, para o mesmo conjunto de respostas gerar sempre a mesma linha.
 */
export function validarInscricao(dados: unknown): {
  ok: boolean;
  erros: ErrosInscricao;
  valor?: Inscricao;
} {
  const d: Record<string, unknown> = ehObjeto(dados) ? dados : {};
  const erros: ErrosInscricao = {};
  const E = COPY_INSCRICAO.erros;

  /** A primeira mensagem de um campo é a que fica: ela é a mais específica. */
  const anota = (campo: keyof Inscricao, mensagem: string): void => {
    if (erros[campo] === undefined) erros[campo] = mensagem;
  };

  const textoObrigatorio = (
    campo: keyof Inscricao,
    valor: unknown,
    limite: number,
    faltando: string = E.faltaTexto,
  ): string | undefined => {
    const t = textoDe(valor);
    if (t === undefined) {
      anota(campo, faltando);
      return undefined;
    }
    if (contarCaracteres(t) > limite) {
      anota(campo, comLimite(E.textoLongo, limite));
      return undefined;
    }
    return t;
  };

  /** Texto opcional. Vazio depois do `trim` vira `null`, nunca `""`. */
  const textoOpcional = (
    campo: keyof Inscricao,
    valor: unknown,
    limite: number,
  ): string | null => {
    const t = textoDe(valor);
    if (t === undefined) return null;
    if (contarCaracteres(t) > limite) {
      anota(campo, comLimite(E.textoLongo, limite));
      return null;
    }
    return t;
  };

  const escolha = (
    campo: keyof Inscricao,
    valor: unknown,
    lista: readonly { readonly id: string }[],
    faltando: string = E.faltaEscolha,
  ): string | undefined => {
    const t = textoDe(valor);
    if (t === undefined) {
      anota(campo, faltando);
      return undefined;
    }
    if (!lista.some((o) => o.id === t)) {
      anota(campo, E.opcaoDesconhecida);
      return undefined;
    }
    return t;
  };

  const escolhaNumerica = (
    campo: keyof Inscricao,
    valor: unknown,
    lista: readonly { readonly valor: number }[],
  ): number | undefined => {
    const n = numeroDe(valor);
    if (n === undefined) {
      anota(campo, E.faltaEscolha);
      return undefined;
    }
    if (!lista.some((o) => o.valor === n)) {
      anota(campo, E.opcaoDesconhecida);
      return undefined;
    }
    return n;
  };

  /* — Bloco 1 — */

  const nome = textoObrigatorio("nome", d.nome, LIMITES.textoCurto);

  // O rótulo pede nome completo, mas a validação não exige duas palavras: nome
  // de uma palavra só existe, e recusar um deles trocaria um dado imperfeito
  // por uma inscrição perdida. O pedido fica no rótulo, onde é convite.

  let email: string | undefined;
  const emailBruto = textoDe(d.email);
  if (emailBruto === undefined) {
    anota("email", E.faltaTexto);
  } else if (emailBruto.length > EMAIL_MAX) {
    anota("email", E.emailLongo);
  } else if (!EMAIL.test(emailBruto)) {
    anota("email", E.email);
  } else {
    // Minúsculas porque `email` é a chave da inscrição (§6.4) e a coluna é
    // `citext`: "Ana@Gmail.com" e "ana@gmail.com" são a mesma pessoa em todo
    // provedor que existe, e guardar as duas formas criaria duas fichas.
    email = emailBruto.toLowerCase();
  }

  let whatsapp: string | undefined;
  const whatsBruto = textoDe(d.whatsapp);
  if (whatsBruto === undefined) {
    anota("whatsapp", E.whatsappFalta);
  } else {
    // O `+55` sai aqui, pela mesma função que a máscara do campo usa — ver
    // `digitosDoTelefone` para por que 12/13 dígitos e não 11.
    const digitos = digitosDoTelefone(whatsBruto);
    const ddd = Number(digitos.slice(0, 2));
    const primeiro = digitos.charAt(2);
    if (digitos.length < 10) {
      anota("whatsapp", E.whatsappCurto);
    } else if (digitos.length > 11) {
      anota("whatsapp", E.whatsappLongo);
    } else if (!DDDS_VALIDOS.has(ddd)) {
      anota("whatsapp", E.whatsappDdd);
    } else if (digitos.length === 11 && primeiro !== "9") {
      anota("whatsapp", E.whatsappNove);
    } else if (digitos.length === 10 && !"2345".includes(primeiro)) {
      // Fixo no Brasil começa em 2, 3, 4 ou 5. Dez dígitos começando em 6–9 é
      // celular antigo, de antes do nono dígito: o número existiu, hoje não
      // completa mais — e a pessoa consegue consertar sozinha se a mensagem
      // disser qual dígito falta.
      anota("whatsapp", E.whatsappNove);
    } else {
      whatsapp = digitos;
    }
  }

  // A idade escrita traz uma família de erros que o `<select>` não tinha:
  // vazio, "vinte e dois", "22 anos", "22,5" e — o clássico — o ano de
  // nascimento. Recusar é melhor do que consertar: `2004` "corrigido" para `20`
  // seria uma idade plausível e errada, gravada em silêncio.
  let idade: number | undefined;
  // Número e string são os dois aceitos: a tela manda string, e um cliente que
  // mandasse `22` não pode ser recusado por causa do tipo (é a mesma razão de
  // `numeroDe` existir).
  const idadeBruta = typeof d.idade === "number" ? d.idade : textoDe(d.idade);
  if (idadeBruta === undefined) {
    anota("idade", E.faltaTexto);
  } else {
    const n = numeroDe(idadeBruta);
    if (
      n === undefined ||
      !Number.isInteger(n) ||
      n < LIMITES.idadeMin ||
      n > LIMITES.idadeMax
    ) {
      anota("idade", E.idade);
    } else {
      idade = n;
    }
  }

  let estado: string | undefined;
  const estadoBruto = textoDe(d.estado);
  if (estadoBruto === undefined) {
    anota("estado", E.faltaEscolha);
  } else if (!ESTADOS.some((e) => e.sigla === estadoBruto.toUpperCase())) {
    anota("estado", E.opcaoDesconhecida);
  } else {
    estado = estadoBruto.toUpperCase();
  }

  const cidade = textoObrigatorio("cidade", d.cidade, LIMITES.textoCurto);

  let linkedin: string | null = null;
  const linkedinBruto = textoDe(d.linkedin);
  if (linkedinBruto !== undefined) {
    const normalizado = normalizarLinkedin(linkedinBruto);
    if (normalizado === null) anota("linkedin", E.linkedin);
    else linkedin = normalizado;
  }

  /* — Bloco 2 — */

  const instituicao = escolha("instituicao", d.instituicao, INSTITUICOES);

  // Os condicionais que **sobram** são descartados em silêncio, e não viram
  // erro: a interface guarda o que a pessoa digitou enquanto ela troca de
  // opção e volta, e transformar isso em erro puniria uma hesitação. A exceção
  // é `ai_trabalho`, lá embaixo, e o motivo está escrito lá.
  const instituicao_outra =
    instituicao === "OUTRA"
      ? (textoObrigatorio(
          "instituicao_outra",
          d.instituicao_outra,
          LIMITES.textoCurto,
          E.instituicaoOutra,
        ) ?? null)
      : null;

  const unidade_usp =
    instituicao === "USP"
      ? (escolha("unidade_usp", d.unidade_usp, UNIDADES_USP, E.unidadeUsp) ?? null)
      : null;

  // Condicional de segundo grau: só existe quando a instituição é a USP **e** a
  // unidade escolhida foi `OUTRA`. A cascata é a mesma de `instituicao_outra` —
  // se `unidade_usp` já é `null` porque a pessoa não é da USP, não há o que
  // cobrar aqui.
  const unidade_usp_outra =
    unidade_usp === "OUTRA"
      ? (textoObrigatorio(
          "unidade_usp_outra",
          d.unidade_usp_outra,
          LIMITES.textoCurto,
          E.unidadeUspOutra,
        ) ?? null)
      : null;

  const curso = escolha("curso", d.curso, CURSOS);

  const curso_outro =
    curso === "OUTRO"
      ? (textoObrigatorio("curso_outro", d.curso_outro, LIMITES.textoCurto, E.cursoOutro) ??
        null)
      : null;

  const ano_atual = escolha("ano_atual", d.ano_atual, ANOS_ATUAIS);

  // A chave precisa **existir** no payload, mesmo valendo `null`. Sem isso,
  // "não respondi" e "já formei" chegariam idênticos ao servidor, e um campo
  // obrigatório passaria em branco. A interface manda `null` para "Já formei" —
  // ou o `id` `FORMEI`, que também é aceito por vir direto de um `<select>`.
  let conclusao_prevista: number | null = null;
  if (!("conclusao_prevista" in d)) {
    anota("conclusao_prevista", E.conclusao);
  } else {
    const bruto = d.conclusao_prevista;
    if (bruto === null || bruto === "FORMEI") {
      conclusao_prevista = null;
    } else {
      const n = numeroDe(bruto);
      if (n === undefined || !CONCLUSOES_PREVISTAS.some((c) => c.valor === n)) {
        anota("conclusao_prevista", E.conclusao);
      } else {
        conclusao_prevista = n;
      }
    }
  }

  let premios: readonly string[] = [];
  const premiosBruto = d.premios;
  if (premiosBruto !== undefined && premiosBruto !== null) {
    if (!Array.isArray(premiosBruto) || premiosBruto.some((p) => typeof p !== "string")) {
      anota("premios", E.premiosTipo);
    } else {
      // Campo vazio no meio da lista é o rastro de quem clicou em "+ adicionar"
      // e desistiu — some sem reclamação. O teto conta depois da limpeza, senão
      // três campos em branco custariam três vagas.
      const limpos = (premiosBruto as string[])
        .map((p) => p.trim())
        .filter((p) => p !== "");
      if (limpos.length > LIMITES.maxPremios) {
        anota("premios", comLimite(E.premiosDemais, LIMITES.maxPremios));
      } else if (limpos.some((p) => contarCaracteres(p) > LIMITES.premio)) {
        anota("premios", comLimite(E.premioLongo, LIMITES.premio));
      } else {
        premios = limpos;
      }
    }
  }

  /* — Bloco 3 — */

  // `nivel_ai` vale 0 num degrau legítimo ("nunca usei"). Toda checagem aqui é
  // contra `undefined`, nunca `if (!nivel)` — o degrau 0 é uma resposta, e
  // tratá-lo como ausência transformaria o iniciante em erro de formulário.
  const nivel_ai = escolhaNumerica("nivel_ai", d.nivel_ai, NIVEIS_AI);

  let ferramentas_ai: readonly string[] = [];
  const ferramentasBruto = d.ferramentas_ai;
  if (!Array.isArray(ferramentasBruto)) {
    anota("ferramentas_ai", E.ferramentasVazio);
  } else {
    const marcadas = new Set(
      ferramentasBruto
        .filter((f): f is string => typeof f === "string")
        .map((f) => f.trim())
        .filter((f) => f !== ""),
    );
    const desconhecida = [...marcadas].some(
      (id) => !FERRAMENTAS_AI.some((f) => f.id === id),
    );
    const exclusivas = FERRAMENTAS_AI.filter(
      (f) => f.exclusiva === true && marcadas.has(f.id),
    );
    if (marcadas.size === 0) {
      anota("ferramentas_ai", E.ferramentasVazio);
    } else if (desconhecida) {
      anota("ferramentas_ai", E.opcaoDesconhecida);
    } else if (exclusivas.length > 0 && marcadas.size > 1) {
      anota("ferramentas_ai", E.ferramentasExclusiva);
    } else {
      // Sai na ordem da lista, e não na ordem dos cliques: a mesma resposta tem
      // de virar sempre a mesma linha no banco, senão o `text[]` fica com
      // permutações e qualquer comparação entre duas fichas mente.
      ferramentas_ai = FERRAMENTAS_AI.filter((f) => marcadas.has(f.id)).map((f) => f.id);
    }
  }

  const ai_estudos = escolha("ai_estudos", d.ai_estudos, AI_ESTUDOS);
  const historia_ai = textoOpcional("historia_ai", d.historia_ai, LIMITES.textoLivre);

  /* — Bloco 4 — */

  const situacao = escolha("situacao", d.situacao, SITUACOES);

  const situacao_outra =
    situacao === "OUTRO"
      ? (textoObrigatorio(
          "situacao_outra",
          d.situacao_outra,
          LIMITES.textoCurto,
          E.situacaoOutra,
        ) ?? null)
      : null;

  // Sem condicional: a pergunta é feita a todo mundo, e por isso é obrigatória
  // para todo mundo. `Não uso` é a resposta de quem ela não alcança — e "não
  // uso" é um dado, enquanto uma coluna vazia é a ausência de um.
  const ai_trabalho = escolha("ai_trabalho", d.ai_trabalho, AI_TRABALHO);

  const empreendedorismo = escolhaNumerica(
    "empreendedorismo",
    d.empreendedorismo,
    EMPREENDEDORISMO,
  );

  /* — Bloco 5 — */

  const disponibilidade = escolha("disponibilidade", d.disponibilidade, DISPONIBILIDADES);
  const origem = escolha("origem", d.origem, ORIGENS);

  const origem_quem_indicou =
    origem === "INDICACAO"
      ? (textoObrigatorio(
          "origem_quem_indicou",
          d.origem_quem_indicou,
          LIMITES.textoCurto,
          E.quemIndicou,
        ) ?? null)
      : null;

  // `origem_outra` e `origem_quem_indicou` são o mesmo padrão em opções
  // diferentes, e por isso nunca aparecem juntos. O par curto-obrigatório +
  // `origem_detalhe` opcional já existia para `INDICACAO`; `OUTRO` só passa a
  // ter o mesmo tratamento em vez de cair num campo opcional genérico, onde a
  // resposta que interessa — *qual* é a outra origem — ficava em branco.
  const origem_outra =
    origem === "OUTRO"
      ? (textoObrigatorio(
          "origem_outra",
          d.origem_outra,
          LIMITES.textoCurto,
          E.origemOutra,
        ) ?? null)
      : null;

  const origem_detalhe = textoOpcional("origem_detalhe", d.origem_detalhe, LIMITES.textoLivre);
  const algo_mais = textoOpcional("algo_mais", d.algo_mais, LIMITES.textoLivre);

  /* — As indicações — */

  // Recomendadas, nunca obrigatórias: lista vazia é uma resposta válida e não
  // anota erro nenhum. O que esta validação impede é a indicação PELA METADE.
  //
  // A regra do par: linha com os dois campos em branco é descartada em silêncio
  // (mesmo raciocínio dos prêmios — é o rastro de quem começou e desistiu), e
  // linha com um só dos dois é recusada. Recusar é o certo aqui e descartar
  // seria errado: um nome sem link é uma pessoa que a 202 não consegue achar, e
  // um link sem nome apagado em silêncio faria a indicação que a pessoa
  // acabou de escrever sumir sem aviso.
  let indicacoes: readonly Indicacao[] = [];
  const indicacoesBruto = d.indicacoes;
  if (indicacoesBruto !== undefined && indicacoesBruto !== null) {
    if (!Array.isArray(indicacoesBruto) || !indicacoesBruto.every(ehObjeto)) {
      anota("indicacoes", E.indicacoesTipo);
    } else {
      // Campo presente com tipo errado é RECUSADO, e não descartado.
      //
      // `textoDe` devolve `undefined` para qualquer não-string, e o `?? ""`
      // abaixo transformaria isso em "linha em branco" — que o filtro remove. O
      // efeito era o pior possível: `{nome: 123, linkedin: 456}` respondia `ok`,
      // sem erro nenhum, com a indicação apagada. A pessoa indicou alguém e o
      // formulário disse que deu certo.
      //
      // `premios` já fazia o certo (`some(p => typeof p !== "string")` → erro de
      // tipo); esta é a mesma regra para o mesmo problema. `undefined` e `null`
      // continuam valendo como "não veio", que é diferente de "veio errado".
      const tipoErrado = indicacoesBruto.some((linha) =>
        (["nome", "linkedin"] as const).some(
          (chave) =>
            linha[chave] !== undefined &&
            linha[chave] !== null &&
            typeof linha[chave] !== "string",
        ),
      );

      const linhas = indicacoesBruto.map((linha) => ({
        nome: textoDe(linha.nome) ?? "",
        linkedin: textoDe(linha.linkedin) ?? "",
      }));

      // O par vazio some ANTES de qualquer checagem de conteúdo: a tela desenha
      // as três linhas sempre, então quem indica uma pessoa só manda duas linhas
      // vazias junto — e nenhuma delas pode virar "falta o nome".
      const preenchidas = linhas.filter((l) => l.nome !== "" || l.linkedin !== "");

      // O mesmo `normalizarLinkedin` do campo `linkedin` da própria pessoa — e
      // não uma segunda regra parecida. Quem indica cola o link do mesmo jeito
      // que cola o seu: com `br.`, com `?originalSubdomain`, ou só o usuário.
      // Duas regras divergiriam no primeiro caso estranho.
      const normalizadas = preenchidas.map((l) => ({
        nome: l.nome,
        linkedin: normalizarLinkedin(l.linkedin),
      }));

      if (tipoErrado) {
        anota("indicacoes", E.indicacoesTipo);
      } else if (preenchidas.length > LIMITES.maxIndicacoes) {
        anota("indicacoes", comLimite(E.indicacoesDemais, LIMITES.maxIndicacoes));
      } else if (preenchidas.some((l) => l.nome === "" || l.linkedin === "")) {
        anota("indicacoes", E.indicacaoIncompleta);
      } else if (preenchidas.some((l) => contarCaracteres(l.nome) > LIMITES.textoCurto)) {
        anota("indicacoes", comLimite(E.indicacaoNomeLongo, LIMITES.textoCurto));
      } else if (normalizadas.some((l) => l.linkedin === null)) {
        anota("indicacoes", E.indicacaoLinkedin);
      } else {
        indicacoes = normalizadas as readonly Indicacao[];
      }
    }
  }

  // `=== true` e não "é verdadeiro": a string `"false"`, que é o que um `<input
  // type=hidden>` mal montado mandaria, é verdadeira em JavaScript. Aqui isso
  // gravaria um aceite que ninguém deu.
  const aceite_dados = d.aceite_dados === true;
  if (!aceite_dados) anota("aceite_dados", E.aceite);

  if (Object.keys(erros).length > 0) return { ok: false, erros };

  // Chegar aqui significa que cada campo obrigatório passou pelo seu validador
  // sem anotar erro — os `?? ""` e `?? 0` abaixo são só o que o compilador
  // precisa para aceitar, e nenhum deles é alcançável. Se algum dia um deles
  // for, é porque um validador devolveu `undefined` sem anotar nada, e o teste
  // "um payload vazio reprova em todo campo obrigatório" quebra antes.
  return {
    ok: true,
    erros: {},
    valor: {
      nome: nome ?? "",
      email: email ?? "",
      whatsapp: whatsapp ?? "",
      idade: idade ?? 0,
      estado: estado ?? "",
      cidade: cidade ?? "",
      linkedin,
      instituicao: instituicao ?? "",
      instituicao_outra,
      unidade_usp,
      unidade_usp_outra,
      curso: curso ?? "",
      curso_outro,
      ano_atual: ano_atual ?? "",
      conclusao_prevista,
      premios,
      nivel_ai: nivel_ai ?? 0,
      ferramentas_ai,
      ai_estudos: ai_estudos ?? "",
      historia_ai,
      situacao: situacao ?? "",
      situacao_outra,
      ai_trabalho: ai_trabalho ?? "",
      empreendedorismo: empreendedorismo ?? 0,
      disponibilidade: disponibilidade ?? "",
      origem: origem ?? "",
      origem_quem_indicou,
      origem_outra,
      origem_detalhe,
      algo_mais,
      indicacoes,
      aceite_dados,
    },
  };
}
