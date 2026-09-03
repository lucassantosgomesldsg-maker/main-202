import { createHash } from "node:crypto";

import {
  CAMPO_HONEYPOT,
  validarInscricao,
  type ErrosInscricao,
} from "@/lib/inscricao";
import {
  repositorioConfigurado,
  type RepositorioInscricoes,
} from "@/lib/inscricao-banco";
import { ErroDoCrm } from "@/lib/inscricao-crm";
import { emailAtivo, enviarConfirmacao } from "@/lib/inscricao-email";

/**
 * O único caminho pelo qual uma inscrição chega ao banco.
 *
 * O navegador **nunca** fala com o Supabase (spec §6.2). Ele fala com esta
 * rota, e esta rota escreve com a `service_role key`, que ignora RLS e vive só
 * em variável de ambiente do servidor. A tabela do outro lado guarda nome,
 * e-mail, telefone e idade de estudantes, alguns menores — não é lugar de
 * confiar numa chave que o bundle do cliente carrega.
 *
 * ── A ordem das checagens é a própria política ──────────────────────────────
 * Ela não é arbitrária, e mudar a ordem muda o comportamento:
 *
 * 1. O corpo é lido com tolerância. Corpo vazio, JSON quebrado ou
 *    `Content-Type` errado viram `400`, nunca uma exceção crua — um `500` aqui
 *    seria indistinguível de "o banco caiu" para quem for ler o log depois.
 * 2. **Honeypot antes de tudo.** Antes de validar e antes de tocar no banco: o
 *    robô não pode nem descobrir se o payload dele estava bem formado, e nada
 *    do que ele mandou custa uma consulta.
 * 3. O interruptor da §9.4, que é o único caso em que a resposta certa é "não,
 *    e não é culpa sua".
 * 4. A validação — a **mesma** função que roda no navegador. Se o cliente
 *    deixou passar, aqui recusa com a mesma frase, sem uma segunda cópia das
 *    regras.
 * 5. O hash do IP, que a cota precisa.
 * 6. A cota por IP.
 * 7. A gravação.
 * 8. O e-mail, **depois** de gravar e dentro de um `try/catch` que engole tudo.
 *
 * ── Nenhuma string em português sai daqui ───────────────────────────────────
 * O corpo da resposta leva ou os `erros` da fundação (que já vêm com a frase
 * certa) ou um `motivo` em token curto, que a interface traduz com
 * `COPY_INSCRICAO.envio.*`. O texto visível continua morando num arquivo só.
 * Os `console.error` abaixo são exceção consciente: são diagnóstico de
 * servidor, ninguém os lê numa tela, e eles seguem o idioma do repo.
 */

/** Cinco por hora, do mesmo `ip_hash` (spec §8). A sexta é recusada. */
const LIMITE_POR_IP = 5;

/**
 * O gancho de injeção dos testes, e por que ele é seguro.
 *
 * `lib/inscricao-servidor.test.ts` chama `POST` com um `Request` montado à mão,
 * sem subir servidor e sem rede — e para isso precisa trocar o repositório real
 * por `repositorioFake()`. A alternativa seria um segundo parâmetro em `POST`,
 * mas a assinatura de um Route Handler é verificada pelo tipo gerado do Next
 * (`.next/types/validator.ts`), e o segundo argumento ali é o `context` do
 * framework — pendurar um dublê nele seria contrabando.
 *
 * O que impede isto de virar uma porta em produção é o `throw`: em
 * `NODE_ENV === "production"` a função não injeta nada, ela quebra. E ela não é
 * alcançável por HTTP de jeito nenhum — não é um campo do payload, é um export
 * do módulo, que só outro módulo do próprio servidor conseguiria chamar.
 */
type DublesDeTeste = { repositorio: RepositorioInscricoes };
let dubles: DublesDeTeste | null = null;

export function definirDublesDeTeste(novos: DublesDeTeste | null): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("definirDublesDeTeste não existe em produção");
  }
  dubles = novos;
}

/** O corpo de recusa por validação. A frase de cada campo vem da fundação. */
function recusaPorValidacao(erros: ErrosInscricao): Response {
  return Response.json({ ok: false, erros }, { status: 400 });
}

function recusa(motivo: "limite" | "encerrado" | "servidor", status: number): Response {
  return Response.json({ ok: false, motivo }, { status });
}

/**
 * Diz se o campo-armadilha veio preenchido.
 *
 * O nome do campo é importado de `lib/inscricao.ts` e não escrito aqui: um
 * honeypot com nome diferente dos dois lados é um honeypot desligado, e
 * desligado em silêncio.
 *
 * Qualquer valor que não seja string vazia conta como preenchido — inclusive
 * número, `true` ou objeto. Um formulário de verdade manda `""`; um robô que
 * manda outra coisa qualquer já se identificou.
 */
function honeypotPreenchido(corpo: unknown): boolean {
  if (typeof corpo !== "object" || corpo === null) return false;
  const valor = (corpo as Record<string, unknown>)[CAMPO_HONEYPOT];
  if (valor === undefined || valor === null) return false;
  if (typeof valor === "string") return valor.trim() !== "";
  return true;
}

/**
 * O IP de quem enviou.
 *
 * `NextRequest.ip` foi **removido** no Next 15, então o IP sai do cabeçalho na
 * mão. Na Vercel o `x-forwarded-for` é uma lista encadeada de proxies e o
 * cliente é o **primeiro** item; pegar o último devolveria o IP de um proxy da
 * própria Vercel e jogaria todo mundo na mesma cota.
 *
 * Sem cabeçalho nenhum — `next dev` na máquina, um teste — todo mundo cai no
 * mesmo balde `sem-ip`. Isso é de propósito: uma requisição sem origem
 * declarada é exatamente o tipo que interessa limitar, e agrupá-las erra para o
 * lado seguro.
 */
function ipDaRequisicao(request: Request): string {
  const encadeado = request.headers.get("x-forwarded-for");
  const primeiro = encadeado?.split(",")[0]?.trim();
  if (primeiro) return primeiro;
  const real = request.headers.get("x-real-ip")?.trim();
  return real && real !== "" ? real : "sem-ip";
}

export async function POST(request: Request): Promise<Response> {
  // O interruptor do e-mail vai na resposta para que a tela de confirmação
  // saiba se pode prometer e-mail (spec §4.7) sem que o cliente precise ler
  // variável de ambiente — o que exigiria um `NEXT_PUBLIC_`, e é justamente o
  // que esta página não faz.
  const emailLigado = emailAtivo();

  try {
    /* 1 — o corpo, com tolerância */
    let corpo: unknown;
    try {
      corpo = await request.json();
    } catch {
      // Corpo vazio, JSON quebrado, `Content-Type` de formulário: tudo isso é
      // "não veio inscrição nenhuma". `validarInscricao(undefined)` devolve,
      // sozinha, a frase certa em cada campo obrigatório — a mesma que o
      // navegador mostraria.
      return recusaPorValidacao(validarInscricao(undefined).erros);
    }

    /* 2 — honeypot, antes de validar e antes de tocar no banco */
    if (honeypotPreenchido(corpo)) {
      // Resposta de sucesso, e nada gravado (spec §8). O robô precisa acreditar
      // que funcionou: uma recusa explícita ensina o autor a tirar o campo.
      return Response.json({ ok: true, atualizada: false, emailAtivo: emailLigado });
    }

    // O repositório é resolvido uma vez. `null` aqui significa "nenhum destino
    // configurado" — nem o CRM, nem um Supabase próprio —, que é um estado
    // esperado e que só vira erro no passo da gravação, para que um payload
    // inválido continue recebendo o `400` informativo em vez de um `500`
    // genérico.
    const repositorio: RepositorioInscricoes | null =
      dubles?.repositorio ?? repositorioConfigurado();

    /* 3 — o interruptor da §9.4 */
    let abertas = true;
    if (repositorio) {
      try {
        abertas = await repositorio.inscricoesAbertas();
      } catch (erro) {
        // Banco fora do ar não pode fechar as inscrições sozinho: quem recebeu
        // o link naquele minuto veria "encerradas" e não voltaria. O envio
        // falha adiante, no `salvar`, com o preenchimento preservado.
        console.error("[inscricao] não deu para ler o interruptor:", erro);
      }
    }
    if (!abertas) return recusa("encerrado", 409);

    /* 4 — a mesma validação do navegador */
    const validado = validarInscricao(corpo);
    if (!validado.ok || validado.valor === undefined) {
      return recusaPorValidacao(validado.erros);
    }
    const inscricao = validado.valor;

    /* 5 — o hash do IP */
    const sal = process.env.IP_SALT;
    if (!sal) {
      // Recusar, e não gravar um hash sem sal. `sha256(ip)` sozinho é
      // reversível por força bruta: os ~4 bilhões de IPv4 cabem numa tabela que
      // se monta num notebook, e o "hash anônimo" viraria o IP de volta. Um
      // dado pessoal gravado por engano não dá para desgravar depois — a
      // inscrição perdida, sim, dá para refazer assim que a variável entrar.
      console.error("[inscricao] IP_SALT ausente: envio recusado para não gravar hash sem sal");
      return recusa("servidor", 500);
    }
    const ipHash = createHash("sha256")
      .update(ipDaRequisicao(request) + sal)
      .digest("hex");

    /* 6 — a cota por IP */
    if (!repositorio) {
      // Nunca cair no `repositorioFake()` aqui. Inscrição gravada em memória
      // morre no próximo deploy, e a pessoa teria visto a tela de confirmação.
      console.error(
        "[inscricao] nem CRM_INTEREST_URL nem SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY: " +
          "a inscrição NÃO foi gravada",
      );
      return recusa("servidor", 500);
    }

    try {
      const criadasNaHora = await repositorio.contarPorIpNaUltimaHora(ipHash);
      // A cota conta inscrições **criadas**, então reenvio da mesma pessoa (que
      // é update) não a consome. O efeito colateral conhecido: quem estiver
      // atrás de um IP que já criou cinco fichas na última hora — uma sala de
      // aula, um NAT de campus — leva `429` mesmo ao corrigir a própria
      // inscrição. Cinco por hora é largo o bastante para isso ser raro, e o
      // texto da §7 pede para tentar de novo daqui a pouco.
      if (criadasNaHora >= LIMITE_POR_IP) return recusa("limite", 429);
    } catch (erro) {
      console.error("[inscricao] falha ao contar a cota do IP:", erro);
      return recusa("servidor", 500);
    }

    /* 7 — gravar */
    let atualizada = false;
    try {
      ({ atualizada } = await repositorio.salvar(inscricao, { ipHash }));
    } catch (erro) {
      console.error("[inscricao] falha ao gravar a inscrição:", erro);

      /*
       * O CRM sabe dizer *por que* recusou, e a diferença chega até a pessoa.
       *
       * Sem isto, um `429` do CRM viraria "deu um problema do nosso lado" — a
       * frase de falha nossa, mandando tentar de novo alguém que só precisa
       * esperar —, e um `409` diria a mesma coisa sobre inscrições que foram
       * encerradas de verdade. Os três motivos já têm frase própria em
       * `COPY_INSCRICAO.envio`; o que faltava era carregá-los até aqui.
       */
      if (erro instanceof ErroDoCrm) {
        return recusa(
          erro.motivo,
          erro.motivo === "limite" ? 429 : erro.motivo === "encerrado" ? 409 : 500,
        );
      }

      return recusa("servidor", 500);
    }

    /* 8 — o e-mail, que não pode derrubar o que já está gravado */
    try {
      await enviarConfirmacao(inscricao, { atualizada });
    } catch (erro) {
      // Registrado, não propagado (spec §7). Uma inscrição perdida é
      // irrecuperável; um e-mail não enviado é um aborrecimento — e a tela de
      // confirmação com e-mail prometido e não entregue é o menor dos males,
      // porque ela manda olhar o spam e a 202 ainda tem o WhatsApp da pessoa.
      console.error("[inscricao] inscrição gravada, e-mail não enviado:", erro);
    }

    return Response.json({ ok: true, atualizada, emailAtivo: emailLigado });
  } catch (erro) {
    // A rede de segurança. Nada acima deveria chegar aqui; se chegar, o log tem
    // o motivo e a pessoa recebe a mensagem de erro de servidor da §7 com o
    // preenchimento preservado, em vez da página de erro do Next.
    console.error("[inscricao] falha não prevista no envio:", erro);
    return recusa("servidor", 500);
  }
}
