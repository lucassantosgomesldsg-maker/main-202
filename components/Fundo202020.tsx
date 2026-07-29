import estilos from "./Fundo202020.module.css";

/** O papel de parede oficial da marca: "202" repetido a 4% de diferença de
 *  luminância sobre o preto. Presença sem ruído (design.md §3). */
const PADRAO = "202".repeat(3000);

export default function Fundo202020() {
  return (
    <div aria-hidden="true" className={estilos.fundo}>
      {PADRAO}
    </div>
  );
}
