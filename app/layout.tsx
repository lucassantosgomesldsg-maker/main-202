import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Inter } from "next/font/google";
import { oneliner } from "@/lib/copy";
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
  description: oneliner("pt"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${fraunces.variable} ${plexMono.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
