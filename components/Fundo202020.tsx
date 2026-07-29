import Lanterna from "./Lanterna";
import estilos from "./Fundo202020.module.css";

/** O papel de parede oficial da marca: "202" repetido a poucos por cento de
 *  diferença de luminância sobre o preto. Presença sem ruído (design.md §3). */
const PADRAO = "202".repeat(3000);

/**
 * Duas camadas da mesma malha, exatamente sobrepostas:
 *
 *   base — `--padrao-base`, sem máscara, no limite do perceptível. É o que
 *          garante que a tela nunca fique vazia, lanterna ou não.
 *   luz  — `--padrao-luz`, mascarada por um radial-gradient centrado na
 *          lanterna. É o que o cursor "acende".
 *
 * Em ponteiro grosso não há cursor: a camada de luz some e a base volta ao
 * `--padrao-202020` aprovado na fatia 1 (regras em Fundo202020.module.css).
 */
export default function Fundo202020({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={[estilos.fundo, className].filter(Boolean).join(" ")}
    >
      <div className={estilos.base}>{PADRAO}</div>
      <Lanterna>
        <div className={estilos.luz}>{PADRAO}</div>
      </Lanterna>
    </div>
  );
}
