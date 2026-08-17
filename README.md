# 202lab-site

O site da 202Lab, em português e inglês. Em produção: https://202lab.com.br

Duas páginas, com regras opostas de propósito:

| Rota | O que é | Rola? |
| --- | --- | --- |
| `/` | A main page — **uma tela, sem scroll** | Nunca |
| `/tese` | **A Tese** — dez telas de argumento, com instrumento por seção | Sim |

As duas são ligadas nos dois sentidos: `A TESE` no topo da home, ao lado do
`CONTATO`, e o wordmark `202` no topo da tese de volta para `/`. O idioma
atravessa junto — é a mesma chave de `localStorage`, lida por
`lib/usaIdioma.ts`.

## A main page (`/`)

Uma página só: o wordmark `202` gigante no centro, sobre uma malha `202020`
quase engolida pelo preto. O cursor é uma lanterna que acende a malha em verde
de terminal e **gruda** nos alvos da página. Na primeira visita da sessão a
entrada toca em quatro batidas — a logo cresce girando o `0`, o ponto verde
pulsa ao assentar, `PT/EN` e `CONTATO ↗` entram pelas laterais da tela e a
frase do rodapé se digita sozinha, caractere a caractere — e num reload dentro
da mesma sessão ela é pulada. Trocar `PT/EN` com a página pronta apaga a frase
de trás para frente, com o cursor recuando, e a reescreve na outra língua.

## A Tese (`/tese`)

A página de **posicionamento**: o que a 202 acredita e o que isso obriga a
construir. Não conta história, não apresenta o time, não mostra número de
tração. Dez seções de tela cheia; cinco carregam o desenho que sustenta a afirmação — a
linha do tempo dos 18 meses contra os 48 do diploma, a curva contínua contra a
escada do currículo, o razão das cinco frentes. As outras cinco são texto puro:
três de propósito e duas esperando (ver §4 da spec).

Reaproveita o fundo vivo da home inteiro, sem alteração: o custo por quadro é o
mesmo, porque o canvas mede a tela e não o comprimento da página. A lateral
esquerda é uma **régua** — instrumento de medida, não barra de progresso — que
acompanha a leitura e navega.

O movimento tem duas mãos, e a divisão importa. **O texto** é dirigido pelo
scroll (`animation-timeline: view()`), sem JavaScript. **Os instrumentos tocam
no tempo**, disparados por `lib/usaTocarAoVer.ts` quando aparecem na tela: um
desenho dirigido pela roda do mouse pode ser parado no meio, e um gráfico
parado no meio é lido como resultado. O porquê inteiro está na §6.1 da spec.

Especificação: `docs/superpowers/specs/2026-08-17-a-tese-design.md`.

## Rodar local

```powershell
npm install
npm run dev
```

Abre em http://localhost:3000.

## Testes

```powershell
npm run lint       # ESLint (regras do next/core-web-vitals + TS)
npx tsc --noEmit   # tipos
npm test           # 184 testes de lógica e componentes (Vitest + jsdom)
npm run test:e2e   # 98 testes num Chromium real (Playwright) — 68 da home, 30 da tese
npm run build      # build de produção
```

`npm run test:e2e` sobe o site sozinho (`next build && next start`) antes de
rodar — não é preciso deixar o dev server de pé.

### A regra dura

**A home nunca rola, em nenhum viewport.** (A `/tese` rola — é a página oposta,
e `e2e/tese.spec.ts` mede os dois lados do interruptor na mesma corrida.)
`e2e/layout.spec.ts` trava a home em 5 viewports × 2 idiomas × 2 estados de
animação, e verifica duas coisas diferentes que é fácil confundir:

- `esperaSemScroll` — o conteúdo cabe na viewport e o documento não rola.
  Mede `document.body.scrollHeight/scrollWidth` e tenta rolar de verdade
  (`scrollTo` + `scrollY`). **Não** use `documentElement.scrollHeight` aqui:
  com `html, body { overflow: hidden }` ele fica preso ao `clientHeight` e a
  asserção passa a valer nada — foi exatamente esse o defeito da versão
  anterior deste teste.
- `esperaNadaCortado` — nenhum dos quatro cantos vaza para fora da tela.

Quem impede o scroll é `html:has(.tela), body:has(.tela) { overflow: hidden }`
em `app/globals.css` — `.tela` é desenhado só pela home. O seletor pergunta
"esta página é a home?" antes de aplicar a regra; sem essa pergunta, a `/tese`
ficaria ilegível abaixo da primeira dobra. O `overflow: hidden` do `.palco` só
evita vazamento **visual**, e nada na suíte cobre isso.

## Onde mexer

| O quê | Onde |
| --- | --- |
| Texto de marca da home | `lib/copy.ts` — **única** fonte; é copy aprovada, verbatim |
| Escolha de idioma (as duas páginas) | `lib/usaIdioma.ts` — uma chave de `localStorage`, uma regra |
| Texto da /tese | `lib/tese.ts` — as dez seções e os instrumentos, PT e EN |
| Cor, espaçamento, tipografia | bloco `:root` no topo de `app/globals.css` |
| Animação de entrada | `lib/abertura.ts` (tempos), `app/abertura.module.css` (coreografia do topo e da logo), `components/FraseDigitada.*` (digitação do rodapé) |
| Física da lanterna e do ímã | `lib/usaLanterna.ts` (testada sem navegador) |
| Quem a lanterna agarra | atributo `data-ima` no JSX de `app/page.tsx` (na /tese, só no cabeçalho fixo — ver abaixo) |
| Desenhos da /tese | `components/tese/Instrumentos.tsx` + a folha compartilhada ao lado |
| Régua lateral da /tese | `components/tese/Regua.tsx`, `lib/usaSecaoAtiva.ts` |
| Quando um instrumento toca | `lib/usaTocarAoVer.ts` (escreve `data-toque`); a coreografia é CSS |
| Ícones (favicon, apple-touch) | `node scripts/gerar-icones.mjs` — não edite os gerados à mão |
| Imagem de link preview | `app/opengraph-image.tsx` |

### Detalhes que economizam tempo

- **Hooks com nome em português** (`usaLanterna`, `usaMotionUmaVez`) são
  importados com alias `use*` (`import { usaLanterna as useLanterna }`). Isso
  não é enfeite: a regra `react-hooks/rules-of-hooks` só reconhece um hook
  pelo nome **no ponto da chamada**, e sem o alias uma chamada condicional
  passa lint, tsc e build e só quebra no navegador. Mantenha o alias.
- **O `<title>` mora em `app/page.tsx`**, não no `metadata` do layout — ele
  troca com o idioma sem reload. `app/layout.tsx` explica por que declarar
  `title` lá volta a prender a aba no português.
- **Os glifos da logo** são vetor em `lib/logo-paths.ts`, gerado por
  `scripts/extrair-logo.mjs`. A fonte do wordmark (The Seasons) nunca foi
  embarcada — por isso o logo é sempre path, nunca texto, inclusive no card
  de compartilhamento.
- **`assets/Fraunces-Light.woff`** existe só para o `opengraph-image`: o
  satori não lê o `.woff2` que o `next/font/google` baixa, nem a versão
  variável da Fraunces.
- **Na /tese os ímãs da lanterna ficam só no cabeçalho fixo.** Não é limitação:
  `lib/usaLanterna.ts` já remede em `scroll` (linha 587) e funcionaria em
  qualquer elemento. É decisão de leitura — luz grudando em texto corrido
  atrapalha quem está lendo dez telas de argumento.
- **`stroke-dasharray` não convive com `vector-effect: non-scaling-stroke`.**
  Com os dois juntos o Chrome mede o tracejado em pixels de tela e ignora o
  `pathLength`, então a curva fica cortada **para sempre**, não só durante a
  animação. Já custou o gráfico do descompasso inteiro. Para desenhar uma curva
  progressivamente num SVG esticado, use recorte (`clipPath` com um `rect` que
  varre) — ver §6.2 da spec.
- **Chromium headless costuma dizer `prefers-reduced-motion: reduce`.** Nesse
  estado o bloco global de `globals.css` esmaga toda duração para 1µs: o
  desenho salta para o fim e parece que nada anima. Confirme com
  `matchMedia("(prefers-reduced-motion: reduce)").matches` antes de concluir
  qualquer coisa sobre movimento num navegador automatizado.
- **`scroll-behavior: smooth` vale para QUALQUER rolagem programática**, não só
  para os cliques na régua. Testes que leem `window.scrollY` logo depois de um
  `scrollTo` precisam passar `behavior: "instant"` — sem isso medem a página
  parada e concluem que ela não rola. Já custou um teste vermelho.

## De onde vem o design

Sistema de identidade em `design.md` no repo da trilha (`matheus-fondello/202`).
Os tokens e a logo foram **copiados** de lá, não importados — os dois projetos
são independentes de propósito.

Especificação desta página:
`docs/superpowers/specs/2026-07-28-main-page-202-design.md`
Plano de execução: `docs/superpowers/plans/2026-07-28-main-page-202.md`

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · CSS Modules +
uma folha global de tokens · Vitest · Playwright. Sem dependências de runtime
além de `next`, `react` e `react-dom`.
