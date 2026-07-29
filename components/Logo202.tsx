import { LOGO_GLIFOS, LOGO_GRUPO_TRANSFORM, LOGO_VIEWBOX } from "@/lib/logo-paths";
import estilos from "./Logo202.module.css";

export default function Logo202({ className }: { className?: string }) {
  return (
    <div data-logo className={[estilos.raiz, className].filter(Boolean).join(" ")}>
      <svg
        data-glifos
        className={estilos.svg}
        viewBox={LOGO_VIEWBOX}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="202Lab"
      >
        <g transform={LOGO_GRUPO_TRANSFORM} fill="var(--branco-202)">
          {LOGO_GLIFOS.map((glifo, i) => (
            <g key={i} data-glifo data-indice={i} transform={glifo.transform}>
              <path d={glifo.d} />
            </g>
          ))}
        </g>
      </svg>
      <span data-ponto aria-hidden="true" className={estilos.ponto} />
    </div>
  );
}
