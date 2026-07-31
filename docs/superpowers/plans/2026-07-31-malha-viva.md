# Malha viva e lanterna por caractere — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o fundo da main page por uma malha em canvas — visível em repouso, cintilando por caractere e acesa individualmente pela lanterna com rastro — e remover as coordenadas do rodapé.

**Architecture:** A matemática do brilho vira funções puras em `lib/malha.ts` (testáveis sem navegador, mesmo padrão de `passo` em `lib/usaLanterna.ts`). `components/Malha.tsx` desenha num `<canvas>` com dois laços independentes: o da lanterna (dorme ao assentar, inalterado) e o da malha (contínuo). A malha lê a posição da lanterna por um ref numérico novo, exposto via contexto React, em vez de reler CSS a cada quadro.

**Tech Stack:** Next.js 16.2.12 (App Router), React 19, TypeScript, CSS Modules, Vitest + Testing Library (jsdom), Playwright (e2e), `subset-font` (devDependency nova).

**Spec:** `docs/superpowers/specs/2026-07-31-malha-viva-design.md`

## Global Constraints

- Branch de trabalho: `feat/main-page`. Não criar branch nova, não fazer push (o repo não tem remote).
- `AGENTS.md` do repo: **esta versão do Next.js tem breaking changes**. Antes de escrever código de framework, consultar `node_modules/next/dist/docs/`. Não vale confiar em memória de versões anteriores.
- Idioma do código: identificadores, comentários e nomes de teste em **português**. É a convenção estabelecida do repo.
- Hooks: o identificador **local** de qualquer hook precisa começar com `use` (`import { usaX as useX }`), senão a regra `react-hooks` para de checar o corpo. O export continua em português. Isso já derrubou a página em runtime antes — ver comentário no topo de `app/page.tsx`.
- Nenhum número da coreografia de entrada pode ser tocado: `ATOS` em `components/motion/MotionD.tsx` é a fonte única.
- Os três ímãs (`data-ima="contato"`, `"idioma"`, `"oneliner"`) devem continuar funcionando.
- Comandos: `npm test` (vitest run), `npm run lint`, `npx tsc --noEmit`, `npm run test:e2e`.
- Commits em português, no formato já usado no repo (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).
- Valores exatos vindos do spec: `tamanhoFonte 18`, `tracking -0.03×fonte`, `alturaLinha 0.9×fonte`, `padX 6`, `padY 4`, `corRepouso #171717`, `corLuz #28d305`, `intensidade 0.85`, `decaimento 0.9`, `amplitudeCintilacao 0.035`, `raioBase 300px`, `dprMaximo 2`.

## Ordem e paralelismo

As tarefas 1, 2, 3 e 4 são independentes entre si e podem rodar em paralelo. A 5 depende de 2, 3 e 4. A 6 depende da 5. A 7 depende da 6.

```
1 ─┐
2 ─┼─→ 5 → 6 → 7
3 ─┤
4 ─┘
```

---

### Task 1: Remover as coordenadas

**Files:**
- Modify: `app/page.tsx` (linhas 13 e 89-93)
- Modify: `lib/copy.ts` (linhas 19-23)
- Modify: `lib/copy.test.ts` (linhas 2 e 34-37)
- Modify: `app/page.test.tsx` (linhas 5, 14-18, 43-47)
- Modify: `app/globals.css` (linha 116 e dentro do `@media (max-width: 720px)`)
- Modify: `e2e/layout.spec.ts` (linha 32)

**Interfaces:**
- Consumes: nada.
- Produces: `lib/copy.ts` deixa de exportar `COORDENADAS` e `LOCAL`. Nenhuma outra tarefa depende desses símbolos.

- [ ] **Step 1: Trocar os testes de página para exigir ausência**

Em `app/page.test.tsx`, remova o import da linha 5 e substitua os dois testes (linhas 14-18 e 43-47) por um só:

```tsx
  it("não mostra mais coordenadas nem cidade no rodapé", () => {
    render(<Home />);
    expect(screen.queryByText(/23°12'37"S/)).not.toBeInTheDocument();
    expect(screen.queryByText(/SÃO JOSÉ DOS CAMPOS/)).not.toBeInTheDocument();
  });
```

Em `lib/copy.test.ts`, remova `COORDENADAS, LOCAL` do import da linha 2 e apague o teste das linhas 34-37 por inteiro.

- [ ] **Step 2: Rodar os testes e ver falhar**

Run: `npm test -- app/page.test.tsx lib/copy.test.ts`
Expected: FAIL. `page.test.tsx` falha porque o texto ainda está na tela; `copy.test.ts` pode passar já (só removeu asserção) — o que interessa é o vermelho da página.

- [ ] **Step 3: Remover das fontes**

Em `app/page.tsx`, linha 13, tire `COORDENADAS` e `LOCAL` do import:

```tsx
import { COPY, INSTAGRAM, titulo, type Idioma } from "@/lib/copy";
```

E apague o bloco inteiro das linhas 89-93 (o `<p className="label coordenadas">` com seus dois `<span>` e o `<br />`). O `<footer className="base">` fica só com o `<h1 className="oneliner">`.

Em `lib/copy.ts`, apague as linhas 19-23 (o comentário de bloco e os dois `export const`).

- [ ] **Step 4: Limpar o CSS**

Em `app/globals.css`, apague a linha `.coordenadas { text-align: right; }` e, dentro do `@media (max-width: 720px)`, apague a regra `.coordenadas { text-align: left; }`. O `@media` continua existindo por causa da regra `.base`.

Em `e2e/layout.spec.ts` linha 32, tire `".coordenadas"` da lista:

```ts
const SELETORES_CANTOS = ["[data-logo]", ".oneliner", ".contato"];
```

- [ ] **Step 5: Rodar tudo e ver passar**

Run: `npm test && npm run lint && npx tsc --noEmit`
Expected: PASS nos três. Se `tsc` reclamar de import não usado em algum arquivo, é resíduo do passo 3 — remova.

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx app/page.test.tsx lib/copy.ts lib/copy.test.ts app/globals.css e2e/layout.spec.ts
git commit -m "feat: remove as coordenadas do rodape"
```

---

### Task 2: `lib/malha.ts` — a matemática pura

**Files:**
- Create: `lib/malha.ts`
- Test: `lib/malha.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces (a Task 5 depende destes nomes e tipos exatos):
  - `PARAMETROS` — objeto congelado com os valores do spec
  - `type RGB = readonly [number, number, number]`
  - `type Grade = { colunas: number; linhas: number; total: number }`
  - `type Celulas = { fatores: Float32Array; fases: Float32Array; chars: Uint8Array; brilhos: Float32Array }`
  - `montarGrade(entrada: { larguraCss: number; alturaCss: number; larguraChar: number; alturaLinha: number }): Grade`
  - `semearCelulas(total: number, aleatorio?: () => number): Celulas`
  - `brilhoDaCelula(entrada: EntradaBrilho): number`
  - `devePular(entrada: { cintila: boolean; mudou: boolean; precisaDesenhar: boolean }): boolean`
  - `hexParaRgb(hex: string): RGB`
  - `misturar(base: RGB, alvo: RGB, g: number): RGB`
  - `ganho(brilho: number, intensidade?: number): number`

- [ ] **Step 1: Escrever os testes que falham**

Crie `lib/malha.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  PARAMETROS,
  brilhoDaCelula,
  devePular,
  ganho,
  hexParaRgb,
  misturar,
  montarGrade,
  semearCelulas,
} from "./malha";

/** Entrada mínima de `brilhoDaCelula`, para cada teste mudar só o que importa. */
function entrada(sobrescreve: Partial<Parameters<typeof brilhoDaCelula>[0]> = {}) {
  return {
    anterior: 0,
    fator: 1,
    fase: 0,
    tempo: 0,
    distancia2: 1e12,
    raio2: 90000,
    temLuz: false,
    cintila: false,
    ...sobrescreve,
  };
}

describe("montarGrade", () => {
  it("cobre a tela inteira, com folga de uma coluna e uma linha", () => {
    const g = montarGrade({
      larguraCss: 1000,
      alturaCss: 600,
      larguraChar: 10,
      alturaLinha: 16,
    });
    expect(g.colunas * 10).toBeGreaterThanOrEqual(1000 - PARAMETROS.padX);
    expect(g.linhas * 16).toBeGreaterThanOrEqual(600 - PARAMETROS.padY);
    expect(g.total).toBe(g.colunas * g.linhas);
  });

  it("devolve grade vazia quando a métrica ainda não existe", () => {
    const g = montarGrade({
      larguraCss: 1000,
      alturaCss: 600,
      larguraChar: 0,
      alturaLinha: 0,
    });
    expect(g).toEqual({ colunas: 0, linhas: 0, total: 0 });
  });
});

describe("semearCelulas", () => {
  it("alterna 2 e 0 célula a célula", () => {
    const c = semearCelulas(4, () => 0.5);
    expect(Array.from(c.chars)).toEqual([0, 1, 0, 1]);
  });

  it("mantém os fatores entre 0.5 e 1", () => {
    const c = semearCelulas(3, () => 1);
    expect(Array.from(c.fatores)).toEqual([1, 1, 1]);
    const d = semearCelulas(3, () => 0);
    expect(Array.from(d.fatores)).toEqual([0.5, 0.5, 0.5]);
  });

  it("começa com todos os brilhos zerados", () => {
    const c = semearCelulas(5);
    expect(Array.from(c.brilhos).every((v) => v === 0)).toBe(true);
  });
});

describe("brilhoDaCelula", () => {
  it("decai a 0.9 por quadro quando não há luz nem cintilação", () => {
    expect(brilhoDaCelula(entrada({ anterior: 1 }))).toBeCloseTo(0.9, 5);
    expect(brilhoDaCelula(entrada({ anterior: 0.9 }))).toBeCloseTo(0.81, 5);
  });

  it("apaga na hora quando o decaimento é zero (movimento reduzido)", () => {
    expect(brilhoDaCelula(entrada({ anterior: 1, decaimento: 0 }))).toBe(0);
  });

  it("acende a 1 no centro exato da luz", () => {
    const v = brilhoDaCelula(entrada({ temLuz: true, distancia2: 0 }));
    expect(v).toBeCloseTo(1, 5);
  });

  it("não acende nada fora do raio", () => {
    const v = brilhoDaCelula(entrada({ temLuz: true, distancia2: 90001, raio2: 90000 }));
    expect(v).toBe(0);
  });

  it("acende menos quanto mais longe do centro", () => {
    const perto = brilhoDaCelula(entrada({ temLuz: true, distancia2: 10000 }));
    const longe = brilhoDaCelula(entrada({ temLuz: true, distancia2: 40000 }));
    expect(perto).toBeGreaterThan(longe);
  });

  it("a cintilação nunca passa da amplitude", () => {
    for (let t = 0; t < 20; t += 0.37) {
      const v = brilhoDaCelula(entrada({ cintila: true, tempo: t }));
      expect(v).toBeLessThanOrEqual(PARAMETROS.amplitudeCintilacao + 1e-6);
    }
  });

  it("a luz vence a cintilação, e a cintilação vence o decaimento", () => {
    const so = brilhoDaCelula(entrada({ cintila: true, tempo: 1 }));
    const com = brilhoDaCelula(entrada({ cintila: true, tempo: 1, temLuz: true, distancia2: 0 }));
    expect(com).toBeGreaterThan(so);
    expect(brilhoDaCelula(entrada({ anterior: 0.001, cintila: true, tempo: 1 }))).toBe(so);
  });
});

describe("devePular", () => {
  it("nunca pula enquanto a malha cintila", () => {
    expect(devePular({ cintila: true, mudou: false, precisaDesenhar: false })).toBe(false);
  });

  it("pula quando não cintila, nada mudou e não há pedido de redesenho", () => {
    expect(devePular({ cintila: false, mudou: false, precisaDesenhar: false })).toBe(true);
  });

  it("não pula quando a luz se moveu", () => {
    expect(devePular({ cintila: false, mudou: true, precisaDesenhar: false })).toBe(false);
  });

  it("não pula quando alguém pediu redesenho (resize, fonte, volta de aba)", () => {
    expect(devePular({ cintila: false, mudou: false, precisaDesenhar: true })).toBe(false);
  });
});

describe("cor", () => {
  it("lê hexadecimal", () => {
    expect(hexParaRgb("#28d305")).toEqual([40, 211, 5]);
    expect(hexParaRgb("171717")).toEqual([23, 23, 23]);
  });

  it("mistura entre repouso e luz", () => {
    expect(misturar([23, 23, 23], [40, 211, 5], 0)).toEqual([23, 23, 23]);
    expect(misturar([23, 23, 23], [40, 211, 5], 1)).toEqual([40, 211, 5]);
  });

  it("o ganho satura em 1", () => {
    expect(ganho(1, 0.85)).toBeCloseTo(0.85, 5);
    expect(ganho(2, 0.85)).toBe(1);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- lib/malha.test.ts`
Expected: FAIL — `Failed to resolve import "./malha"`.

- [ ] **Step 3: Escrever `lib/malha.ts`**

```ts
/**
 * A matemática da malha viva — sem DOM, sem canvas, sem navegador.
 *
 * Fica separada de `components/Malha.tsx` pelo mesmo motivo que `passo` fica
 * separada do componente da lanterna: é a única parte com lógica de verdade, e
 * é a única que dá para testar sem abrir um navegador. O componente vira só
 * pincel.
 *
 * Todos os valores vêm da referência `Hero 2020 Glow v2.dc.html`, conferida
 * rodando — ver o spec de 31/07/2026.
 */

/** Um número por parâmetro, num lugar só. Ajuste é troca de valor aqui. */
export const PARAMETROS = {
  /** Corpo da fonte da malha, em px. */
  tamanhoFonte: 18,
  /** Espaçamento entre caracteres, como fração do corpo. Negativo = mais junto. */
  trackingRelativo: -0.03,
  /** Entrelinha como fração do corpo. Abaixo de 1 as linhas se tocam. */
  alturaLinhaRelativa: 0.9,
  padX: 6,
  padY: 4,
  /** A malha apagada, sobre o preto da página. */
  corRepouso: "#171717",
  /** Quanto do caminho até a cor da luz um brilho 1.0 percorre. */
  intensidade: 0.85,
  /** Fração do brilho que sobrevive a cada quadro — é isto que vira rastro. */
  decaimento: 0.9,
  /** Teto da respiração em repouso. */
  amplitudeCintilacao: 0.035,
  /** Radianos por segundo da respiração. */
  velocidadeCintilacao: 0.8,
  /** Curva da queda com a distância. Acima de 1 concentra a luz no centro. */
  expoenteProximidade: 1.6,
  /** Abaixo disto a célula não é redesenhada. */
  limiarAceso: 0.02,
  /** A partir daqui a célula ganha halo. */
  limiarHalo: 0.25,
  /** Raio máximo do halo, em px. */
  haloMaximo: 9,
  /** Opacidade do halo, como fração do ganho. */
  opacidadeHalo: 0.7,
  /** Teto do device pixel ratio: acima de 2 o custo dobra sem ganho visível. */
  dprMaximo: 2,
} as const;

export type RGB = readonly [number, number, number];

export type Grade = { colunas: number; linhas: number; total: number };

export type Celulas = {
  /** Quanto cada célula acende no máximo — 0.5 a 1, sorteado uma vez. */
  fatores: Float32Array;
  /** Deslocamento da respiração, para as vizinhas não pulsarem juntas. */
  fases: Float32Array;
  /** 0 → "2", 1 → "0". */
  chars: Uint8Array;
  /** O brilho do quadro anterior. É a memória que produz o rastro. */
  brilhos: Float32Array;
};

const GRADE_VAZIA: Grade = { colunas: 0, linhas: 0, total: 0 };

/**
 * Quantas colunas e linhas cobrem a caixa. Uma a mais em cada eixo de
 * propósito: sem ela sobra uma faixa apagada na borda direita e embaixo.
 */
export function montarGrade(entrada: {
  larguraCss: number;
  alturaCss: number;
  larguraChar: number;
  alturaLinha: number;
}): Grade {
  const { larguraCss, alturaCss, larguraChar, alturaLinha } = entrada;
  if (!(larguraChar > 0) || !(alturaLinha > 0)) return GRADE_VAZIA;
  if (!(larguraCss > 0) || !(alturaCss > 0)) return GRADE_VAZIA;

  const colunas = Math.ceil((larguraCss - PARAMETROS.padX) / larguraChar) + 1;
  const linhas = Math.ceil((alturaCss - PARAMETROS.padY) / alturaLinha) + 1;
  return { colunas, linhas, total: colunas * linhas };
}

/**
 * Sorteia o que cada célula tem de próprio. `aleatorio` é injetado para o teste
 * ser determinístico — o componente não passa nada e cai no Math.random.
 */
export function semearCelulas(
  total: number,
  aleatorio: () => number = Math.random
): Celulas {
  const fatores = new Float32Array(total);
  const fases = new Float32Array(total);
  const chars = new Uint8Array(total);
  const brilhos = new Float32Array(total);

  for (let i = 0; i < total; i++) {
    fatores[i] = 0.5 + aleatorio() * 0.5;
    fases[i] = aleatorio() * Math.PI * 2;
    chars[i] = i % 2;
  }

  return { fatores, fases, chars, brilhos };
}

export type EntradaBrilho = {
  /** Brilho desta célula no quadro anterior. */
  anterior: number;
  fator: number;
  fase: number;
  /** Tempo em segundos desde o início da animação. */
  tempo: number;
  /** Distância² da célula até a luz, em px². Ao quadrado para evitar raiz. */
  distancia2: number;
  /** Raio² efetivo da luz, em px² — já multiplicado pela escala do ímã. */
  raio2: number;
  temLuz: boolean;
  cintila: boolean;
  /** Sobrescreve PARAMETROS.decaimento. Zero = sem rastro (movimento reduzido). */
  decaimento?: number;
};

/**
 * O brilho de uma célula neste quadro, entre 0 e 1.
 *
 * Três fontes disputam, e a maior vence: o que sobrou do quadro anterior (o
 * rastro), a respiração, e a proximidade da luz. A subida é instantânea de
 * propósito — quem suaviza o movimento é a lanterna, em `lib/usaLanterna.ts`;
 * suavizar de novo aqui deixaria a luz borrada.
 */
export function brilhoDaCelula(entrada: EntradaBrilho): number {
  const decaimento = entrada.decaimento ?? PARAMETROS.decaimento;
  let v = entrada.anterior * decaimento;

  if (entrada.cintila) {
    const respiracao =
      PARAMETROS.amplitudeCintilacao *
      entrada.fator *
      (0.5 +
        0.5 *
          Math.sin(entrada.tempo * PARAMETROS.velocidadeCintilacao + entrada.fase));
    if (respiracao > v) v = respiracao;
  }

  if (entrada.temLuz && entrada.raio2 > 0 && entrada.distancia2 < entrada.raio2) {
    // sqrt(d²)/raio é o mesmo que sqrt(d²/raio²), e assim o raio nunca precisa
    // sair do quadrado.
    const proximidade = 1 - Math.sqrt(entrada.distancia2 / entrada.raio2);
    const alvo =
      Math.pow(proximidade, PARAMETROS.expoenteProximidade) * entrada.fator;
    if (alvo > v) v = alvo;
  }

  return v;
}

/**
 * Este quadro pode ser descartado sem mudar nada na tela?
 *
 * Só quando a malha não respira (movimento reduzido), a luz não se mexeu e
 * ninguém pediu redesenho — aí o quadro anterior já É a imagem certa. É o que
 * faz "reduzir movimento" custar quase nada sem precisar de um segundo
 * mecanismo de notificação entre a lanterna e a malha.
 *
 * Mora aqui, e não dentro do componente, para ser testável: o jsdom não dá
 * contexto 2d, então nada que dependa do laço de desenho pode ser verificado
 * lá.
 */
export function devePular(entrada: {
  cintila: boolean;
  mudou: boolean;
  precisaDesenhar: boolean;
}): boolean {
  return !entrada.cintila && !entrada.mudou && !entrada.precisaDesenhar;
}

export function hexParaRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  return [
    Number.parseInt(h.slice(0, 2), 16),
    Number.parseInt(h.slice(2, 4), 16),
    Number.parseInt(h.slice(4, 6), 16),
  ] as const;
}

/** Interpola do repouso até a luz. `g` fora de [0,1] é responsabilidade de `ganho`. */
export function misturar(base: RGB, alvo: RGB, g: number): RGB {
  return [
    Math.round(base[0] + (alvo[0] - base[0]) * g),
    Math.round(base[1] + (alvo[1] - base[1]) * g),
    Math.round(base[2] + (alvo[2] - base[2]) * g),
  ] as const;
}

/** Quanto do caminho até a cor da luz este brilho percorre, saturando em 1. */
export function ganho(
  brilho: number,
  intensidade: number = PARAMETROS.intensidade
): number {
  return Math.min(1, brilho * intensidade);
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- lib/malha.test.ts && npx tsc --noEmit && npm run lint`
Expected: PASS nos três.

- [ ] **Step 5: Commit**

```bash
git add lib/malha.ts lib/malha.test.ts
git commit -m "feat: matematica da malha viva, pura e testavel"
```

---

### Task 3: `usaLanterna` publica a posição viva

**Files:**
- Modify: `lib/usaLanterna.ts` (tipo `PosicaoLanterna` na linha 101, corpo de `useLanterna` a partir da linha 437)
- Test: `lib/usaLanterna.test.ts` (acrescentar um `describe`, não tocar nos existentes)

**Interfaces:**
- Consumes: nada.
- Produces (a Task 5 depende destes nomes exatos):
  - `export type PosicaoViva = { x: number; y: number; escala: number; ativa: boolean }`
  - `PosicaoLanterna` ganha o campo `viva: RefObject<PosicaoViva>` (o tipo `RefObject` é importado de `react`; o arquivo **não** tem o namespace `React` em escopo, então `React.RefObject` não compila)
  - O ref é atualizado no mesmo ponto em que as variáveis CSS são escritas.

- [ ] **Step 1: Escrever o teste que falha**

Acrescente ao final de `lib/usaLanterna.test.ts`:

```tsx
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { usaLanterna } from "./usaLanterna";

describe("a posição viva", () => {
  let quadros: FrameRequestCallback[] = [];

  beforeEach(() => {
    quadros = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      quadros.push(cb);
      return quadros.length;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** Roda o próximo quadro agendado, se houver. */
  function rodarQuadro(t: number) {
    const proximo = quadros.shift();
    if (proximo) act(() => proximo(t));
  }

  it("nasce parada e inativa", () => {
    const { result } = renderHook(() => usaLanterna());
    expect(result.current.viva.current).toEqual({
      x: 0,
      y: 0,
      escala: 1,
      ativa: false,
    });
  });

  it("acompanha as variáveis CSS que a lanterna escreve", () => {
    const { result } = renderHook(() => usaLanterna());
    const elemento = document.createElement("div");
    document.body.appendChild(elemento);

    act(() => result.current.ref(elemento));
    act(() => {
      window.dispatchEvent(new MouseEvent("mousemove", { clientX: 40, clientY: 25 }));
    });
    rodarQuadro(16);

    const viva = result.current.viva.current;
    expect(viva.ativa).toBe(true);
    expect(Number.parseFloat(elemento.style.getPropertyValue("--lanterna-x"))).toBeCloseTo(viva.x, 2);
    expect(Number.parseFloat(elemento.style.getPropertyValue("--lanterna-y"))).toBeCloseTo(viva.y, 2);
    expect(Number.parseFloat(elemento.style.getPropertyValue("--escala-lanterna"))).toBeCloseTo(viva.escala, 3);

    elemento.remove();
  });
});
```

Se os imports de `describe`/`it`/`expect` já existirem no topo do arquivo, não duplique — junte `afterEach`, `beforeEach` e `vi` ao import existente de `vitest`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- lib/usaLanterna.test.ts`
Expected: FAIL — `result.current.viva` é `undefined`.

- [ ] **Step 3: Acrescentar o tipo e o ref**

Em `lib/usaLanterna.ts`, troque o import da linha 3. O `type RefObject` é
obrigatório: este arquivo não importa o namespace `React`, então `React.RefObject`
não existe aqui.

```ts
import { useEffect, useRef, useState, type RefObject } from "react";
```

Acrescente o tipo logo antes de `export type PosicaoLanterna` (linha 101):

```ts
/**
 * A posição da luz **neste quadro**, para quem desenha quadro a quadro.
 *
 * Existe porque a malha em canvas precisa de números, e as variáveis CSS são
 * texto: relê-las com `getComputedStyle` a cada quadro forçaria recálculo de
 * estilo 60 vezes por segundo — exatamente o custo que `medirImas` documenta
 * que este arquivo evita de propósito.
 *
 * É um ref, e não estado: quem lê está dentro de um requestAnimationFrame e não
 * quer renderização nenhuma do React por causa disso.
 */
export type PosicaoViva = {
  x: number;
  y: number;
  escala: number;
  /** Houve algum movimento de mouse desde a montagem. */
  ativa: boolean;
};
```

E acrescente o campo em `PosicaoLanterna`:

```ts
export type PosicaoLanterna = {
  x: number;
  y: number;
  ativa: boolean;
  /** Callback ref: pendure no elemento que deve receber as variáveis. */
  ref: (elemento: HTMLElement | null) => void;
  /** A posição viva, quadro a quadro. Ver PosicaoViva. */
  viva: RefObject<PosicaoViva>;
};
```

Em React 19 `useRef<T>(inicial: T)` já devolve `RefObject<T>` com `current`
mutável — `MutableRefObject` não existe mais. O tipo acima é o certo para
`@types/react` 19, que é o que este repo usa.

- [ ] **Step 4: Preencher o ref dentro do quadro**

No corpo de `useLanterna`, acrescente o ref junto dos outros estados (perto da linha 438):

```ts
  const viva = useRef<PosicaoViva>({ x: 0, y: 0, escala: 1, ativa: false });
```

Dentro de `quadro`, logo **depois** das três chamadas de `setProperty` (linhas 512-514), acrescente:

```ts
      // Mesma verdade das variáveis CSS acima, em número. Escrever nos dois
      // lugares no mesmo ponto é o que garante que nunca divirjam.
      viva.current.x = estado.x;
      viva.current.y = estado.y;
      viva.current.escala = estado.escala;
      viva.current.ativa = temCursor;
```

E troque o `return` final do hook (linha 584) por:

```ts
  return { ...pos, ref: setAlvo, viva };
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm test -- lib/usaLanterna.test.ts && npx tsc --noEmit && npm run lint`
Expected: PASS. Os testes já existentes de `passo` continuam verdes — nada neles foi tocado.

- [ ] **Step 6: Commit**

```bash
git add lib/usaLanterna.ts lib/usaLanterna.test.ts
git commit -m "feat: lanterna publica a posicao viva em numero"
```

---

### Task 4: A fonte da malha

**Files:**
- Create: `scripts/gerar-fonte-malha.mjs`
- Create: `public/fonts/the-seasons-20.woff2` (gerado, commitado)
- Modify: `package.json` (devDependency + script)
- Modify: `app/globals.css` (`@font-face` no topo)

**Interfaces:**
- Consumes: nada.
- Produces: a família CSS `"The Seasons"` disponível na página. A Task 5 a referencia **só via CSS**, em `Malha.module.css` — nenhum código JS escreve o nome da fonte.

- [ ] **Step 1: Instalar a ferramenta**

Run: `npm install --save-dev subset-font`

- [ ] **Step 2: Escrever o script**

Crie `scripts/gerar-fonte-malha.mjs`:

```js
/**
 * Recorta a The Seasons para os dois glifos que a malha usa e gera o woff2.
 *
 * O .ttf de origem (230 KB) NÃO entra no repositório: a malha precisa de "2" e
 * "0" e mais nada, então o que é servido ao visitante é só isso. O woff2
 * gerado é commitado, para o build não depender da máquina de ninguém.
 *
 * Uso: node scripts/gerar-fonte-malha.mjs
 * Origem alternativa: FONTE_ORIGEM=/caminho/para.ttf node scripts/...
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import subsetFont from "subset-font";

const ORIGEM =
  process.env.FONTE_ORIGEM ??
  "C:/Users/Lucas/Downloads/Lucas_dos_Santos/efeito/fonts/TheSeasons-Regular.ttf";

const DESTINO = path.join(process.cwd(), "public", "fonts", "the-seasons-20.woff2");

const ttf = await readFile(ORIGEM);
const woff2 = await subsetFont(ttf, "20", { targetFormat: "woff2" });

await mkdir(path.dirname(DESTINO), { recursive: true });
await writeFile(DESTINO, woff2);

console.log(
  `${DESTINO}\n  ${(ttf.length / 1024).toFixed(1)} KB → ${(woff2.length / 1024).toFixed(1)} KB`
);
```

Acrescente ao `"scripts"` do `package.json`:

```json
    "fonte:malha": "node scripts/gerar-fonte-malha.mjs",
```

- [ ] **Step 3: Gerar e conferir o tamanho**

Run: `npm run fonte:malha`
Expected: imprime o caminho e uma redução grande (o .ttf tem 230 KB; o subset de dois glifos deve ficar bem abaixo de 20 KB).

Se `subset-font` falhar na conversão para woff2, gere sem recorte como saída de emergência — troque `subsetFont(ttf, "20", ...)` por `subsetFont(ttf, "0123456789", ...)` e siga. Anote no commit que o recorte ficou mais largo que o necessário.

- [ ] **Step 4: Declarar a fonte**

No topo de `app/globals.css`, **antes** do `:root`, acrescente:

```css
/* A letra da malha de fundo. Recortada para "2" e "0" por
   scripts/gerar-fonte-malha.mjs — o .ttf de origem não vive no repo.
   `swap`: enquanto ela não chega, a malha desenha com a Fraunces, que já está
   em memória, e se redesenha quando a troca acontece. */
@font-face {
  font-family: "The Seasons";
  src: url("/fonts/the-seasons-20.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
```

- [ ] **Step 5: Conferir que o arquivo é servido**

Run: `npm run dev` em segundo plano, depois `curl -s -o /dev/null -w "%{http_code} %{size_download}\n" http://localhost:3000/fonts/the-seasons-20.woff2`
Expected: `200` e um tamanho maior que zero.

- [ ] **Step 6: Commit**

```bash
git add scripts/gerar-fonte-malha.mjs public/fonts/the-seasons-20.woff2 package.json package-lock.json app/globals.css
git commit -m "feat: recorta a The Seasons para os glifos da malha"
```

---

### Task 5: `components/Malha.tsx` — o canvas

**Files:**
- Create: `components/Malha.tsx`
- Create: `components/Malha.module.css`
- Test: `components/Malha.test.tsx`
- Modify: `components/Lanterna.tsx` (expor a posição viva por contexto)

**Interfaces:**
- Consumes: tudo que a Task 2 exporta de `lib/malha.ts`; `PosicaoViva` da Task 3; a família `"The Seasons"` da Task 4.
- Produces: `export default function Malha()` — sem props. Lê a lanterna pelo contexto. `components/Lanterna.tsx` passa a exportar `usaLanternaViva(): RefObject<PosicaoViva> | null`.

- [ ] **Step 1: Escrever os testes que falham**

Crie `components/Malha.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Lanterna from "./Lanterna";
import Malha from "./Malha";

/**
 * O laço de desenho NÃO é testável aqui: o jsdom não implementa contexto 2d,
 * então `getContext("2d")` devolve null e o efeito sai antes de agendar
 * quadro. Isso não é limitação a contornar — é o comportamento exigido, e o
 * segundo teste abaixo o verifica. O desenho de verdade é coberto pelo e2e
 * (Task 7); a regra de pular quadro é coberta por `devePular` (Task 2).
 */
describe("Malha", () => {
  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renderiza um canvas escondido de leitores de tela", () => {
    const { container } = render(<Malha />);
    const canvas = container.querySelector("canvas");
    expect(canvas).not.toBeNull();
    expect(canvas).toHaveAttribute("aria-hidden", "true");
  });

  it("não estoura quando o navegador não dá contexto 2d", () => {
    // É exatamente o que o jsdom faz sem o pacote `canvas` instalado. Se o
    // componente não sair de fininho aqui, a suíte inteira cai.
    expect(() => render(<Malha />)).not.toThrow();
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it("monta dentro de uma <Lanterna>, lendo a posição viva pelo contexto", () => {
    // Caminho diferente do teste acima: aqui o contexto NÃO é null. É o
    // arranjo real da página, e é o que prova que o provider e o consumidor
    // se encontram.
    const { container } = render(
      <Lanterna>
        <Malha />
      </Lanterna>
    );
    expect(container.querySelector("[data-lanterna] canvas")).not.toBeNull();
  });
});

```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- components/Malha.test.tsx`
Expected: FAIL — `Failed to resolve import "./Malha"`.

- [ ] **Step 3: Expor a posição viva por contexto**

Em `components/Lanterna.tsx`, substitua o arquivo inteiro por:

```tsx
"use client";

import { createContext, useContext, type ReactNode, type RefObject } from "react";
// Alias obrigatório, não estilo: a regra react-hooks identifica hooks pelo
// NOME no ponto da chamada. Com `usaLanterna()` ela nem tenta — chamada
// condicional passava lint, tsc e build e quebrava a página em runtime. O
// export continua em português; só o identificador local vira `use*`.
import { usaLanterna as useLanterna, type PosicaoViva } from "@/lib/usaLanterna";
import estilos from "./Lanterna.module.css";

type Viva = RefObject<PosicaoViva> | null;

const ContextoViva = createContext<Viva>(null);

/**
 * A posição viva da lanterna que envolve este componente, ou `null` se não há
 * lanterna nenhuma acima.
 *
 * `null` não é erro: a malha é fundo e precisa existir onde a lanterna não
 * existe — em ponteiro grosso, e em qualquer teste que renderize a malha
 * sozinha. Quem consome trata `null` como "sem luz", não como falha.
 *
 * O nome interno é `useLanternaViva` pelo mesmo motivo que `useLanterna` em
 * lib/usaLanterna.ts: a regra react-hooks identifica hook pelo PREFIXO do
 * nome. Uma função chamada `usaLanternaViva` que chama `useContext` é vista
 * como função comum chamando hook — que é erro de lint — e, pior, o corpo
 * deixa de ser checado. O nome público continua em português.
 */
function useLanternaViva(): Viva {
  return useContext(ContextoViva);
}

export { useLanternaViva as usaLanternaViva };

/**
 * O cursor vira lanterna: este elemento carrega `--lanterna-x` /
 * `--lanterna-y`, e quem quiser ser iluminado é renderizado dentro dele e usa
 * essas variáveis na própria máscara (custom properties herdam) — ou lê a
 * posição em número por `usaLanternaViva`, que é o que a malha em canvas faz.
 *
 * Por que um elemento e não `:root`: escrever no documento inteiro faria duas
 * lanternas na mesma página brigarem pelas mesmas variáveis, e amarraria as
 * coordenadas à viewport. Aqui o sistema de coordenadas é a caixa deste
 * elemento.
 *
 * Em ponteiro grosso o hook não registra listener nenhum e nenhum quadro é
 * agendado: `viva.ativa` fica `false` para sempre, e a malha desenha só a
 * textura e a cintilação.
 */
export default function Lanterna({ children }: { children?: ReactNode }) {
  const { ref, ativa, viva } = useLanterna();

  return (
    <div
      ref={ref}
      data-lanterna
      data-ativa={String(ativa)}
      aria-hidden="true"
      className={estilos.lanterna}
    >
      <ContextoViva.Provider value={viva}>{children}</ContextoViva.Provider>
    </div>
  );
}
```

- [ ] **Step 4: Escrever o CSS da malha**

Crie `components/Malha.module.css`:

```css
/* A família fica AQUI, e não numa string dentro do JS, de propósito: o
   componente lê `getComputedStyle(canvas).fontFamily` e entrega o resultado ao
   `ctx.font`. Assim o fallback é resolvido pelo navegador — The Seasons quando
   chegar, Fraunces enquanto não chegar — e nenhum nome de fonte fica repetido
   em dois lugares que podem divergir. */
.canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  font-family: "The Seasons", var(--fonte-display), Georgia, serif;
}
```

- [ ] **Step 5: Escrever o componente**

Crie `components/Malha.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import {
  PARAMETROS,
  brilhoDaCelula,
  devePular,
  ganho,
  hexParaRgb,
  misturar,
  montarGrade,
  semearCelulas,
  type Celulas,
  type Grade,
} from "@/lib/malha";
// Alias obrigatório, não estilo — mesma regra do resto do repo: a checagem
// react-hooks só reconhece hook pelo prefixo `use` no ponto da chamada.
import { usaLanternaViva as useLanternaViva } from "./Lanterna";
import estilos from "./Malha.module.css";

const PARADA = { x: 0, y: 0, escala: 1, ativa: false } as const;

function consulta(pergunta: string): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia(pergunta).matches;
}

/** Lê um comprimento de custom property, uma vez. Nunca dentro do quadro. */
function lerPx(elemento: Element, nome: string, padrao: number): number {
  const bruto = getComputedStyle(elemento).getPropertyValue(nome).trim();
  const n = Number.parseFloat(bruto);
  return Number.isFinite(n) && n > 0 ? n : padrao;
}

/** Lê uma cor hexadecimal de custom property. Só aceita #rrggbb. */
function lerCor(elemento: Element, nome: string, padrao: string): string {
  const bruto = getComputedStyle(elemento).getPropertyValue(nome).trim();
  return /^#[0-9a-f]{6}$/i.test(bruto) ? bruto : padrao;
}

/**
 * A malha viva: a trama de "2" e "0" que é o papel de parede da marca.
 *
 * Duas camadas, como na versão em DOM que isto substitui:
 *
 *   base    — desenhada UMA vez por mudança de tamanho ou chegada de fonte,
 *             guardada num canvas fora da tela. É a trama apagada.
 *   acesos  — a cada quadro, copia a base e repinta por cima só as células
 *             acima do limiar. É o que segura o custo: quase sempre são poucas.
 *
 * O laço daqui é INDEPENDENTE do laço da lanterna. O da lanterna dorme quando a
 * luz assenta (economia deliberada, ver lib/usaLanterna.ts); a cintilação não
 * pode dormir. Esta malha nunca acorda a lanterna — só lê o ref dela, que
 * guarda a última posição mesmo enquanto ela dorme.
 */
export default function Malha() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viva = useLanternaViva();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    // O jsdom não implementa contexto 2d. Sem contexto não há o que desenhar, e
    // estourar aqui derrubaria a suíte inteira de testes de componente.
    if (!ctx) return;

    const caixa = canvas.parentElement ?? canvas;
    const cintila = !consulta("(prefers-reduced-motion: reduce)");
    const grosso = consulta("(pointer: coarse)");
    // Sem cintilação também não há rastro: a célula apaga no quadro em que a
    // luz sai. É o que "reduzir movimento" quer dizer aqui.
    const decaimento = cintila ? PARAMETROS.decaimento : 0;

    const corRepouso = hexParaRgb(
      lerCor(caixa, "--padrao-repouso", PARAMETROS.corRepouso)
    );
    const corLuz = hexParaRgb(lerCor(caixa, "--verde-codigo", "#28d305"));
    const corLuzCss = `${corLuz[0]},${corLuz[1]},${corLuz[2]}`;

    let grade: Grade = { colunas: 0, linhas: 0, total: 0 };
    let celulas: Celulas = semearCelulas(0);
    let base: HTMLCanvasElement | null = null;
    let larguraChar = 0;
    let alturaLinha = 0;
    let larguraCss = 0;
    let alturaCss = 0;
    let fonte = "";
    let raio = 300;
    let quadroId = 0;
    let alternado = false;
    let precisaDesenhar = true;
    let ultima = { ...PARADA };

    const construir = () => {
      const r = caixa.getBoundingClientRect();
      larguraCss = r.width;
      alturaCss = r.height;
      if (!(larguraCss > 0) || !(alturaCss > 0)) return;

      const dpr = Math.min(window.devicePixelRatio || 1, PARAMETROS.dprMaximo);
      canvas.width = Math.round(larguraCss * dpr);
      canvas.height = Math.round(alturaCss * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // A família vem do CSS Module — ver o comentário em Malha.module.css.
      const familia = getComputedStyle(canvas).fontFamily || "Georgia, serif";
      fonte = `400 ${PARAMETROS.tamanhoFonte}px ${familia}`;
      ctx.font = fonte;

      const tracking = PARAMETROS.trackingRelativo * PARAMETROS.tamanhoFonte;
      larguraChar = ctx.measureText("0").width + tracking;
      alturaLinha = PARAMETROS.tamanhoFonte * PARAMETROS.alturaLinhaRelativa;
      raio = lerPx(caixa, "--raio-lanterna", 300);

      grade = montarGrade({ larguraCss, alturaCss, larguraChar, alturaLinha });
      celulas = semearCelulas(grade.total);

      base = document.createElement("canvas");
      base.width = canvas.width;
      base.height = canvas.height;
      const bctx = base.getContext("2d");
      if (!bctx) {
        base = null;
        return;
      }
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bctx.font = fonte;
      bctx.textBaseline = "alphabetic";
      // Fundo transparente de propósito: quem pinta o preto é o --preto-202 da
      // página, e assim o token continua sendo a fonte única daquela cor.
      bctx.fillStyle = PARAMETROS.corRepouso;
      for (let l = 0; l < grade.linhas; l++) {
        const y = PARAMETROS.padY + l * alturaLinha + PARAMETROS.tamanhoFonte;
        for (let c = 0; c < grade.colunas; c++) {
          const i = l * grade.colunas + c;
          bctx.fillText(celulas.chars[i] ? "0" : "2", PARAMETROS.padX + c * larguraChar, y);
        }
      }

      precisaDesenhar = true;
    };

    const desenhar = (t: number) => {
      if (!base || grade.total === 0) return;
      const tempo = t * 0.001;
      const luz = viva?.current ?? PARADA;
      const temLuz = luz.ativa;
      const raioEfetivo = raio * luz.escala;
      const raio2 = raioEfetivo * raioEfetivo;

      ctx.clearRect(0, 0, larguraCss, alturaCss);
      ctx.drawImage(base, 0, 0, larguraCss, alturaCss);
      ctx.font = fonte;
      ctx.textBaseline = "alphabetic";

      for (let l = 0; l < grade.linhas; l++) {
        const y = PARAMETROS.padY + l * alturaLinha + PARAMETROS.tamanhoFonte;
        // O centro ótico do caractere fica acima da linha de base.
        const cy = y - PARAMETROS.tamanhoFonte * 0.35;
        for (let c = 0; c < grade.colunas; c++) {
          const i = l * grade.colunas + c;
          const x = PARAMETROS.padX + c * larguraChar;
          const dx = x - luz.x;
          const dy = cy - luz.y;

          const v = brilhoDaCelula({
            anterior: celulas.brilhos[i],
            fator: celulas.fatores[i],
            fase: celulas.fases[i],
            tempo,
            distancia2: dx * dx + dy * dy,
            raio2,
            temLuz,
            cintila,
            decaimento,
          });
          celulas.brilhos[i] = v;
          if (v < PARAMETROS.limiarAceso) continue;

          const g = ganho(v);
          const [rr, gg, bb] = misturar(corRepouso, corLuz, g);
          ctx.fillStyle = `rgb(${rr},${gg},${bb})`;
          if (g > PARAMETROS.limiarHalo) {
            ctx.shadowColor = `rgba(${corLuzCss},${(g * PARAMETROS.opacidadeHalo).toFixed(3)})`;
            ctx.shadowBlur = g * PARAMETROS.haloMaximo;
          } else {
            ctx.shadowBlur = 0;
          }
          ctx.fillText(celulas.chars[i] ? "0" : "2", x, y);
        }
      }
      ctx.shadowBlur = 0;
    };

    const quadro = (t: number) => {
      quadroId = requestAnimationFrame(quadro);

      // Ponteiro grosso: metade dos quadros. A respiração usa sin(t * 0.8) —
      // lenta o bastante para 30 quadros por segundo serem indistinguíveis de
      // 60, e o celular é justamente quem tem menos bateria para gastar.
      if (grosso) {
        alternado = !alternado;
        if (alternado) return;
      }

      const luz = viva?.current ?? PARADA;
      const mudou =
        luz.x !== ultima.x ||
        luz.y !== ultima.y ||
        luz.escala !== ultima.escala ||
        luz.ativa !== ultima.ativa;

      if (devePular({ cintila, mudou, precisaDesenhar })) return;

      ultima = { x: luz.x, y: luz.y, escala: luz.escala, ativa: luz.ativa };
      precisaDesenhar = false;
      desenhar(t);
    };

    const acordar = () => {
      if (quadroId === 0) quadroId = requestAnimationFrame(quadro);
    };

    const dormir = () => {
      if (quadroId !== 0) {
        cancelAnimationFrame(quadroId);
        quadroId = 0;
      }
    };

    const aoTrocarVisibilidade = () => {
      if (document.visibilityState === "hidden") {
        dormir();
      } else {
        precisaDesenhar = true;
        acordar();
      }
    };

    construir();
    acordar();

    const observador =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(() => construir())
        : null;
    observador?.observe(caixa);

    document.addEventListener("visibilitychange", aoTrocarVisibilidade);

    // A métrica muda quando a The Seasons chega: sem remontar a base, a trama
    // fica desenhada com a largura da Fraunces e some o alinhamento.
    if (typeof document !== "undefined" && document.fonts?.load) {
      document.fonts
        .load(`400 ${PARAMETROS.tamanhoFonte}px "The Seasons"`)
        .then(() => construir())
        .catch(() => {});
    }

    return () => {
      dormir();
      observador?.disconnect();
      document.removeEventListener("visibilitychange", aoTrocarVisibilidade);
    };
  }, [viva]);

  return <canvas ref={canvasRef} aria-hidden="true" className={estilos.canvas} />;
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npm test -- components/Malha.test.tsx components/Lanterna.test.tsx && npx tsc --noEmit && npm run lint`
Expected: PASS, **incluindo `Lanterna.test.tsx` sem nenhuma alteração**. Um `Context.Provider` não renderiza elemento no DOM, então o seletor do teste "mostra o que for colocado dentro dela" (`[data-lanterna] [data-testid='malha']`) continua casando. Se esse teste quebrar, o erro está no componente — não conserte o teste.

- [ ] **Step 7: Commit**

```bash
git add components/Malha.tsx components/Malha.module.css components/Malha.test.tsx components/Lanterna.tsx components/Lanterna.test.tsx
git commit -m "feat: malha em canvas com brilho por caractere e rastro"
```

---

### Task 6: Ligar a malha no fundo e limpar o que morreu

**Files:**
- Modify: `components/Fundo202020.tsx`
- Modify: `components/Fundo202020.module.css`
- Modify: `components/Fundo202020.test.tsx`
- Modify: `app/globals.css` (tokens)

**Interfaces:**
- Consumes: `Malha` da Task 5.
- Produces: a página renderizando a malha nova. A Task 7 verifica no navegador.

- [ ] **Step 1: Trocar o teste do fundo**

Substitua `components/Fundo202020.test.tsx` por:

```tsx
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Fundo202020 from "./Fundo202020";

describe("Fundo202020", () => {
  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("é escondido de leitores de tela", () => {
    const { container } = render(<Fundo202020 />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("põe a malha dentro da lanterna, para ela receber a posição viva", () => {
    const { container } = render(<Fundo202020 />);
    const lanterna = container.querySelector("[data-lanterna]");
    expect(lanterna).not.toBeNull();
    expect(lanterna!.querySelector("canvas")).not.toBeNull();
  });

  it("tem a vinheta, e ela não intercepta o mouse", () => {
    const { container } = render(<Fundo202020 />);
    expect(container.querySelector("[data-vinheta]")).not.toBeNull();
  });

  it("não desenha mais a malha como texto no DOM", () => {
    const { container } = render(<Fundo202020 />);
    expect(container.textContent).toBe("");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- components/Fundo202020.test.tsx`
Expected: FAIL — não há canvas, e `textContent` ainda tem os milhares de "202".

- [ ] **Step 3: Trocar o componente**

Substitua `components/Fundo202020.tsx` por:

```tsx
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
```

- [ ] **Step 4: Trocar o CSS do fundo**

Em `components/Fundo202020.module.css`, apague os blocos `.base, .luz`, `.base`, `.luz` e o `@media (pointer: coarse)` inteiro. Mantenha `.fundo` como está e acrescente:

```css
/* A vinheta da referência: some no meio, fecha nos cantos. `pointer-events`
   nenhum porque ela cobre a tela toda e o CONTATO precisa continuar clicável. */
.vinheta {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(
    120% 120% at 50% 45%,
    transparent 55%,
    rgba(0, 0, 0, 0.55) 100%
  );
}
```

- [ ] **Step 5: Acertar os tokens**

Em `app/globals.css`, dentro do `:root`:

- Troque o valor e o comentário do verde:

```css
  /* Verde de fósforo de terminal antigo. NÃO é cor de marca e não deve virar
     uma: o Verde Sinal (--verde-sinal, #c6ff3e) puxa para o amarelo-limão e
     não lê como código. Só existe debaixo da lanterna.
     31/07/2026 — passou de #39ff14 para #28d305 por decisão do Lucas, para
     bater com o efeito de referência. Não é alguém "corrigindo" a exceção do
     fundador de volta ao verde da marca; é troca deliberada. */
  --verde-codigo: #28d305;
```

- Substitua o bloco de `--padrao-base` / `--padrao-luz` por um token só:

```css
  /* A trama apagada, sobre o preto. Quem pinta agora é o canvas
     (components/Malha.tsx), que lê este valor uma vez por montagem. */
  --padrao-repouso: #171717;
```

- Troque o raio:

```css
  /* Em px, e não em rem: o efeito inteiro é medido em pixels (a malha tem
     corpo fixo de 18px), e uma ponta em rem faria o raio dessincronizar da
     trama se o visitante mudasse o tamanho de fonte do navegador. */
  --raio-lanterna: 300px;
```

- Apague `--padrao-202020` por inteiro. Ele existia só para o fallback de
  ponteiro grosso, que sumiu quando o celular passou a receber a mesma trama.

- **Mantenha** `--lanterna-x`, `--lanterna-y` e `--escala-lanterna`, mesmo que
  nenhum CSS as leia mais. Elas são o contrato público do hook: `usaLanterna`
  escreve nas três, `components/Lanterna.test.tsx` afirma os valores, e a
  declaração no `:root` é o que documenta a posição de repouso (`50% 50%`, antes
  do primeiro movimento). Apagá-las quebraria o teste e apagaria a documentação.

- [ ] **Step 6: Caçar referências mortas**

Run: `grep -rn "padrao-base\|padrao-luz\|padrao-202020\|coordenadas" --include=*.css --include=*.ts --include=*.tsx . | grep -v node_modules`
Expected: nenhuma linha. Se aparecer alguma, apague-a — é resíduo.

Run: `grep -rn "lanterna-x\|escala-lanterna" --include=*.css --include=*.ts --include=*.tsx . | grep -v node_modules`
Expected: aparecem em `lib/usaLanterna.ts` (quem escreve), em `app/globals.css` (as declarações de repouso) e em `components/Lanterna.test.tsx` (quem afirma). Nenhum outro CSS as lê — e está certo assim. Não apague nenhuma das três.

Há ainda um comentário desatualizado a corrigir: `components/Lanterna.test.tsx`, por volta da linha 100, diz que "o raio da máscara é --raio-lanterna vezes esta variável (ver Fundo202020.module.css)". A máscara não existe mais. Troque a referência para `components/Malha.tsx`, que é quem passou a multiplicar o raio pela escala. O teste em si continua válido e não muda.

- [ ] **Step 7: Rodar tudo**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS nos três.

- [ ] **Step 8: Commit**

```bash
git add components/Fundo202020.tsx components/Fundo202020.module.css components/Fundo202020.test.tsx app/globals.css
git commit -m "feat: liga a malha em canvas no fundo da pagina"
```

---

### Task 7: Verificar no navegador de verdade

**Files:**
- Modify: `e2e/layout.spec.ts`

**Interfaces:**
- Consumes: a página inteira, montada.
- Produces: nada de código. Produz a evidência de que está funcionando.

- [ ] **Step 1: Acrescentar o teste e2e**

Em `e2e/layout.spec.ts`, acrescente um bloco novo (não mexa nos existentes):

```ts
test.describe("a malha viva", () => {
  test("cobre a viewport e não deixa coordenada para trás", async ({ page }) => {
    await page.goto("/");
    const canvas = page.locator("[data-lanterna] canvas");
    await expect(canvas).toHaveCount(1);

    const caixa = await canvas.boundingBox();
    const viewport = page.viewportSize()!;
    expect(caixa!.width).toBeGreaterThanOrEqual(viewport.width - 1);
    expect(caixa!.height).toBeGreaterThanOrEqual(viewport.height - 1);

    await expect(page.getByText(/23°12'37"S/)).toHaveCount(0);
    await expect(page.getByText(/SÃO JOSÉ DOS CAMPOS/)).toHaveCount(0);
  });

  test("a trama é visível antes de qualquer movimento de mouse", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(2500); // a entrada termina em 2000ms
    const canvas = page.locator("[data-lanterna] canvas");
    // Um pixel qualquer fora do centro precisa estar acima do preto puro: é o
    // que separa "textura visível" de "fundo liso", que é o ponto da mudança.
    const claro = await canvas.evaluate((el: HTMLCanvasElement) => {
      const ctx = el.getContext("2d")!;
      const d = ctx.getImageData(0, 0, el.width, Math.min(200, el.height)).data;
      let maximo = 0;
      for (let i = 0; i < d.length; i += 4) maximo = Math.max(maximo, d[i + 1]);
      return maximo;
    });
    expect(claro).toBeGreaterThan(8);
  });
});

test.describe("com movimento reduzido", () => {
  test.use({ reducedMotion: "reduce" });

  test("a trama continua visível e nada quebra", async ({ page }) => {
    const erros: string[] = [];
    page.on("pageerror", (e) => erros.push(e.message));

    await page.goto("/");
    await page.waitForTimeout(500); // sem animação de entrada, não há o que esperar

    const canvas = page.locator("[data-lanterna] canvas");
    await expect(canvas).toHaveCount(1);

    const claro = await canvas.evaluate((el: HTMLCanvasElement) => {
      const ctx = el.getContext("2d")!;
      const d = ctx.getImageData(0, 0, el.width, Math.min(200, el.height)).data;
      let maximo = 0;
      for (let i = 0; i < d.length; i += 4) maximo = Math.max(maximo, d[i + 1]);
      return maximo;
    });
    expect(claro).toBeGreaterThan(8);
    expect(erros).toEqual([]);
  });
});
```

Este é o **único** lugar onde a preferência por menos movimento é verificável de ponta a ponta: no jsdom não há contexto 2d, então o laço de desenho nunca roda lá. A regra de pular quadro em si já tem teste unitário — é `devePular`, na Task 2.

- [ ] **Step 2: Rodar o e2e**

Run: `npm run test:e2e`
Expected: PASS. Se o segundo teste falhar com `claro` baixo, a trama não está sendo desenhada — investigue antes de seguir; é exatamente o defeito que este teste existe para pegar.

- [ ] **Step 3: Subir e olhar**

Run: `npm run dev` em segundo plano.

Abra `http://localhost:3000` e confira, com os próprios olhos, na ordem:

1. A trama de "20" é visível na tela toda, parada, sem mouse em cima.
2. Ela respira — dá para ver caracteres pulsando fora de sincronia.
3. Movendo o mouse, caracteres acendem em verde com intensidades diferentes.
4. Ao parar o mouse, o rastro apaga atrás dele.
5. A luz gruda no `CONTATO`, no `PT / EN` e na frase, e cresce ao grudar.
6. Recarregando: a malha abre do centro, depois a logo, depois o ponto.
7. Console sem erro.

- [ ] **Step 4: Capturar a evidência**

Tire um screenshot com o cursor parado sobre a frase (para o ímã aparecer capturado) e outro com o cursor no meio da tela. Guarde-os para mostrar ao Lucas.

- [ ] **Step 5: Commit**

```bash
git add e2e/layout.spec.ts
git commit -m "test: e2e da malha viva e da ausencia das coordenadas"
```

---

## Verificação final

Antes de declarar pronto:

```bash
npm test && npx tsc --noEmit && npm run lint && npm run build && npm run test:e2e
```

Os cinco precisam passar. `npm run build` está na lista porque a Task 12 do plano anterior existiu justamente para zerar dívida de lint e tsc — não é para reabri-la aqui.

**O que nenhum destes comandos responde:** se ficou bonito, se a serifada embolou em 18px, se a cintilação incomoda. Isso é o Lucas olhando. Se a trama virar sujeira, o conserto é `PARAMETROS.tamanhoFonte` e `PARAMETROS.trackingRelativo` em `lib/malha.ts` — e, se nem isso resolver, trocar a família em `components/Malha.module.css`, que é uma linha.
