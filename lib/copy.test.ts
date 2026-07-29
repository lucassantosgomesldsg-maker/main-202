import { describe, it, expect } from "vitest";
import { COPY, oneliner, titulo, COORDENADAS, LOCAL, INSTAGRAM } from "./copy";

describe("copy", () => {
  it("tem o oneliner em português, verbatim, quebrado em duas linhas", () => {
    expect(COPY.pt.onelinerLinhas).toEqual([
      "Potencializamos talentos e",
      "construímos o futuro.",
    ]);
  });

  it("tem o oneliner em inglês, verbatim, quebrado em duas linhas", () => {
    expect(COPY.en.onelinerLinhas).toEqual([
      "We amplify talent.",
      "We build the future.",
    ]);
  });

  it("junta as linhas num oneliner completo", () => {
    expect(oneliner("pt")).toBe("Potencializamos talentos e construímos o futuro.");
    expect(oneliner("en")).toBe("We amplify talent. We build the future.");
  });

  it("monta o título da aba a partir do oneliner", () => {
    expect(titulo("pt")).toBe("202Lab — Potencializamos talentos e construímos o futuro.");
    expect(titulo("en")).toBe("202Lab — We amplify talent. We build the future.");
  });

  it("traduz o rótulo de contato", () => {
    expect(COPY.pt.contato).toBe("CONTATO");
    expect(COPY.en.contato).toBe("CONTACT");
  });

  it("usa as coordenadas do ITA e não muda com o idioma", () => {
    expect(COORDENADAS).toBe("23°12'37\"S 45°52'35\"W");
    expect(LOCAL).toBe("SÃO JOSÉ DOS CAMPOS, BR");
  });

  it("aponta para o Instagram da 202", () => {
    expect(INSTAGRAM).toBe("https://www.instagram.com/202lab.br/");
  });
});
