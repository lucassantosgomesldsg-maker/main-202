// Gera `public/202-marca.svg` a partir de `lib/logo-paths.ts`.
//
// Por que um ARQUIVO e não o componente `Logo202`: na abertura da inscrição a
// marca é uma imagem estática, e o `Logo202` monta três `<path>` inline a cada
// render. No navegador isso é irrelevante; no jsdom dos testes não é — medido,
// ele sozinho empurrou seis testes de travessia do formulário para além do
// limite de 5s. Um `<img>` é um nó só, e o navegador ainda ganha o arquivo
// cacheado em vez de repetir os glifos no HTML.
//
// A fonte dos glifos continua sendo `lib/logo-paths.ts` — a mesma que o
// `Logo202` usa. `components/inscricao/LogoMarca.test.ts` regenera este arquivo
// e compara com o que está em disco, então mudar os glifos sem rodar este
// script reprova no `npm test` em vez de deixar as duas marcas divergirem.
//
//   node scripts/gerar-logo-marca.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * As proporções vêm de `Logo202.module.css`, e não de gosto: lá o ponto mede
 * `0.075em` e o vão `0.03em`, ambos sobre a largura da raiz. Reproduzi-las aqui
 * é o que faz a marca desta página ter exatamente o mesmo desenho da home.
 */
const PONTO = 0.075;
const VAO = 0.03;

export function svgDaMarca() {
  const fonte = readFileSync(join(process.cwd(), "lib", "logo-paths.ts"), "utf8");

  const viewBox = /LOGO_VIEWBOX = "([^"]+)"/.exec(fonte)?.[1];
  const grupo = /LOGO_GRUPO_TRANSFORM = "([^"]+)"/.exec(fonte)?.[1];
  if (!viewBox || !grupo) throw new Error("não achei LOGO_VIEWBOX/LOGO_GRUPO_TRANSFORM");

  const glifos = [...fonte.matchAll(/"transform":\s*"([^"]+)",\s*\n\s*"d":\s*"([^"]+)"/g)].map(
    ([, transform, d]) => ({ transform, d }),
  );
  if (glifos.length === 0) throw new Error("não achei nenhum glifo");

  const [x, y, largura, altura] = viewBox.split(/\s+/).map(Number);

  // A largura total é a dos glifos MAIS o vão e o ponto, e os três são frações
  // dela mesma: total = glifos + total*VAO + total*PONTO.
  const total = largura / (1 - VAO - PONTO);
  const diametro = total * PONTO;

  // O ponto encosta na base dos glifos — `align-items: flex-end` no CSS.
  const cx = x + largura + total * VAO + diametro / 2;
  const cy = y + altura - diametro / 2;

  const caminhos = glifos
    .map((g) => `<g transform="${g.transform}"><path d="${g.d}"/></g>`)
    .join("");

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${total} ${altura}">` +
    `<g transform="${grupo}" fill="#fff">${caminhos}</g>` +
    `<circle cx="${cx}" cy="${cy}" r="${diametro / 2}" fill="#c6ff3e"/>` +
    `</svg>\n`
  );
}

// A escrita só acontece quando ESTE arquivo é o programa. Sem a guarda, quem
// importasse `svgDaMarca` ganharia a reescrita do asset de brinde — e o teste
// que compara o disco com o gerador passaria sempre, porque teria acabado de
// gerar o disco. Foi exatamente o que aconteceu: o guarda nasceu cego e só
// apareceu quando quebrei um glifo de propósito para ver se ele reprovava.
if (process.argv[1] !== undefined && process.argv[1].endsWith("gerar-logo-marca.mjs")) {
  const destino = join(process.cwd(), "public", "202-marca.svg");
  writeFileSync(destino, svgDaMarca(), "utf8");
  console.log("escrito:", destino);
}
