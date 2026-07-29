# Main page da 202 — Design

> Especificação da página principal de `202lab.com.br`.
> Escrita em 28/07/2026, a partir de entrevista com o Lucas.
> Fonte da verdade visual: `design.md` e `design_system/tokens.css` do repo da trilha
> (`C:\Users\Lucas\202`). Este documento não substitui o `design.md` — ele o aplica.

---

## 1. O que estamos construindo

Uma **página única, de uma tela só, sem scroll**, que é o cartão de visita da 202Lab.

Objetivo: quem chega em `202lab.com.br` entende em três segundos que a 202 é séria,
premium e brasileira — e tem um único caminho para falar com a gente.

**Não é** um site institucional. Não tem "sobre nós", "cases", "carreiras" nem blog.
A referência de escopo é a Long Lake: abre, é aquilo, acabou.

### Critérios de sucesso

1. A página cabe em uma tela, em qualquer resolução, sem barra de rolagem.
2. A logo entra com movimento — a página não "aparece pronta".
3. Um visitante consegue chegar ao Instagram da 202 em um clique.
4. A página é reconhecível como 202 sem precisar ler o nome por extenso.
5. Carrega e fica utilizável em menos de 1 segundo em conexão 4G.

---

## 2. Decisões fechadas com o Lucas

| Ponto | Decisão | Alternativas descartadas |
|---|---|---|
| Escopo | Só o hero, uma tela, sem scroll | Hero + blocos; hero + seção de contato |
| Logo do centro | `202` sozinho, sem "Lab" | `202Lab.` completo; logo pequena no topo-esquerdo |
| Motion da logo | **Em aberto por decisão** — 3 protótipos serão construídos e o Lucas escolhe vendo | — |
| Fundo | Preto `#0A0A0A` + padrão `202020` sutil | Preto liso; `202` gigante em dot-matrix |
| Contato | Link para `https://www.instagram.com/202lab.br/`, aba nova | mailto; WhatsApp; formulário; agendamento |
| Canto inferior direito | Coordenadas **do ITA** + `SÃO JOSÉ DOS CAMPOS, BR` | Quarto 202 / EST. 2026; os dois; vazio |
| Idioma | Bilíngue PT / EN com seletor | Só português |
| Oneliner EN | "We amplify talent. We build the future." | "We empower talent and build the future."; "Powering talent, building the future." |
| Stack | Next.js + Vercel, repo novo `202lab-site` | HTML estático puro; dentro do repo da trilha |
| Domínio | `202lab.com.br` | `202lab.com` |
| Analytics | **Não incluído.** Nenhum rastreamento, nenhum cookie. | Plausible/GA — o Lucas não pediu; adicionar depois é trivial |

---

## 3. Layout

Quatro cantos ocupados, centro livre para a logo. É a composição construtiva do
`design.md` §5 — nada flutua no meio do nada.

```
┌────────────────────────────────────────────────────┐
│  PT / EN                                CONTATO ↗  │
│                                                    │
│                                                    │
│                      2 0 2 ●                       │
│                 (entra com motion)                 │
│                                                    │
│                                                    │
│  Potencializamos talentos e                        │
│  construímos o futuro.       23°12'37"S 45°52'35"W │
│                              SÃO JOSÉ DOS CAMPOS,BR│
└────────────────────────────────────────────────────┘
```

### Elementos, um a um

| # | Elemento | Posição | Conteúdo | Tipografia |
|---|---|---|---|---|
| 1 | Seletor de idioma | topo-esquerdo | `PT / EN` | mono 12px, uppercase, tracking `0.1em` |
| 2 | Contato | topo-direito | `CONTATO ↗` / `CONTACT ↗` | mono 12px, uppercase, tracking `0.1em` |
| 3 | Logo | centro | SVG `202_Branco.svg` + ponto verde | vetor, não texto |
| 4 | Oneliner | inferior-esquerdo | ver §4 | Fraunces 300, `clamp(1.5rem, 2.6vw, 2.4rem)` |
| 5 | Coordenadas | inferior-direito | duas linhas, alinhadas à direita | mono 12px, uppercase, tracking `0.1em` |

**Margens:** `3rem` no desktop, `1.5rem` abaixo de 720px — igual à prova
`01_hero_site.html` do design system.

**Largura da logo:** `clamp(11rem, 34vw, 30rem)`. Grande o suficiente para dominar,
com folga vertical mínima de `12vh` acima do oneliner em qualquer viewport.

---

## 4. Conteúdo (copy verbatim)

Estes textos são finais. Não parafrasear.

| Chave | PT | EN |
|---|---|---|
| `oneliner` | Potencializamos talentos e construímos o futuro. | We amplify talent. We build the future. |
| `contato` | CONTATO | CONTACT |
| `coordenadas` | 23°12'37"S  45°52'35"W | *(idêntico)* |
| `local` | SÃO JOSÉ DOS CAMPOS, BR | *(idêntico)* |

**As coordenadas são as do ITA**, não as do centro de São José dos Campos — a origem
real da 202 é o campus. Valor decimal correspondente: `-23.21021, -45.87645`, que é o
nó do ITA no OpenStreetMap.

Ressalva de precisão: fontes públicas divergem em cerca de 500 m sobre "onde é o ITA",
porque o campus é grande. A outra leitura corrente é `-23.2061, -45.8727`
(`23°12'22"S 45°52'22"W`). Adotamos a primeira por ser a mais próxima do valor que já
estava no `design.md` (`23°12'46"S 45°52'34"W`), mantendo coerência com o material de
marca existente. Se o Lucas quiser um ponto específico — o Prédio Principal, o H8, ou
o próprio quarto 202 — basta trocar a string em `copy.ts`.
| `<title>` | 202Lab — Potencializamos talentos e construímos o futuro | 202Lab — We amplify talent. We build the future. |

O oneliner quebra em duas linhas por controle explícito (`max-width` em `ch`), não por
acaso de viewport. No PT a quebra desejada é depois de "e"; no EN, depois do primeiro
ponto final.

---

## 5. Cor e o ponto verde

Tokens importados de `tokens.css` sem alteração:

- Fundo: `--preto-202` `#0A0A0A`
- Padrão `202020` sobreposto: `--padrao-202020` `#141414` (diferença de luminância ~4%)
- Texto principal: `--branco-202` `#FFFFFF`
- Mono-labels e coordenadas: `--cinza-texto` `#8B8B85`
- Acento: `--verde-sinal` `#C6FF3E`

**Regra do ponto verde nesta página:** existe **um único** ponto verde, e ele pertence
à logo (`202●`). O oneliner termina com ponto branco comum.

Justificativa, porque isso desvia do `design.md` §5 (que manda frases-chave terminarem
em verde): numa tela com tão pouco elemento, dois pontos verdes competem entre si. O
verde deve pertencer ao elemento que chega por último na coreografia de entrada — que
é a logo. Decisão aprovada pelo Lucas em 28/07/2026; reverter é uma linha de CSS.

**Proporção resultante:** ~99% preto/branco/cinza, ~1% verde. Dentro da regra de
"verde é acento raro" do `design.md` §3.

---

## 6. O motion da logo

Este é o único ponto deliberadamente em aberto. Serão construídos **três protótipos
completos e funcionais**, apresentados numa página de comparação, e o Lucas escolhe
vendo. O protótipo vencedor vira a página; os outros dois são descartados.

### Restrições comuns aos três

- Duração total entre **1,2s e 1,8s**. Acima disso o visitante sente que o site travou.
- O **ponto verde acende por último**, sempre, como batida final.
- Toca **uma vez por sessão do navegador** (`sessionStorage`). Voltar à página não
  repete a animação.
- Respeita `prefers-reduced-motion: reduce`: a página aparece já montada, estática.
- Nenhuma dependência de biblioteca de animação se CSS/SVG derem conta. Se algum
  protótipo exigir uma lib, isso é registrado explicitamente na comparação como custo.
- Os quatro elementos dos cantos entram em fade suave **depois** da logo, escalonados.

### Os três candidatos

**A — Linhas construtivas.** Hairlines de 1px atravessam a tela na horizontal e na
vertical, se cruzam, e a logo é revelada a partir dessa interseção. O ponto verde acende
no cruzamento. É o elemento gráfico nº3 do `design.md` ("consultoria que constrói") em
movimento.

**B — Revelação vertical por glifo.** Cada um dos três dígitos sobe de trás de uma
máscara, com atraso escalonado entre eles. O efeito clássico de estúdio de branding —
é o que a referência TheFounders faz.

**C — Traço desenhando o contorno.** O contorno do SVG é desenhado como se uma caneta
percorresse o vetor (`stroke-dasharray`/`stroke-dashoffset`), e depois preenche.

### Critério de escolha

O Lucas escolhe por gosto, vendo. Não há critério técnico de desempate — os três serão
entregues em qualidade equivalente.

---

## 7. Bilinguismo

- O seletor `PT / EN` troca o texto **na hora**, sem recarregar a página e sem mudar a
  URL. O idioma ativo aparece em branco; o inativo em `--cinza-texto`.
- A escolha é salva em `localStorage` e restaurada na próxima visita.
- Idioma inicial: **português**, sempre. Não detectamos o idioma do navegador — o
  público-alvo é brasileiro e a detecção automática erra com frequência em VPN.
- O atributo `lang` do `<html>` acompanha a troca.
- Três strings mudam: oneliner, "Contato" e o `<title>` da aba. Coordenadas e local são
  idênticas nos dois idiomas.
- Os textos vivem em um único objeto de dicionário no código, não espalhados pelo HTML.

---

## 8. Arquitetura

Repo novo, **separado** do repo da trilha, para que mexer no site nunca arrisque
derrubar `trilha.202lab.com.br`.

```
202lab-site/
├── app/
│   ├── layout.tsx          metadados, fontes, <html lang>
│   ├── page.tsx            a tela inteira
│   └── globals.css         tokens + estilos da página
├── components/
│   ├── Logo202.tsx         SVG inline + o motion escolhido
│   ├── SeletorIdioma.tsx   PT / EN
│   └── Fundo202020.tsx     o padrão de fundo
├── lib/
│   └── copy.ts             dicionário PT/EN (§4)
├── public/
│   └── 202_Branco.svg      copiado do repo da trilha
└── docs/superpowers/specs/ este documento
```

**Por que cada peça existe:**

- `Logo202` isola a animação. Trocar o motion vencedor por outro não toca em mais nada.
- `SeletorIdioma` isola o estado de idioma. É o único componente com estado na página.
- `Fundo202020` isola a textura, que é puramente decorativa (`aria-hidden`).
- `copy.ts` é o único lugar onde texto de marca existe. Corrigir uma vírgula é uma
  edição, num arquivo, que o Lucas consegue fazer sozinho.

**Ativos copiados do repo da trilha** (`C:\Users\Lucas\202`), sem modificação:

| Origem | Destino | O quê |
|---|---|---|
| `visual_assets/Raw_Images/202_Branco.svg` | `public/202_Branco.svg` | a logo, byte a byte |
| `design_system/tokens.css` | bloco `:root` no topo de `globals.css` | os tokens de cor e tipografia, com os mesmos nomes e os mesmos valores |

Os `@font-face` da The Seasons presentes no `tokens.css` **não** são copiados — aquela
fonte não é usada aqui (ver "Fontes" abaixo). Nenhum valor de cor ou de escala é alterado.

O repo da trilha **não é modificado**. Nada é importado por referência — só copiado,
para que os dois projetos evoluam sem acoplamento.

**Fontes:** Fraunces e IBM Plex Mono via `next/font/google`, self-hosted no build (sem
requisição a servidor do Google em runtime). The Seasons **não é usada** — o `design.md`
§4 restringe ela ao logo, e o logo aqui é SVG.

---

## 9. Responsivo

| Faixa | Comportamento |
|---|---|
| ≥ 1024px | Layout de referência. Quatro cantos, logo centralizada. |
| 720–1023px | Mesmo layout, margens e logo reduzidas proporcionalmente. |
| < 720px | Margens `1.5rem`. Oneliner e coordenadas **empilham**: oneliner acima, coordenadas abaixo, ambos alinhados à esquerda. Seletor e Contato permanecem no topo. |
| Altura < 600px | Logo reduz para `clamp(7rem, 22vh, 14rem)` para garantir que nada seja cortado. |

**Regra dura:** em nenhuma combinação de viewport pode existir scroll. Usar `100dvh`
(não `100vh`) para não brigar com a barra de endereço do Safari no iPhone.

---

## 10. Acessibilidade

- `prefers-reduced-motion: reduce` → página estática, sem nenhuma animação, incluindo
  o pulso do ponto verde.
- Foco de teclado visível: `outline: 1px solid var(--verde-sinal)`, `offset: 4px` —
  igual à prova `01_hero_site.html`.
- A logo SVG tem `role="img"` e `aria-label="202Lab"`.
- Fundo `202020` e qualquer linha construtiva são `aria-hidden="true"`.
- Contraste: branco sobre `#0A0A0A` = 19:1. Cinza `#8B8B85` sobre `#0A0A0A` = 7.4:1.
  Ambos passam AA e AAA para texto normal.
- O link de contato abre em aba nova com `rel="noopener noreferrer"`.
- O seletor de idioma é um `<button>` real, alcançável por teclado — não um `<div>`.

---

## 11. Verificação

Cada fatia termina em algo que o Lucas vê e confere no navegador.

| Fatia | O que ele vê | Como ele confere |
|---|---|---|
| 1. Estrutura estática | A tela completa, sem nenhum motion | Os quatro cantos estão nos lugares certos, o texto está correto, não há scroll |
| 2. Três protótipos de motion | Uma página de comparação com os três lado a lado | Escolhe um por gosto |
| 3. Motion escolhido integrado | A página final rodando | Recarrega: a animação não repete na mesma sessão |
| 4. Bilinguismo | O seletor funcionando | Clica em EN, o texto troca; recarrega, continua em EN |
| 5. Responsivo | A página em celular | Nenhum scroll, nada cortado, nada sobreposto |
| 6. No ar | `202lab.com.br` | Abre no celular dele, fora do wi-fi de casa |

---

## 12. Fragilidades conhecidas

Registradas por honestidade, não como pendências bloqueantes:

1. **O SVG do logo tem o ponto em verde antigo.** O `design.md` §2 registra que o ponto
   do logo atual usa `#3DBE2B` aproximado, e não o Verde Sinal `#C6FF3E`. Nesta página
   o ponto verde será desenhado separadamente com o token correto, então o problema não
   aparece — mas o SVG-fonte continua desatualizado no repo da trilha.
2. **Sem analytics, não saberemos quantas visitas o site recebe.** Foi decisão
   consciente. Adicionar depois é uma linha.
3. **Uma tela sem scroll é frágil em telas muito baixas** (ex.: notebook 1366×768 com
   barra de favoritos). A regra de altura < 600px cobre o caso comum, mas vale conferir
   na verificação, fatia 5.
4. **Next.js para uma página estática é maquinário sobrando hoje.** Foi decisão do
   Lucas por consistência com a trilha e por espaço de crescimento. O custo real é
   manutenção de dependências ao longo do tempo.
5. **`localStorage` para idioma não sobrevive a navegação anônima.** Aceitável: o
   fallback é português, que é o padrão desejado.

---

## 13. Fora de escopo

Explicitamente não faz parte desta entrega: scroll, formulário de contato, página de
carreiras, blog, cases, equipe, cookies, banner de consentimento, analytics, menu de
navegação, modo claro, e qualquer segunda página.
