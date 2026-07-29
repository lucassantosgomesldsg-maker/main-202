"use client";

import { useState } from "react";
import MotionA from "@/components/motion/MotionA";
import MotionB from "@/components/motion/MotionB";
import MotionC from "@/components/motion/MotionC";

const CANDIDATOS = [
  { id: "A", nome: "Linhas construtivas", Componente: MotionA },
  { id: "B", nome: "Revelação por glifo", Componente: MotionB },
  { id: "C", nome: "Traço desenhando", Componente: MotionC },
];

export default function Comparacao() {
  const [rodada, setRodada] = useState(0);

  return (
    <div style={{ height: "100dvh", overflowY: "auto", padding: "2rem" }}>
      <button
        className="label"
        onClick={() => setRodada((n) => n + 1)}
        style={{
          background: "none",
          border: "1px solid var(--cinza-linha)",
          padding: "0.8rem 1.5rem",
          color: "var(--cinza-texto)",
          cursor: "pointer",
          marginBottom: "2rem",
        }}
      >
        ▸ Tocar os três de novo
      </button>

      <div style={{ display: "grid", gap: "3rem" }}>
        {CANDIDATOS.map(({ id, nome, Componente }) => (
          <section key={id}>
            <p className="label" style={{ marginBottom: "1rem" }}>
              {id} — {nome}
            </p>
            <div
              style={{
                display: "grid",
                placeItems: "center",
                minHeight: "40vh",
                border: "1px solid var(--cinza-linha)",
              }}
            >
              <Componente key={`${id}-${rodada}`} />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
