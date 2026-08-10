# Abertura da tela — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar a entrada da página: a logo cresce girando o `0`, o ponto verde pulsa, os textos do topo entram pelas laterais e a frase do rodapé é digitada — tudo em CSS, com o efeito antigo arquivado e não apagado.

**Architecture:** Uma fonte única de tempos em `lib/abertura.ts` entrega custom properties ao `<main>`, e uma folha só (`app/abertura.module.css`) coreografa as três regiões da página alcançando-as por `data-*` que já existem. A digitação não tem timer: cada caractere é um `<span>` com o próprio índice em `--i`, e o CSS deriva o atraso com `calc()`.

**Tech Stack:** Next.js 16.2.12 (App Router), React 19.2.4, TypeScript, CSS Modules, Vitest + Testing Library, Playwright.

**Design:** `docs/superpowers/specs/2026-07-31-abertura-da-tela-design.md`

## Global Constraints

- **Arquivos intocáveis** (outro chat está mexendo neles no mesmo worktree): `app/globals.css`, `components/Malha.tsx`, `lib/malha.ts`, `lib/malha.test.ts`, `components/Fundo202020.tsx`, `components/Fundo202020.module.css`, `components/Fundo202020.test.tsx`, `components/Lanterna.tsx`, `components/Lanterna.module.css`, `components/Lanterna.test.tsx`, `lib/usaLanterna.ts`, `lib/usaLanterna.test.ts`. Se algo parecer exigir mudança neles, **pare e pergunte**.
- **Todo `git add` usa caminhos explícitos.** Nunca `git add -A`, nunca `git add .` — há trabalho não-commitado de outra pessoa neste worktree e ele não pode entrar nestes commits.
- **Nenhum tempo literal em `.module.css`.** Toda duração e todo atraso vêm de custom properties derivadas de `ATOS` em `lib/abertura.ts`.
- **Toda regra de `app/abertura.module.css` carrega o atributo `data-abertura` no seletor**, em uma de duas formas — e a diferença entre elas não é estilística:
  - **Regra de preparo** (vale em qualquer estado — repouso, `tocando` e `estatica`): `.abertura[data-abertura] :global([data-...])`, **presença do atributo, sem valor**. Ancorar preparo num valor de estado é bug: numa visita repetida (`estatica`) a preparação some.
  - **Regra de coreografia** (depende do estado): `.abertura[data-abertura="tocando"] :global([data-...])` ou `="estatica"`.

  As duas dão especificidade (0,3,0). É isso que faz esta folha vencer os módulos dos componentes (`Logo202.module.css`, `Fundo202020.module.css`) **por especificidade**. Vencer por ordem de import é proibido: a doc do Next diz que essa ordem é a ordem dos imports no código, e muda quando alguém reordena uma linha.
- **Não altere `DURACAO_MAXIMA_MS` em `components/motion/tipos.ts`** (vale 2000, governa o efeito arquivado). O teto novo é próprio, em `lib/abertura.ts`.
- **Comentários, nomes de variável e mensagens de commit em português**, como o resto do repo. Comentários explicam *por quê*, não *o quê*.
- **TDD onde um teste consegue enxergar a mudança:** o teste falhando primeiro, rodado e visto falhar antes de implementar. Tasks 1, 2, 3 e 6 são assim. As Tasks 4 e 5 são só CSS e a 7 é só documentação — **o jsdom não carrega CSS Modules**, então nenhuma asserção de vitest consegue ver uma linha dessas folhas, e escrever um teste que "passa" sobre elas seria um teste que não afirma nada. A verificação delas é o e2e da Task 6 (que roda num navegador de verdade) mais o olho na tela. Isso não é uma dispensa de TDD: é onde a fronteira do que um teste unitário alcança realmente cai neste projeto.
- Conforme `AGENTS.md`: antes de escrever código que toque em API do Next, leia o guia relevante em `node_modules/next/dist/docs/`. Para este plano o relevante é `01-app/01-getting-started/11-css.md` (já lido: CSS Modules em `app/`, e a regra de ordenação por import).
- Rodar tudo: `npm test` (vitest) e `npm run lint`. Um arquivo só: `npx vitest run <caminho>`.

---

### Task 1: Os tempos da coreografia

**Files:**
- Create: `lib/abertura.ts`
- Test: `lib/abertura.test.ts`

**Interfaces:**
- Consumes: `COPY`, `IDIOMAS`, `Idioma` de `lib/copy.ts`.
- Produces:
  - `ATOS` — objeto `as const` com `crescimento`, `pulso`, `esperaTopo`, `topo`, `esperaFrase`, `msPorCaractere`, `saidaCursor` (todos `number`).
  - `INICIO_PULSO`, `INICIO_TOPO`, `INICIO_FRASE`: `number`
  - `caracteres(idioma: Idioma): number`
  - `duracaoTotal(idioma: Idioma): number`
  - `DURACAO_MAXIMA_MS: number`, `DURACAO_TOTAL_MAXIMA_MS: number`
  - `TEMPOS: Record<string, string>` — as custom properties que o `<main>` pendura.

- [ ] **Step 1: Escrever o teste falhando**

Crie `lib/abertura.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  ATOS,
  DURACAO_MAXIMA_MS,
  DURACAO_TOTAL_MAXIMA_MS,
  INICIO_FRASE,
  INICIO_PULSO,
  INICIO_TOPO,
  TEMPOS,
  caracteres,
  duracaoTotal,
} from "./abertura";
import { IDIOMAS } from "./copy";

/**
 * A ordem dos atos é a regra dura da coreografia. Estes testes existem para
 * que mexer numa duração não quebre a ordem em silêncio — o CSS não tem
 * nenhum tempo literal, ele consome exatamente estas variáveis.
 */
describe("a ordem dos atos", () => {
  it("faz o ponto pulsar exatamente quando o crescimento termina", () => {
    expect(INICIO_PULSO).toBe(ATOS.crescimento);
  });

  it("faz o topo entrar depois do pulso e da espera, nunca durante", () => {
    expect(INICIO_TOPO).toBe(ATOS.crescimento + ATOS.pulso + ATOS.esperaTopo);
    expect(INICIO_TOPO).toBeGreaterThan(INICIO_PULSO + ATOS.pulso);
  });

  it("faz a frase começar depois do topo entrar inteiro", () => {
    expect(INICIO_FRASE).toBe(INICIO_TOPO + ATOS.topo + ATOS.esperaFrase);
    expect(INICIO_FRASE).toBeGreaterThan(INICIO_TOPO + ATOS.topo);
  });
});

describe("a contagem da frase", () => {
  // Números conferidos à mão contra lib/copy.ts. Se um deles mudar, alguém
  // mexeu na copy — e aí o teto precisa ser reconferido, que é exatamente o
  // que este teste existe para forçar.
  it("conta os code points das duas linhas, nos dois idiomas", () => {
    expect(caracteres("pt")).toBe(47);
    expect(caracteres("en")).toBe(38);
  });
});

describe("a duração total", () => {
  it("conta n-1 intervalos entre n caracteres — o primeiro tem índice zero", () => {
    expect(duracaoTotal("pt")).toBe(
      INICIO_FRASE + 46 * ATOS.msPorCaractere + ATOS.saidaCursor,
    );
    expect(duracaoTotal("pt")).toBe(4484);
    expect(duracaoTotal("en")).toBe(4178);
  });

  it("mede o pior caso entre TODOS os idiomas, não só o português", () => {
    expect(DURACAO_TOTAL_MAXIMA_MS).toBe(
      Math.max(...IDIOMAS.map((idioma) => duracaoTotal(idioma))),
    );
  });

  it("cabe no teto", () => {
    expect(DURACAO_TOTAL_MAXIMA_MS).toBeLessThanOrEqual(DURACAO_MAXIMA_MS);
  });
});

describe("o que o CSS recebe", () => {
  it("entrega só tempos derivados, nenhum número solto", () => {
    expect(TEMPOS["--t-pulso"]).toBe(`${INICIO_PULSO}ms`);
    expect(TEMPOS["--t-topo"]).toBe(`${INICIO_TOPO}ms`);
    expect(TEMPOS["--t-frase"]).toBe(`${INICIO_FRASE}ms`);
    expect(TEMPOS["--d-caractere"]).toBe(`${ATOS.msPorCaractere}ms`);
  });

  it("entrega exatamente os tempos que o CSS consome, nem a mais nem a menos", () => {
    expect(Object.keys(TEMPOS).sort()).toEqual([
      "--d-caractere",
      "--d-crescimento",
      "--d-cursor",
      "--d-pulso",
      "--d-topo",
      "--t-frase",
      "--t-pulso",
      "--t-topo",
    ]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/abertura.test.ts`
Expected: FAIL — `Failed to resolve import "./abertura"`.

- [ ] **Step 3: Implementar**

Crie `lib/abertura.ts`:

```ts
import { COPY, IDIOMAS, type Idioma } from "./copy";

/**
 * A duração de cada ato — **a única fonte de verdade da coreografia de entrada**.
 *
 * Os inícios NÃO são escritos à mão em lugar nenhum: são derivados daqui e
 * entregues ao CSS como custom properties (`TEMPOS`), e o CSS deriva o resto
 * com `calc()`. Mexer numa duração empurra o resto da coreografia junto, em
 * vez de deixar dois números iguais se desencontrarem em silêncio.
 *
 * Mesma disciplina que components/motion/MotionD.tsx (arquivado) aplicava ao
 * efeito anterior — só que agora a coreografia atravessa `.topo`, `.centro` e
 * `.base`, três regiões que não se falam, então ela subiu para lib/.
 *
 * O import de `./copy` é relativo, e não `@/lib/copy`, de propósito: o e2e do
 * Playwright importa este módulo, e assim a cadeia inteira resolve sem
 * depender do alias `@/` ser lido pelo transformador dele.
 */
export const ATOS = {
  /** A logo cresce de 0.82 a 1, e o "0" dá uma volta completa. */
  crescimento: 1200,
  /** O ponto verde assenta e pulsa com brilho. */
  pulso: 360,
  /** Tela parada, de propósito, antes do topo entrar. */
  esperaTopo: 400,
  /** PT/EN e CONTATO entram pelas laterais, ao mesmo tempo. */
  topo: 520,
  /** Tela parada, de propósito, antes da frase começar. */
  esperaFrase: 200,
  /** O ritmo da digitação: um caractere a cada tanto. */
  msPorCaractere: 34,
  /** A barra de digitação some. */
  saidaCursor: 240,
} as const;

/** O ponto só pulsa quando o crescimento termina. Esta linha *é* a regra. */
export const INICIO_PULSO = ATOS.crescimento;
/** O topo só entra depois do pulso mais a espera. */
export const INICIO_TOPO = INICIO_PULSO + ATOS.pulso + ATOS.esperaTopo;
/** A frase só começa depois do topo ter entrado inteiro, mais a espera. */
export const INICIO_FRASE = INICIO_TOPO + ATOS.topo + ATOS.esperaFrase;

/**
 * Quantos caracteres a frase tem, somando as duas linhas.
 *
 * `Array.from` e não `.length`: `.length` conta unidades UTF-16, e um acento
 * escrito na forma decomposta (i + acento combinante) contaria dois. Quem
 * desenha os <span> em components/FraseDigitada.tsx usa o mesmo `Array.from`
 * — as duas contagens PRECISAM bater, senão o último índice não é o último
 * caractere e o cursor some no lugar errado.
 */
export function caracteres(idioma: Idioma): number {
  return COPY[idioma].onelinerLinhas.reduce(
    (total, linha) => total + Array.from(linha).length,
    0,
  );
}

/**
 * Quando a coreografia termina, por idioma.
 *
 * O `- 1` não é detalhe: o primeiro caractere tem índice ZERO e surge
 * exatamente em INICIO_FRASE. Entre n caracteres há n-1 intervalos, não n.
 */
export function duracaoTotal(idioma: Idioma): number {
  return (
    INICIO_FRASE +
    (caracteres(idioma) - 1) * ATOS.msPorCaractere +
    ATOS.saidaCursor
  );
}

/**
 * O teto desta coreografia.
 *
 * NÃO confundir com o `DURACAO_MAXIMA_MS` de components/motion/tipos.ts, que
 * vale 2000 e governa o Motion D — arquivado, mas ainda no repo e ainda
 * coerente consigo mesmo. Aquele número não subiu de propósito: mexer nele
 * faria o comentário dele mentir sobre um efeito que ninguém mais roda.
 */
export const DURACAO_MAXIMA_MS = 4800;

/** O pior caso entre TODOS os idiomas — computado, não copiado. */
export const DURACAO_TOTAL_MAXIMA_MS = Math.max(
  ...IDIOMAS.map((idioma) => duracaoTotal(idioma)),
);

if (DURACAO_TOTAL_MAXIMA_MS > DURACAO_MAXIMA_MS) {
  throw new Error(
    `abertura: a frase mais longa leva ${DURACAO_TOTAL_MAXIMA_MS}ms e o teto é ${DURACAO_MAXIMA_MS}ms`,
  );
}

/**
 * O que o CSS recebe, pendurado no <main> por app/page.tsx.
 *
 * SEM anotação de tipo, de propósito, e o detalhe não é cosmético:
 *
 * - anotar `Record<string, string>` faria `TEMPOS as CSSProperties` em
 *   app/page.tsx virar erro de compilação (nenhum dos dois é atribuível ao
 *   outro, e `as` exige que um seja);
 * - anotar `CSSProperties` exigiria importar do React aqui e faria
 *   `TEMPOS["--t-pulso"]` no teste virar erro (CSSProperties não tem index
 *   signature).
 *
 * Deixando o TypeScript inferir o tipo do literal, as duas pontas funcionam —
 * é o mesmo formato que components/motion/MotionD.tsx já usa e que compila
 * hoje.
 */
export const TEMPOS = {
  "--d-crescimento": `${ATOS.crescimento}ms`,
  "--d-pulso": `${ATOS.pulso}ms`,
  "--d-topo": `${ATOS.topo}ms`,
  "--d-caractere": `${ATOS.msPorCaractere}ms`,
  "--d-cursor": `${ATOS.saidaCursor}ms`,
  "--t-pulso": `${INICIO_PULSO}ms`,
  "--t-topo": `${INICIO_TOPO}ms`,
  "--t-frase": `${INICIO_FRASE}ms`,
};
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/abertura.test.ts`
Expected: PASS, 8 testes.

- [ ] **Step 5: Commitar**

```bash
git add lib/abertura.ts lib/abertura.test.ts
git commit -m "feat: a linha do tempo da abertura, derivada e com teto próprio"
```

---

### Task 2: O palco, e o Motion D arquivado

Depois desta task a página funciona e está verde — sem animação nenhuma, tudo já no estado final. A coreografia entra nas tasks seguintes.

**Files:**
- Create: `components/Palco.tsx`, `components/Palco.module.css`, `app/abertura.module.css`
- Modify: `app/page.tsx`, `components/motion/MotionD.tsx` (só cabeçalho), `components/motion/MotionD.module.css` (só cabeçalho), `components/motion/tipos.ts` (só comentário)
- Test: `app/page.test.tsx`

**Interfaces:**
- Consumes: `TEMPOS`, `INICIO_TOPO`, `INICIO_FRASE` de `lib/abertura.ts`; `Fundo202020`, `Logo202`.
- Produces:
  - `Palco` — componente sem props, default export de `components/Palco.tsx`.
  - `estilos.abertura` — a classe âncora exportada por `app/abertura.module.css`.
  - No DOM: `<main>` com `data-abertura="tocando" | "estatica"` e as custom properties de `TEMPOS` no `style`.

- [ ] **Step 1: Escrever o teste falhando**

Em `app/page.test.tsx`, acrescente `beforeEach` ao import de `vitest` que já existe (ele passa a ser `import { describe, it, expect, beforeEach } from "vitest";`) e adicione os dois imports novos:

```tsx
import { INICIO_FRASE, INICIO_TOPO } from "@/lib/abertura";
import { __resetarParaTeste } from "@/lib/usaMotionUmaVez";
```

E, logo antes do primeiro `describe`:

```tsx
// A guarda de módulo de usaMotionUmaVez e o sessionStorage sobrevivem entre
// casos do mesmo arquivo. Sem zerar os dois, o primeiro render decide por
// todos e as asserções sobre `data-abertura` passariam por ordem, não por
// comportamento.
beforeEach(() => {
  __resetarParaTeste();
  window.sessionStorage.clear();
});
```

E, no fim do arquivo, o describe novo:

```tsx
describe("a abertura", () => {
  it("nasce tocando: o HTML do servidor não pula a entrada", () => {
    const { container } = render(<Home />);
    expect(container.querySelector("main")).toHaveAttribute(
      "data-abertura",
      "tocando",
    );
  });

  it("entrega os tempos da coreografia ao CSS, no <main>", () => {
    const { container } = render(<Home />);
    const tela = container.querySelector("main") as HTMLElement;

    // Os dois que carregam a ordem dos atos:
    expect(tela.style.getPropertyValue("--t-topo")).toBe(`${INICIO_TOPO}ms`);
    expect(tela.style.getPropertyValue("--t-frase")).toBe(`${INICIO_FRASE}ms`);
  });

  it("desenha o palco com o fundo e a logo dentro", () => {
    const { container } = render(<Home />);
    const palco = container.querySelector("[data-palco]");
    expect(palco).not.toBeNull();
    expect(palco!.querySelector("[data-logo]")).not.toBeNull();
    expect(palco!.querySelector("[data-lanterna]")).not.toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run app/page.test.tsx`
Expected: FAIL — `data-abertura` não existe, `--t-topo` vem `""`, `[data-palco]` é `null`.

- [ ] **Step 3: Criar o palco**

Crie `components/Palco.tsx`:

```tsx
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
```

Crie `components/Palco.module.css`:

```css
/* A geometria herdada do MotionD.module.css (arquivado). Nada aqui anima. */

.palco {
  /* Cobre a seção inteira — o ancestral posicionado mais próximo é .tela —
     para a malha ser fundo de tela cheia e não um retângulo do tamanho da
     logo. */
  position: absolute;
  inset: 0;
  z-index: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
}

/* Dois seletores de classe de propósito: precisa vencer o `position: fixed`
   de .fundo em Fundo202020.module.css sem depender da ordem em que os dois
   CSS modules entram no bundle — a doc do Next é explícita ao dizer que essa
   ordem é a ordem dos imports no código. Aqui a malha é fundo desta seção, e
   não da viewport: é isso que faz a lanterna acertar o cursor. */
.palco .fundo {
  position: absolute;
}

.logo {
  position: relative;
  z-index: 1;
}
```

- [ ] **Step 4: Criar a folha da coreografia (só a âncora, por enquanto)**

Crie `app/abertura.module.css`:

```css
/* app/abertura.module.css — a coreografia de entrada da página inteira.
 *
 * ATENÇÃO: nenhum tempo desta folha é um número literal. As durações e os
 * inícios vêm de `ATOS` em lib/abertura.ts, entregues pelo <main> como custom
 * properties (--d-* e --t-*). Mexer numa duração lá empurra tudo aqui junto,
 * em vez de deixar dois números iguais se desencontrarem em silêncio.
 *
 * Toda regra é ancorada em
 * `.abertura[data-abertura="..."] :global([data-...])`. Os dois atributos não
 * são decoração: eles levam a especificidade para (0,3,0) e fazem esta folha
 * vencer as regras dos módulos dos componentes (Logo202.module.css,
 * Fundo202020.module.css) POR ESPECIFICIDADE, nunca por ordem de import — que,
 * segundo a doc do Next, é a ordem dos imports no código e muda quando alguém
 * reordena uma linha.
 */

/* Preparo do glifo do "0" para girar em torno do próprio centro (Task 4).
   Inerte enquanto não houver `transform`: transform-box e transform-origin
   sozinhos não movem nada. Fica aqui, e não em Logo202.module.css, porque é
   parte da coreografia — e porque é esta regra que ancora a classe .abertura
   nesta folha. */
.abertura :global([data-glifo][data-indice="1"] path) {
  transform-box: fill-box;
  transform-origin: center;
}
```

- [ ] **Step 5: Costurar em `app/page.tsx`**

Troque os imports do topo — remova `MotionD`, adicione `Palco`, `TEMPOS`, `estilos` e o tipo `CSSProperties`:

```tsx
import { useEffect, useState, type CSSProperties } from "react";
import Palco from "@/components/Palco";
import SeletorIdioma from "@/components/SeletorIdioma";
```

(o comentário longo sobre o alias `as useMotionUmaVez` e o import de
`usaMotionUmaVez` continuam exatamente como estão)

```tsx
import { TEMPOS } from "@/lib/abertura";
import { COPY, INSTAGRAM, titulo, type Idioma } from "@/lib/copy";
import estilos from "./abertura.module.css";
```

Troque a abertura do `<main>`:

```tsx
    <main
      className={`tela ${estilos.abertura}`}
      /* O interruptor único da coreografia. As três regiões da página (.topo,
         .centro, .base) penduram nele — assim não têm como discordar entre si
         sobre estar tocando ou não. Nasce "tocando" para o HTML do servidor
         bater com o primeiro render do cliente; quem já viu a entrada nesta
         sessão vira "estatica" no efeito de usaMotionUmaVez. */
      data-abertura={jaRodou ? "estatica" : "tocando"}
      style={TEMPOS as CSSProperties}
    >
```

E troque o miolo do `.centro`:

```tsx
      <div className="centro">
        <Palco />
      </div>
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx vitest run app/page.test.tsx`
Expected: PASS — inclusive os testes antigos, que ainda usam `getByText` (a frase só vira spans na Task 3).

- [ ] **Step 7: Arquivar o Motion D**

No topo de `components/motion/MotionD.tsx`, **antes** do `"use client";`:

```tsx
/* ───────────────────────────────────────────────────────────────────────────
 * ARQUIVADO em 31/07/2026. Nenhum arquivo da aplicação importa este.
 *
 * Era a entrada da página: a malha crescia do centro para fora, depois a logo
 * abria do meio para os lados, e o ponto verde acendia por último. Foi
 * substituído pela abertura de lib/abertura.ts + app/abertura.module.css — a
 * logo cresce girando o "0", o topo entra pelas laterais, a frase é digitada.
 *
 * Fica no repo inteiro e com os testes rodando, de propósito, para o efeito
 * poder voltar sem arqueologia de git.
 *
 * Para religar: renderize <MotionD estatico={jaRodou}/> dentro de .centro em
 * app/page.tsx, no lugar de <Palco/>. As duas coreografias animam [data-logo]
 * e [data-ponto] — então desligue também as regras correspondentes de
 * app/abertura.module.css, senão elas brigam por especificidade.
 * ─────────────────────────────────────────────────────────────────────────── */
```

No topo de `components/motion/MotionD.module.css`, antes do comentário existente:

```css
/* ARQUIVADO em 31/07/2026 junto com MotionD.tsx — ver o cabeçalho de lá.
   Nenhuma página carrega esta folha. */
```

Em `components/motion/tipos.ts`, acrescente ao bloco de comentário de
`DURACAO_MAXIMA_MS`, logo antes da linha `export const DURACAO_MAXIMA_MS`:

```ts
 *  31/07/2026 — este teto continua valendo para o Motion D, que está
 *  ARQUIVADO (ver o cabeçalho de MotionD.tsx). A abertura que a página roda
 *  hoje tem teto próprio, de 4800ms, em lib/abertura.ts. Os dois números são
 *  de coreografias diferentes e não devem ser unificados: subir este aqui
 *  faria o parágrafo acima mentir sobre um efeito que ninguém mais roda.
```

- [ ] **Step 8: Rodar a suíte inteira e o lint**

Run: `npm test`
Expected: PASS — incluindo `components/motion/motion.test.tsx`, que continua importando o MotionD arquivado direto e continua verde.

Run: `npm run lint`
Expected: sem erros. Se acusar import não usado de `MotionD` em `app/page.tsx`, o Step 5 não removeu a linha.

- [ ] **Step 9: Commitar**

```bash
git add components/Palco.tsx components/Palco.module.css app/abertura.module.css app/page.tsx app/page.test.tsx components/motion/MotionD.tsx components/motion/MotionD.module.css components/motion/tipos.ts
git commit -m "refactor: troca o MotionD por um palco sem coreografia e arquiva o efeito antigo"
```

---

### Task 3: A frase digitada

**Files:**
- Create: `components/FraseDigitada.tsx`, `components/FraseDigitada.module.css`
- Modify: `app/page.tsx`
- Test: `components/FraseDigitada.test.tsx`, `app/page.test.tsx`

**Interfaces:**
- Consumes: `COPY`, `Idioma` de `lib/copy.ts`; as custom properties `--t-frase`, `--d-caractere`, `--d-cursor` que a Task 2 pendurou no `<main>`.
- Produces:
  - `FraseDigitada` — default export, props `{ idioma: Idioma; estatica: boolean }`.
  - No DOM: `<h1 class="oneliner" data-ima="oneliner" data-estatica="true|false">`, dois `<span data-linha="0|1">`, e dentro deles um `<span data-caractere>` por caractere com `--i` no `style` e `data-ultimo="true"` no último da frase inteira.

- [ ] **Step 1: Escrever o teste falhando**

Crie `components/FraseDigitada.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import FraseDigitada from "./FraseDigitada";
import { caracteres } from "@/lib/abertura";

function linhas(container: HTMLElement) {
  return container.querySelectorAll("[data-linha]");
}

describe("FraseDigitada", () => {
  it("tem a frase inteira no DOM antes de escrever qualquer caractere", () => {
    // O <h1> é a única frase da página que descreve o que a 202 faz — para
    // leitor de tela e para busca ela precisa estar completa desde o primeiro
    // quadro, com ou sem animação.
    const { container } = render(<FraseDigitada idioma="pt" estatica={false} />);
    expect(linhas(container)).toHaveLength(2);
    expect(linhas(container)[0]).toHaveTextContent("Potencializamos talentos e");
    expect(linhas(container)[1]).toHaveTextContent("construímos o futuro.");
  });

  it("desenha um span por caractere, com o índice contínuo entre as linhas", () => {
    const { container } = render(<FraseDigitada idioma="pt" estatica={false} />);
    const spans = container.querySelectorAll("[data-caractere]");

    expect(spans).toHaveLength(caracteres("pt"));
    spans.forEach((span, i) => {
      expect((span as HTMLElement).style.getPropertyValue("--i")).toBe(String(i));
    });
  });

  it("marca só o último caractere da frase inteira, na segunda linha", () => {
    // Se o índice reiniciasse a cada linha, a segunda se escreveria junto com
    // a primeira e o cursor sumiria no meio da frase.
    const { container } = render(<FraseDigitada idioma="pt" estatica={false} />);
    const marcados = container.querySelectorAll("[data-ultimo='true']");

    expect(marcados).toHaveLength(1);
    expect(marcados[0]).toHaveTextContent(".");
    expect(marcados[0].closest("[data-linha]")).toHaveAttribute("data-linha", "1");
  });

  it("mantém a frase completa também no modo estático", () => {
    const { container } = render(<FraseDigitada idioma="pt" estatica />);
    expect(container.querySelector("h1")).toHaveAttribute("data-estatica", "true");
    expect(linhas(container)[0]).toHaveTextContent("Potencializamos talentos e");
  });

  it("remonta a frase inteira ao trocar de idioma", () => {
    const { container, rerender } = render(
      <FraseDigitada idioma="pt" estatica={false} />,
    );
    rerender(<FraseDigitada idioma="en" estatica={false} />);

    expect(linhas(container)[0]).toHaveTextContent("We amplify talent.");
    expect(linhas(container)[1]).toHaveTextContent("We build the future.");
    expect(container.querySelectorAll("[data-caractere]")).toHaveLength(
      caracteres("en"),
    );
    expect(container.querySelectorAll("[data-ultimo='true']")).toHaveLength(1);
  });

  it("continua sendo o h1 e continua sendo o ímã da lanterna", () => {
    const { container } = render(<FraseDigitada idioma="pt" estatica={false} />);
    const h1 = container.querySelector("h1") as HTMLElement;

    expect(h1).toHaveClass("oneliner");
    expect(h1).toHaveAttribute("data-ima", "oneliner");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run components/FraseDigitada.test.tsx`
Expected: FAIL — `Failed to resolve import "./FraseDigitada"`.

- [ ] **Step 3: Implementar o componente**

Crie `components/FraseDigitada.tsx`:

```tsx
import { Fragment, type CSSProperties } from "react";
import { COPY, type Idioma } from "@/lib/copy";
import estilos from "./FraseDigitada.module.css";

/**
 * A frase do rodapé, escrita caractere a caractere.
 *
 * Não há timer nem estado: cada caractere é um <span> que carrega o próprio
 * índice em `--i`, e o CSS deriva o atraso dele com
 * `calc(var(--t-frase) + var(--i) * var(--d-caractere))`. O escalonamento sai
 * da aritmética do CSS.
 *
 * Isso não é economia de linhas, são três propriedades boas de graça:
 * funciona com JavaScript desligado (animação CSS não depende de hidratação),
 * não existe piscada entre o HTML do servidor e o primeiro quadro do cliente,
 * e `prefers-reduced-motion` volta a ser tratado só por @media, como no resto
 * do projeto.
 *
 * A frase INTEIRA está no DOM desde o primeiro quadro — o textContent do <h1>
 * é a frase completa em qualquer estado. Os caracteres ainda não escritos são
 * `opacity: 0`, e NÃO `visibility: hidden`: visibility:hidden os tiraria da
 * árvore de acessibilidade, e um leitor de tela encontraria um <h1> vazio
 * durante os primeiros quatro segundos.
 *
 * Continua <h1> (é a única frase que descreve o que a 202 faz — o título da
 * página para leitor de tela e para busca) e continua sendo o ímã da lanterna
 * (`data-ima`). As duas coisas são decisões registradas no design; não são
 * detalhes de implementação.
 */
export default function FraseDigitada({
  idioma,
  estatica,
}: {
  idioma: Idioma;
  estatica: boolean;
}) {
  // Array.from e não split(""): conta code points. A mesma conta está em
  // `caracteres()` de lib/abertura.ts, e as duas PRECISAM bater — é o índice
  // do último caractere que diz onde o cursor some.
  const porLinha = COPY[idioma].onelinerLinhas.map((linha) => Array.from(linha));
  const total = porLinha.reduce((n, chars) => n + chars.length, 0);

  return (
    <h1
      className={`oneliner ${estilos.frase}`}
      data-ima="oneliner"
      data-estatica={String(estatica)}
    >
      {porLinha.map((chars, l) => {
        // O índice atravessa a quebra de linha: a linha 2 continua de onde a
        // linha 1 parou. Se reiniciasse, as duas se escreveriam ao mesmo tempo.
        const deslocamento = porLinha
          .slice(0, l)
          .reduce((n, anteriores) => n + anteriores.length, 0);

        return (
          <Fragment key={l}>
            {l > 0 && <br />}
            <span data-linha={l}>
              {chars.map((caractere, j) => {
                const i = deslocamento + j;
                return (
                  <span
                    key={i}
                    data-caractere=""
                    data-ultimo={i === total - 1 ? "true" : undefined}
                    className={estilos.caractere}
                    style={{ "--i": String(i) } as CSSProperties}
                  >
                    {caractere}
                  </span>
                );
              })}
            </span>
          </Fragment>
        );
      })}
    </h1>
  );
}
```

- [ ] **Step 4: Implementar a folha**

Crie `components/FraseDigitada.module.css`:

```css
/* A digitação. Nenhum tempo literal: --t-frase, --d-caractere e --d-cursor
 * vêm de lib/abertura.ts, pendurados no <main> por app/page.tsx. */

.caractere {
  /* O atraso deste caractere, derivado do índice que o React pôs em --i. É
     isto que substitui o timer. */
  --atraso: calc(var(--t-frase) + var(--i) * var(--d-caractere));

  /* `relative` para o cursor (::after) se ancorar no fim deste caractere sem
     ninguém medir offsetLeft quadro a quadro. Num elemento inline, `relative`
     não muda o layout. NÃO virar inline-block: isso quebraria o kerning da
     fonte display. */
  position: relative;

  /* opacity, e não visibility: visibility:hidden tiraria o caractere da
     árvore de acessibilidade, e o leitor de tela leria um <h1> vazio durante
     a entrada inteira. Com opacity ele continua na árvore e continua
     ocupando o mesmo espaço — o que também evita pulo de layout e mantém o
     ímã da lanterna acertando a caixa certa do começo ao fim. */
  opacity: 0;
}

.caractere::after {
  content: "";
  position: absolute;
  left: 100%;
  top: 0.06em;
  width: 0.06em;
  height: 1em;
  /* Verde de propósito: a §6 do spec da main page fecha com "o ponto verde
     acende por último, sempre". Esta coreografia encerra com a frase, então
     quem fecha em verde passa a ser o cursor. */
  background: var(--verde-sinal);
  opacity: 0;
  pointer-events: none;
}

/* ── Tocando ────────────────────────────────────────────────────────────── */

/* 1ms, e não um fade: a 34ms de cadência, um fade de 90ms deixaria três
   caracteres meio-transparentes ao mesmo tempo — vira borrão, não digitação. */
.frase[data-estatica="false"] .caractere {
  animation: caractere-surge 1ms linear var(--atraso) forwards;
}

/* `forwards` e não `both`: com `both` o cursor já estaria aceso ANTES do
   atraso correr, e os 47 cursores apareceriam todos juntos no carregamento.
   `steps(1, end)` segura a opacidade em 1 durante a fatia inteira do
   caractere e derruba para 0 no fim dela — um cursor aceso por vez. */
.frase[data-estatica="false"] .caractere::after {
  animation: cursor-apaga var(--d-caractere) steps(1, end) var(--atraso) forwards;
}

/* O último caractere não passa a bola para ninguém: o cursor fica nele e some
   em fade. Esta regra é mais específica e vence inteira — `animation` é uma
   propriedade só, não se mistura. */
.frase[data-estatica="false"] .caractere[data-ultimo="true"]::after {
  animation: cursor-apaga var(--d-cursor) linear var(--atraso) forwards;
}

@keyframes caractere-surge {
  to {
    opacity: 1;
  }
}

@keyframes cursor-apaga {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

/* ── Estático (visita repetida na mesma sessão) ─────────────────────────── */

.frase[data-estatica="true"] .caractere {
  opacity: 1;
}

.frase[data-estatica="true"] .caractere::after {
  content: none;
}

/* ── prefers-reduced-motion ─────────────────────────────────────────────── */

/* !important de propósito, e zerando a ANIMAÇÃO inteira: o bloco de
   globals.css zera `animation-duration`, mas não zera `animation-delay` —
   sozinho, ele deixaria os 47 caracteres surgirem escalonados ao longo de
   1,6s, com duração zero e atrasos intactos. Isso ainda é movimento. */
@media (prefers-reduced-motion: reduce) {
  .caractere {
    animation: none !important;
    opacity: 1 !important;
  }

  .caractere::after {
    content: none !important;
  }
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run components/FraseDigitada.test.tsx`
Expected: PASS, 6 testes.

- [ ] **Step 6: Costurar em `app/page.tsx` e migrar os testes da página**

Em `app/page.tsx`, adicione o import:

```tsx
import FraseDigitada from "@/components/FraseDigitada";
```

E troque o conteúdo do `<footer className="base">` — o `<h1>` inteiro, junto com o comentário longo que o precede — por:

```tsx
      <footer className="base">
        {/* A frase inteira é UM ímã, as duas linhas juntas. Aqui ele não é
            dica de clique (não há para onde ir) — é ênfase: a luz para em
            cima da frase. Decisão explícita do Lucas.

            É <h1> e não <p>: é a única frase da página que descreve o que a
            202 faz, então é o título dela para leitor de tela e para busca.
            Quem desenha o <h1>, os <span> por linha e os <span> por caractere
            é components/FraseDigitada — inclusive a digitação, que é CSS puro
            e não depende de JavaScript. */}
        <FraseDigitada idioma={idioma} estatica={jaRodou} />
      </footer>
```

Em `app/page.test.tsx`, adicione o utilitário logo depois do `beforeEach` da Task 2:

```tsx
/** A frase virou um <span> por caractere, e o `getByText` do testing-library
 *  só casa nós de texto DIRETOS de um elemento — por isso as asserções de
 *  frase passam a ser por linha, com toHaveTextContent. */
function linhas(container: HTMLElement) {
  return container.querySelectorAll("[data-linha]");
}
```

E troque as quatro asserções de frase:

```tsx
  it("mostra o oneliner em português, quebrado em duas linhas", () => {
    const { container } = render(<Home />);
    expect(linhas(container)).toHaveLength(2);
    expect(linhas(container)[0]).toHaveTextContent("Potencializamos talentos e");
    expect(linhas(container)[1]).toHaveTextContent("construímos o futuro.");
  });
```

```tsx
  it("troca o oneliner e o rótulo de contato para inglês", async () => {
    const { container } = render(<Home />);
    await userEvent.click(screen.getByRole("button", { name: "EN" }));
    expect(linhas(container)[0]).toHaveTextContent("We amplify talent.");
    expect(linhas(container)[1]).toHaveTextContent("We build the future.");
    expect(screen.getByRole("link", { name: /CONTACT/ })).toBeInTheDocument();
  });
```

```tsx
  it("começa em português mesmo que o navegador esteja em inglês", () => {
    const { container } = render(<Home />);
    expect(linhas(container)[0]).toHaveTextContent("Potencializamos talentos e");
  });
```

```tsx
  it("restaura o idioma guardado numa visita seguinte", () => {
    window.localStorage.setItem("202:idioma", "en");
    const { container } = render(<Home />);
    expect(linhas(container)[0]).toHaveTextContent("We amplify talent.");
  });
```

- [ ] **Step 7: Rodar a suíte inteira e o lint**

Run: `npm test`
Expected: PASS. O teste `"guarda a escolha e o idioma do documento"` (que confere `document.title`) não muda: o `<title>` vem de `titulo(idioma)`, não do DOM da frase.

Run: `npm run lint`
Expected: sem erros.

- [ ] **Step 8: Commitar**

```bash
git add components/FraseDigitada.tsx components/FraseDigitada.module.css components/FraseDigitada.test.tsx app/page.tsx app/page.test.tsx
git commit -m "feat: a frase do rodape e digitada caractere a caractere, em CSS puro"
```

---

### Task 4: A logo cresce, o "0" gira e o ponto pulsa

**Files:**
- Modify: `app/abertura.module.css`

**Interfaces:**
- Consumes: `--d-crescimento`, `--d-pulso`, `--t-pulso` (Task 2); `[data-logo]`, `[data-glifo][data-indice="1"] path`, `[data-ponto]` (já existem em `Logo202.tsx`); `--verde-sinal` (globals.css).
- Produces: nada de novo no DOM. Só CSS.

Esta task não tem teste unitário: o jsdom não carrega CSS Modules, então nenhuma asserção em vitest consegue ver estas regras. A prova é o e2e da Task 6 e o olho na tela.

- [ ] **Step 1: Escrever as regras da logo**

Acrescente a `app/abertura.module.css`, depois do bloco de `transform-box` que já está lá:

```css
/* ── Ato 1: a logo cresce e o "0" gira (0 → --d-crescimento) ───────────── */

/* Estado de repouso, que também é a base do fallback: nada aqui depende de um
   keyframe ter rodado. */
.abertura :global([data-logo]) {
  transform: scale(0.82);
}

.abertura[data-abertura="tocando"] :global([data-logo]) {
  animation: logo-crescer var(--d-crescimento) cubic-bezier(0.4, 0, 0.2, 1) both;
}

/* A rotação vai no <path>, e NÃO no <g data-glifo>: em SVG a propriedade CSS
   `transform` SOBRESCREVE o atributo `transform`, e o <g> carrega o
   translate(199.249752, 336.821489) que põe o "0" no lugar dele dentro da
   palavra. Animar o <g> apagaria esse translate e o glifo saltaria para fora
   da logo. O <path> não tem atributo nenhum, e o `transform-box: fill-box` lá
   em cima faz o `center` do transform-origin ser o centro do próprio glifo. */
.abertura[data-abertura="tocando"] :global([data-glifo][data-indice="1"] path) {
  animation: zero-girar var(--d-crescimento) cubic-bezier(0.4, 0, 0.2, 1) both;
}

/* Mesma curva que o crescimento, de propósito. Os dois duram --d-crescimento
   e terminam juntos no relógio — mas isso não basta. Com uma expo-out no
   crescimento (95% do caminho em 40% do tempo) e uma ease-in-out no giro, a
   logo PARECE pronta aos 600ms enquanto o "0" ainda roda, e lê como dois
   movimentos em vez de um. Com a mesma curva, resolvem juntos também aos
   olhos — que é o que o Lucas pediu: "voltando à posição correta assim que
   chegar no tamanho ideal". */

@keyframes logo-crescer {
  from {
    transform: scale(0.82);
  }
  to {
    transform: scale(1);
  }
}

@keyframes zero-girar {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
```

- [ ] **Step 2: Escrever as regras do ponto**

Acrescente, na sequência:

```css
/* ── Ato 2: o ponto verde pulsa (--t-pulso) ─────────────────────────────── */

/* O ponto não precisa de animação própria para "acompanhar o crescimento":
   ele é filho de [data-logo] e é carregado pelo scale junto com o resto. O
   que ele ganha aqui é a batida de chegada. */
.abertura :global([data-ponto]) {
  position: relative;
}

/* O halo. radial-gradient + transform + opacity: as três coisas que o
   compositor faz de graça. NÃO é box-shadow animado — box-shadow não é
   composto na GPU e repinta a cada quadro, e este projeto já escolheu duas
   vezes ficar nas propriedades baratas. */
.abertura :global([data-ponto])::after {
  content: "";
  position: absolute;
  inset: -50%;
  border-radius: 50%;
  background: radial-gradient(circle, var(--verde-sinal) 0%, transparent 70%);
  opacity: 0;
  pointer-events: none;
}

.abertura[data-abertura="tocando"] :global([data-ponto]) {
  animation: ponto-pulsar var(--d-pulso) cubic-bezier(0.34, 1.56, 0.64, 1)
    var(--t-pulso) both;
}

.abertura[data-abertura="tocando"] :global([data-ponto])::after {
  animation: ponto-halo var(--d-pulso) ease-out var(--t-pulso) both;
}

@keyframes ponto-pulsar {
  0% {
    transform: scale(1);
  }
  45% {
    transform: scale(1.35);
  }
  100% {
    transform: scale(1);
  }
}

/* Sem resíduo: o estado final do ponto é o círculo chapado de sempre. */
@keyframes ponto-halo {
  0% {
    opacity: 0;
    transform: scale(0.4);
  }
  40% {
    opacity: 0.7;
  }
  100% {
    opacity: 0;
    transform: scale(2.2);
  }
}
```

- [ ] **Step 3: Escrever o estado estático e o movimento reduzido**

Acrescente, na sequência:

```css
/* ── Estado final explícito: visita repetida na mesma sessão ────────────── */

.abertura[data-abertura="estatica"] :global([data-logo]) {
  transform: none;
}

.abertura[data-abertura="estatica"] :global([data-ponto])::after {
  content: none;
}

/* ── prefers-reduced-motion ─────────────────────────────────────────────── */

/* !important de propósito: sem ele, a cadeia
   `.abertura[data-abertura="tocando"] :global([data-glifo]...)` venceria por
   especificidade e a animação rodaria mesmo com a preferência ligada — a
   mesma lição que MotionD.module.css já tinha registrado por escrito.
   O bloco de globals.css não resolve sozinho: ele zera animation-duration,
   mas não zera animation-delay. */
@media (prefers-reduced-motion: reduce) {
  .abertura :global([data-logo]),
  .abertura :global([data-glifo][data-indice="1"] path),
  .abertura :global([data-ponto]) {
    animation: none !important;
    transform: none !important;
  }

  .abertura :global([data-ponto])::after {
    content: none !important;
  }
}
```

- [ ] **Step 4: Ver com os próprios olhos**

Run: `npm run dev`

Abra `http://localhost:3000` numa aba anônima (o `sessionStorage` de uma aba já usada faria a entrada ser pulada) e confira, nesta ordem:

1. A logo começa menor e cresce até o tamanho de hoje, centralizada o tempo todo.
2. O `0` do meio dá **uma** volta completa, no sentido horário, e para na posição correta **no mesmo instante** em que a logo para de crescer.
3. O `0` não sai do lugar dentro da palavra em nenhum quadro — se ele saltar para fora, a rotação foi parar no `<g>` em vez do `<path>`.
4. O ponto verde é carregado junto com o crescimento e, ao assentar, dá um pulso com um brilho verde que **não deixa resíduo**.
5. Recarregue a página (mesma aba): a logo aparece já montada, sem crescer e sem girar.
6. Ligue `prefers-reduced-motion` no sistema operacional (ou emule em DevTools → Rendering → "Emulate CSS prefers-reduced-motion") e abra numa aba anônima: nada se mexe.

- [ ] **Step 5: Rodar a suíte e o lint**

Run: `npm test && npm run lint`
Expected: PASS — nada muda no vitest, esta task é só CSS. É uma checagem de que nada quebrou.

- [ ] **Step 6: Commitar**

```bash
git add app/abertura.module.css
git commit -m "feat: a logo cresce girando o 0 e o ponto verde pulsa ao assentar"
```

---

### Task 5: O topo entra pelas laterais

**Files:**
- Modify: `app/abertura.module.css`

**Interfaces:**
- Consumes: `--d-topo`, `--t-topo` (Task 2); `[data-ima="idioma"]` (raiz do `SeletorIdioma`) e `[data-ima="contato"]` (o link do Instagram) — os dois já existem, nenhum componente é tocado; `--margem` (globals.css).
- Produces: nada de novo no DOM. Só CSS.

- [ ] **Step 1: Escrever as regras do topo**

Acrescente a `app/abertura.module.css`, antes do bloco `@media (prefers-reduced-motion: reduce)` (o bloco de reduced-motion fica sempre por último na folha):

```css
/* ── Ato 3: os textos do topo entram pelas laterais (--t-topo) ──────────── */

/* Cada um exatamente fora da sua borda: 100% da própria largura mais a margem
   da página. O recorte é do `html, body { overflow: hidden }` que já existe
   em globals.css — nada aqui precisa recortar.

   Um artefato conhecido, e é medição, não defeito: enquanto o CONTATO está
   deslocado para a direita, `document.body.scrollWidth` reporta a extensão
   real do conteúdo mesmo escondida pelo overflow. Ninguém consegue rolar; o
   e2e é que precisa medir depois do fim da entrada (ver e2e/layout.spec.ts). */
/* `[data-abertura]` sem valor: presença do atributo, não um estado. Estas duas
   são regras de REPOUSO — precisam valer antes de a animação começar, e a
   presença do atributo é o que leva a especificidade a (0,3,0), que é o que
   faz esta folha vencer os módulos dos componentes por especificidade e nunca
   por ordem de import. É a mesma convenção que o cabeçalho do arquivo
   documenta e que as regras da Task 4 seguem. */
.abertura[data-abertura] :global([data-ima="idioma"]) {
  transform: translateX(calc(-100% - var(--margem)));
  opacity: 0;
}

.abertura[data-abertura] :global([data-ima="contato"]) {
  transform: translateX(calc(100% + var(--margem)));
  opacity: 0;
}

/* Os dois ao mesmo tempo, sem escalonar: é um gesto simétrico só, não dois. */
.abertura[data-abertura="tocando"] :global([data-ima="idioma"]) {
  animation: topo-esquerda var(--d-topo) cubic-bezier(0.16, 1, 0.3, 1)
    var(--t-topo) both;
}

.abertura[data-abertura="tocando"] :global([data-ima="contato"]) {
  animation: topo-direita var(--d-topo) cubic-bezier(0.16, 1, 0.3, 1)
    var(--t-topo) both;
}

@keyframes topo-esquerda {
  from {
    transform: translateX(calc(-100% - var(--margem)));
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes topo-direita {
  from {
    transform: translateX(calc(100% + var(--margem)));
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* ── Estado final explícito: visita repetida na mesma sessão ────────────── */

.abertura[data-abertura="estatica"] :global([data-ima="idioma"]),
.abertura[data-abertura="estatica"] :global([data-ima="contato"]) {
  transform: none;
  opacity: 1;
}
```

- [ ] **Step 2: Acrescentar o topo ao bloco de movimento reduzido**

No bloco `@media (prefers-reduced-motion: reduce)` que já existe no fim da folha, acrescente um seletor novo (não mexa nos que já estão lá):

```css
  .abertura[data-abertura] :global([data-ima="idioma"]),
  .abertura[data-abertura] :global([data-ima="contato"]) {
    animation: none !important;
    transform: none !important;
    opacity: 1 !important;
  }
```

- [ ] **Step 3: Ver com os próprios olhos**

Run: `npm run dev`

Numa aba anônima, em `http://localhost:3000`:

1. `PT / EN` e `CONTATO ↗` **não estão na tela** enquanto a logo cresce.
2. Eles entram juntos, cada um pela sua borda, 0,4s depois de o ponto verde pulsar.
3. Repita em 390x844 (DevTools, modo dispositivo): eles ainda entram de fora e param no lugar certo — `--margem` cai para 1.5rem nesse tamanho, e o `calc` acompanha.
4. Recarregue na mesma aba: os dois já estão no lugar, sem entrar.

- [ ] **Step 4: Rodar a suíte e o lint**

Run: `npm test && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commitar**

```bash
git add app/abertura.module.css
git commit -m "feat: PT/EN e CONTATO entram pelas laterais da tela"
```

---

### Task 6: O e2e da abertura nova

**Files:**
- Modify: `e2e/layout.spec.ts`

**Interfaces:**
- Consumes: `DURACAO_TOTAL_MAXIMA_MS` de `lib/abertura.ts` (import relativo `../lib/abertura`, sem alias — `lib/abertura.ts` importa `./copy` justamente para a cadeia inteira resolver sem `@/`).
- Produces: nada. É teste.

- [ ] **Step 1: Trocar as esperas pela fonte de verdade**

No topo de `e2e/layout.spec.ts`, depois do import do Playwright:

```ts
import { DURACAO_TOTAL_MAXIMA_MS } from "../lib/abertura";

/**
 * Uma folga sobre o fim REAL da coreografia, importado de lib/abertura.ts em
 * vez de escrito à mão. Antes eram 2000ms literais espalhados pelo arquivo,
 * herdados do MotionD; a entrada de hoje termina em 4484ms (pt) e mexer numa
 * duração lá dentro empurra este número junto, sem ninguém precisar lembrar.
 *
 * Sim, isto deixa a suíte mais lenta: são ~4,8s por caso, contra ~2s antes.
 * É o preço de medir a página no estado em que o visitante a encontra.
 */
const DEPOIS_DA_ENTRADA = DURACAO_TOTAL_MAXIMA_MS + 300;
```

Atualize o comentário do cabeçalho do arquivo: onde ele diz
"a entrada (MotionD) toca uma vez por sessão do navegador", troque `MotionD`
por `a abertura (lib/abertura.ts + app/abertura.module.css)`.

Substitua **todas** as esperas de fim de entrada por `DEPOIS_DA_ENTRADA`:

- os quatro `await page.waitForTimeout(2000);` dentro do laço de viewports
  (nos testes "não tem scroll durante a entrada", "não tem scroll após reload",
  "nada é cortado durante a entrada", "nada é cortado após reload");
- `await page.waitForTimeout(2100);` no `beforeEach` de "o ímã da lanterna" —
  e o comentário `// a entrada termina em 2000ms` vira
  `// a entrada termina em DURACAO_TOTAL_MAXIMA_MS`;
- os dois `await page.waitForTimeout(2500);` em "a malha viva" — mesmo
  tratamento no comentário.

**Não** mexa nos `waitForTimeout(300)` pós-reload, nos `waitForTimeout(500)` do
ímã, nem nos do bloco "com movimento reduzido": nenhum deles espera a entrada.

- [ ] **Step 2: Escrever os testes novos da abertura**

Acrescente ao fim de `e2e/layout.spec.ts`:

```ts
/**
 * A abertura em si. O que só um navegador de verdade prova é que as regras de
 * app/abertura.module.css realmente venceram as dos módulos dos componentes e
 * que a coreografia chega ao estado final — o jsdom não carrega CSS Modules,
 * então nenhum teste de vitest enxerga uma linha destas folhas.
 */
test.describe("a abertura", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("termina com a logo no tamanho final e o giro fechado", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(DEPOIS_DA_ENTRADA);

    // "none" e a matriz identidade dizem a mesma coisa: escala 1, sem giro.
    const identidade = ["none", "matrix(1, 0, 0, 1, 0, 0)"];

    const logo = await page
      .locator("[data-logo]")
      .evaluate((el) => getComputedStyle(el).transform);
    expect(identidade, `a logo parou em ${logo}`).toContain(logo);

    const zero = await page
      .locator("[data-glifo][data-indice='1'] path")
      .evaluate((el) => getComputedStyle(el).transform);
    expect(identidade, `o "0" parou em ${zero}`).toContain(zero);
  });

  test("o 0 continua no lugar dele dentro da palavra", async ({ page }) => {
    // A armadilha do §5a do design: se a rotação tivesse ido para o
    // <g data-glifo>, ela teria apagado o `transform` de atributo que
    // posiciona o glifo, e o "0" terminaria fora da caixa da logo.
    await page.goto("/");
    await page.waitForTimeout(DEPOIS_DA_ENTRADA);

    const logo = (await page.locator("[data-logo]").boundingBox())!;
    const zero = (await page
      .locator("[data-glifo][data-indice='1'] path")
      .boundingBox())!;

    expect(zero.x).toBeGreaterThan(logo.x);
    expect(zero.x + zero.width).toBeLessThan(logo.x + logo.width);
  });

  test("termina com a frase inteira acesa e nenhum cursor aceso", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(DEPOIS_DA_ENTRADA);

    const opacidades = await page
      .locator("[data-caractere]")
      .evaluateAll((els) => els.map((el) => Number(getComputedStyle(el).opacity)));

    expect(opacidades.length).toBeGreaterThan(30);
    expect(Math.min(...opacidades)).toBeGreaterThan(0.99);

    const cursoresAcesos = await page
      .locator("[data-caractere]")
      .evaluateAll(
        (els) =>
          els.filter(
            (el) => Number(getComputedStyle(el, "::after").opacity) > 0.01,
          ).length,
      );
    expect(cursoresAcesos).toBe(0);
  });

  test("no começo a frase ainda não escreveu nada", async ({ page }) => {
    // Contraparte decisiva do teste acima: sem ela, "tudo aceso no fim"
    // passaria com a animação nunca tendo rodado.
    await page.goto("/");
    await page.waitForTimeout(500); // a frase só começa em 2680ms

    const acesos = await page
      .locator("[data-caractere]")
      .evaluateAll(
        (els) =>
          els.filter((el) => Number(getComputedStyle(el).opacity) > 0.5).length,
      );
    expect(acesos).toBe(0);
  });
});

test.describe("a abertura com movimento reduzido", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("a frase já está inteira no primeiro quadro, e sem cursor", async ({ page }) => {
    await page.goto("/");

    // Prova de que a preferência está mesmo ligada nesta página — sem isto o
    // teste passaria com o modo reduzido nunca tendo sido ativado.
    const reduzidoDeVerdade = await page.evaluate(
      () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    expect(reduzidoDeVerdade).toBe(true);

    const opacidades = await page
      .locator("[data-caractere]")
      .evaluateAll((els) => els.map((el) => Number(getComputedStyle(el).opacity)));

    expect(opacidades.length).toBeGreaterThan(30);
    expect(Math.min(...opacidades)).toBeGreaterThan(0.99);

    const cursoresAcesos = await page
      .locator("[data-caractere]")
      .evaluateAll(
        (els) =>
          els.filter(
            (el) => Number(getComputedStyle(el, "::after").opacity) > 0.01,
          ).length,
      );
    expect(cursoresAcesos).toBe(0);
  });

  test("o topo já está no lugar, sem ter entrado de lado", async ({ page }) => {
    await page.goto("/");

    for (const seletor of ["[data-ima='idioma']", "[data-ima='contato']"]) {
      const t = await page
        .locator(seletor)
        .evaluate((el) => getComputedStyle(el).transform);
      expect(["none", "matrix(1, 0, 0, 1, 0, 0)"], `${seletor} = ${t}`).toContain(t);
    }
  });
});
```

- [ ] **Step 3: Rodar o e2e**

Run: `npx playwright test`
Expected: PASS. A suíte demora mais que antes (cada caso do laço de viewports espera ~4,8s em vez de ~2s).

Se o Playwright reclamar de resolver `../lib/abertura`, o problema é a cadeia
de imports: confira que `lib/abertura.ts` importa `./copy`, e **não**
`@/lib/copy` (Task 1, Step 3). Se ainda assim falhar, troque o import por uma
constante literal com um comentário apontando para `lib/abertura.ts` como
fonte — e registre isso no design como fragilidade conhecida.

- [ ] **Step 4: Commitar**

```bash
git add e2e/layout.spec.ts
git commit -m "test: e2e da abertura nova e esperas amarradas na fonte de verdade"
```

---

### Task 7: As emendas no spec da main page

**Files:**
- Modify: `docs/superpowers/specs/2026-07-28-main-page-202-design.md`

**Interfaces:** nenhuma. É documentação.

- [ ] **Step 1: Registrar a emenda na §6**

Em `docs/superpowers/specs/2026-07-28-main-page-202-design.md`, logo depois do
bloco "Resultado (29/07/2026): nenhum dos três" — isto é, depois da linha
`- **Nasce a lanterna** (§6.1), que muda o fundo especificado na §5.` e antes
de `## 6.1 A lanterna do mouse` — acrescente:

```markdown
### Resultado (31/07/2026): o Motion D sai, entra a abertura da tela

O Lucas pediu uma entrada nova, especificada em
`docs/superpowers/specs/2026-07-31-abertura-da-tela-design.md`. O Motion D fica
**arquivado no repo**, sem nenhum import e com os testes rodando, para poder
voltar sem arqueologia de git.

A sequência nova: a logo cresce girando o `0` e o ponto verde pulsa ao
assentar; os textos do topo entram pelas laterais da tela; a frase do rodapé é
digitada com uma barra de digitação.

Três coisas que isso arrasta para este documento:

- **O teto de duração desta página passa a ser 4800 ms**, em
  `lib/abertura.ts`. O teto de 2000 ms em `components/motion/tipos.ts` **não
  muda**: ele governa os candidatos de motion, e o Motion D arquivado continua
  obedecendo a ele. A regra que o teto protege continua a mesma — o visitante
  não pode achar que o site travou — e continua valendo: a tela não fica parada
  em instante nenhum, exceto pelas duas pausas de 0,4 s e 0,2 s, que são
  deliberadas.
- **"O ponto verde acende por último, sempre, como batida final" vira "o verde
  fecha".** A sequência nova encerra com a frase digitada, e o ponto pulsa no
  meio. Para não perder a batida, a barra de digitação é `--verde-sinal`: o
  último pixel a se mexer na tela continua sendo verde.
- **"Os quatro elementos dos cantos entram em fade suave depois da logo,
  escalonados" está implementado — com outro gesto.** Não é fade: `PT/EN` e
  `CONTATO ↗` entram pelas laterais da tela, e a frase do rodapé é digitada. O
  princípio (os cantos vêm depois da logo, em ordem) foi respeitado; o fade
  não.
```

- [ ] **Step 2: Commitar**

```bash
git add docs/superpowers/specs/2026-07-28-main-page-202-design.md
git commit -m "docs: registra a emenda da abertura no spec da main page"
```

---

## Fechamento

- [ ] **Rodar tudo, uma vez, do zero**

```bash
npm test
npm run lint
npm run build
npx playwright test
```

Expected: os quatro verdes. O `npm run build` importa: `lib/abertura.ts` lança
no carregamento do módulo se a frase mais longa estourar o teto, e é no build
que isso apareceria.

- [ ] **Entregar para o Lucas olhar**

Run: `npm run dev`

Aba anônima em `http://localhost:3000`. A sequência inteira, do começo ao fim,
nesta ordem: logo cresce girando o `0` → ponto pulsa → 0,4 s parado → topo
entra pelas laterais → 0,2 s parado → frase digitada → cursor some. Gosto não
se testa: quem julga é ele.
