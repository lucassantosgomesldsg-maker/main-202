export type Idioma = "pt" | "en";

export const IDIOMAS: readonly Idioma[] = ["pt", "en"] as const;

export const COPY = {
  pt: {
    onelinerLinhas: ["Potencializamos talentos e", "construímos o futuro."],
    contato: "CONTATO",
    tese: "A TESE",
    inscricao: "INSCRIÇÃO",
  },
  en: {
    onelinerLinhas: ["We amplify talent.", "We build the future."],
    contato: "CONTACT",
    tese: "THE THESIS",
    // "APPLY" e não "SIGN UP": a trilha é seletiva (há triagem depois do
    // formulário), e "sign up" promete entrada automática.
    inscricao: "APPLY",
  },
} as const satisfies Record<
  Idioma,
  {
    onelinerLinhas: readonly [string, string];
    contato: string;
    /**
     * O rótulo do link para `/tese`, no canto inferior direito da home.
     *
     * Está duplicado com `TESE[idioma].rotuloPagina` de propósito, e a
     * duplicação é guardada por teste (`lib/tese.test.ts`). A alternativa era
     * a home importar `lib/tese.ts` só por causa de duas palavras — e aí a
     * copy inteira das dez seções entraria no bundle de uma página que existe
     * para ser uma tela só. Um teste custa menos que isso e pega a mesma
     * divergência.
     */
    tese: string;
    /**
     * O rótulo do link para `/trilha/inscricao`, no topo direito da home.
     *
     * O destino é uma página **só em português** (spec §2), então quem clica
     * daqui em EN troca de idioma sem aviso. O rótulo é traduzido mesmo assim:
     * um item em português no meio de um topo em inglês parece defeito, e a
     * pessoa que lê "APPLY" entende para onde vai antes de clicar — que é o
     * que o rótulo tem de fazer. No dia em que existir `/en/trilha/inscricao`,
     * é o `href` que muda, não esta linha.
     */
    inscricao: string;
  }
>;

export const INSTAGRAM = "https://www.instagram.com/202lab.br/";

export function oneliner(idioma: Idioma): string {
  return COPY[idioma].onelinerLinhas.join(" ");
}

export function titulo(idioma: Idioma): string {
  return `202Lab — ${oneliner(idioma)}`;
}
