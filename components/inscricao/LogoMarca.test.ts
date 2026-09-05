import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { svgDaMarca } from "../../scripts/gerar-logo-marca.mjs";

/**
 * A marca da abertura é um ARQUIVO gerado, e arquivo gerado apodrece.
 *
 * `public/202-marca.svg` sai de `lib/logo-paths.ts` — a mesma fonte de glifos
 * que o componente `Logo202` da home usa. São duas representações da mesma
 * marca, e o modo de falhar é silencioso: alguém ajusta os glifos, a home muda,
 * a abertura da inscrição continua com o desenho velho, e ninguém compara as
 * duas telas lado a lado para notar.
 *
 * Este teste roda o gerador e compara com o que está em disco. Se divergirem, o
 * conserto é uma linha:
 *
 *   node scripts/gerar-logo-marca.mjs
 */
describe("a marca gerada da abertura", () => {
  const caminho = join(process.cwd(), "public", "202-marca.svg");

  /**
   * O fim de linha não faz parte do que este teste afirma.
   *
   * O repositório está com `core.autocrlf=true` e não tem `.gitattributes`, o
   * que significa que quem clonar no Windows recebe este arquivo com CRLF
   * enquanto o gerador sempre escreve LF. Sem normalizar, o teste reprovaria em
   * todo clone novo — inclusive no CI — por uma diferença que não é a que ele
   * existe para pegar. Medido: reprova mesmo, com o arquivo restaurado pelo
   * `git checkout`.
   */
  const semFimDeLinha = (texto: string) => texto.replace(/\r\n/g, "\n");

  it("está em dia com os glifos de lib/logo-paths.ts", () => {
    const emDisco = readFileSync(caminho, "utf8");
    expect(
      semFimDeLinha(emDisco),
      "public/202-marca.svg está velho — rode `node scripts/gerar-logo-marca.mjs`",
    ).toBe(semFimDeLinha(svgDaMarca()));
  });

  it("carrega o ponto verde da marca, e não só os algarismos", () => {
    // O ponto é metade da marca: "202" sem ele é um número. No componente ele é
    // um `<span>` à parte; aqui precisa estar DENTRO do arquivo, senão o
    // `<img>` da abertura entrega só os três glifos.
    const svg = readFileSync(caminho, "utf8");
    expect(svg).toMatch(/<circle[^>]*fill="#c6ff3e"/);
    expect((svg.match(/<path/g) ?? []).length).toBe(3);
  });
});
