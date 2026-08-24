import type { Inscricao } from "./inscricao";

/**
 * O e-mail de confirmação da inscrição, pelo Resend, atrás de um interruptor.
 *
 * ── Por que atrás de um interruptor ─────────────────────────────────────────
 * A verificação do domínio no Resend depende de propagação de DNS no
 * Registro.br, que pode levar horas (spec §7 e §14). Sem o interruptor, a
 * página só poderia ir ao ar depois disso — ou iria ao ar prometendo um e-mail
 * que não sai. Com ele, a inscrição é gravada desde o primeiro minuto, a tela
 * de confirmação **não promete** o que não pode cumprir (§4.7), e o Matheus
 * liga o e-mail depois mexendo numa variável de ambiente, sem deploy de código.
 *
 * Por isso `RESEND_API_KEY` ausente é "desligado" e não "erro": é o estado
 * normal e esperado da fase 1 antes do DNS, e tratá-lo como falha encheria o
 * log de erro em toda inscrição legítima.
 *
 * ── Por que `fetch` e não o pacote `resend` ─────────────────────────────────
 * Mesmo argumento de `lib/inscricao-banco.ts`: o repo tem três dependências de
 * produção, e o que se faz aqui é **um** POST com JSON contra uma API HTTP.
 *
 * ── Por que texto puro ──────────────────────────────────────────────────────
 * Sem HTML de newsletter — nem tabela, nem botão, nem logo em base64. A spec
 * (§7) pede curto, e a razão é operacional: e-mail transacional com cara de
 * campanha cai em Promoções, e um e-mail de confirmação que a pessoa não vê é
 * pior do que nenhum, porque a tela prometeu que ele chegaria.
 */

/**
 * O endereço do site, escrito à mão de propósito.
 *
 * O canônico do projeto é o `metadataBase` de `app/layout.tsx`, mas importar um
 * módulo de `app/` a partir de `lib/` inverteria a direção das dependências do
 * repo por um link de e-mail. Se o domínio mudar, muda nos dois lugares — e o
 * teste de servidor confere que o link do e-mail continua apontando para a
 * `/tese`.
 */
const SITE = "https://202lab.com.br";

/**
 * A copy do e-mail.
 *
 * Ela mora aqui, e não em `lib/inscricao.ts`, por uma razão de fronteira: a
 * fundação é a copy que o **navegador** mostra, e `CopyInscricao` é o contrato
 * que a interface consome. Texto que só existe fora do navegador não deveria
 * entrar nesse contrato e obrigar o Agente da interface a recompilar contra
 * campos que ele nunca vai renderizar. A regra "nenhum texto de marca no JSX"
 * continua valendo: aqui não há JSX nenhum.
 *
 * A voz é a mesma das telas de confirmação, e a frase da `/tese` é a mesma —
 * quem recebe o e-mail e quem fica na página leram a mesma coisa.
 */
export const COPY_EMAIL = {
  de: "202Lab <trilha@202lab.com.br>",
  assunto: "Recebemos a sua inscrição — 202Lab",
  assuntoAtualizada: "Atualizamos a sua inscrição — 202Lab",
  saudacao: "Oi, {nome}.",
  chegou: "A sua inscrição para a próxima trilha da 202 chegou.",
  atualizada:
    "Você já tinha se inscrito com este e-mail, e agora vale o que você acabou de mandar.",
  contato: "A gente lê tudo e entra em contato pelo e-mail ou pelo WhatsApp que você deixou.",
  tese: "Enquanto isso, o argumento inteiro da 202 está escrito numa página só:",
  assinatura: "— 202Lab",
} as const;

/** O link da tese, absoluto: e-mail não tem base para resolver caminho relativo. */
export const LINK_TESE = `${SITE}/tese`;

/**
 * O interruptor da §7.
 *
 * Exige as duas coisas: a variável ligada **e** a chave presente. Só a variável
 * faria a tela de confirmação prometer um e-mail que nunca teve como sair, e
 * essa é exatamente a promessa que a spec §4.7 existe para evitar.
 *
 * A comparação é com a string exata `"true"`. Um `!== ""` aceitaria `false`
 * como ligado — o clássico defeito de interruptor de ambiente, porque a string
 * `"false"` é verdadeira em JavaScript.
 */
export function emailAtivo(): boolean {
  return (
    process.env.EMAIL_CONFIRMACAO_ATIVO === "true" &&
    (process.env.RESEND_API_KEY ?? "") !== ""
  );
}

/**
 * O corpo do e-mail, montado e testável sem rede.
 *
 * Separado do envio porque as duas coisas erram de jeitos diferentes: o texto
 * erra em silêncio (link errado, nome do meio no lugar do primeiro) e o envio
 * erra alto (401, 429, DNS). Só o primeiro dá para provar num teste unitário.
 */
export function corpoDoEmail(
  inscricao: Inscricao,
  opcoes: { atualizada: boolean },
): { assunto: string; texto: string } {
  // O primeiro nome, e não o nome completo: "Oi, Maria Clara de Souza Almeida."
  // soa a mala direta. O `?? nome` cobre o caso improvável de o `trim` não
  // sobrar nada — a validação já garante que não, mas o e-mail não é lugar de
  // depender disso.
  const primeiroNome = inscricao.nome.trim().split(/\s+/)[0] ?? inscricao.nome;

  const linhas = [
    COPY_EMAIL.saudacao.replace("{nome}", primeiroNome),
    "",
    opcoes.atualizada ? COPY_EMAIL.atualizada : COPY_EMAIL.chegou,
    COPY_EMAIL.contato,
    "",
    COPY_EMAIL.tese,
    LINK_TESE,
    "",
    COPY_EMAIL.assinatura,
  ];

  return {
    assunto: opcoes.atualizada ? COPY_EMAIL.assuntoAtualizada : COPY_EMAIL.assunto,
    // `\n` e não `\r\n`: a API do Resend recebe o texto em JSON e monta o MIME.
    texto: linhas.join("\n"),
  };
}

/**
 * Manda o e-mail. **Lança** quando falha, e quem chama tem de engolir.
 *
 * A escolha de lançar em vez de devolver `false` é deliberada: um retorno
 * booleano ignorado é indistinguível de sucesso, e o defeito ficaria invisível
 * até alguém perguntar por que ninguém recebe e-mail. Lançando, o log do
 * servidor tem o motivo e o `try/catch` de quem chama fica escrito no código —
 * a rota grava primeiro e tenta o e-mail depois, porque uma inscrição perdida é
 * irrecuperável e um e-mail não enviado é um aborrecimento (spec §7).
 *
 * Quando o interruptor está desligado a função **não faz nada e não lança**:
 * é o estado normal da fase 1, não uma falha.
 */
export async function enviarConfirmacao(
  inscricao: Inscricao,
  opcoes: { atualizada: boolean },
): Promise<void> {
  if (!emailAtivo()) return;

  const { assunto, texto } = corpoDoEmail(inscricao, opcoes);

  // O timeout existe porque isto roda dentro do envio de um formulário: sem
  // ele, uma API pendurada seguraria a resposta até o limite da função na
  // Vercel, e a pessoa veria o botão "ENVIANDO…" por um minuto para uma
  // inscrição que já estava gravada no primeiro segundo.
  const resposta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY ?? ""}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: COPY_EMAIL.de,
      to: [inscricao.email],
      subject: assunto,
      text: texto,
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (!resposta.ok) {
    // O corpo do erro do Resend diz qual das falhas foi (domínio não
    // verificado, chave inválida, limite) e é isso que o log precisa. O `catch`
    // é para o caso de a resposta de erro não ter corpo legível — perder a
    // mensagem não pode virar uma segunda exceção por cima da primeira.
    const detalhe = await resposta.text().catch(() => "");
    throw new Error(
      `Resend recusou o envio: ${resposta.status} ${resposta.statusText} ${detalhe}`.trim(),
    );
  }
}
