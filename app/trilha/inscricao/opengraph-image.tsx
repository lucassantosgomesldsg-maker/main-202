import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { COPY_INSCRICAO } from "@/lib/inscricao";
import { LOGO_GLIFOS, LOGO_GRUPO_TRANSFORM, LOGO_VIEWBOX } from "@/lib/logo-paths";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "202Lab — A TRILHA";

/**
 * O card desta rota, separado do card institucional da raiz de propósito.
 *
 * ANTES DAQUI EXISTIR, esta rota ia para o WhatsApp SEM imagem nenhuma. Não
 * por esquecimento: `app/trilha/inscricao/layout.tsx` declara um objeto
 * `openGraph` próprio, e declarar o objeto SUBSTITUI o do pai inteiro — a
 * `opengraph-image` da raiz ia junto. É a mesma armadilha que o comentário
 * de `app/tese/layout.tsx` documenta, e que lá foi resolvida apontando de
 * volta para `/opengraph-image`. Aqui a saída é outra, porque esta página
 * merece card próprio: o arquivo de convenção. `opengraph-image.tsx` no
 * segmento tem precedência sobre o `metadata` do mesmo segmento, então ele
 * repõe og:image, og:image:width/height/type e twitter:image sozinho —
 * conferido no HTML servido, não deduzido da documentação.
 *
 * POR QUE AS DIMENSÕES IMPORTAM: sem `og:image:width`/`height`, o WhatsApp
 * tende a cair no thumbnail QUADRADO, que apara um 1200x630 pelo centro e
 * decepa justamente as pontas onde moram o logo e o título. Quem usa o
 * arquivo de convenção ganha as duas meta tags de graça; quem escreve
 * `images: ["/algum-caminho"]` à mão, não — foi o caso da /tese.
 *
 * A ARTE é a mesma trilha neon que a página mostra, recortada para 1200x630
 * por scripts/gerar-og-trilha.mjs (o satori não decodifica WebP; ver o
 * cabeçalho do script). O degradê por cima não é enfeite: sem ele o título
 * cai em cima do rastro aceso e some. Ele escurece só o terço esquerdo, que
 * é o pedaço vazio da arte — a bandeira, à direita, fica limpa.
 *
 * O "202" é vetor, não texto, pelo mesmo motivo do card da raiz: o logo é
 * The Seasons, fonte que o projeto nunca embarcou.
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

export default async function OpengraphImageInscricao() {
  const [fraunces, arte] = await Promise.all([
    readFile(join(process.cwd(), "assets/Fraunces-Light.woff")),
    readFile(join(process.cwd(), "assets/trilha-arte-og.jpg")),
  ]);
  const arteUri = `data:image/jpeg;base64,${arte.toString("base64")}`;

  const [, , vbW, vbH] = LOGO_VIEWBOX.split(" ").map(Number);
  const largura = 300;
  const altura = Math.round((largura * vbH) / vbW);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          color: "#ffffff",
          backgroundColor: "#0a0a0a",
          backgroundImage:
            "linear-gradient(100deg, rgba(10,10,10,0.96) 0%, rgba(10,10,10,0.88) 34%," +
            ` rgba(10,10,10,0.10) 72%), url("${arteUri}")`,
          backgroundSize: "1200px 630px",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <img src={logoDataUri()} width={largura} height={altura} alt="202Lab" />
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              background: "#c6ff3e",
              marginLeft: 11,
              marginBottom: 8,
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", fontFamily: "Fraunces" }}>
          <span style={{ fontSize: 22, letterSpacing: 4, color: "#c6ff3e", marginBottom: 18 }}>
            {COPY_INSCRICAO.abertura.rotulo}
          </span>
          <span style={{ fontSize: 58, lineHeight: 1.15 }}>{COPY_INSCRICAO.abertura.titulo}</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Fraunces", data: fraunces, style: "normal", weight: 300 }],
    },
  );
}
