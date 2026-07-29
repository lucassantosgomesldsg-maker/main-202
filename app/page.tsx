"use client";

import Fundo202020 from "@/components/Fundo202020";
import Logo202 from "@/components/Logo202";
import { COORDENADAS, COPY, INSTAGRAM, LOCAL } from "@/lib/copy";

export default function Home() {
  const idioma = "pt" as const;
  const t = COPY[idioma];

  return (
    <>
      <Fundo202020 />
      <div className="tela">
        <header className="topo">
          <span />
          <a
            className="label contato"
            href={INSTAGRAM}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.contato} ↗
          </a>
        </header>

        <div className="centro">
          <Logo202 />
        </div>

        <footer className="base">
          <p className="oneliner">
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
    </>
  );
}
