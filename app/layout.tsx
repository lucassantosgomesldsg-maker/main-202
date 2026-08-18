import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Mono, Inter } from "next/font/google";
import { INSTAGRAM, titulo } from "@/lib/copy";
import { DESCRICAO_BUSCA, URL_SITE, dadosOrganizacao } from "@/lib/site";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--fonte-display",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--fonte-mono",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--fonte-corpo",
  display: "swap",
});

// `title` é deliberadamente omitido daqui. app/page.tsx (Home, "use client")
// renderiza seu próprio <title>{titulo(idioma)}</title> — o React 19 hoista
// esse elemento para o <head> de onde estiver na árvore, e esta é a fonte
// ÚNICA do título da página, trocando com o idioma sem reload. Declarar
// `title` aqui também gerava um segundo <title> estático (sempre "pt") que o
// App Router reafirma pouco depois da hidratação, prendendo a aba nesse
// valor sempre que a home restaura EN de localStorage logo no mount — bug
// verificado em produção, não só em dev (task-8-report.md, "Fix round 1").
// Task 10 vai trazer Open Graph / Twitter cards com um title próprio: tudo
// bem, esses vivem em og:title/twitter:title (tags <meta>, não <title>) e não
// competem com isto — só não devolva `title` a este objeto.
export const metadata: Metadata = {
  metadataBase: new URL(URL_SITE),
  // Era `oneliner("pt")` — a frase da marca. Ela continua sendo o <h1> e o
  // og:title (via `titulo`), que é onde ela pertence; aqui ela não servia,
  // porque a descrição do resultado do Google é o único lugar em que a 202
  // precisa dizer o que ela É para alguém que ainda não a conhece. Ver o
  // comentário de DESCRICAO_BUSCA em lib/site.ts.
  description: DESCRICAO_BUSCA,
  // Diz ao Google qual é o endereço oficial desta página, para ele não tratar
  // variações (www, com barra no fim, com ?utm_source=...) como páginas
  // diferentes disputando entre si. O caminho é relativo de propósito:
  // `metadataBase` acima o completa, então o domínio vive num lugar só.
  alternates: { canonical: "/" },
  openGraph: {
    title: titulo("pt"),
    description: DESCRICAO_BUSCA,
    url: "/",
    siteName: "202Lab",
    locale: "pt_BR",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: titulo("pt"), description: DESCRICAO_BUSCA },
};

export const viewport: Viewport = { themeColor: "#0a0a0a" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${fraunces.variable} ${plexMono.variable} ${inter.variable}`}>
      <body>
        {children}
        {/* O cartão de identidade da 202 para buscadores. Fica no layout raiz
            porque descreve a ORGANIZAÇÃO, não a página — vale igual na home e
            na tese, e declarar duas vezes só criaria duas versões para
            divergirem.

            `<script>` nativo e não next/script: isto é dado estruturado, não
            código para executar — é a recomendação explícita da doc do Next
            (02-guides/json-ld.md). O `.replace(/</g, "\\u003c")` também vem de
            lá: fecha a porta para uma string do payload escapar do <script> e
            virar HTML. Hoje o conteúdo é todo constante e nada disso poderia
            acontecer; o dia em que alguém trouxer um nome de fora é
            exatamente o dia em que ninguém vai lembrar de adicionar o escape. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(dadosOrganizacao(INSTAGRAM)).replace(/</g, "\\u003c"),
          }}
        />
      </body>
    </html>
  );
}
