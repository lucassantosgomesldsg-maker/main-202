import Lanterna from "./Lanterna";
import Malha from "./Malha";
import estilos from "./Fundo202020.module.css";

/**
 * O papel de parede oficial da marca: "2" e "0" repetidos a poucos por cento de
 * diferença de luminância sobre o preto. Presença sem ruído (design.md §3).
 *
 * A malha vive DENTRO da lanterna porque é dela que sai a posição da luz — e
 * porque a caixa da lanterna é o sistema de coordenadas em que essa posição é
 * medida. A vinheta fica fora, por cima das duas: ela escurece os cantos da
 * trama, e é o que dá profundidade e ajuda a leitura do que ocupa os cantos da
 * página.
 */
export default function Fundo202020({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={[estilos.fundo, className].filter(Boolean).join(" ")}
    >
      <Lanterna>
        <Malha />
      </Lanterna>
      <div data-vinheta className={estilos.vinheta} />
    </div>
  );
}
