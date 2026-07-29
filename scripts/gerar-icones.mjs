/**
 * Gera os ícones do site a partir de UMA fonte só: lib/logo-paths.ts (os
 * mesmos glifos que components/Logo202.tsx desenha na página).
 *
 *   node scripts/gerar-icones.mjs
 *
 * Produz:
 *   app/icon.svg        quadrado, "202" branco sobre o preto da marca
 *   app/apple-icon.png  180x180 (rel="apple-touch-icon")
 *   app/favicon.ico     16/32/48 — o fallback de quem não lê favicon SVG,
 *                       e o que atende o /favicon.ico que todo cliente pede
 *                       sozinho, sem <link> nenhum
 *   .superpowers/sdd/2026-07-28-main-page-202/frames/icone-*.png  provas
 *
 * POR QUE QUADRADO: a marca "202" é 2.15:1. O ícone antigo usava esse
 * viewBox largo direto, então num slot 16x16 o preto virava uma FAIXA de
 * 16x7.5 boiando em transparência — em aba clara, um borrão sem contorno.
 * O quadrado dá o ladrilho preto inteiro em qualquer slot.
 *
 * O TETO DE LEGIBILIDADE (medido, não estimado): com os três glifos inteiros
 * dentro de um quadrado, a altura do glifo num ícone de 16px é
 * 16 * 303.5/653 ≈ 7.4px, ~5px por dígito. A caixa de tinta do logo já é
 * justa (0.2% de folga horizontal — conferido rasterizando e medindo os
 * pixels), então NÃO existe recorte a recuperar: 7.4px é o teto geométrico,
 * não um defeito de rasterização. Passar disso exigiria cortar a marca ou
 * mostrar menos glifos — decisão de marca, do fundador, não do build.
 * O `TRACO` abaixo é a compensação óptica possível sem tocar na forma.
 *
 * Requer `sharp`, que já vem no node_modules como dependência do next. É
 * script de autoria (roda à mão quando o logo muda), não entra no build.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const FRAMES = join(RAIZ, ".superpowers/sdd/2026-07-28-main-page-202/frames");

const PRETO = "#0a0a0a";
const BRANCO = "#ffffff";
/** Fração da largura do quadrado ocupada pela marca. 1 = encostando nas bordas. */
const LARGURA = 0.96;
/** Engorda óptica, em unidades do viewBox (a marca tem 653 de largura).
 *  Some no tamanho grande e é o que faz o hairline do didone sobreviver
 *  ao downsample para 16/32px. Comparado a olho em 0, 3, 6 e 10. */
const TRACO = 5;

/** Lê os glifos do arquivo gerado, sem depender de transpilar TS. */
function lerGlifos() {
  const src = readFileSync(join(RAIZ, "lib/logo-paths.ts"), "utf8");
  const grupo = src.match(/LOGO_GRUPO_TRANSFORM = "([^"]+)"/)[1];
  const depois = src.slice(src.indexOf("LOGO_GLIFOS = [") + "LOGO_GLIFOS = ".length);
  const glifos = JSON.parse(depois.slice(0, depois.lastIndexOf("]") + 1));
  return { grupo, glifos };
}

/** `janela` é o retângulo do viewBox em unidades do logo: {x, y, lado}. */
function montarSvg({ grupo, glifos }, janela, { traco = TRACO, px } = {}) {
  const { x, y, lado } = janela;
  const dim = px ? ` width="${px}" height="${px}"` : "";
  const pincel = traco > 0 ? ` stroke="${BRANCO}" stroke-width="${traco}"` : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${lado} ${lado}"${dim}>` +
    `<rect x="${x}" y="${y}" width="${lado}" height="${lado}" fill="${PRETO}"/>` +
    `<g transform="${grupo}" fill="${BRANCO}"${pincel}>` +
    glifos.map((g) => `<g transform="${g.transform}"><path d="${g.d}"/></g>`).join("") +
    `</g></svg>`
  );
}

/**
 * Caixa de tinta real dos glifos, medida rasterizando — não chutada.
 * Mede uma janela FOLGADA (o logo inteiro cabe com sobra) e converte os
 * pixels de volta usando a origem dessa mesma janela: usar qualquer outra
 * origem desloca o centro e o quadrado sai torto.
 */
async function medirTinta(logo) {
  const janela = { x: -200, y: 300, lado: 1200 };
  const px = 1200;
  const cru = montarSvg(logo, janela, { traco: 0, px });
  const { data, info } = await sharp(Buffer.from(cru), { density: 300 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let minX = Infinity, maxX = -1, minY = Infinity, maxY = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * info.channels;
      const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (lum > 60) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error("nenhum glifo encontrado ao medir a tinta");
  const s = janela.lado / info.width; // unidades do logo por pixel
  return {
    cx: janela.x + ((minX + maxX) / 2) * s,
    cy: janela.y + ((minY + maxY) / 2) * s,
    largura: (maxX - minX + 1) * s,
    altura: (maxY - minY + 1) * s,
  };
}

/** SVG -> PNG num tamanho. Rasteriza grande e reduz com lanczos: reduzir
 *  direto do vetor para 16px perde o glifo. */
async function png(svg, size) {
  const grande = await sharp(Buffer.from(svg), { density: 300 }).png().toBuffer();
  return sharp(grande).resize(size, size, { kernel: "lanczos3" }).png().toBuffer();
}

/** Container ICO com PNGs dentro (Vista+ e todos os navegadores atuais). */
function montarIco(imagens) {
  const cab = Buffer.alloc(6);
  cab.writeUInt16LE(0, 0);
  cab.writeUInt16LE(1, 2);
  cab.writeUInt16LE(imagens.length, 4);
  let offset = 6 + 16 * imagens.length;
  const entradas = imagens.map(({ size, buf }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(buf.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += buf.length;
    return e;
  });
  return Buffer.concat([cab, ...entradas, ...imagens.map((i) => i.buf)]);
}

const logo = lerGlifos();
const tinta = await medirTinta(logo);
const lado = tinta.largura / LARGURA;
const svg = montarSvg(logo, {
  x: tinta.cx - lado / 2,
  y: tinta.cy - lado / 2,
  lado,
});

writeFileSync(join(RAIZ, "app/icon.svg"), svg + "\n");
writeFileSync(join(RAIZ, "app/apple-icon.png"), await png(svg, 180));
writeFileSync(
  join(RAIZ, "app/favicon.ico"),
  montarIco(
    await Promise.all([16, 32, 48].map(async (size) => ({ size, buf: await png(svg, size) }))),
  ),
);

mkdirSync(FRAMES, { recursive: true });
for (const size of [16, 32, 64, 180]) {
  const buf = await png(svg, size);
  writeFileSync(join(FRAMES, `icone-${size}.png`), buf);
  // ampliação nearest: é assim que dá para OLHAR um ícone de 16px
  writeFileSync(
    join(FRAMES, `icone-${size}-ampliado.png`),
    await sharp(buf).resize(256, 256, { kernel: "nearest" }).png().toBuffer(),
  );
}

console.log(
  `tinta ${tinta.largura.toFixed(1)}x${tinta.altura.toFixed(1)} ` +
    `(${(tinta.largura / tinta.altura).toFixed(2)}:1) | quadrado ${lado.toFixed(1)} | ` +
    `glifo num icone 16px: ${((16 * tinta.altura) / lado).toFixed(1)}px`,
);
console.log("escritos: app/icon.svg, app/apple-icon.png, app/favicon.ico, frames/icone-*.png");
