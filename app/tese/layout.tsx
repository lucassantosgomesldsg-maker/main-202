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
  openGraph: {
    title: `202Lab — ${TESE.pt.rotuloPagina}`,
    description: resumo,
    url: "https://202lab.com.br/tese",
    siteName: "202Lab",
    locale: "pt_BR",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: `202Lab — ${TESE.pt.rotuloPagina}`,
    description: resumo,
  },
};

export default function LayoutTese({ children }: { children: React.ReactNode }) {
  return children;
}
