"use client";

import type { ReactNode } from "react";
import {
  COPY_INSCRICAO,
  contarCaracteres,
  textoContador,
  type Ferramenta,
  type Inscricao,
} from "@/lib/inscricao";
import estilos from "./Campos.module.css";

/**
 * Os tijolos do formulário: a moldura de um campo e os cinco controles que ela
 * embrulha.
 *
 * Vários componentes num arquivo só, contra a convenção do repo, pelo mesmo
 * motivo que `components/tese/Instrumentos.tsx` declara: eles não são
 * reutilizáveis fora daqui, mudam sempre juntos e ninguém abre um sem abrir os
 * outros. Dez arquivos de vinte linhas custariam dez abas abertas para ler uma
 * decisão só.
 *
 * A regra que os une é a da §2 do briefing do repo — **nenhum texto de marca no
 * JSX**. Nenhum componente daqui recebe um rótulo por prop: todos recebem o
 * NOME do campo (`campo: keyof Inscricao`) e buscam rótulo, ajuda e placeholder
 * em `COPY_INSCRICAO.campos[campo]`. O efeito prático é que o Matheus troca uma
 * palavra em `lib/inscricao.ts` e ela troca na tela, e que é impossível um
 * campo chegar à tela sem rótulo — o `Record<keyof Inscricao, CopyCampo>` da
 * fundação não deixa compilar.
 */

/* ── Identidade e acessibilidade ──────────────────────────────────────────── */

/**
 * O id do controle de um campo, derivado do nome do campo e não escrito à mão.
 *
 * Ele carrega três coisas de uma vez: o `htmlFor` do rótulo, o alvo do
 * `document.getElementById` quando o foco tem de pular para o primeiro campo
 * com erro (§4.6), e o prefixo dos ids de apoio (`-ajuda`, `-erro`,
 * `-contador`). Se fosse escrito à mão em cada lugar, o primeiro erro de
 * digitação quebraria o `aria-describedby` em silêncio — nada avisa que um
 * `aria-describedby` aponta para o nada.
 */
export function idDoCampo(campo: keyof Inscricao): string {
  return `insc-${campo}`;
}

/**
 * O `aria-describedby` de um controle, montado a partir do que existe de fato.
 *
 * Apontar para um id inexistente não dá erro em lugar nenhum e simplesmente
 * emudece o leitor de tela, então a lista é construída pelo que está na tela
 * naquele render, nunca por um literal fixo.
 */
export function descricaoDe(
  campo: keyof Inscricao,
  id: string,
  extras?: { contador?: boolean; erro?: boolean },
): string | undefined {
  const ids: string[] = [];
  if (COPY_INSCRICAO.campos[campo].ajuda !== undefined) ids.push(`${id}-ajuda`);
  if (extras?.contador === true) ids.push(`${id}-contador`);
  if (extras?.erro === true) ids.push(`${id}-erro`);
  return ids.length === 0 ? undefined : ids.join(" ");
}

/* ── Opções ───────────────────────────────────────────────────────────────── */

/** Uma opção pronta para virar `<option>` ou linha de radio. */
export type OpcaoLista = { readonly chave: string; readonly rotulo: string };

/**
 * Achata as duas formas de opção da fundação numa só.
 *
 * `Opcao` guarda `id` (texto) e `OpcaoNumerica` guarda `valor` (número), porque
 * é isso que o schema pede em cada coluna. Um `<select>` e um `<input
 * type=radio>`, porém, só sabem devolver string — e `validarInscricao` aceita
 * string onde espera número exatamente por isso. Converter aqui, uma vez por
 * lista e no módulo, evita um `String(o.valor)` espalhado por cinco JSX.
 */
export function opcoesDe(
  lista: readonly (
    | { readonly id: string; readonly rotulo: string }
    | { readonly valor: number; readonly rotulo: string }
  )[],
): readonly OpcaoLista[] {
  return lista.map((o) =>
    "id" in o ? { chave: o.id, rotulo: o.rotulo } : { chave: String(o.valor), rotulo: o.rotulo },
  );
}

/* ── O contador ───────────────────────────────────────────────────────────── */

/** O que a moldura precisa para desenhar o contador de um texto livre. */
export type Contador = {
  readonly texto: string;
  readonly estado: "calmo" | "perto" | "passou";
};

/**
 * O contador de um texto livre, com o seu estado de urgência.
 *
 * O texto sai de `textoContador` da fundação — que conta como a pessoa conta,
 * por caractere visível e não por unidade UTF-16 — e nunca de um `.length` aqui:
 * duas contagens diferentes dariam um contador dizendo que cabe e um servidor
 * dizendo que não.
 *
 * Os 40 caracteres de folga do estado `perto` não vêm da spec; vêm de que um
 * contador que só reage no limite avisa tarde demais para a pessoa mudar de
 * frase, e um que reage sempre é ruído em 260 dos 300 caracteres.
 */
export function contadorDe(texto: string, limite: number): Contador {
  const usado = contarCaracteres(texto);
  return {
    texto: textoContador(texto, limite),
    estado: usado > limite ? "passou" : usado > limite - 40 ? "perto" : "calmo",
  };
}

/* ── A moldura ────────────────────────────────────────────────────────────── */

/**
 * O que envolve todo campo: rótulo em cima, ajuda, o controle, contador e erro.
 *
 * O rótulo fica **sempre** em cima do campo e nunca dentro dele como
 * placeholder: placeholder some quando a pessoa digita, e a partir daí ela não
 * sabe mais o que estava respondendo — o defeito aparece justamente quando ela
 * volta um bloco para conferir.
 *
 * `grupo` troca `<label for>` por `<fieldset><legend>`. Não é preferência de
 * marcação: um `<label for>` só pode apontar para **um** controle, e um grupo
 * de radio ou de checkbox tem vários. Sem o fieldset, o leitor de tela lê
 * "ChatGPT, caixa de seleção" sem nunca dizer de que pergunta aquilo é resposta.
 */
export function Moldura({
  campo,
  id,
  erro,
  contador,
  grupo = false,
  children,
}: {
  campo: keyof Inscricao;
  id: string;
  erro?: string;
  contador?: Contador;
  grupo?: boolean;
  children: ReactNode;
}) {
  const c = COPY_INSCRICAO.campos[campo];

  const miolo = (
    <>
      {c.ajuda !== undefined && (
        <p id={`${id}-ajuda`} className={estilos.ajuda}>
          {c.ajuda}
        </p>
      )}
      {children}
      {contador !== undefined && (
        <p id={`${id}-contador`} className={estilos.contador} data-estado={contador.estado}>
          {contador.texto}
        </p>
      )}
      {/* Erro sempre com TEXTO, nunca só a cor da borda (spec §10): vermelho
          sozinho não existe para quem é daltônico nem para quem ouve a tela.
          Sem `role="alert"` de propósito — num AVANÇAR com cinco erros, cinco
          alertas assertivos se atropelam; a mensagem chega pelo
          `aria-describedby` quando o foco pousa no campo, que é onde ela é
          acionável. O `role="alert"` da página está no aviso de envio, que é um
          por vez. */}
      {erro !== undefined && (
        <p id={`${id}-erro`} className={estilos.erro} data-erro>
          {erro}
        </p>
      )}
    </>
  );

  if (grupo) {
    return (
      <fieldset
        className={estilos.campo}
        data-campo={campo}
        data-invalido={erro !== undefined}
        // No `<fieldset>`, e não num `<div>` lá dentro: a ajuda e o erro de um
        // grupo falam do grupo inteiro, e é ao entrar no grupo que o leitor de
        // tela os lê. Num elemento sem papel, `aria-describedby` não é
        // anunciado em lugar nenhum — falha silenciosa clássica.
        aria-describedby={descricaoDe(campo, id, {
          contador: contador !== undefined,
          erro: erro !== undefined,
        })}
      >
        <legend className={estilos.rotulo}>{c.rotulo}</legend>
        {miolo}
      </fieldset>
    );
  }

  return (
    <div className={estilos.campo} data-campo={campo} data-invalido={erro !== undefined}>
      <label className={estilos.rotulo} htmlFor={id}>
        {c.rotulo}
      </label>
      {miolo}
    </div>
  );
}

/* ── Texto de uma linha ───────────────────────────────────────────────────── */

export function CampoTexto({
  campo,
  valor,
  aoMudar,
  erro,
  tipo = "text",
  modo,
  preenchimento,
  id = idDoCampo(campo),
}: {
  campo: keyof Inscricao;
  valor: string;
  aoMudar: (valor: string) => void;
  erro?: string;
  tipo?: "text" | "email" | "tel" | "url";
  /** `inputmode`: é ele que troca o teclado do celular, e isso é metade da experiência (spec §10). */
  modo?: "text" | "email" | "tel" | "url" | "numeric";
  preenchimento?: string;
  id?: string;
}) {
  const c = COPY_INSCRICAO.campos[campo];
  return (
    <Moldura campo={campo} id={id} erro={erro}>
      <input
        id={id}
        className={estilos.controle}
        type={tipo}
        inputMode={modo}
        autoComplete={preenchimento}
        placeholder={c.placeholder}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        aria-invalid={erro !== undefined || undefined}
        aria-describedby={descricaoDe(campo, id, { erro: erro !== undefined })}
      />
    </Moldura>
  );
}

/* ── Texto livre com contador ─────────────────────────────────────────────── */

export function CampoTextoLongo({
  campo,
  valor,
  aoMudar,
  limite,
  erro,
  id = idDoCampo(campo),
}: {
  campo: keyof Inscricao;
  valor: string;
  aoMudar: (valor: string) => void;
  limite: number;
  erro?: string;
  id?: string;
}) {
  const c = COPY_INSCRICAO.campos[campo];
  const contador = contadorDe(valor, limite);
  return (
    <Moldura campo={campo} id={id} erro={erro} contador={contador}>
      {/* Sem `maxLength`. O atributo corta no meio de uma colagem sem dizer
          nada, e corta contando unidades UTF-16 — um emoji custaria dois — o
          que faria o navegador recusar um texto que o contador jurava caber.
          O contador desce, passa a vermelho, e o AVANÇAR é quem barra. */}
      <textarea
        id={id}
        className={`${estilos.controle} ${estilos.area}`}
        rows={3}
        placeholder={c.placeholder}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        aria-invalid={erro !== undefined || undefined}
        aria-describedby={descricaoDe(campo, id, { contador: true, erro: erro !== undefined })}
      />
    </Moldura>
  );
}

/* ── Select nativo ────────────────────────────────────────────────────────── */

/**
 * `<select>` de verdade, e não uma lista customizada.
 *
 * A spec §10 decide isso e o motivo é o celular: o seletor nativo abre a roda
 * do sistema, com o tamanho de alvo do sistema e o comportamento que a pessoa
 * já conhece. Qualquer substituto nosso seria pior ali — estilizamos a caixa,
 * nunca a lista. A única exceção do formulário é o combobox de cursos, e ele
 * existe porque 44 opções sem busca é outra coisa (ver `ComboboxCurso.tsx`).
 *
 * A primeira `<option>` é vazia de propósito, sem texto inventado tipo
 * "Selecione…": ela representa "ainda não respondi", e é o `AVANÇAR` que cobra.
 */
export function CampoSelect({
  campo,
  opcoes,
  valor,
  aoMudar,
  erro,
  id = idDoCampo(campo),
}: {
  campo: keyof Inscricao;
  opcoes: readonly OpcaoLista[];
  valor: string;
  aoMudar: (valor: string) => void;
  erro?: string;
  id?: string;
}) {
  return (
    <Moldura campo={campo} id={id} erro={erro}>
      <div className={estilos.caixaSelect}>
        <select
          id={id}
          className={`${estilos.controle} ${estilos.select}`}
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          aria-invalid={erro !== undefined || undefined}
          aria-describedby={descricaoDe(campo, id, { erro: erro !== undefined })}
        >
          <option value="" />
          {opcoes.map((o) => (
            <option key={o.chave} value={o.chave}>
              {o.rotulo}
            </option>
          ))}
        </select>
        <span className={estilos.seta} aria-hidden="true" />
      </div>
    </Moldura>
  );
}

/* ── Escolha única em linhas ──────────────────────────────────────────────── */

/**
 * A escala de AI e a escada de empreendedorismo: uma linha por degrau.
 *
 * Não é uma fileira de bolinhas com um número embaixo. Cada degrau destas duas
 * listas é uma frase inteira ("Já construí algo com AI além do chat — …"), e
 * uma fileira horizontal obrigaria a ler a frase fora do alvo que se clica. A
 * linha inteira é clicável porque o `<label>` embrulha o `<input>`: no celular,
 * o alvo passa a ser a frase toda em vez de um círculo de 16px.
 */
export function ListaEscolha({
  campo,
  opcoes,
  valor,
  aoMudar,
  erro,
  id = idDoCampo(campo),
}: {
  campo: keyof Inscricao;
  opcoes: readonly OpcaoLista[];
  valor: string;
  aoMudar: (valor: string) => void;
  erro?: string;
  id?: string;
}) {
  return (
    <Moldura campo={campo} id={id} erro={erro} grupo>
      <div className={estilos.lista}>
        {opcoes.map((o, i) => (
          <label key={o.chave} className={estilos.linha} data-marcada={valor === o.chave}>
            <input
              /* Só o primeiro item leva o id do campo: é ele o alvo do foco
                 quando o bloco abre ou quando o erro manda voltar. */
              id={i === 0 ? id : undefined}
              className={estilos.marcador}
              type="radio"
              name={campo}
              value={o.chave}
              checked={valor === o.chave}
              onChange={() => aoMudar(o.chave)}
            />
            <span className={estilos.desenho} aria-hidden="true" />
            <span className={estilos.textoLinha}>{o.rotulo}</span>
          </label>
        ))}
      </div>
    </Moldura>
  );
}

/* ── Múltipla escolha com opção exclusiva ─────────────────────────────────── */

/**
 * O checklist de ferramentas, com a regra de exclusividade lida do dado.
 *
 * Quem manda é a flag `exclusiva` de `FERRAMENTAS_AI`, nunca o rótulo: comparar
 * com a string "Nenhuma dessas" faria a regra morrer em silêncio no dia em que
 * alguém trocasse uma palavra da copy — e o resultado seria "nenhuma
 * ferramenta + ChatGPT" gravado no banco, um dado que ninguém consegue
 * interpretar depois.
 *
 * A saída sai sempre na ordem da lista, e não na ordem dos cliques, pelo mesmo
 * motivo que `validarInscricao` reordena do lado do servidor: a mesma resposta
 * tem de virar sempre a mesma linha.
 */
export function ListaMarcacao({
  campo,
  opcoes,
  marcadas,
  aoMudar,
  erro,
  id = idDoCampo(campo),
}: {
  campo: keyof Inscricao;
  opcoes: readonly Ferramenta[];
  marcadas: readonly string[];
  aoMudar: (marcadas: string[]) => void;
  erro?: string;
  id?: string;
}) {
  function alternar(opcao: Ferramenta): void {
    const marcada = marcadas.includes(opcao.id);
    let escolhidas: Set<string>;

    if (opcao.exclusiva === true) {
      // Marcar a exclusiva apaga todas as outras; desmarcá-la deixa vazio.
      escolhidas = marcada ? new Set() : new Set([opcao.id]);
    } else {
      escolhidas = new Set(marcadas);
      if (marcada) escolhidas.delete(opcao.id);
      else escolhidas.add(opcao.id);
      // E marcar qualquer outra tira a exclusiva do caminho, sem avisar: a
      // pessoa acabou de dizer que usa alguma coisa.
      for (const f of opcoes) if (f.exclusiva === true) escolhidas.delete(f.id);
    }

    aoMudar(opcoes.filter((f) => escolhidas.has(f.id)).map((f) => f.id));
  }

  return (
    <Moldura campo={campo} id={id} erro={erro} grupo>
      <div className={estilos.lista}>
        {opcoes.map((o, i) => (
          <label key={o.id} className={estilos.linha} data-marcada={marcadas.includes(o.id)}>
            <input
              id={i === 0 ? id : undefined}
              className={estilos.marcador}
              type="checkbox"
              name={campo}
              value={o.id}
              checked={marcadas.includes(o.id)}
              onChange={() => alternar(o)}
            />
            <span className={`${estilos.desenho} ${estilos.quadrado}`} aria-hidden="true" />
            <span className={estilos.textoLinha}>{o.rotulo}</span>
          </label>
        ))}
      </div>
    </Moldura>
  );
}

/* ── O aceite de dados ────────────────────────────────────────────────────── */

/**
 * O aceite da §8, com a linha dos menores de 18 logo acima da caixa.
 *
 * A linha dos menores fica **antes** do checkbox e não depois, e não é um
 * segundo campo: o que ela diz precisa ter sido lido no instante em que a
 * pessoa marca, e um segundo checkbox só para quem tem menos de 18 anos
 * transformaria um formulário de três minutos numa triagem.
 */
export function CampoAceite({
  marcado,
  aoMudar,
  erro,
}: {
  marcado: boolean;
  aoMudar: (marcado: boolean) => void;
  erro?: string;
}) {
  const id = idDoCampo("aceite_dados");
  const a = COPY_INSCRICAO.aceite;
  return (
    <Moldura campo="aceite_dados" id={id} erro={erro} grupo>
      <p className={estilos.aceiteTexto}>{a.texto}</p>
      <p className={estilos.aceiteTexto}>{a.menores}</p>
      <label className={`${estilos.linha} ${estilos.linhaAceite}`} data-marcada={marcado}>
        <input
          id={id}
          className={estilos.marcador}
          type="checkbox"
          checked={marcado}
          onChange={(e) => aoMudar(e.target.checked)}
          aria-invalid={erro !== undefined || undefined}
        />
        <span className={`${estilos.desenho} ${estilos.quadrado}`} aria-hidden="true" />
        <span className={estilos.textoLinha}>{a.rotulo}</span>
      </label>
    </Moldura>
  );
}
