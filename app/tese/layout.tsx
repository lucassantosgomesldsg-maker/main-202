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
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: `202Lab — ${TESE.pt.rotuloPagina}`,
    description: resumo,
    // Explícito, e não confiando em herdar de `openGraph` acima: um
    // `summary_large_image` sem imagem é a única combinação que degrada para
    // pior que o card simples — a rede mostra a moldura grande vazia.
    images: ["/opengraph-image"],
  },
};

export default function LayoutTese({ children }: { children: React.ReactNode }) {
  return children;
}
