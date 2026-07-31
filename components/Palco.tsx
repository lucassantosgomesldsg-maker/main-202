import Fundo202020 from "@/components/Fundo202020";
import Logo202 from "@/components/Logo202";
import estilos from "./Palco.module.css";

/**
 * O palco da abertura: a tela cheia onde o fundo e a logo convivem.
 *
 * É o que sobrou do `.palco` do MotionD (arquivado — ver o cabeçalho de
 * components/motion/MotionD.tsx) depois de tirar a coreografia dele: só a
 * geometria. Quem anima a logo hoje é app/abertura.module.css, de fora. Este
 * componente não sabe de tempo nenhum, e é de propósito: assim a coreografia
 * mora num arquivo só, junto com a do topo e a da frase.
 */
export default function Palco() {
  return (
    <div data-palco className={estilos.palco}>
      <Fundo202020 className={estilos.fundo} />
      <Logo202 className={estilos.logo} />
    </div>
  );
}
