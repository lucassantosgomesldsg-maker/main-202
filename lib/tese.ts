import { COPY, type Idioma } from "./copy";

/**
 * O oneliner da home, sem o ponto final.
 *
 * O fecho da tese **é** a frase da home — a página inteira existe para que
 * essa frase deixe de ser slogan e passe a ser conclusão. Por isso ela é
 * derivada de `copy.ts` em vez de copiada: corrigir a frase num lugar continua
 * corrigindo nas duas páginas, que é a regra do repo. O ponto final sai porque
 * aqui quem termina a frase é o ponto verde, igual a todo statement desta
 * página.
 */
function fechoLinhas(idioma: Idioma): string[] {
  // `string[]` explícito: as linhas da home são literais (`as const` em
  // copy.ts), e sem a anotação o array herdaria o tipo dos literais — o
  // `replace` abaixo devolve `string` e não caberia mais dentro dele.
  const linhas: string[] = [...COPY[idioma].onelinerLinhas];
  linhas[linhas.length - 1] = linhas[linhas.length - 1].replace(/\.$/, "");
  return linhas;
}

/**
 * A copy da página /tese, PT e EN.
 *
 * Vive aqui, e não em `lib/copy.ts`, porque copy.ts é o dicionário da home —
 * quatro strings que cabem de cabeça. Esta página tem dez seções e sete
 * instrumentos; misturar as duas coisas tornaria impossível corrigir uma
 * vírgula da home sem ler cem linhas de tese. A regra do repo continua valendo:
 * **nenhum texto de marca no JSX**. Um arquivo por página, e é este o da tese.
 *
 * O texto é reescrito a partir do deck `202.pdf` (decisão de 17/08/2026): mesma
 * tese, mesmos oito beats, mesmos números — frases construídas para uma tela
 * que se lê sozinha, sem ninguém narrando por cima.
 *
 * O ponto verde final de cada statement NÃO está nas strings: quem o desenha é
 * o componente, uma vez por seção. Assim a regra "um verde por tela" é
 * garantida pelo código, e não pela disciplina de quem edita o texto.
 */

/** Uma seção da página: o beat do argumento. */
export type Secao = {
  /** Âncora na URL, chave da régua e `id` do elemento. */
  readonly id: string;
  /** O nome do beat, em mono caixa-alta, acima do statement. */
  readonly rotulo: string;
  /** O nome curto na régua lateral — precisa caber em ~14 caracteres. */
  readonly regua: string;
  /** O statement, linha a linha. A quebra é decisão de design, não do viewport. */
  readonly titulo: readonly string[];
  /** O parágrafo que sustenta o statement. Ausente onde a frase basta. */
  readonly apoio?: string;
};

/** Tudo que a página /tese diz, num idioma. */
export type Conteudo = {
  readonly rotuloPagina: string;
  readonly voltar: string;
  readonly role: string;
  readonly secoes: readonly Secao[];
  readonly linhaDoTempo: {
    readonly titulo: string;
    readonly graduacao: string;
    readonly unidade: string;
    readonly renovacao: string;
    readonly conclusao: string;
  };
  readonly descompasso: {
    readonly rapido: { readonly nome: string; readonly nota: string };
    readonly lento: { readonly nome: string; readonly nota: string };
  };
  readonly supera: {
    readonly superadoRotulo: string;
    readonly superadoValor: string;
    readonly superaRotulo: string;
    readonly superaValor: string;
  };
  readonly pilares: readonly {
    readonly nome: string;
    readonly definicao: string;
  }[];
  readonly frentes: readonly {
    readonly tag: string;
    readonly nome: string;
    readonly texto: string;
  }[];
};

const pt = {
  rotuloPagina: "A TESE",
  voltar: "VOLTAR AO INÍCIO",
  role: "ROLE",

  secoes: [
    {
      id: "abertura",
      rotulo: "A TESE",
      regua: "A TESE",
      titulo: ["O que falta no mercado", "não é tecnologia.", "São pessoas excepcionais"],
      apoio:
        "Este é o argumento inteiro, na ordem em que ele se sustenta. Se você discordar de uma parte, o resto cai junto.",
    },
    {
      id: "ponto-de-partida",
      rotulo: "O PONTO DE PARTIDA",
      regua: "PARTIDA",
      titulo: ["Todo mundo carrega", "um PhD no bolso"],
      apoio:
        "Conhecimento de especialista virou consulta de trinta segundos. O que era escasso e caro passou a ser abundante e quase de graça — e nenhuma vantagem construída sobre escassez sobrevive a isso.",
    },
    {
      id: "velocidade",
      rotulo: "A VELOCIDADE DA FRONTEIRA",
      regua: "VELOCIDADE",
      titulo: ["A fronteira se renova", "a cada 18 meses.", "Um diploma leva 48"],
      apoio:
        "São 2,7 renovações completas dentro de um único diploma. Quem entra na faculdade estudando o estado da arte se forma três fronteiras atrás dele.",
    },
    {
      id: "descompasso",
      rotulo: "O DESCOMPASSO",
      regua: "DESCOMPASSO",
      titulo: ["Currículo se planeja em anos.", "A fronteira não espera", "o próximo semestre"],
      apoio:
        "Ementa, grade e carreira foram desenhadas para um mundo que mudava devagar o suficiente para caber num plano de quatro anos. A instituição se move em degraus. O conhecimento, não.",
    },
    {
      id: "o-que-supera",
      rotulo: "O QUE SUPERA O QUÊ",
      regua: "O QUE SUPERA",
      titulo: ["O que a pessoa já sabe envelhece.", "O jeito como ela aprende, não"],
      apoio:
        "Por isso não medimos ninguém pelo repertório. Capacidade de aprender, de pensar diferente e de transformar isso em coisa construída é o único ativo que não vence.",
    },
    {
      id: "ecossistema",
      rotulo: "O QUE ESTAMOS CONSTRUINDO",
      regua: "ECOSSISTEMA",
      titulo: ["Um ecossistema de talentos", "ancorado nas principais", "universidades brasileiras"],
      apoio:
        "O talento bruto já está lá dentro. O que não existe é um ambiente que o faça andar na velocidade da fronteira em vez da velocidade da grade.",
    },
    {
      id: "pilares",
      rotulo: "O QUE NÃO É NEGOCIÁVEL",
      regua: "PILARES",
      titulo: ["Três coisas.", "Não abrimos mão de nenhuma"],
    },
    {
      id: "frentes",
      rotulo: "COMO ISSO VIRA PRÁTICA",
      regua: "FRENTES",
      titulo: ["Cinco frentes", "rodando ao mesmo tempo"],
      apoio: "Crença sem consequência é opinião. Estas são as consequências.",
    },
    {
      id: "missao",
      rotulo: "A MISSÃO",
      regua: "MISSÃO",
      titulo: ["Que esses talentos criem", "— ou façam crescer — a nova safra", "de startups que muda o Brasil"],
    },
    {
      id: "fecho",
      rotulo: "FIM DA TESE",
      regua: "FIM",
      titulo: fechoLinhas("pt"),
    },
  ],

  linhaDoTempo: {
    titulo: "A FRONTEIRA RENOVA A CADA 18 MESES",
    graduacao: "GRADUAÇÃO · 48 MESES",
    unidade: "MESES",
    renovacao: "RENOVAÇÃO",
    conclusao: "2,7 RENOVAÇÕES DA FRONTEIRA DENTRO DE UM ÚNICO DIPLOMA",
  },

  descompasso: {
    rapido: { nome: "A FRONTEIRA", nota: "contínua, sem aviso" },
    lento: { nome: "O CURRÍCULO", nota: "em degraus, uma vez por ano" },
  },

  supera: {
    superadoRotulo: "O QUE FOI SUPERADO",
    superadoValor: "Conhecimento prévio",
    superaRotulo: "O QUE SUPERA",
    superaValor: "Capacidade de aprender, de pensar diferente e de construir",
  },

  pilares: [
    {
      nome: "Autodidatismo",
      definicao: "Quem depende de alguém para aprender anda na velocidade de quem ensina.",
    },
    {
      nome: "AI como core",
      definicao: "Não é ferramenta acessória no fim do processo. É o modo padrão de trabalhar.",
    },
    {
      nome: "Ambição",
      definicao: "Currículo mostra o que a pessoa já fez. Ambição mostra até onde ela ainda vai.",
    },
  ],

  frentes: [
    {
      tag: "TRILHAS",
      nome: "Percursos autodidatas",
      texto: "A pessoa atravessa por conta própria, no próprio ritmo, com entrega no fim.",
    },
    {
      tag: "REDE",
      nome: "Mentores e partners",
      texto: "Contato direto com quem já construiu, dentro e fora da 202.",
    },
    {
      tag: "SERVIÇO",
      nome: "Projetos reais para empresas",
      texto: "Cliente real, prazo real, dinheiro real. É onde a formação encontra consequência.",
    },
    {
      tag: "PRODUTO",
      nome: "Soluções escaláveis",
      texto:
        "Produto próprio, do problema até o que roda em produção. O que amadurece o bastante sai da 202 como empresa.",
    },
    {
      tag: "ALOCAÇÃO",
      nome: "Headhunting",
      texto:
        "Levamos quem atravessa para onde o trabalho é excepcional — startup ou empresa grande, o critério é o mesmo.",
    },
  ],
} as const satisfies Conteudo;

const en = {
  rotuloPagina: "THE THESIS",
  voltar: "BACK TO THE START",
  role: "SCROLL",

  secoes: [
    {
      id: "abertura",
      rotulo: "THE THESIS",
      regua: "THE THESIS",
      titulo: ["What the market lacks", "isn't technology.", "It's exceptional people"],
      apoio:
        "This is the whole argument, in the order it holds up. Disagree with one part and the rest falls with it.",
    },
    {
      id: "ponto-de-partida",
      rotulo: "THE STARTING POINT",
      regua: "STARTING POINT",
      titulo: ["Everyone carries", "a PhD in their pocket"],
      apoio:
        "Expert knowledge is now a thirty-second query. What was scarce and expensive became abundant and nearly free — and no advantage built on scarcity survives that.",
    },
    {
      id: "velocidade",
      rotulo: "THE SPEED OF THE FRONTIER",
      regua: "SPEED",
      titulo: ["The frontier renews", "every 18 months.", "A degree takes 48"],
      apoio:
        "That is 2.7 complete renewals inside a single degree. You start college studying the state of the art and graduate three frontiers behind it.",
    },
    {
      id: "descompasso",
      rotulo: "THE MISMATCH",
      regua: "MISMATCH",
      titulo: ["Curricula are planned in years.", "The frontier doesn't wait", "for next semester"],
      apoio:
        "Syllabus, course plan and career were designed for a world that changed slowly enough to fit inside a four-year plan. The institution moves in steps. Knowledge doesn't.",
    },
    {
      id: "o-que-supera",
      rotulo: "WHAT BEATS WHAT",
      regua: "WHAT BEATS WHAT",
      titulo: ["What a person already knows ages.", "How they learn doesn't"],
      apoio:
        "So we don't measure anyone by their repertoire. The ability to learn, to think differently and to turn that into something built is the only asset that doesn't expire.",
    },
    {
      id: "ecossistema",
      rotulo: "WHAT WE ARE BUILDING",
      regua: "ECOSYSTEM",
      titulo: ["A talent ecosystem", "anchored in Brazil's", "leading universities"],
      apoio:
        "The raw talent is already inside them. What doesn't exist is an environment that moves it at the speed of the frontier instead of the speed of the syllabus.",
    },
    {
      id: "pilares",
      rotulo: "WHAT ISN'T NEGOTIABLE",
      regua: "PILLARS",
      titulo: ["Three things.", "We give up none of them"],
    },
    {
      id: "frentes",
      rotulo: "HOW THIS BECOMES PRACTICE",
      regua: "FRONTS",
      titulo: ["Five fronts", "running at once"],
      apoio: "Belief without consequence is opinion. These are the consequences.",
    },
    {
      id: "missao",
      rotulo: "THE MISSION",
      regua: "MISSION",
      titulo: ["That this talent creates", "— or grows — the new wave of", "startups that changes Brazil"],
    },
    {
      id: "fecho",
      rotulo: "END OF THESIS",
      regua: "END",
      titulo: fechoLinhas("en"),
    },
  ],

  linhaDoTempo: {
    titulo: "THE FRONTIER RENEWS EVERY 18 MONTHS",
    graduacao: "DEGREE · 48 MONTHS",
    unidade: "MONTHS",
    renovacao: "RENEWAL",
    conclusao: "2.7 FRONTIER RENEWALS INSIDE A SINGLE DEGREE",
  },

  descompasso: {
    rapido: { nome: "THE FRONTIER", nota: "continuous, without warning" },
    lento: { nome: "THE CURRICULUM", nota: "in steps, once a year" },
  },

  supera: {
    superadoRotulo: "WHAT WAS SUPERSEDED",
    superadoValor: "Prior knowledge",
    superaRotulo: "WHAT SUPERSEDES IT",
    superaValor: "The ability to learn, think differently and build",
  },

  pilares: [
    {
      nome: "Self-teaching",
      definicao: "Depending on someone else to learn means moving at the teacher's speed.",
    },
    {
      nome: "AI at the core",
      definicao: "Not an accessory tool at the end of the process. It is the default way of working.",
    },
    {
      nome: "Ambition",
      definicao: "A résumé shows what someone has already done. Ambition shows how far they will still go.",
    },
  ],

  frentes: [
    {
      tag: "TRACKS",
      nome: "Self-taught paths",
      texto: "Each person crosses it alone, at their own pace, with something delivered at the end.",
    },
    {
      tag: "NETWORK",
      nome: "Mentors and partners",
      texto: "Direct contact with people who have already built — inside and outside 202.",
    },
    {
      tag: "SERVICE",
      nome: "Real projects for companies",
      texto: "Real client, real deadline, real money. This is where training meets consequence.",
    },
    {
      tag: "PRODUCT",
      nome: "Scalable software",
      texto:
        "Our own product, from the problem to what runs in production. What matures enough spins out of 202 as a company.",
    },
    {
      tag: "PLACEMENT",
      nome: "Headhunting",
      texto:
        "We place the ones who make it through where the work is exceptional — startup or large company, the bar is the same.",
    },
  ],
} as const satisfies Conteudo;

export const TESE: Record<Idioma, Conteudo> = { pt, en };

/**
 * Os `id` das seções, na ordem do argumento.
 *
 * Constante de módulo, e não `TESE[idioma].secoes.map(...)` no componente, por
 * dois motivos: os ids são os mesmos nos dois idiomas de propósito (trocar de
 * língua não pode invalidar um link que alguém compartilhou), e uma lista nova
 * a cada render faria o `useEffect` do observador de seção remontar sem parar.
 * `lib/tese.test.ts` guarda a primeira parte.
 */
export const IDS_SECOES: readonly string[] = pt.secoes.map((s) => s.id);

/**
 * O `<title>` da aba. Segue a forma da home (`202Lab — …`) para as duas
 * páginas lerem como o mesmo site na lista de abas e no histórico.
 */
export function tituloTese(idioma: Idioma): string {
  return `202Lab — ${TESE[idioma].rotuloPagina}`;
}
