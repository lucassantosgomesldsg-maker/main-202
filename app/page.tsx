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

    const tituloDesejado = titulo(idioma);
    document.title = tituloDesejado;

    // O App Router reafirma o <title> estático do metadata (sempre em "pt")
    // pouco depois da hidratação — em produção, não só em dev — e essa
    // reafirmação vence a escrita acima quando ela acontece perto do mount
    // (como na restauração via localStorage). Sem isto, quem volta com EN
    // salvo vê o conteúdo da página em inglês mas a aba do navegador em
    // português. O observer corrige de volta se algo mexer no título
    // enquanto este efeito estiver de pé; a troca por clique, que acontece
    // bem depois desse instante, nunca chega a precisar dele.
    const elementoTitulo = document.querySelector("title");
    if (!elementoTitulo) return;
    const observador = new MutationObserver(() => {
      if (document.title !== tituloDesejado) document.title = tituloDesejado;
    });
    observador.observe(elementoTitulo, { childList: true, characterData: true, subtree: true });
    return () => observador.disconnect();
  }, [idioma]);

  function trocarIdioma(novo: Idioma) {
    setIdioma(novo);
    window.localStorage.setItem(CHAVE_IDIOMA, novo);
  }

  return (
    <div className="tela">
      <header className="topo">
        <SeletorIdioma idioma={idioma} aoTrocar={trocarIdioma} />
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
