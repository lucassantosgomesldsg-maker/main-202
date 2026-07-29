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
    // data-ima fica no par, não em cada botão: PT e EN são pequenos e
    // colados, e dois ímãs disputando essa faixa de tela seria pior que um só
    // (decisão do brief da Task 11). A marca é lida por lib/usaLanterna e não
    // muda nada do comportamento dos botões.
    <div className={`label ${estilos.seletor}`} data-ima="idioma">
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
