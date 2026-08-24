import type { Metadata } from "next";
import { COPY_INSCRICAO } from "@/lib/inscricao";

/** A linha da abertura que diz para quem a trilha é — a melhor prévia possível. */
const descricao = COPY_INSCRICAO.abertura.linhas[1];

/**
 * Aqui o `title` **entra** no `metadata`, ao contrário de `app/layout.tsx` e de
 * `app/tese/layout.tsx`. Vale a pena explicar, porque a regra do repo diz o
 * oposto e ela existe por causa de um bug verificado em produção.
 *
 * O bug é de **título com duas fontes**. A home e a /tese são Client Components
 * que trocam de idioma sem recarregar, então o título delas precisa trocar
 * junto — e por isso elas renderizam um `<title>` dentro do JSX, que o React 19
 * hoista para o `<head>`. Declarar `title` também no `metadata` criava um
 * segundo título, estático e sempre em português, que o App Router reafirma
 * logo depois da hidratação: a aba travava no valor errado.
 *
 * Nesta rota nada disso existe. A página é monolíngue (spec §2), é um Server
 * Component, e **nenhum componente abaixo dela renderiza `<title>`** — conferido
 * em `page.tsx`, `Formulario.tsx`, `Campos.tsx`, `ComboboxCurso.tsx`,
 * `Premios.tsx` e `Progresso.tsx`. Com fonte única, o caminho do `metadata` é o
 * caminho normal do Next e o único que funciona sem JavaScript. Se um dia algum
 * componente daqui renderizar um `<title>` próprio, é esta linha que sai.
 *
 * `robots: { index: false, follow: false }` vale para esta rota e para tudo
 * abaixo dela (spec §11). A página existe para quem recebe o link a dedo; não
 * há link para ela em lugar nenhum do site. É reversível numa linha.
 *
 * Open Graph mínimo, sem imagem própria: o link vai ser colado no WhatsApp e no
 * LinkedIn, onde título e descrição são o que aparece — a `opengraph-image` do
 * site serve para o resto.
 */
export const metadata: Metadata = {
  title: COPY_INSCRICAO.tituloAba,
  description: descricao,
  robots: { index: false, follow: false },
  openGraph: {
    title: COPY_INSCRICAO.tituloAba,
    description: descricao,
    url: "https://202lab.com.br/trilha/inscricao",
    siteName: "202Lab",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: COPY_INSCRICAO.tituloAba,
    description: descricao,
  },
};

export default function LayoutInscricao({ children }: { children: React.ReactNode }) {
  return children;
}
