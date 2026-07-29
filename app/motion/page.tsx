"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import MotionA from "@/components/motion/MotionA";
import MotionB from "@/components/motion/MotionB";
import MotionC from "@/components/motion/MotionC";
import MotionD from "@/components/motion/MotionD";
import type { PropsMotion } from "@/components/motion/tipos";

/** D vem primeiro de propósito: é o candidato novo, o que está sendo julgado.
 *  A, B e C continuam na lista só como comparação. */
const CANDIDATOS: {
  id: string;
  nome: string;
  Componente: ComponentType<PropsMotion>;
}[] = [
  { id: "D", nome: "Malha, logo e lanterna", Componente: MotionD },
  { id: "A", nome: "Linhas construtivas", Componente: MotionA },
  { id: "B", nome: "Revelação por glifo", Componente: MotionB },
  { id: "C", nome: "Traço desenhando", Componente: MotionC },
];

/**
 * Uma seção por candidato, cada uma do tamanho exato da tela. O problema que
 * isto resolve: antes, os três ficavam empilhados na mesma rolagem e todos
 * tocavam ao carregar a página — quando o Lucas rolava até B ou C, a
 * animação já tinha acontecido fora de vista.
 *
 * Agora cada seção só monta o seu candidato quando entra na tela
 * (IntersectionObserver), e remonta (troca de `key`, igual à versão
 * anterior) toda vez que volta a aparecer — então rolar até um candidato
 * sempre o mostra do frame zero, sem precisar sair da tela para reiniciar:
 * o botão "tocar de novo" está dentro da própria seção.
 */
function Secao({
  id,
  nome,
  Componente,
}: {
  id: string;
  nome: string;
  Componente: ComponentType<PropsMotion>;
}) {
  const [rodada, setRodada] = useState(0);
  const [visivel, setVisivel] = useState(false);
  const secaoRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = secaoRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisivel(true);
          setRodada((n) => n + 1);
        }
      },
      { threshold: 0.6 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={secaoRef}
      style={{
        height: "100dvh",
        scrollSnapAlign: "start",
        scrollSnapStop: "always",
        position: "relative",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
        borderBottom: "1px solid var(--cinza-linha)",
      }}
    >
      {/* z-index acima do palco: o candidato D é fundo de tela cheia e, sem
          isto, a malha cobriria o rótulo e o botão de tocar de novo. */}
      <p
        className="label"
        style={{ position: "absolute", top: "2rem", left: "2rem", zIndex: 2 }}
      >
        {id} — {nome}
      </p>

      <button
        className="label"
        onClick={() => setRodada((n) => n + 1)}
        style={{
          position: "absolute",
          top: "2rem",
          right: "2rem",
          zIndex: 2,
          background: "none",
          border: "1px solid var(--cinza-linha)",
          padding: "0.8rem 1.5rem",
          color: "var(--cinza-texto)",
          cursor: "pointer",
        }}
      >
        ▸ Tocar de novo
      </button>

      <div style={{ display: "grid", placeItems: "center", minHeight: "40vh" }}>
        {visivel && <Componente key={`${id}-${rodada}`} />}
      </div>
    </section>
  );
}

export default function Comparacao() {
  return (
    <div
      style={{
        height: "100dvh",
        overflowY: "auto",
        scrollSnapType: "y mandatory",
      }}
    >
      {CANDIDATOS.map(({ id, nome, Componente }) => (
        <Secao key={id} id={id} nome={nome} Componente={Componente} />
      ))}
    </div>
  );
}
