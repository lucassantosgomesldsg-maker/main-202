"use client";

import type { Secao } from "@/lib/tese";
import estilos from "./Regua.module.css";

/**
 * A régua: a lateral esquerda da tese, e a assinatura visual da página.
 *
 * Não é uma barra de progresso — é um instrumento de medida. A página inteira
 * argumenta sobre RITMO (18 meses contra 48), então o objeto que acompanha a
 * leitura precisa ser o mesmo tipo de objeto que aparece dentro do argumento:
 * um traço graduado. Os tracinhos menores entre as seções vêm de um
 * `repeating-linear-gradient` no próprio fio (Regua.module.css), não de
 * elementos — são gradação, não conteúdo, e não deveriam existir na árvore
 * de acessibilidade.
 *
 * É `<nav>` de verdade, com links de âncora de verdade: funciona sem
 * JavaScript, é alcançável por teclado, e o rótulo da seção lida aparece
 * escrito. Só a marca de "onde estou" depende de JS.
 */
export default function Regua({
  secoes,
  ativa,
  rotulo,
}: {
  secoes: readonly Secao[];
  ativa: string;
  rotulo: string;
}) {
  return (
    <nav className={estilos.regua} aria-label={rotulo}>
      <ol className={estilos.lista}>
        {secoes.map((secao) => (
          <li key={secao.id} className={estilos.item}>
            <a
              href={`#${secao.id}`}
              className={estilos.marca}
              data-ativa={secao.id === ativa ? "sim" : "nao"}
              aria-current={secao.id === ativa ? "true" : undefined}
            >
              <span className={estilos.traco} aria-hidden="true" />
              <span className={estilos.nome}>{secao.regua}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
