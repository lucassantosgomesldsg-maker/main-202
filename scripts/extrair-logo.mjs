// Extrai os três glifos do SVG-pôster da 202 e gera lib/logo-paths.ts.
// Rodar de novo só se o SVG de origem mudar.
import { readFileSync, writeFileSync } from "node:fs";

const ORIGEM = "public/202_Branco.svg";
const DESTINO = "lib/logo-paths.ts";

// viewBox justo aos glifos. Medido uma vez no navegador via getBBox() sobre
// os glifos reais (Task 4, Step 2), com o <g transform="matrix(...)"> aninhado
// sob um <g> neutro — getBBox() exclui o transform do próprio elemento, então
// medir direto no <g> da matrix daria a caixa no espaço local (pré-deslocamento
// 61,527), não na absoluta que este viewBox precisa. Esse é o valor definitivo;
// só remeça se `public/202_Branco.svg` mudar. Para remedir: reconstruir a
// medição em Task 4 (nested wrapper + getBBox), arredondar para fora (floor no
// canto mínimo, ceil no máximo) e passar o resultado por LOGO_VIEWBOX.
const VIEWBOX = process.env.LOGO_VIEWBOX ?? "64 564 654 305";

const svg = readFileSync(ORIGEM, "utf8");

const grupo = /<g transform="(matrix\([^"]+\))"/.exec(svg);
if (!grupo) throw new Error("Não achei o transform do grupo no SVG de origem.");

// O <g> vazio entre o translate(...) e o <path> vem do exportador do SVG
// original (provavelmente um agrupamento de máscara/clip que não sobrou
// nada visível) — está sempre presente nos três glifos, então o regex exige
// essa camada extra para não casar com outra coisa por engano. Se um SVG
// re-exportado não tiver esse <g> vazio, a extração vai falhar com
// "Esperava 3 glifos, achei 0" — ajustar o regex aqui, não forçar o SVG.
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
