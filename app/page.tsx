"use client";

import MotionD from "@/components/motion/MotionD";
import { usaMotionUmaVez } from "@/lib/usaMotionUmaVez";
import { COORDENADAS, COPY, INSTAGRAM, LOCAL } from "@/lib/copy";

export default function Home() {
  const idioma = "pt" as const;
  const t = COPY[idioma];
  const jaRodou = usaMotionUmaVez();

  return (
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
        <MotionD estatico={jaRodou} />
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
  );
}
