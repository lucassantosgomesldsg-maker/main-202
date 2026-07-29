// Extrai os três glifos do SVG-pôster da 202 e gera lib/logo-paths.ts.
// Rodar de novo só se o SVG de origem mudar.
import { readFileSync, writeFileSync } from "node:fs";

const ORIGEM = "public/202_Branco.svg";
const DESTINO = "lib/logo-paths.ts";

// viewBox justo aos glifos. Medido no navegador via getBBox() — ver Task 4, Step 2.
// Valor inicial: o retângulo de clip do SVG original (61, 527, 664, 440).
const VIEWBOX = process.env.LOGO_VIEWBOX ?? "61 527 664 440";

const svg = readFileSync(ORIGEM, "utf8");

const grupo = /<g transform="(matrix\([^"]+\))"/.exec(svg);
if (!grupo) throw new Error("Não achei o transform do grupo no SVG de origem.");

const glifos = [
  ...svg.matchAll(
    /<g transform="(translate\([^"]+\))"[^>]*>\s*<g>\s*<path[^>]*\sd="([^"]+)"/g,
  ),
].map(([, transform, d]) => ({ transform, d }));

if (glifos.length !== 3) {
  throw new Error(`Esperava 3 glifos, achei ${glifos.length}.`);
}

const ts = `// GERADO por scripts/extrair-logo.mjs — não editar à mão.
// Origem: visual_assets/Raw_Images/202_Branco.svg (repo da trilha).

export const LOGO_VIEWBOX = ${JSON.stringify(VIEWBOX)};
export const LOGO_GRUPO_TRANSFORM = ${JSON.stringify(grupo[1])};

export const LOGO_GLIFOS = ${JSON.stringify(glifos, null, 2)} as const;
`;

writeFileSync(DESTINO, ts, "utf8");
console.log(`OK — 3 glifos escritos em ${DESTINO}`);
