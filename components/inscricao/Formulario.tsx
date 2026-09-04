"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AI_ESTUDOS,
  AI_TRABALHO,
  ANOS_ATUAIS,
  CAMPO_HONEYPOT,
  CONCLUSOES_PREVISTAS,
  COPY_INSCRICAO,
  DISPONIBILIDADES,
  EMPREENDEDORISMO,
  ESTADOS,
  FERRAMENTAS_AI,
  INSTITUICOES,
  LIMITES,
  NIVEIS_AI,
  ORIGENS,
  SITUACOES,
  TOTAL_BLOCOS,
  UNIDADES_USP,
  blocoDoCampo,
  confirmacaoDe,
  digitosDoTelefone,
  primeiroBlocoComErro,
  validarInscricao,
  type ErrosInscricao,
  type Inscricao,
  type TelaCopy,
} from "@/lib/inscricao";
import {
  CampoAceite,
  CampoSelect,
  CampoTexto,
  CampoTextoLongo,
  ListaEscolha,
  ListaMarcacao,
  idDoCampo,
  opcoesDe,
} from "./Campos";
import ComboboxCurso from "./ComboboxCurso";
import Indicacoes from "./Indicacoes";
import Premios from "./Premios";
import Progresso from "./Progresso";
import estilos from "./Formulario.module.css";

/**
 * O formulário inteiro: oito telas numa rota só.
 *
 * A decisão que organiza tudo aqui é **trocar de bloco por estado, nunca por
 * URL e nunca esperando o fim de uma animação**.
 *
 * Sem `?passo=3` porque o botão "voltar" do navegador tem de sair da página, e
 * não andar dentro do formulário: quem quer voltar um bloco tem um botão
 * VOLTAR grande, na tela, o tempo todo. Um histórico com seis entradas para uma
 * página só é a forma mais rápida de fazer alguém perder o preenchimento.
 *
 * Sem `animationend` porque o Chromium headless que testa esta página reporta
 * `prefers-reduced-motion: reduce` sempre, e ali a animação termina em 0,001ms
 * ou nem começa. Uma navegação pendurada num callback de fim de animação
 * **trava** a página nesse ambiente — e trava igual no navegador de quem ligou
 * a preferência de verdade. A animação aqui é decoração pura: o `key={passo}`
 * remonta o bloco, o CSS reproduz a entrada, e nada no JavaScript espera por
 * ela.
 */

/* ── O rascunho ───────────────────────────────────────────────────────────── */

/**
 * O formulário meio preenchido — que não é uma `Inscricao`.
 *
 * Todo controle de HTML devolve string: um `<select>` de idade devolve `"22"`,
 * não `22`, e um campo ainda não respondido devolve `""`, não `undefined`.
 * Guardar isso já convertido em número exigiria converter a cada tecla e
 * inventar um valor para "vazio" — e o valor inventado sempre vaza para o banco
 * um dia. Aqui o estado é literalmente o que a tela produz, e a conversão
 * acontece uma vez só, na fronteira, em `paraEnvio`.
 *
 * O tipo é derivado de `Inscricao` de propósito: acrescentar um campo lá e
 * esquecer dele aqui não compila.
 */
type Rascunho = {
  -readonly [K in keyof Inscricao]: K extends "premios" | "ferramentas_ai"
    ? string[]
    : K extends "indicacoes"
      ? IndicacaoRascunho[]
      : K extends "aceite_dados"
        ? boolean
        : string;
};

/**
 * Uma indicação meio preenchida.
 *
 * Não é `Indicacao`, e a diferença é a mesma que separa `Rascunho` de
 * `Inscricao`: na tela existe a linha com o nome escrito e o LinkedIn ainda em
 * branco — estado legítimo enquanto se digita, e impossível no tipo validado,
 * onde os dois vieram ou a linha não veio.
 */
type IndicacaoRascunho = { nome: string; linkedin: string };

/** As três linhas vazias com que o bloco 5 nasce e para as quais ele volta. */
function indicacoesVazias(): IndicacaoRascunho[] {
  return Array.from({ length: LIMITES.maxIndicacoes }, () => ({ nome: "", linkedin: "" }));
}

/** O passo da abertura. Os blocos são 0..5; a confirmação é um estado à parte. */
const ABERTURA = -1;

const VAZIO: Rascunho = {
  nome: "",
  email: "",
  whatsapp: "",
  idade: "",
  estado: "",
  cidade: "",
  linkedin: "",

  instituicao: "",
  instituicao_outra: "",
  unidade_usp: "",
  unidade_usp_outra: "",
  curso: "",
  curso_outro: "",
  ano_atual: "",
  conclusao_prevista: "",
  // O repeater nasce com uma linha vazia (spec §4.2).
  premios: [""],

  nivel_ai: "",
  ferramentas_ai: [],
  ai_estudos: "",
  historia_ai: "",

  situacao: "",
  situacao_outra: "",
  ai_trabalho: "",
  empreendedorismo: "",

  disponibilidade: "",
  origem: "",
  origem_quem_indicou: "",
  origem_outra: "",
  origem_detalhe: "",
  algo_mais: "",
  // Três linhas desde o início, e não uma com botão de `+` como os prêmios: a
  // pergunta pede TRÊS, e mostrar as três é o que diz isso sem texto nenhum.
  // Um repeater que começa com uma linha comunicaria "quantas você quiser".
  indicacoes: indicacoesVazias(),
  aceite_dados: false,
};

/**
 * Os campos na ordem em que aparecem na tela, e os campos de cada bloco.
 *
 * A ordem importa duas vezes: é ela que decide para qual campo o foco vai
 * quando o AVANÇAR encontra erros (o primeiro da tela, não o primeiro que a
 * validação por acaso anotou) e é ela que faz `primeiroBlocoComErro` casar com
 * o campo que recebe o foco depois de um 400 do servidor.
 */
const CAMPOS = Object.keys(VAZIO) as (keyof Inscricao)[];

const CAMPOS_DO_BLOCO: readonly (readonly (keyof Inscricao)[])[] = COPY_INSCRICAO.blocos.map(
  (_, bloco) => CAMPOS.filter((campo) => blocoDoCampo(campo) === bloco),
);

/**
 * As listas já achatadas para `<option>`/radio, calculadas uma vez no módulo.
 *
 * Regra do repo: nada que possa ser computado uma vez fora do componente deve
 * ser recomputado a cada render — e um formulário que muda de estado a cada
 * tecla renderiza muito.
 */
const OPCOES = {
  // `ESTADOS` é a única lista com forma própria (`sigla`/`nome`): a sigla é o
  // que o banco guarda (`char(2)`) e o nome é o que se procura com o olho.
  estado: ESTADOS.map((e) => ({ chave: e.sigla, rotulo: e.nome })),
  instituicao: opcoesDe(INSTITUICOES),
  unidade_usp: opcoesDe(UNIDADES_USP),
  ano_atual: opcoesDe(ANOS_ATUAIS),
  conclusao_prevista: opcoesDe(CONCLUSOES_PREVISTAS),
  nivel_ai: opcoesDe(NIVEIS_AI),
  ai_estudos: opcoesDe(AI_ESTUDOS),
  situacao: opcoesDe(SITUACOES),
  ai_trabalho: opcoesDe(AI_TRABALHO),
  empreendedorismo: opcoesDe(EMPREENDEDORISMO),
  disponibilidade: opcoesDe(DISPONIBILIDADES),
  origem: opcoesDe(ORIGENS),
} as const;

/**
 * Os `id` de opção que abrem campo condicional.
 *
 * São valores de coluna, não copy: o schema (§6.3) guarda literalmente `OUTRA`,
 * `USP`, `OUTRO` e `INDICACAO`, e é por eles que o painel agrupa. Ficam nomeados
 * aqui, e não espalhados como literais no JSX, para que a condição da tela e a
 * condição de `validarInscricao` sejam obviamente a mesma coisa.
 */
const ABRE_CAMPO = {
  instituicaoOutra: "OUTRA",
  unidadeUsp: "USP",
  unidadeUspOutra: "OUTRA",
  cursoOutro: "OUTRO",
  situacaoOutra: "OUTRO",
  quemIndicou: "INDICACAO",
  origemOutra: "OUTRO",
} as const;

/* ── A idade ──────────────────────────────────────────────────────────────── */

/**
 * Só dígitos, no máximo três.
 *
 * O teclado `numeric` do celular já entrega números, mas no computador nada
 * impede "vinte e dois" — e o campo tem de recusar isso na hora, e não no
 * AVANÇAR. Os três dígitos são o limite que deixa o engano clássico **visível**:
 * quem digita o ano de nascimento vê `200` parar na tela e lê a mensagem que
 * explica. Cortar em dois transformaria `2004` num `20` plausível e errado, que
 * é a pior das saídas — o mesmo erro que a máscara do WhatsApp aqui embaixo
 * existe para não cometer.
 */
function soDigitos(texto: string): string {
  return texto.replace(/\D/g, "").slice(0, 3);
}

/* ── A máscara do WhatsApp ────────────────────────────────────────────────── */

/**
 * `(11) 91234-5678`. O estado guarda só dígitos; a máscara é vestida na hora de
 * desenhar.
 *
 * O corte olha o **terceiro dígito** e não o tamanho do que já foi digitado:
 * celular brasileiro tem 9 depois do DDD e 11 dígitos ao todo, fixo tem 10.
 * Decidir pelo tamanho faria a máscara se reorganizar no meio da digitação — o
 * hífen pulando de casa enquanto a pessoa escreve parece defeito, e ela apaga
 * tudo para tentar de novo.
 *
 * Nunca há caractere de máscara sobrando no fim (`(11) ` com o parêntese e o
 * espaço esperando o próximo dígito). Isso não é estética: com o sufixo, apagar
 * o último dígito reescreveria o sufixo de volta e o backspace ficaria preso.
 */
function mascaraWhatsapp(digitos: string): string {
  const d = digitos.slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  const corte = d.charAt(2) === "9" ? 7 : 6;
  if (d.length <= corte) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, corte)}-${d.slice(corte)}`;
}

/**
 * Os dígitos do que a pessoa acabou de digitar.
 *
 * O `+55` sai **antes** do recorte de 11, e é por isso que quem tira é
 * `digitosDoTelefone`, da fundação, e não uma regex daqui. Recortar primeiro
 * faria `+55 11 91234-5678` — exatamente o que o botão "copiar número" do
 * WhatsApp entrega — guardar `55119123456` e o formulário acusar "falta o 9 do
 * celular" num número certo. A regra do código de país é uma só, e é a mesma
 * que o servidor aplica.
 *
 * O caso que exige o segundo parâmetro: apagar o `-` ou o `)` da máscara não
 * muda dígito nenhum, então o campo se reescreveria idêntico e o backspace
 * pareceria não funcionar. Quando o texto encurtou e os dígitos não, apagamos
 * um dígito — que é o que a pessoa quis dizer.
 */
function digitosDoWhatsapp(texto: string, atuais: string): string {
  const crus = texto.replace(/\D/g, "");
  // O `+55` só conta como código de país quando o número CHEGA INTEIRO — colado
  // do próprio WhatsApp, ou preenchido pelo navegador. Digitando, cada tecla
  // acrescenta um dígito só, e aí `55` na frente é o DDD de Santa Maria até
  // prova em contrário.
  //
  // Sem essa distinção, quem é do DDD 55 e encosta numa tecla a mais com o
  // campo já cheio vê `55987654321` virar `(98) 7654-3211` — um número VÁLIDO
  // e completamente diferente, trocado em silêncio. Errar assim é pior do que
  // recusar: o formulário seguiria em frente com um telefone que não é o da
  // pessoa, e o WhatsApp é o canal por onde a 202 vai chamá-la.
  const chegouDeUmaVez = crus.length - atuais.length >= 2;
  const d = (chegouDeUmaVez ? digitosDoTelefone(crus) : crus).slice(0, 11);
  if (d === atuais && texto.length < mascaraWhatsapp(atuais).length) return d.slice(0, -1);
  return d;
}

/* ── A fronteira: rascunho → payload ──────────────────────────────────────── */

/**
 * O que vai no corpo do POST — e o que a validação do cliente recebe, para que
 * cliente e servidor julguem exatamente o mesmo objeto.
 *
 * Duas traduções acontecem aqui e em nenhum outro lugar:
 *
 * 1. **`conclusao_prevista` vai sempre**, mesmo valendo `null`. É a chave que
 *    separa "já formei" de "não respondi": sem ela no payload, um campo
 *    obrigatório passaria em branco sem ninguém notar.
 * 2. **Prêmios em branco somem.** São o rastro de quem clicou em `+` e
 *    desistiu.
 *
 * Havia uma terceira até 21/08/2026: `ai_trabalho` só ia se a situação fosse de
 * trabalho. Saiu junto com o condicional — a pergunta é feita a todo mundo, e
 * apagar a resposta aqui esvaziaria no envio exatamente o campo que a tela
 * acabou de cobrar.
 *
 * O resto vai como string — `idade: "22"`, `nivel_ai: "0"` — porque
 * `validarInscricao` aceita string onde espera número exatamente por saber que
 * é isso que um `<select>` devolve.
 */
function paraEnvio(r: Rascunho): Record<string, unknown> {
  return {
    ...r,
    conclusao_prevista: r.conclusao_prevista === "FORMEI" ? null : r.conclusao_prevista,
    premios: r.premios.filter((p) => p.trim() !== ""),
    // As três linhas estão sempre na tela; as que ninguém tocou não são resposta.
    // A validação também as descartaria, e de propósito: quem chega à rota sem
    // passar por esta tela não tem como saber desta limpeza.
    indicacoes: r.indicacoes.filter((i) => i.nome.trim() !== "" || i.linkedin.trim() !== ""),
  };
}

/* ── O rascunho guardado ──────────────────────────────────────────────────── */

const CHAVE = "202:inscricao";

/**
 * A versão do formato guardado. Quando o formulário mudar de campos, ela sobe e
 * o rascunho velho é descartado em silêncio — restaurar um rascunho de outra
 * versão colocaria a pessoa num bloco que não existe mais.
 *
 * 1 → 2 em 01/09/2026: chegou o bloco 5 (indicações) e o aceite se mudou para
 * ele. Um rascunho da versão 1 guardou `passo: 4` querendo dizer "estou no
 * último bloco" — restaurá-lo agora largaria a pessoa no penúltimo, com o
 * botão ENVIAR trocado por um AVANÇAR que ela não pediu.
 */
const VERSAO = 2;

function textoGuardado(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function listaGuardada(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

/**
 * As indicações de volta do `sessionStorage`, sempre com exatamente
 * `maxIndicacoes` linhas.
 *
 * Como todo leitor daqui, não confia em nada: o que estiver guardado pode ter
 * vindo de um rascunho editado à mão, com dez linhas, com `nome` num número, ou
 * com a chave inteira faltando. O corte e o preenchimento acontecem aqui para
 * que a tela receba sempre a mesma forma — três pares de strings — e nunca
 * precise perguntar quantas linhas tem.
 */
function indicacoesGuardadas(v: unknown): IndicacaoRascunho[] {
  const lidas = Array.isArray(v)
    ? v.slice(0, LIMITES.maxIndicacoes).map((x) => {
        const o = (typeof x === "object" && x !== null ? x : {}) as Record<string, unknown>;
        return { nome: textoGuardado(o.nome), linkedin: textoGuardado(o.linkedin) };
      })
    : [];
  const vazias = indicacoesVazias();
  return vazias.map((vazia, i) => lidas[i] ?? vazia);
}

/**
 * Lê o rascunho de volta, campo a campo e checando o tipo de cada um.
 *
 * Nada aqui confia no que está guardado: `sessionStorage` é editável pela
 * pessoa, sobrevive a um deploy que mudou o formulário, e um `JSON.parse` solto
 * derrubaria a página inteira por uma chave a mais. Qualquer coisa estranha —
 * JSON quebrado, versão antiga, campo com tipo errado — vira "começa limpo", em
 * silêncio. Perder um rascunho é ruim; uma página branca é pior.
 */
function leGuardado(): { rascunho: Rascunho; passo: number } | null {
  let bruto: string | null = null;
  try {
    bruto = window.sessionStorage.getItem(CHAVE);
  } catch {
    // Modo privado de alguns navegadores nega o acesso. Sem rascunho, então.
    return null;
  }
  if (bruto === null) return null;

  let dados: unknown;
  try {
    dados = JSON.parse(bruto);
  } catch {
    // JSON corrompido: começa limpo.
    return null;
  }
  if (dados === null || typeof dados !== "object") return null;

  const d = dados as { v?: unknown; passo?: unknown; rascunho?: unknown };
  if (d.v !== VERSAO) return null;
  if (d.rascunho === null || typeof d.rascunho !== "object") return null;
  const g = d.rascunho as Record<string, unknown>;

  const premios = listaGuardada(g.premios);

  const rascunho: Rascunho = {
    nome: textoGuardado(g.nome),
    email: textoGuardado(g.email),
    whatsapp: textoGuardado(g.whatsapp),
    idade: textoGuardado(g.idade),
    estado: textoGuardado(g.estado),
    cidade: textoGuardado(g.cidade),
    linkedin: textoGuardado(g.linkedin),
    instituicao: textoGuardado(g.instituicao),
    instituicao_outra: textoGuardado(g.instituicao_outra),
    unidade_usp: textoGuardado(g.unidade_usp),
    unidade_usp_outra: textoGuardado(g.unidade_usp_outra),
    curso: textoGuardado(g.curso),
    curso_outro: textoGuardado(g.curso_outro),
    ano_atual: textoGuardado(g.ano_atual),
    conclusao_prevista: textoGuardado(g.conclusao_prevista),
    premios: premios.length === 0 ? [""] : premios.slice(0, LIMITES.maxPremios),
    nivel_ai: textoGuardado(g.nivel_ai),
    ferramentas_ai: listaGuardada(g.ferramentas_ai),
    ai_estudos: textoGuardado(g.ai_estudos),
    historia_ai: textoGuardado(g.historia_ai),
    situacao: textoGuardado(g.situacao),
    situacao_outra: textoGuardado(g.situacao_outra),
    ai_trabalho: textoGuardado(g.ai_trabalho),
    empreendedorismo: textoGuardado(g.empreendedorismo),
    disponibilidade: textoGuardado(g.disponibilidade),
    origem: textoGuardado(g.origem),
    origem_quem_indicou: textoGuardado(g.origem_quem_indicou),
    origem_outra: textoGuardado(g.origem_outra),
    origem_detalhe: textoGuardado(g.origem_detalhe),
    algo_mais: textoGuardado(g.algo_mais),
    indicacoes: indicacoesGuardadas(g.indicacoes),
    aceite_dados: g.aceite_dados === true,
  };

  const passo =
    typeof d.passo === "number" &&
    Number.isInteger(d.passo) &&
    d.passo >= ABERTURA &&
    d.passo < TOTAL_BLOCOS
      ? d.passo
      : ABERTURA;

  return { rascunho, passo };
}

function apagaGuardado(): void {
  try {
    window.sessionStorage.removeItem(CHAVE);
  } catch {
    // Sem acesso ao storage não há o que apagar.
  }
}

/* ── Foco ─────────────────────────────────────────────────────────────────── */

/**
 * Pedido de foco para "o primeiro campo do bloco", seja ele qual for.
 *
 * O valor é um caractere que nenhum id pode ter, para nunca colidir com um
 * pedido de foco por id. Escrito como escape (`\u0000`) e não como o caractere
 * cru: um NUL de verdade no fonte faz `file` classificar o arquivo como `data`,
 * `git diff` dizer "Binary files differ" e — o pior — `grep -r` pular o maior
 * componente da página em silêncio, sem uma linha de aviso. Em execução o valor
 * é idêntico; muda só a codificação aqui.
 */
const PRIMEIRO_DO_BLOCO = "\u0000primeiro";

/**
 * O que conta como "primeiro campo".
 *
 * `button` entra por causa da abertura, cujo único alvo é o COMEÇAR; nos blocos
 * o primeiro `input`/`select` sempre vem antes de qualquer botão na ordem do
 * documento, então incluí-lo não muda nada ali. O campo-armadilha fica de fora
 * pelo `tabindex="-1"`, e mora fora do bloco de qualquer forma.
 */
const SELETOR_FOCO =
  'input:not([type="hidden"]):not([tabindex="-1"]), select, textarea, button:not([tabindex="-1"])';

/**
 * O título da confirmação, alvo do último pedido de foco do percurso.
 *
 * A confirmação é a única tela sem campo nenhum: o `<form>` inteiro — inclusive
 * o botão que tinha o foco — sai do DOM, e sem pedido explícito o foco cai no
 * `<body>`. Quem enviou pelo teclado não ouve nada e precisa tabular a página
 * inteira para descobrir se funcionou, no exato momento em que mais importa
 * saber. Um id, e não `PRIMEIRO_DO_BLOCO`, porque o alvo aqui é um texto e não
 * um campo — daí o `tabIndex={-1}` no `<h1>`, que deixa o foco chegar por
 * programa sem acrescentar uma parada a mais na tabulação de quem usa o mouse.
 */
const ID_CONFIRMACAO = "confirmacao-titulo";

/* ── A rota do envio ──────────────────────────────────────────────────────── */

const ROTA_API = "/trilha/inscricao/api";

export default function Formulario() {
  const [rascunho, setRascunho] = useState<Rascunho>(VAZIO);
  const [passo, setPasso] = useState<number>(ABERTURA);
  /**
   * Os campos que já erraram uma vez. Antes disso, o campo não é validado
   * enquanto a pessoa digita — um e-mail é inválido nos primeiros oito
   * caracteres de **qualquer** e-mail válido, e acusar isso é hostil. Depois de
   * errar uma vez, ele revalida a cada tecla, para o erro sumir no instante em
   * que for corrigido. É esse par — tarde na primeira vez, cedo depois — que
   * faz o formulário parecer justo.
   */
  const [marcados, setMarcados] = useState<readonly (keyof Inscricao)[]>([]);
  const [errosServidor, setErrosServidor] = useState<ErrosInscricao>({});
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [confirmacao, setConfirmacao] = useState<TelaCopy | null>(null);

  const telaRef = useRef<HTMLElement>(null);
  const armadilha = useRef<HTMLInputElement>(null);
  const restaurado = useRef(false);
  /**
   * O próximo foco a entregar: o id de um campo, ou `PRIMEIRO_DO_BLOCO`.
   *
   * Um `ref` e não um `useState` de propósito. Isto é uma **ordem para o DOM**,
   * não um pedaço do estado da tela: nada é renderizado diferente por causa
   * dele, e guardá-lo em estado obrigaria a zerá-lo com um `setState` dentro do
   * efeito — cascata de render que o `react-hooks/set-state-in-effect` recusa,
   * com razão. Quem dispara o efeito é a mudança de estado que sempre acompanha
   * o pedido (o bloco que trocou, os campos que passaram a mostrar erro).
   */
  const pedidoDeFoco = useRef<string | null>(null);

  /* — Restaurar o rascunho, inclusive o bloco em que a pessoa estava (§4) —
     Num efeito, e não na inicialização do estado: o componente é renderizado no
     servidor antes de chegar ao navegador, e ler `sessionStorage` durante o
     render daria HTML diferente dos dois lados. */
  useEffect(() => {
    const guardado = leGuardado();
    if (guardado !== null) {
      // A dispensa abaixo cobre este bloco e é o caso que a própria doc da
      // regra aceita: sincronizar o React com um sistema externo que só existe
      // no navegador. O estado PRECISA nascer vazio para o HTML do servidor
      // bater com o primeiro render do cliente, e só o `sessionStorage` — que
      // não existe no servidor — sabe que ele deveria ser outro. Mesma
      // dispensa, pelo mesmo motivo, que `lib/usaIdioma.ts`.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRascunho(guardado.rascunho);
      setPasso(guardado.passo);
    }
    restaurado.current = true;
  }, []);

  /* — Guardar, com um respiro — O debounce existe para não escrever no disco a
     cada tecla; 400ms é curto o bastante para sobreviver a uma notificação que
     troca de app, que é o cenário real (a pessoa chega pelo WhatsApp, no
     celular). `sessionStorage` e não `localStorage` de propósito: uma inscrição
     pela metade não deve ressuscitar semanas depois. */
  useEffect(() => {
    if (!restaurado.current || confirmacao !== null) return;
    const relogio = window.setTimeout(() => {
      try {
        window.sessionStorage.setItem(CHAVE, JSON.stringify({ v: VERSAO, passo, rascunho }));
      } catch {
        // Cota cheia ou modo privado: seguir sem rascunho é melhor do que parar.
      }
    }, 400);
    return () => window.clearTimeout(relogio);
  }, [rascunho, passo, confirmacao]);

  /* — O foco — Um pedido por vez, resolvido depois que o React já pintou o
     bloco novo. Sem isto, quem usa leitor de tela clica em AVANÇAR e não ouve
     nada: o foco continua no botão, que não mudou de nome, e a pessoa não sabe
     se funcionou. */
  useEffect(() => {
    const pedido = pedidoDeFoco.current;
    if (pedido === null) return;
    pedidoDeFoco.current = null;

    const primeiro = pedido === PRIMEIRO_DO_BLOCO;
    const alvo = primeiro
      ? (telaRef.current?.querySelector<HTMLElement>(SELETOR_FOCO) ?? null)
      : document.getElementById(pedido);
    if (alvo === null) return;

    alvo.focus({ preventScroll: primeiro });
    // Bloco novo começa do topo; erro leva até onde o erro está (o `focus`
    // acima já rolou até lá). A guarda do `scrollY` também evita chamar
    // `scrollTo` no jsdom dos testes, onde ele não é implementado.
    if (primeiro && window.scrollY > 0) window.scrollTo({ top: 0, behavior: "auto" });
  });

  const validacao = useMemo(() => validarInscricao(paraEnvio(rascunho)), [rascunho]);

  /**
   * O que aparece na tela: o erro que a validação vê agora, para os campos que
   * já erraram, mais o que o servidor tenha dito e o cliente não reproduza.
   */
  const erros = useMemo<ErrosInscricao>(() => {
    const visiveis: ErrosInscricao = { ...errosServidor };
    for (const campo of marcados) {
      const local = validacao.erros[campo];
      if (local !== undefined) visiveis[campo] = local;
    }
    // Repare que nada é APAGADO daqui: um erro que só o servidor viu — porque
    // as duas validações divergiram, ou porque a lista mudou entre o carregar e
    // o enviar — continua na tela. Apagá-lo por o cliente não o reproduzir
    // deixaria o formulário parecendo correto e recusado ao mesmo tempo, sem
    // nada indicando onde mexer. Quem o apaga é `atualizar`, no instante em que
    // a pessoa mexe em qualquer campo.
    return visiveis;
  }, [errosServidor, marcados, validacao]);

  function atualizar<K extends keyof Rascunho>(campo: K, valor: Rascunho[K]): void {
    setRascunho((r) => ({ ...r, [campo]: valor }));
    // O que o servidor disse deixou de valer no instante em que a pessoa mexeu.
    setErrosServidor({});
    setAviso(null);
  }

  function irPara(destino: number): void {
    setPasso(destino);
    setAviso(null);
    pedidoDeFoco.current = PRIMEIRO_DO_BLOCO;
  }

  function marcar(campos: readonly (keyof Inscricao)[]): void {
    setMarcados((antes) => Array.from(new Set([...antes, ...campos])));
  }

  function avancar(): void {
    const comErro = CAMPOS_DO_BLOCO[passo].filter((c) => validacao.erros[c] !== undefined);
    if (comErro.length > 0) {
      marcar(comErro);
      pedidoDeFoco.current = idDoCampo(comErro[0]);
      return;
    }
    irPara(passo + 1);
  }

  /** Leva a pessoa ao primeiro campo com erro, no bloco onde ele mora (§4.6). */
  function levarAoErro(quais: ErrosInscricao): void {
    const campos = CAMPOS.filter((c) => quais[c] !== undefined);
    marcar(campos);
    const bloco = primeiroBlocoComErro(quais);
    if (bloco !== null) setPasso(bloco);
    if (campos.length > 0) pedidoDeFoco.current = idDoCampo(campos[0]);
    setAviso(COPY_INSCRICAO.envio.invalido);
  }

  async function enviar(): Promise<void> {
    const payload = paraEnvio(rascunho);

    // A mesma validação do servidor, rodada aqui antes de gastar uma viagem.
    const conferida = validarInscricao(payload);
    if (!conferida.ok) {
      levarAoErro(conferida.erros);
      return;
    }

    setEnviando(true);
    setAviso(null);
    try {
      const resposta = await fetch(ROTA_API, {
        method: "POST",
        headers: { "content-type": "application/json" },
        // O campo-armadilha é lido do DOM, e não de um estado do React: um robô
        // que preenche o formulário mexendo no `value` do elemento não dispara
        // evento nenhum, e um honeypot controlado por estado chegaria vazio.
        body: JSON.stringify({
          ...payload,
          [CAMPO_HONEYPOT]: armadilha.current?.value ?? "",
        }),
      });

      const cru: unknown = await resposta.json().catch(() => null);
      const corpo = (cru !== null && typeof cru === "object" ? cru : {}) as {
        ok?: unknown;
        atualizada?: unknown;
        emailAtivo?: unknown;
        erros?: unknown;
      };

      if (resposta.ok && corpo.ok === true) {
        apagaGuardado();
        // O mesmo mecanismo das trocas de bloco, pelo mesmo motivo: sem isto o
        // foco morre junto com o `<form>` que sai do DOM.
        pedidoDeFoco.current = ID_CONFIRMACAO;
        setConfirmacao(
          confirmacaoDe({
            atualizada: corpo.atualizada === true,
            emailAtivo: corpo.emailAtivo === true,
          }),
        );
        return;
      }

      if (resposta.status === 400) {
        const doServidor = (
          corpo.erros !== null && typeof corpo.erros === "object" ? corpo.erros : {}
        ) as ErrosInscricao;
        setErrosServidor(doServidor);
        levarAoErro(doServidor);
        return;
      }

      if (resposta.status === 429) {
        setAviso(COPY_INSCRICAO.envio.limite);
        return;
      }

      if (resposta.status === 409) {
        setAviso(COPY_INSCRICAO.envio.encerrado);
        return;
      }

      setAviso(COPY_INSCRICAO.envio.servidor);
    } catch {
      // `fetch` só lança por rede — o servidor respondendo 500 cai no `else`
      // acima. O rascunho continua guardado e o botão volta a funcionar.
      setAviso(COPY_INSCRICAO.envio.rede);
    } finally {
      setEnviando(false);
    }
  }

  function aoSubmeter(evento: FormEvent<HTMLFormElement>): void {
    evento.preventDefault();
    if (enviando) return;
    if (passo === TOTAL_BLOCOS - 1) void enviar();
    else avancar();
  }

  /* ── As telas ───────────────────────────────────────────────────────────── */

  if (confirmacao !== null) {
    const tese = COPY_INSCRICAO.confirmacao.tese;
    return (
      <section className={estilos.tela} data-tela="confirmacao">
        <p className={`label ${estilos.rotuloTela}`}>{COPY_INSCRICAO.confirmacao.rotulo}</p>
        <h1 className={estilos.titulo} id={ID_CONFIRMACAO} tabIndex={-1}>
          {confirmacao.titulo}
        </h1>
        {confirmacao.linhas.map((linha) => (
          <p key={linha} className={estilos.linha}>
            {linha}
          </p>
        ))}
        <p className={estilos.linha}>{tese.convite}</p>
        <Link className={`label ${estilos.saida}`} href={tese.href}>
          {tese.botao}
        </Link>
      </section>
    );
  }

  if (passo === ABERTURA) {
    const a = COPY_INSCRICAO.abertura;
    return (
      <>
        <Progresso atual={null} aoVoltarPara={irPara} />
        <section className={estilos.tela} data-tela="abertura" ref={telaRef}>
          <p className={`label ${estilos.rotuloTela}`}>{a.rotulo}</p>
          <h1 className={estilos.titulo}>{a.titulo}</h1>
          {a.linhas.map((linha) => (
            <p key={linha} className={estilos.linha}>
              {linha}
            </p>
          ))}
          <button type="button" className={estilos.primario} onClick={() => irPara(0)}>
            {a.botao}
          </button>
        </section>
      </>
    );
  }

  const ultimo = passo === TOTAL_BLOCOS - 1;
  const nav = COPY_INSCRICAO.navegacao;

  return (
    <>
      <Progresso atual={passo} aoVoltarPara={irPara} />

      <form className={estilos.forma} onSubmit={aoSubmeter} noValidate>
        {/* `key={passo}` remonta o bloco a cada troca, e é só isso que a
            animação de entrada precisa. Nada espera por ela. */}
        <section
          key={passo}
          ref={telaRef}
          className={estilos.bloco}
          data-bloco={passo}
          aria-labelledby="insc-titulo-bloco"
        >
          <h1 id="insc-titulo-bloco" className={estilos.tituloBloco}>
            {COPY_INSCRICAO.blocos[passo].titulo}
          </h1>
          {conteudo(passo, rascunho, erros, atualizar)}
        </section>

        {/* O campo-armadilha da §8. Fora da tela, mas não `display: none` —
            robô bom ignora o que está com `display: none`, e o campo perderia a
            função. `aria-hidden` e `tabindex="-1"` o tiram do caminho de quem
            usa leitor de tela e de quem navega por Tab. */}
        <input
          ref={armadilha}
          className={estilos.armadilha}
          type="text"
          name={CAMPO_HONEYPOT}
          defaultValue=""
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />

        {aviso !== null && (
          <p className={estilos.aviso} role="alert">
            {aviso}
          </p>
        )}

        <div className={estilos.navegacao}>
          <button
            type="button"
            className={estilos.secundario}
            onClick={() => irPara(passo - 1)}
            disabled={enviando}
          >
            {nav.voltar}
          </button>
          <button type="submit" className={estilos.primario} disabled={enviando}>
            {enviando ? nav.enviando : ultimo ? nav.enviar : nav.avancar}
          </button>
        </div>
      </form>
    </>
  );
}

/* ── Os seis blocos ──────────────────────────────────────────────────────── */

/**
 * Os campos de cada bloco, na ordem da tela.
 *
 * Função solta e não um componente por bloco: eles não têm estado próprio, não
 * são reusados e mudam sempre junto com o `Rascunho`. Seis componentes só
 * acrescentariam seis listas de props idênticas.
 */
function conteudo(
  passo: number,
  r: Rascunho,
  erros: ErrosInscricao,
  atualizar: <K extends keyof Rascunho>(campo: K, valor: Rascunho[K]) => void,
) {
  switch (passo) {
    case 0:
      return (
        <>
          <CampoTexto
            campo="nome"
            valor={r.nome}
            aoMudar={(v) => atualizar("nome", v)}
            erro={erros.nome}
            preenchimento="name"
          />
          <CampoTexto
            campo="email"
            tipo="email"
            modo="email"
            preenchimento="email"
            valor={r.email}
            aoMudar={(v) => atualizar("email", v)}
            erro={erros.email}
          />
          <CampoTexto
            campo="whatsapp"
            tipo="tel"
            modo="tel"
            preenchimento="tel"
            valor={mascaraWhatsapp(r.whatsapp)}
            aoMudar={(v) => atualizar("whatsapp", digitosDoWhatsapp(v, r.whatsapp))}
            erro={erros.whatsapp}
          />
          <CampoTexto
            campo="idade"
            modo="numeric"
            valor={r.idade}
            aoMudar={(v) => atualizar("idade", soDigitos(v))}
            erro={erros.idade}
          />
          <CampoSelect
            campo="estado"
            opcoes={OPCOES.estado}
            valor={r.estado}
            aoMudar={(v) => atualizar("estado", v)}
            erro={erros.estado}
          />
          <CampoTexto
            campo="cidade"
            preenchimento="address-level2"
            valor={r.cidade}
            aoMudar={(v) => atualizar("cidade", v)}
            erro={erros.cidade}
          />
          {/* `type="text"` e não `type="url"`: o campo aceita só o usuário do
              LinkedIn (spec §4.1), que não é URL nenhuma. O `inputmode` já dá o
              teclado com barra e ponto no celular. */}
          <CampoTexto
            campo="linkedin"
            modo="url"
            valor={r.linkedin}
            aoMudar={(v) => atualizar("linkedin", v)}
            erro={erros.linkedin}
          />
        </>
      );

    case 1:
      return (
        <>
          <CampoSelect
            campo="instituicao"
            opcoes={OPCOES.instituicao}
            valor={r.instituicao}
            aoMudar={(v) => atualizar("instituicao", v)}
            erro={erros.instituicao}
          />
          {r.instituicao === ABRE_CAMPO.instituicaoOutra && (
            <CampoTexto
              campo="instituicao_outra"
              valor={r.instituicao_outra}
              aoMudar={(v) => atualizar("instituicao_outra", v)}
              erro={erros.instituicao_outra}
            />
          )}
          {r.instituicao === ABRE_CAMPO.unidadeUsp && (
            <ListaEscolha
              campo="unidade_usp"
              opcoes={OPCOES.unidade_usp}
              valor={r.unidade_usp}
              aoMudar={(v) => atualizar("unidade_usp", v)}
              erro={erros.unidade_usp}
            />
          )}
          {/* Condicional dentro de condicional: a unidade só existe para quem é
              da USP, e o campo aberto só existe para quem escolheu `Outra`
              dentro dela. A primeira metade da condição não é redundante — sem
              ela, trocar a instituição para outra coisa deixaria este campo na
              tela com o valor antigo ainda escolhido. */}
          {r.instituicao === ABRE_CAMPO.unidadeUsp &&
            r.unidade_usp === ABRE_CAMPO.unidadeUspOutra && (
              <CampoTexto
                campo="unidade_usp_outra"
                valor={r.unidade_usp_outra}
                aoMudar={(v) => atualizar("unidade_usp_outra", v)}
                erro={erros.unidade_usp_outra}
              />
            )}
          <ComboboxCurso
            valor={r.curso}
            aoEscolher={(v) => atualizar("curso", v)}
            erro={erros.curso}
          />
          {r.curso === ABRE_CAMPO.cursoOutro && (
            <CampoTexto
              campo="curso_outro"
              valor={r.curso_outro}
              aoMudar={(v) => atualizar("curso_outro", v)}
              erro={erros.curso_outro}
            />
          )}
          <CampoSelect
            campo="ano_atual"
            opcoes={OPCOES.ano_atual}
            valor={r.ano_atual}
            aoMudar={(v) => atualizar("ano_atual", v)}
            erro={erros.ano_atual}
          />
          <CampoSelect
            campo="conclusao_prevista"
            opcoes={OPCOES.conclusao_prevista}
            valor={r.conclusao_prevista}
            aoMudar={(v) => atualizar("conclusao_prevista", v)}
            erro={erros.conclusao_prevista}
          />
          <Premios
            valores={r.premios}
            aoMudar={(v) => atualizar("premios", v)}
            erro={erros.premios}
          />
        </>
      );

    case 2:
      return (
        <>
          <ListaEscolha
            campo="nivel_ai"
            opcoes={OPCOES.nivel_ai}
            valor={r.nivel_ai}
            aoMudar={(v) => atualizar("nivel_ai", v)}
            erro={erros.nivel_ai}
          />
          <ListaMarcacao
            campo="ferramentas_ai"
            opcoes={FERRAMENTAS_AI}
            marcadas={r.ferramentas_ai}
            aoMudar={(v) => atualizar("ferramentas_ai", v)}
            erro={erros.ferramentas_ai}
          />
          <ListaEscolha
            campo="ai_estudos"
            opcoes={OPCOES.ai_estudos}
            valor={r.ai_estudos}
            aoMudar={(v) => atualizar("ai_estudos", v)}
            erro={erros.ai_estudos}
          />
          <CampoTextoLongo
            campo="historia_ai"
            limite={LIMITES.textoLivre}
            valor={r.historia_ai}
            aoMudar={(v) => atualizar("historia_ai", v)}
            erro={erros.historia_ai}
          />
        </>
      );

    case 3:
      return (
        <>
          <ListaEscolha
            campo="situacao"
            opcoes={OPCOES.situacao}
            valor={r.situacao}
            aoMudar={(v) => atualizar("situacao", v)}
            erro={erros.situacao}
          />
          {r.situacao === ABRE_CAMPO.situacaoOutra && (
            <CampoTexto
              campo="situacao_outra"
              valor={r.situacao_outra}
              aoMudar={(v) => atualizar("situacao_outra", v)}
              erro={erros.situacao_outra}
            />
          )}
          <ListaEscolha
            campo="ai_trabalho"
            opcoes={OPCOES.ai_trabalho}
            valor={r.ai_trabalho}
            aoMudar={(v) => atualizar("ai_trabalho", v)}
            erro={erros.ai_trabalho}
          />
          <ListaEscolha
            campo="empreendedorismo"
            opcoes={OPCOES.empreendedorismo}
            valor={r.empreendedorismo}
            aoMudar={(v) => atualizar("empreendedorismo", v)}
            erro={erros.empreendedorismo}
          />
        </>
      );

    case 4:
      return (
        <>
          <ListaEscolha
            campo="disponibilidade"
            opcoes={OPCOES.disponibilidade}
            valor={r.disponibilidade}
            aoMudar={(v) => atualizar("disponibilidade", v)}
            erro={erros.disponibilidade}
          />
          <CampoSelect
            campo="origem"
            opcoes={OPCOES.origem}
            valor={r.origem}
            aoMudar={(v) => atualizar("origem", v)}
            erro={erros.origem}
          />
          {r.origem === ABRE_CAMPO.quemIndicou && (
            <CampoTexto
              campo="origem_quem_indicou"
              valor={r.origem_quem_indicou}
              aoMudar={(v) => atualizar("origem_quem_indicou", v)}
              erro={erros.origem_quem_indicou}
            />
          )}
          {r.origem === ABRE_CAMPO.origemOutra && (
            <CampoTexto
              campo="origem_outra"
              valor={r.origem_outra}
              aoMudar={(v) => atualizar("origem_outra", v)}
              erro={erros.origem_outra}
            />
          )}
          <CampoTextoLongo
            campo="origem_detalhe"
            limite={LIMITES.textoLivre}
            valor={r.origem_detalhe}
            aoMudar={(v) => atualizar("origem_detalhe", v)}
            erro={erros.origem_detalhe}
          />
          <CampoTextoLongo
            campo="algo_mais"
            limite={LIMITES.textoLivre}
            valor={r.algo_mais}
            aoMudar={(v) => atualizar("algo_mais", v)}
            erro={erros.algo_mais}
          />
        </>
      );

    // O último bloco. É o `default` e não um `case 5` pela mesma razão de
    // antes: `TOTAL_BLOCOS` sai do tamanho de `COPY_INSCRICAO.blocos`, e um
    // `switch` sem saída padrão devolveria `undefined` — tela branca — no dia
    // em que alguém acrescentasse um bloco à copy e esquecesse daqui.
    default:
      return (
        <>
          <Indicacoes
            valores={r.indicacoes}
            aoMudar={(v) => atualizar("indicacoes", v)}
            erro={erros.indicacoes}
          />
          <CampoAceite
            marcado={r.aceite_dados}
            aoMudar={(v) => atualizar("aceite_dados", v)}
            erro={erros.aceite_dados}
          />
        </>
      );
  }
}
