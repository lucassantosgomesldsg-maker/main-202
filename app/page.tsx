"use client";

import { useEffect, useState } from "react";
import MotionD from "@/components/motion/MotionD";
import SeletorIdioma from "@/components/SeletorIdioma";
// O alias `as useMotionUmaVez` não é cosmético: a regra react-hooks só
// reconhece uma chamada como hook pelo NOME no ponto da chamada. Com o nome
// português o lint enxergava `usaMotionUmaVez()` como função comum e deixava
// passar chamada condicional — verificado: uma chamada dentro de `if` passava
// lint, tsc e build, e derrubava a página em runtime. O export segue em
// português (convenção do projeto); só o identificador local muda.
import { usaMotionUmaVez as useMotionUmaVez } from "@/lib/usaMotionUmaVez";
import { COORDENADAS, COPY, INSTAGRAM, LOCAL, titulo, type Idioma } from "@/lib/copy";

const CHAVE_IDIOMA = "202:idioma";

export default function Home() {
  const [idioma, setIdioma] = useState<Idioma>("pt");
  const t = COPY[idioma];
  const jaRodou = useMotionUmaVez();

  // restaura a escolha anterior; nunca detecta o idioma do navegador
  useEffect(() => {
    const guardado = window.localStorage.getItem(CHAVE_IDIOMA);
    // Proposital, não um efeito perdido: o estado PRECISA nascer "pt" pro
    // HTML do servidor bater com o primeiro render do cliente (hydration),
    // e só localStorage (inexistente no servidor) diz se deve virar "en".
    // Isto é sincronizar React com um sistema externo — o próprio caso de
    // uso que a doc da regra aceita — não um derivado de outro estado
    // React. Já confirmado como não-defeito em duas revisões anteriores.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (guardado === "en" || guardado === "pt") setIdioma(guardado);
  }, []);

  useEffect(() => {
    document.documentElement.lang = idioma === "pt" ? "pt-BR" : "en";
  }, [idioma]);

  function trocarIdioma(novo: Idioma) {
    setIdioma(novo);
    window.localStorage.setItem(CHAVE_IDIOMA, novo);
  }

  return (
    <main className="tela">
      {/* Único dono do <title>: app/layout.tsx deliberadamente não declara
          metadata.title (ver comentário lá). O React 19 hoista este elemento
          para o <head> de onde quer que ele esteja na árvore — é o jeito
          declarativo, sem escrita manual em document.title e sem correr
          atrás de nenhuma reconciliação do App Router. */}
      <title>{titulo(idioma)}</title>
      <header className="topo">
        <SeletorIdioma idioma={idioma} aoTrocar={trocarIdioma} />
        {/* data-ima: a lanterna gruda aqui. É só uma marca lida por
            lib/usaLanterna — nada de pointer-events, nada de listener — então
            o link continua clicável e focável exatamente como era. */}
        <a
          className="label contato"
          data-ima="contato"
          href={INSTAGRAM}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t.contato} ↗
        </a>
      </header>

      <div className="centro">
        <MotionD estatico={jaRodou} />
      </div>

      <footer className="base">
        {/* A frase inteira é UM ímã, as duas linhas juntas. Aqui ele não é
            dica de clique (não há para onde ir) — é ênfase: a luz para em
            cima da frase. Decisão explícita do Lucas.

            É <h1> e não <p>: é a única frase da página que descreve o que a
            202 faz, então é o título dela para leitor de tela e para busca —
            a página vinha com zero heading. Os <span> por linha continuam:
            os testes (unitário e e2e) casam texto linha a linha. Nada muda
            visualmente — `.oneliner` já define família, peso e tamanho, e o
            reset `* { margin: 0 }` no topo de globals.css já zerava a margem
            que o h1 traria por padrão. */}
        <h1 className="oneliner" data-ima="oneliner">
          <span>{t.onelinerLinhas[0]}</span>
          <br />
          <span>{t.onelinerLinhas[1]}</span>
        </h1>
        <p className="label coordenadas">
          <span>{COORDENADAS}</span>
          <br />
          <span>{LOCAL}</span>
        </p>
      </footer>
    </main>
  );
}
