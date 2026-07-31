/**
 * Recorta a The Seasons para os dois glifos que a malha usa e gera o woff2.
 *
 * O .ttf de origem (230 KB) NÃO entra no repositório: a malha precisa de "2" e
 * "0" e mais nada, então o que é servido ao visitante é só isso. O woff2
 * gerado é commitado, para o build não depender da máquina de ninguém.
 *
 * Uso: node scripts/gerar-fonte-malha.mjs
 * Origem alternativa: FONTE_ORIGEM=/caminho/para.ttf node scripts/...
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import subsetFont from "subset-font";

const ORIGEM =
  process.env.FONTE_ORIGEM ??
  "C:/Users/Lucas/Downloads/Lucas_dos_Santos/efeito/fonts/TheSeasons-Regular.ttf";

const DESTINO = path.join(process.cwd(), "public", "fonts", "the-seasons-20.woff2");

const ttf = await readFile(ORIGEM);
const woff2 = await subsetFont(ttf, "20", { targetFormat: "woff2" });

await mkdir(path.dirname(DESTINO), { recursive: true });
await writeFile(DESTINO, woff2);

console.log(
  `${DESTINO}\n  ${(ttf.length / 1024).toFixed(1)} KB → ${(woff2.length / 1024).toFixed(1)} KB`
);
