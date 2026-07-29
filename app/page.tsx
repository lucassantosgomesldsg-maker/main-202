"use client";

import { useEffect, useState } from "react";
import MotionD from "@/components/motion/MotionD";
import SeletorIdioma from "@/components/SeletorIdioma";
import { usaMotionUmaVez } from "@/lib/usaMotionUmaVez";
import { COORDENADAS, COPY, INSTAGRAM, LOCAL, titulo, type Idioma } from "@/lib/copy";

const CHAVE_IDIOMA = "202:idioma";

export default function Home() {
  const [idioma, setIdioma] = useState<Idioma>("pt");
  const t = COPY[idioma];
  const jaRodou = usaMotionUmaVez();

  // restaura a escolha anterior; nunca detecta o idioma do navegador
  useEffect(() => {
    const guardado = window.localStorage.getItem(CHAVE_IDIOMA);
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
    <div className="tela">
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
            cima da frase. Decisão explícita do Lucas. */}
        <p className="oneliner" data-ima="oneliner">
          <span>{t.onelinerLinhas[0]}</span>
          <br />
          <span>{t.onelinerLinhas[1]}</span>
        </p>
        <p className="label coordenadas">
          <span>{COORDENADAS}</span>
          <br />
          <span>{LOCAL}</span>
        </p>
      </footer>
    </div>
  );
}
