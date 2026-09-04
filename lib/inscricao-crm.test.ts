import { afterEach, describe, expect, it, vi } from "vitest";

import { COPY_INSCRICAO, validarInscricao, type Inscricao } from "./inscricao";
import { ErroDoCrm, ambienteCrm, repositorioCrm } from "./inscricao-crm";

/**
 * A inscrição indo para o CRM.
 *
 * Sem rede: `fetch` é trocado por um dublê que guarda o que foi enviado, que é
 * a única coisa que este arquivo precisa observar. O que ele exercita é o
 * contrato — o marcador, o consentimento e o hash — e a tradução dos três
 * motivos que o CRM sabe dar, porque é ela que decide qual frase da §7 a pessoa
 * lê quando o envio não passa.
 */

const AMBIENTE = { url: "https://crm.exemplo/api/tracks/trilha-outubro/interest", token: null };

/** Uma inscrição válida, montada pela mesma validação que a rota usa. */
function inscricaoValida(): Inscricao {
  const resultado = validarInscricao({
    nome: "Maria Clara de Souza Almeida",
    email: "maria.clara@usp.br",
    whatsapp: "(11) 91234-5678",
    idade: 21,
    estado: "SP",
    cidade: "São Paulo",
    linkedin: "linkedin.com/in/maria-clara",
    instituicao: "USP",
    unidade_usp: "POLI",
    curso: "Eng. de Computação",
    ano_atual: "3",
    conclusao_prevista: "2028",
    premios: ["Medalha de ouro na OBMEP 2023"],
    nivel_ai: 3,
    ferramentas_ai: ["CLAUDE"],
    ai_estudos: "QUASE_TODO_DIA",
    historia_ai: "Construí um agente que lê os PDFs das aulas.",
    situacao: "ESTAGIO",
    ai_trabalho: "CENTRAL",
    empreendedorismo: 2,
    disponibilidade: "DE_10_A_20H",
    origem: "INSTAGRAM",
    aceite_dados: true,
  });

  if (!resultado.ok || !resultado.valor) {
    throw new Error(`fixture inválida: ${JSON.stringify(resultado.erros)}`);
  }
  return resultado.valor;
}

function responder(status: number, corpo: unknown = {}) {
  const enviados: { url: string; init: RequestInit }[] = [];

  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    enviados.push({ url, init });
    return new Response(JSON.stringify(corpo), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  });

  return enviados;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("o que viaja para o CRM", () => {
  it("manda o objeto validado inteiro, e não uma lista escrita à mão", async () => {
    const enviados = responder(201, { status: "received" });

    await repositorioCrm(AMBIENTE).salvar(inscricaoValida(), { ipHash: "a".repeat(64) });

    const corpo = JSON.parse(String(enviados[0].init.body));

    // O spread é o ponto: `validarInscricao` decide o que existe em
    // `Inscricao`, e o CRM guarda qualquer chave que não conheça. Uma lista
    // escrita aqui seria uma terceira cópia para ficar fora de sincronia — e o
    // modo de falhar seria a pergunta nova do formulário chegando em branco,
    // em silêncio.
    expect(corpo.curso).toBe("Eng. de Computação");
    expect(corpo.ferramentas_ai).toEqual(["CLAUDE"]);
    expect(corpo.premios).toEqual(["Medalha de ouro na OBMEP 2023"]);
    expect(corpo.disponibilidade).toBe("DE_10_A_20H");
  });

  it("se identifica, para o CRM ler as respostas como respostas", async () => {
    const enviados = responder(201);
    await repositorioCrm(AMBIENTE).salvar(inscricaoValida(), { ipHash: "b".repeat(64) });

    // Sem o marcador, `origem` é lida como "por qual porta a linha entrou" —
    // que é a coluna de onde a conversão decide se escreve um consentimento.
    expect(JSON.parse(String(enviados[0].init.body)).form).toBe("inscricao-trilha-v1");
  });

  it("manda a frase do aceite, e não só o booleano", async () => {
    const enviados = responder(201);
    await repositorioCrm(AMBIENTE).salvar(inscricaoValida(), { ipHash: "c".repeat(64) });

    const corpo = JSON.parse(String(enviados[0].init.body));

    // `aceite_dados: true` diz que ela marcou a caixa; não diz com o que
    // concordou, e é a segunda coisa que a LGPD pede registrar. Montada da
    // copy: duas cópias de um texto divergem, e esta divergiria justo para o
    // lado em que o registro diz uma coisa e a tela dizia outra.
    expect(corpo.aceite_dados).toBe(true);
    expect(corpo.consentimento).toContain(COPY_INSCRICAO.aceite.rotulo);
    expect(corpo.consentimento).toContain(COPY_INSCRICAO.aceite.menores);
  });

  it("manda o hash do endereço, e nunca o endereço", async () => {
    const enviados = responder(201);
    await repositorioCrm(AMBIENTE).salvar(inscricaoValida(), { ipHash: "d".repeat(64) });

    const corpo = JSON.parse(String(enviados[0].init.body));
    expect(corpo.ip_hash).toBe("d".repeat(64));
    expect(JSON.stringify(corpo)).not.toContain("IP_SALT");
  });

  it("leva o token no cabeçalho quando ele existe", async () => {
    const enviados = responder(201);
    await repositorioCrm({ ...AMBIENTE, token: "segredo" }).salvar(inscricaoValida(), {
      ipHash: "e".repeat(64),
    });

    const headers = enviados[0].init.headers as Record<string, string>;
    expect(headers["x-form-token"]).toBe("segredo");
  });
});

describe("a resposta do CRM", () => {
  it("nunca diz que atualizou, porque o CRM não conta isso", async () => {
    responder(201, { status: "received" });

    // O CRM responde igual para inscrição nova e reenvio, de propósito: uma
    // resposta diferente diz, uma requisição por vez, quais e-mails já se
    // inscreveram.
    const { atualizada } = await repositorioCrm(AMBIENTE).salvar(inscricaoValida(), {
      ipHash: "f".repeat(64),
    });
    expect(atualizada).toBe(false);
  });

  it.each([
    [409, "encerrado"],
    [429, "limite"],
    [500, "servidor"],
    [422, "servidor"],
    [401, "servidor"],
  ])("traduz %i em %s", async (status, motivo) => {
    responder(status, { error: "..." });

    // Sem isto um 429 viraria "deu um problema do nosso lado" — a frase de
    // falha nossa, mandando tentar de novo alguém que só precisa esperar.
    const erro = await repositorioCrm(AMBIENTE)
      .salvar(inscricaoValida(), { ipHash: "0".repeat(64) })
      .then(
        () => null,
        (e: unknown) => e,
      );

    expect(erro).toBeInstanceOf(ErroDoCrm);
    expect((erro as ErroDoCrm).motivo).toBe(motivo);
  });
});

describe("o interruptor", () => {
  it("lê o que o CRM responde", async () => {
    responder(200, { aberta: false });
    expect(await repositorioCrm(AMBIENTE).inscricoesAbertas()).toBe(false);
  });

  it.each([
    ["erro de servidor", 500, {}],
    ["resposta sem o campo", 200, { outra: "coisa" }],
  ])("abre no caso de %s", async (_rotulo, status, corpo) => {
    // Fechar no erro deixaria uma falha passageira mostrar "inscrições
    // encerradas" para quem recebeu o link naquele minuto, e isso é
    // irrecuperável: a pessoa não volta.
    responder(status, corpo);
    expect(await repositorioCrm(AMBIENTE).inscricoesAbertas()).toBe(true);
  });
});

describe("a cota por endereço", () => {
  it("é zero aqui, porque esta página não tem mais linhas para contar", async () => {
    responder(201);
    // Ela não sumiu: foi para onde as linhas estão. O `ip_hash` viaja no corpo
    // e o CRM responde 429, que vira o mesmo motivo `limite` acima.
    expect(await repositorioCrm(AMBIENTE).contarPorIpNaUltimaHora("x")).toBe(0);
  });
});

describe("ler o ambiente", () => {
  it("devolve null quando o CRM não foi configurado", () => {
    vi.stubEnv("CRM_INTEREST_URL", "");
    expect(ambienteCrm()).toBeNull();
  });

  it("lê a URL e o token, sem espaços nas pontas", () => {
    vi.stubEnv("CRM_INTEREST_URL", "  https://crm.exemplo/x  ");
    vi.stubEnv("CRM_INTEREST_FORM_TOKEN", "  segredo  ");
    expect(ambienteCrm()).toEqual({ url: "https://crm.exemplo/x", token: "segredo" });
  });

  it("um token vazio é ausência, e não um token de string vazia", () => {
    vi.stubEnv("CRM_INTEREST_URL", "https://crm.exemplo/x");
    vi.stubEnv("CRM_INTEREST_FORM_TOKEN", "");
    expect(ambienteCrm()?.token).toBeNull();
  });
});
