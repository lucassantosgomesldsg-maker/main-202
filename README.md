# 202lab-site

A main page da 202Lab — **uma tela, sem scroll**, em português e inglês.
Em produção: https://202lab.com.br

Uma página só: o wordmark `202` gigante no centro, sobre uma malha `202020`
quase engolida pelo preto. O cursor é uma lanterna que acende a malha em verde
de terminal e **gruda** nos alvos da página. Na primeira visita da sessão a
malha abre e a logo entra; num reload a entrada é pulada.

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
npm test           # 103 testes de lógica e componentes (Vitest + jsdom)
npm run test:e2e   # 49 testes de layout e interação num Chromium real (Playwright)
npm run build      # build de produção
```

`npm run test:e2e` sobe o site sozinho (`next build && next start`) antes de
rodar — não é preciso deixar o dev server de pé.

### A regra dura

**A página nunca rola, em nenhum viewport.** `e2e/layout.spec.ts` trava isso
em 5 viewports × 2 idiomas × 2 estados de animação, e verifica duas coisas
diferentes que é fácil confundir:

- `esperaSemScroll` — o conteúdo cabe na viewport e o documento não rola.
  Mede `document.body.scrollHeight/scrollWidth` e tenta rolar de verdade
  (`scrollTo` + `scrollY`). **Não** use `documentElement.scrollHeight` aqui:
  com `html, body { overflow: hidden }` ele fica preso ao `clientHeight` e a
  asserção passa a valer nada — foi exatamente esse o defeito da versão
  anterior deste teste.
- `esperaNadaCortado` — nenhum dos quatro cantos vaza para fora da tela.

Quem impede o scroll é `html, body { overflow: hidden }` em `app/globals.css`.
O `overflow: hidden` do `.palco` só evita vazamento **visual**, e nada na
suíte cobre isso.

## Onde mexer

| O quê | Onde |
| --- | --- |
| Qualquer texto de marca | `lib/copy.ts` — **única** fonte; é copy aprovada, verbatim |
| Cor, espaçamento, tipografia | bloco `:root` no topo de `app/globals.css` |
| Animação de entrada | `components/motion/` (`MotionD.tsx` + `.module.css`) |
| Física da lanterna e do ímã | `lib/usaLanterna.ts` (testada sem navegador) |
| Quem a lanterna agarra | atributo `data-ima` no JSX de `app/page.tsx` |
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
