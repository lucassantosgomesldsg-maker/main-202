import type { Metadata } from "next";
import { TESE } from "@/lib/tese";

const abertura = TESE.pt.secoes[0];
const resumo = abertura.titulo.join(" ");

/**
 * `title` é omitido aqui pelo mesmo motivo que em `app/layout.tsx`: quem é
 * dono do título desta rota é o `<title>` que `app/tese/page.tsx` renderiza,
 * porque ele troca junto com o idioma sem recarregar a página. Declarar
 * `title` neste objeto criaria um segundo título estático, sempre em
 * português, que o App Router reafirma logo depois da hidratação — o bug já
 * verificado em produção na home. `openGraph.title` e `twitter.title` abaixo
 * são `<meta>`, não `<title>`, e não competem com ele.
 */
export const metadata: Metadata = {
  description: resumo,
  alternates: { canonical: "/tese" },
  openGraph: {
    title: `202Lab — ${TESE.pt.rotuloPagina}`,
    description: resumo,
    url: "/tese",
    siteName: "202Lab",
    locale: "pt_BR",
    type: "article",
    // Sem esta linha a /tese era compartilhada SEM imagem nenhuma — conferido
    // no site no ar. A imagem da raiz (app/opengraph-image.tsx) não chega
    // aqui: declarar um objeto `openGraph` próprio SUBSTITUI o do layout pai
    // inteiro, e a imagem que o pai tinha vai junto. Apontar de volta para a
    // rota da raiz reaproveita o mesmo card (logo + oneliner), que é
    // institucional e serve às duas páginas — não é imagem provisória.
    //
    // As DIMENSÕES não são decoração. Apontar a imagem por string crua, como
    // esta linha fazia, emite só `og:image` — sem `og:image:width`/`height`,
    // que a raiz ganha de graça por usar o arquivo de convenção. E é por essas
    // duas tags que o WhatsApp decide entre o card GRANDE e o thumbnail
    // QUADRADO; sem elas ele apara o 1200x630 pelo centro e corta justamente o
    // "202" da esquerda e o oneliner de baixo, deixando um retângulo preto
    // quase vazio. Conferido no HTML servido: a raiz emitia as duas, a /tese
    // não emitia nenhuma.
    images: [
      { url: "/opengraph-image", width: 1200, height: 630, type: "image/png", alt: "202Lab" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `202Lab — ${TESE.pt.rotuloPagina}`,
    description: resumo,
    // Explícito, e não confiando em herdar de `openGraph` acima: um
    // `summary_large_image` sem imagem é a única combinação que degrada para
    // pior que o card simples — a rede mostra a moldura grande vazia.
    images: ["/opengraph-image"],
    // (twitter:image não tem par de tags de dimensão; aqui a string basta.)
  },
};

export default function LayoutTese({ children }: { children: React.ReactNode }) {
  return children;
}
