"use client";

import { Fragment } from "react";
import { IDIOMAS, type Idioma } from "@/lib/copy";
import estilos from "./SeletorIdioma.module.css";

export default function SeletorIdioma({
  idioma,
  aoTrocar,
}: {
  idioma: Idioma;
  aoTrocar: (novo: Idioma) => void;
}) {
  return (
    <div className={`label ${estilos.seletor}`}>
      {IDIOMAS.map((opcao, i) => (
        <Fragment key={opcao}>
          {i > 0 && (
            <span className={estilos.barra} aria-hidden="true">
              /
            </span>
          )}
          <button
            type="button"
            className={estilos.botao}
            aria-pressed={opcao === idioma}
            onClick={() => aoTrocar(opcao)}
          >
            {opcao.toUpperCase()}
          </button>
        </Fragment>
      ))}
    </div>
  );
}
