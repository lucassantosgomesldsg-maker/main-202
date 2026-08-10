import { COPY, IDIOMAS, type Idioma } from "./copy";

/**
 * A duração de cada ato — **a única fonte de verdade da coreografia de entrada**.
 *
 * Os inícios NÃO são escritos à mão em lugar nenhum: são derivados daqui e
 * entregues ao CSS como custom properties (`TEMPOS`), e o CSS deriva o resto
 * com `calc()`. Mexer numa duração empurra o resto da coreografia junto, em
 * vez de deixar dois números iguais se desencontrarem em silêncio.
 *
 * Mesma disciplina que components/motion/MotionD.tsx (arquivado) aplicava ao
 * efeito anterior — só que agora a coreografia atravessa `.topo`, `.centro` e
 * `.base`, três regiões que não se falam, então ela subiu para lib/.
 *
 * O import de `./copy` é relativo, e não `@/lib/copy`, de propósito: o e2e do
 * Playwright importa este módulo, e assim a cadeia inteira resolve sem
 * depender do alias `@/` ser lido pelo transformador dele.
 */
export const ATOS = {
  /** A logo cresce de 0.82 a 1, e o "0" dá uma volta completa. */
  crescimento: 1200,
  /**
   * O ponto verde assenta com uma batida de escala.
   *
   * 02/08/2026 — sem halo. O clarão verde que acendia junto (`ponto-halo` em
   * app/abertura.module.css) foi removido por ser excessivo; a duração ficou,
   * porque a batida de escala continua e porque ela é um elo da cascata: é
   * `pulso` que empurra `INICIO_TOPO` para depois do fim do Ato 2.
   */
  pulso: 360,
  /**
   * Tela parada, de propósito, antes do topo entrar.
   *
   * 02/08/2026 — de 400ms para 150ms. Ver `esperaFrase` logo abaixo.
   */
  esperaTopo: 150,
  /** PT/EN e CONTATO entram pelas laterais, ao mesmo tempo. */
  topo: 520,
  /**
   * Tela parada, de propósito, antes da frase começar.
   *
   * 02/08/2026 — de 200ms para 80ms. Junto com `esperaTopo`, corta 370ms de
   * espera PARADA da entrada: o topo agora começa em 1710ms (era 1960) e a
   * frase em 2310ms (era 2680). Nenhuma DURAÇÃO foi tocada — os gestos levam
   * exatamente o mesmo tempo que levavam; o que encolheu foi só o vazio entre
   * eles, que era o que lia como lento.
   */
  esperaFrase: 80,
  /** O ritmo da digitação: um caractere a cada tanto. */
  msPorCaractere: 34,
  /** A barra de digitação some. */
  saidaCursor: 240,
  /** O ritmo do apagamento, na troca de idioma. Mais rápido que a digitação
   *  de propósito: apagar é um backspace segurado, não uma segunda escrita. */
  msPorCaractereApagando: 14,
  /** O respiro entre a frase apagada e a nova começando a ser escrita. */
  esperaTroca: 120,
} as const;

/** O ponto só pulsa quando o crescimento termina. Esta linha *é* a regra. */
export const INICIO_PULSO = ATOS.crescimento;
/** O topo só entra depois do pulso mais a espera. */
export const INICIO_TOPO = INICIO_PULSO + ATOS.pulso + ATOS.esperaTopo;
/** A frase só começa depois do topo ter entrado inteiro, mais a espera. */
export const INICIO_FRASE = INICIO_TOPO + ATOS.topo + ATOS.esperaFrase;

/**
 * Quantos caracteres a frase tem, somando as duas linhas.
 *
 * `Array.from` e não `.length`: `.length` conta unidades UTF-16, e um acento
 * escrito na forma decomposta (i + acento combinante) contaria dois. Quem
 * desenha os <span> em components/FraseDigitada.tsx usa o mesmo `Array.from`
 * — as duas contagens PRECISAM bater, senão o último índice não é o último
 * caractere e o cursor some no lugar errado.
 */
export function caracteres(idioma: Idioma): number {
  return COPY[idioma].onelinerLinhas.reduce(
    (total, linha) => total + Array.from(linha).length,
    0,
  );
}

/**
 * Quando a coreografia termina, por idioma.
 *
 * O `- 1` não é detalhe: o primeiro caractere tem índice ZERO e surge
 * exatamente em INICIO_FRASE. Entre n caracteres há n-1 intervalos, não n.
 */
export function duracaoTotal(idioma: Idioma): number {
  return (
    INICIO_FRASE +
    (caracteres(idioma) - 1) * ATOS.msPorCaractere +
    ATOS.saidaCursor
  );
}

/**
 * Quanto leva para apagar a frase, na troca de idioma.
 *
 * Aqui NÃO tem `- 1`, e a diferença para `duracaoTotal` é proposital: na
 * digitação o caractere 0 SURGE em t=0, então entre n caracteres há n-1
 * intervalos. No apagamento cada caractere ocupa uma fatia inteira antes de
 * sumir — o último some ao FIM da primeira fatia, não no começo dela, senão a
 * frase perderia uma letra no mesmo quadro do clique. São n fatias.
 */
export function duracaoApagamento(idioma: Idioma): number {
  return caracteres(idioma) * ATOS.msPorCaractereApagando;
}

/**
 * Quanto leva para reescrever a frase depois de apagada.
 *
 * Mesma cadência da abertura (`msPorCaractere`) — a digitação é a assinatura
 * da página, e uma segunda cadência faria a troca parecer outro efeito. O que
 * NÃO se repete é `INICIO_FRASE`: aquela espera existe para deixar a logo e o
 * topo entrarem primeiro, e não há nada disso acontecendo numa troca. No lugar
 * dela entra `esperaTroca`, o respiro curto entre apagar e escrever.
 */
export function duracaoEscrita(idioma: Idioma): number {
  return (
    ATOS.esperaTroca +
    (caracteres(idioma) - 1) * ATOS.msPorCaractere +
    ATOS.saidaCursor
  );
}

/**
 * O teto desta coreografia.
 *
 * NÃO confundir com o `DURACAO_MAXIMA_MS` de components/motion/tipos.ts, que
 * vale 2000 e governa o Motion D — arquivado, mas ainda no repo e ainda
 * coerente consigo mesmo. Aquele número não subiu de propósito: mexer nele
 * faria o comentário dele mentir sobre um efeito que ninguém mais roda.
 */
export const DURACAO_MAXIMA_MS = 4800;

/** O pior caso entre TODOS os idiomas — computado, não copiado. */
export const DURACAO_TOTAL_MAXIMA_MS = Math.max(
  ...IDIOMAS.map((idioma) => duracaoTotal(idioma)),
);

if (DURACAO_TOTAL_MAXIMA_MS > DURACAO_MAXIMA_MS) {
  throw new Error(
    `abertura: a frase mais longa leva ${DURACAO_TOTAL_MAXIMA_MS}ms e o teto é ${DURACAO_MAXIMA_MS}ms`,
  );
}

/**
 * O que o CSS recebe, pendurado no <main> por app/page.tsx.
 *
 * SEM anotação de tipo, de propósito, e o detalhe não é cosmético:
 *
 * - anotar `Record<string, string>` faria `TEMPOS as CSSProperties` em
 *   app/page.tsx virar erro de compilação (nenhum dos dois é atribuível ao
 *   outro, e `as` exige que um seja);
 * - anotar `CSSProperties` exigiria importar do React aqui e faria
 *   `TEMPOS["--t-pulso"]` no teste virar erro (CSSProperties não tem index
 *   signature).
 *
 * Deixando o TypeScript inferir o tipo do literal, as duas pontas funcionam —
 * é o mesmo formato que components/motion/MotionD.tsx já usa e que compila
 * hoje.
 */
export const TEMPOS = {
  "--d-crescimento": `${ATOS.crescimento}ms`,
  "--d-pulso": `${ATOS.pulso}ms`,
  "--d-topo": `${ATOS.topo}ms`,
  "--d-caractere": `${ATOS.msPorCaractere}ms`,
  "--d-cursor": `${ATOS.saidaCursor}ms`,
  "--d-apagar": `${ATOS.msPorCaractereApagando}ms`,
  "--t-pulso": `${INICIO_PULSO}ms`,
  "--t-topo": `${INICIO_TOPO}ms`,
  "--t-frase": `${INICIO_FRASE}ms`,
  "--t-troca": `${ATOS.esperaTroca}ms`,
};
