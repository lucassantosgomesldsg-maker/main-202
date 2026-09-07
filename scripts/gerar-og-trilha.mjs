/**
 * Recorta public/trilha-arte.webp para o formato do card social e grava
 * assets/trilha-arte-og.jpg.
 *
 *   node scripts/gerar-og-trilha.mjs
 *
 * Rodar de novo só se a arte de origem mudar.
 *
 * POR QUE UM ARQUIVO PRÉ-GERADO, e não ler o .webp direto na rota:
 * o satori (quem desenha a ImageResponse) não decodifica WebP — ele só
 * reconhece PNG, JPEG, GIF e SVG. Passar o .webp como data URI faz a imagem
 * sair em branco, sem erro nenhum, que é a pior forma de quebrar. JPEG
 * também pesa menos que PNG aqui: a arte é foto-like (degradê de neon sobre
 * preto), caso em que PNG não comprime.
 *
 * POR QUE 1200x630: é o tamanho que app/trilha/inscricao/opengraph-image.tsx
 * declara, e o que o WhatsApp e o LinkedIn esperam (1.91:1). A origem é
 * 1157x586 (1.975:1), então o `cover` apara ~22px de cada lado — a bandeira,
 * que é o ponto focal, fica a ~79% da largura e sobrevive à apara com folga.
 *
 * Requer `sharp`, que já vem no node_modules como dependência do next. É
 * script de autoria, não entra no build.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const ORIGEM = join(RAIZ, "public/trilha-arte.webp");
const DESTINO = join(RAIZ, "assets/trilha-arte-og.jpg");

const LARGURA = 1200;
const ALTURA = 630;

const buf = await sharp(ORIGEM)
  .resize(LARGURA, ALTURA, { fit: "cover", position: "center" })
  // 82 é o ponto onde o degradê do neon ainda não mostra faixa de banding
  // no céu preto; acima disso o arquivo cresce sem diferença visível.
  .jpeg({ quality: 82, chromaSubsampling: "4:4:4" })
  .toBuffer();

writeFileSync(DESTINO, buf);
console.log(`assets/trilha-arte-og.jpg — ${LARGURA}x${ALTURA}, ${(buf.length / 1024).toFixed(1)}KB`);
