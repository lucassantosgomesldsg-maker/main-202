import { describe, expect, it } from "vitest";
import { IDIOMAS, COPY, type Idioma } from "./copy";
import { IDS_SECOES, TESE, tituloTese } from "./tese";

describe("a tese", () => {
  it("tem as mesmas seções, na mesma ordem, nos dois idiomas", () => {
    // Não é preciosismo de simetria: os `id` viram âncora na URL
    // (/tese#velocidade). Se PT e EN divergissem, um link compartilhado
    // quebraria só para quem tivesse escolhido o outro idioma — o tipo de
    // defeito que nunca aparece em quem testa.
    for (const idioma of IDIOMAS) {
      expect(TESE[idioma].secoes.map((s) => s.id)).toEqual(IDS_SECOES);
    }
  });

  it("não repete nenhum id", () => {
    expect(new Set(IDS_SECOES).size).toBe(IDS_SECOES.length);
  });

  it("abre pela conclusão e fecha na frase da home", () => {
    for (const idioma of IDIOMAS) {
      const secoes = TESE[idioma].secoes;
      expect(secoes[0].id).toBe("abertura");
      expect(secoes[secoes.length - 1].id).toBe("fecho");
    }
  });

  it("deriva o fecho do oneliner da home, sem o ponto final", () => {
    // O ponto final sai porque quem termina a frase na /tese é o ponto verde,
    // desenhado pelo componente. Se alguém reescrever o oneliner em copy.ts,
    // este teste garante que a tese acompanha em vez de guardar uma cópia
    // velha.
    for (const idioma of IDIOMAS) {
      const secoes = TESE[idioma].secoes;
      const fecho = secoes[secoes.length - 1];
      const oneliner = COPY[idioma].onelinerLinhas;

      expect(fecho.titulo.length).toBe(oneliner.length);
      expect(fecho.titulo.join(" ")).toBe(oneliner.join(" ").replace(/\.$/, ""));
      expect(fecho.titulo[fecho.titulo.length - 1].endsWith(".")).toBe(false);
    }
  });

  it("não escreve o ponto verde dentro da copy", () => {
    // A regra "um verde por tela" é garantida pelo componente, que desenha o
    // ponto uma vez por seção. Um "●" digitado numa string furaria a regra sem
    // ninguém perceber.
    for (const idioma of IDIOMAS) {
      for (const secao of TESE[idioma].secoes) {
        expect(secao.titulo.join(" ")).not.toContain("●");
      }
    }
  });

  it("chama a página pelo mesmo nome na home e nela mesma", () => {
    // A home escreve "A TESE" no link do canto (lib/copy.ts) e a própria
    // página escreve "A TESE" no rótulo do topo (lib/tese.ts). São duas
    // strings, e não uma, porque importar `lib/tese.ts` na home só por causa
    // de duas palavras arrastaria a copy das dez seções para o bundle de uma
    // página que existe para ser uma tela só. Este teste é o preço disso: se
    // um dia a página mudar de nome, o link para ela não pode continuar
    // chamando pelo nome antigo.
    for (const idioma of IDIOMAS) {
      expect(COPY[idioma].tese).toBe(TESE[idioma].rotuloPagina);
    }
  });

  it("dá título de aba no formato do site", () => {
    expect(tituloTese("pt")).toBe("202Lab — A TESE");
    expect(tituloTese("en")).toBe("202Lab — THE THESIS");
  });

  it("tem três pilares e cinco frentes nos dois idiomas", () => {
    // Os números estão escritos nos statements ("Três coisas.", "Cinco
    // frentes"). Se a lista e a frase divergirem, a página se contradiz na
    // mesma tela — foi o risco real ao acrescentar a alocação como quinta
    // frente, com a frase ainda dizendo "quatro".
    for (const idioma of IDIOMAS) {
      expect(TESE[idioma].pilares).toHaveLength(3);
      expect(TESE[idioma].frentes).toHaveLength(5);
    }
  });

  it("escreve por extenso, no statement, o número de itens de cada lista", () => {
    // Fecha o buraco que o teste acima deixa: ele conta a lista, não a frase.
    // A contagem esperada sai da PRÓPRIA lista, então acrescentar uma sexta
    // frente e esquecer o statement quebra aqui — sem isso, a página passaria
    // a mentir em caixa alta, em fonte de display, e nada acusaria.
    const POR_EXTENSO: Record<Idioma, Record<number, string>> = {
      pt: { 3: "Três", 4: "Quatro", 5: "Cinco", 6: "Seis" },
      en: { 3: "Three", 4: "Four", 5: "Five", 6: "Six" },
    };

    for (const idioma of IDIOMAS) {
      const t = TESE[idioma];
      for (const [id, lista] of [
        ["pilares", t.pilares],
        ["frentes", t.frentes],
      ] as const) {
        const esperado = POR_EXTENSO[idioma][lista.length];
        expect(esperado, `sem número por extenso para ${lista.length}`).toBeDefined();
        expect(t.secoes.find((s) => s.id === id)?.titulo.join(" ")).toContain(
          esperado,
        );
      }
    }
  });
});
