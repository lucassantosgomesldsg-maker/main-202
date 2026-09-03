import { COPY_INSCRICAO, type Inscricao } from "./inscricao";
import type { RepositorioInscricoes } from "./inscricao-banco";

/**
 * A inscrição indo para o CRM da 202, e não para um banco desta página.
 *
 * ── Por que HTTP e não a `service_role key` do Supabase do CRM ───────────────
 *
 * O caminho óbvio seria apontar `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`
 * para o projeto do CRM e continuar usando `repositorioSupabase`. É o que menos
 * código muda, e é a decisão errada: a `service_role` **ignora RLS em todas as
 * tabelas**. Uma landing page pública com essa chave nas variáveis de ambiente
 * é uma landing page que pode ler todos os parceiros, todas as pessoas, todo o
 * pipeline comercial e a fila de propostas de IA do CRM. O escopo que a chave
 * dá não tem relação nenhuma com a única coisa que esta página precisa fazer.
 *
 * O CRM já tem a porta certa: `POST /api/tracks/<codigo>/interest`, escrita
 * exatamente para uma landing page anônima. Ela só escreve numa tabela de
 * staging, aplica os próprios freios, e nenhuma resposta dela conta nada sobre
 * o CRM. O que esta página guarda é a URL dessa porta e, opcionalmente, um
 * token compartilhado — e se os dois vazarem, o que se ganha é poder mandar
 * inscrição, que é o que qualquer navegador já pode fazer.
 *
 * ── O que muda de comportamento, e é de propósito ────────────────────────────
 *
 * `salvar` devolve sempre `atualizada: false`. O CRM responde **igual** para
 * uma inscrição nova e para um reenvio, e isso não é um descuido dele: uma
 * resposta diferente para cada caso diz, uma requisição por vez, quais e-mails
 * já se inscreveram — que é a lista de quem está procurando o quê, legível por
 * quem achar a URL. A tela de confirmação passa a dizer a mesma coisa nos dois
 * casos, que continua sendo verdade: recebemos.
 *
 * `contarPorIpNaUltimaHora` devolve sempre 0, porque esta página não tem mais
 * banco para contar. A cota por endereço não sumiu: ela foi para onde as linhas
 * estão. O `ip_hash` viaja no payload e o CRM responde `429`, que vira a mesma
 * mensagem da §7 que o limite local produzia.
 */

/** O contrato que o CRM lê. Versionado no valor: ver `INSCRICAO_FORM_ID` lá. */
const FORMULARIO = "inscricao-trilha-v1";

/**
 * A frase que a pessoa leu antes de marcar a caixa.
 *
 * `aceite_dados: true` diz que ela marcou; **não** diz com o que concordou. O
 * que a LGPD pede registrar é a segunda coisa, e é a segunda coisa que o CRM
 * carrega adiante: ao converter a inscrição num talento, este texto vira o
 * `consent_note` do perfil, e é ele que a trava de matrícula exige. Um
 * consentimento que ninguém consegue ler depois é um consentimento que ninguém
 * consegue defender.
 *
 * Montada a partir da copy e não escrita à mão aqui, pelo motivo de sempre:
 * duas cópias de um texto divergem, e esta divergiria justamente para o lado em
 * que o registro diz uma coisa e a tela dizia outra. As três linhas são
 * exatamente as três que aparecem no bloco de aceite, na ordem em que aparecem.
 *
 * Encontrado enviando o formulário de verdade contra o CRM local: a inscrição
 * chegou inteira e `consent_text` chegou nulo.
 */
function textoDoAceite(): string {
  const { rotulo, texto, menores } = COPY_INSCRICAO.aceite;
  return [rotulo, texto, menores].join(" ");
}

/** Toda chamada leva prazo, pelo mesmo motivo do repositório do Supabase. */
const PRAZO_MS = 8000;

export type AmbienteCrm = {
  /** A URL inteira do endpoint, com o código da trilha dentro. */
  url: string;
  /** Opcional. Vai no cabeçalho `x-form-token`; fica só no servidor. */
  token: string | null;
};

/**
 * Um motivo que a interface sabe traduzir.
 *
 * A rota já tem três (`limite`, `encerrado`, `servidor`) e cada um tem uma
 * frase própria em `COPY_INSCRICAO.envio`. Sem esta classe, um `429` do CRM
 * chegaria como exceção genérica e viraria "deu um problema do nosso lado" —
 * dizendo que a culpa é nossa sobre algo que se resolve tentando de novo.
 */
export class ErroDoCrm extends Error {
  readonly motivo: "limite" | "encerrado" | "servidor";

  constructor(motivo: ErroDoCrm["motivo"], mensagem: string) {
    super(mensagem);
    this.name = "ErroDoCrm";
    this.motivo = motivo;
  }
}

/**
 * Lê o ambiente. `null` quando o CRM não foi configurado — que é um estado
 * esperado, e não um defeito: quem chama decide, e ninguém lança daqui.
 */
export function ambienteCrm(): AmbienteCrm | null {
  const url = process.env.CRM_INTEREST_URL?.trim();
  if (!url) return null;
  return { url, token: process.env.CRM_INTEREST_FORM_TOKEN?.trim() || null };
}

export function repositorioCrm(ambiente: AmbienteCrm): RepositorioInscricoes {
  const cabecalhos: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(ambiente.token ? { "x-form-token": ambiente.token } : {}),
  };

  return {
    async salvar(inscricao: Inscricao, meta: { ipHash: string }) {
      /*
       * O objeto validado inteiro, espalhado, e não uma lista de campos
       * escrita à mão.
       *
       * `validarInscricao` é quem decide o que existe em `Inscricao`, e o CRM
       * lê por nome de campo, aceitando qualquer chave que não conheça e
       * guardando-a em vez de descartar. Escrever os trinta campos aqui criaria
       * uma terceira lista para ficar fora de sincronia com as outras duas — e
       * o modo de falhar seria o pior possível: a pergunta nova do formulário
       * chegaria em branco no CRM, em silêncio, e ninguém olharia.
       *
       * Nada sensível entra por aqui que já não seja o conteúdo da inscrição:
       * `Inscricao` é exatamente o que a pessoa preencheu.
       */
      const resposta = await fetch(ambiente.url, {
        method: "POST",
        headers: cabecalhos,
        body: JSON.stringify({
          ...inscricao,
          form: FORMULARIO,
          // Depois do spread, e nunca antes: `Inscricao` não tem esta chave
          // hoje, e no dia em que tiver é ela que deve ganhar.
          consentimento: textoDoAceite(),
          // O hash, nunca o endereço. O sal fica nesta máquina e não viaja,
          // então o CRM consegue contar e não consegue identificar ninguém.
          ip_hash: meta.ipHash,
        }),
        signal: AbortSignal.timeout(PRAZO_MS),
      });

      if (resposta.ok) return { atualizada: false };

      const detalhe = await resposta.text().catch(() => "");

      // As inscrições desta trilha foram encerradas enquanto a pessoa
      // preenchia. É o único caso em que a resposta certa é "não, e não é
      // culpa sua" — a §9.4 tem a frase pronta.
      if (resposta.status === 409) {
        throw new ErroDoCrm("encerrado", `CRM recusou: trilha fechada. ${detalhe}`);
      }

      // A cota, que agora mora no CRM. Mesma mensagem de sempre: tente de novo
      // daqui a pouco.
      if (resposta.status === 429) {
        throw new ErroDoCrm("limite", `CRM recusou por limite de envios. ${detalhe}`);
      }

      /*
       * Um 422 aqui é um bug **nosso**, não um erro de quem preencheu.
       *
       * `validarInscricao` já rodou e passou, dos dois lados, antes desta
       * chamada. O CRM só devolve 422 quando um campo não cabe no formato que
       * ele aceita — quer dizer, quando os dois lados discordam sobre o
       * contrato. A pessoa vê a mensagem de erro de servidor, com o
       * preenchimento preservado, e o motivo fica no log com o corpo inteiro,
       * que é onde alguém consegue consertar.
       */
      throw new ErroDoCrm(
        "servidor",
        `CRM recusou a inscricao: ${resposta.status} ${resposta.statusText} ${detalhe}`.trim(),
      );
    },

    async contarPorIpNaUltimaHora() {
      // Zero, e de propósito: esta página não tem mais linhas para contar. A
      // cota por endereço é aplicada pelo CRM, sobre o `ip_hash` que vai no
      // payload, e chega de volta como o `429` tratado acima.
      //
      // Devolver zero aqui é seguro justamente porque o freio não sumiu — ele
      // mudou de lado. Se um dia o CRM parar de aplicá-lo, o efeito é uma porta
      // sem cota, então isso está escrito também no lado de lá, na migration
      // que criou a coluna.
      return 0;
    },

    async inscricoesAbertas() {
      const resposta = await fetch(ambiente.url, {
        method: "GET",
        headers: cabecalhos,
        signal: AbortSignal.timeout(PRAZO_MS),
      });

      // Igual ao repositório do Supabase e pelo mesmo motivo: no erro, abertas.
      // Uma falha de rede passageira mostrando "inscrições encerradas" para
      // quem recebeu o link naquele minuto é irrecuperável — a pessoa não
      // volta. Um envio que chega com a porta fechada é recusado no POST, alto,
      // com o que ela escreveu ainda na tela.
      if (!resposta.ok) return true;

      const corpo: unknown = await resposta.json().catch(() => null);
      if (
        typeof corpo !== "object" ||
        corpo === null ||
        typeof (corpo as { aberta?: unknown }).aberta !== "boolean"
      ) {
        return true;
      }

      return (corpo as { aberta: boolean }).aberta;
    },
  };
}
