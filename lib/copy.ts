export type Idioma = "pt" | "en";

export const IDIOMAS: readonly Idioma[] = ["pt", "en"] as const;

export const COPY = {
  pt: {
    onelinerLinhas: ["Potencializamos talentos e", "construímos o futuro."],
    contato: "CONTATO",
  },
  en: {
    onelinerLinhas: ["We amplify talent.", "We build the future."],
    contato: "CONTACT",
  },
} as const satisfies Record<
  Idioma,
  { onelinerLinhas: readonly [string, string]; contato: string }
>;

/** Iguais nos dois idiomas — coordenadas do ITA, onde a 202 começou.
 *  Um espaço simples entre latitude e longitude: o HTML colapsa espaços
 *  repetidos de qualquer jeito, então dois não mudariam nada na tela. */
export const COORDENADAS = "23°12'37\"S 45°52'35\"W";
export const LOCAL = "SÃO JOSÉ DOS CAMPOS, BR";

export const INSTAGRAM = "https://www.instagram.com/202lab.br/";

export function oneliner(idioma: Idioma): string {
  return COPY[idioma].onelinerLinhas.join(" ");
}

export function titulo(idioma: Idioma): string {
  return `202Lab — ${oneliner(idioma)}`;
}
