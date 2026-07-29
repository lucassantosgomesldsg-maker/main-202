import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { COPY } from "@/lib/copy";
import { LOGO_GLIFOS, LOGO_GRUPO_TRANSFORM, LOGO_VIEWBOX } from "@/lib/logo-paths";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "202Lab";

/**
 * O card que aparece no WhatsApp, no LinkedIn e no Slack. Duas correções
 * sobre a versão anterior, que pedia `fontFamily: "Georgia, serif"` sem
 * embarcar fonte nenhuma e por isso saía inteira numa sans genérica:
 *
 * 1. O "202" NÃO é mais texto. É o mesmo vetor que components/Logo202.tsx
 *    desenha na página, vindo de lib/logo-paths.ts. Isso não é conveniência:
 *    o logo é The Seasons, fonte que o projeto nunca embarcou (ver o
 *    comentário no topo de app/globals.css) — como texto ele JAMAIS sairia
 *    certo, com ou sem `fonts`. Vetor é a única forma fiel, e de quebra
 *    dispensa fonte para o elemento mais visível do card.
 *
 * 2. O oneliner agora é Fraunces de verdade, com os bytes embarcados. Três
 *    formatos foram testados até achar o que o satori aceita:
 *      - o que o next/font/google baixa é .woff2 (conferido: os 15 arquivos
 *        de .next/static/media são todos woff2) — o satori NÃO lê woff2;
 *      - o Fraunces do repositório do Google Fonts é uma fonte VARIÁVEL, e
 *        o satori quebra nela ("Cannot read properties of undefined
 *        (reading '256')"), com ou sem `weight` declarado;
 *      - uma instância ESTÁTICA em .woff v1, peso 300 — o mesmo peso que
 *        `.oneliner` usa em globals.css — funciona, e são só 22KB.
 *    Daí assets/Fraunces-Light.woff, lido no build. A imagem é
 *    pré-renderizada estática, então este readFile roda no build, nunca em
 *    resposta a request.
 */

/** O logo como data URI — o satori desenha SVG via <img>. */
function logoDataUri() {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${LOGO_VIEWBOX}">` +
    `<g transform="${LOGO_GRUPO_TRANSFORM}" fill="#ffffff">` +
    LOGO_GLIFOS.map((g) => `<g transform="${g.transform}"><path d="${g.d}"/></g>`).join("") +
    `</g></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export default async function OpengraphImage() {
  const fraunces = await readFile(join(process.cwd(), "assets/Fraunces-Light.woff"));

  // LOGO_VIEWBOX é "64 564 654 305" e está justo na tinta (0,2% de folga),
  // então a proporção do viewBox é a proporção do desenho.
  const [, , vbW, vbH] = LOGO_VIEWBOX.split(" ").map(Number);
  const largura = 520;
  const altura = Math.round((largura * vbH) / vbW);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0a0a0a",
          color: "#ffffff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoDataUri()} width={largura} height={altura} alt="202Lab" />
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              background: "#c6ff3e",
              marginLeft: 18,
              marginBottom: 14,
            }}
          />
        </div>
        {/* As duas linhas vêm de lib/copy.ts com a MESMA quebra da página —
            não é o texto corrido deixado embrulhar sozinho pela largura. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontFamily: "Fraunces",
            fontSize: 44,
            lineHeight: 1.2,
          }}
        >
          {COPY.pt.onelinerLinhas.map((linha) => (
            <span key={linha}>{linha}</span>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Fraunces", data: fraunces, style: "normal", weight: 300 }],
    },
  );
}
