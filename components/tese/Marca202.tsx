import Link from "next/link";
import { LOGO_GLIFOS, LOGO_GRUPO_TRANSFORM, LOGO_VIEWBOX } from "@/lib/logo-paths";
import estilos from "./Marca202.module.css";

/**
 * O `202` pequeno do cabeçalho da tese, que leva de volta para a home.
 *
 * Usa os mesmos vetores de `lib/logo-paths.ts` que a logo gigante da home —
 * a fonte do wordmark (The Seasons) nunca foi embarcada, então o logo é sempre
 * path, nunca texto.
 *
 * **Sem o ponto verde**, e isso é decisão, não esquecimento: nesta página o
 * ponto verde é a pontuação que fecha cada statement da tese. Se ele também
 * morasse no cabeçalho, o leitor veria dois verdes na mesma tela disputando
 * significado, e o da marca — que fica parado no topo o tempo todo — venceria
 * por presença. O `202` sozinho continua sendo reconhecível como a 202: é
 * exatamente o que a home faz no centro da tela.
 */
export default function Marca202({ rotulo }: { rotulo: string }) {
  return (
    <Link href="/" className={estilos.marca} aria-label={rotulo}>
      <svg
        className={estilos.svg}
        viewBox={LOGO_VIEWBOX}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
      >
        <g transform={LOGO_GRUPO_TRANSFORM} fill="currentColor">
          {LOGO_GLIFOS.map((glifo, i) => (
            <g key={i} transform={glifo.transform}>
              <path d={glifo.d} />
            </g>
          ))}
        </g>
      </svg>
    </Link>
  );
}
