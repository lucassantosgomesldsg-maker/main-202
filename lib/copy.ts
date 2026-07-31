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

export const INSTAGRAM = "https://www.instagram.com/202lab.br/";

export function oneliner(idioma: Idioma): string {
  return COPY[idioma].onelinerLinhas.join(" ");
}

export function titulo(idioma: Idioma): string {
  return `202Lab — ${oneliner(idioma)}`;
}
