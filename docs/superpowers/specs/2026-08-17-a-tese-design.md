# A Tese — Design

> Especificação de `202lab.com.br/tese`, a segunda página do site.
> Escrita em 17/08/2026, a partir de entrevista com o Matheus.
> Fonte do argumento: o deck `202.pdf` na raiz do repo, mais o post de LinkedIn
> e o texto de pitch fornecidos na mesma conversa.

---

## 1. O que é

Uma página de **posicionamento**, não de história. Ela não conta como a 202
nasceu, quem são os fundadores nem o que já aconteceu. Ela defende uma tese
sobre o mundo e mostra o que essa tese obriga a 202 a construir.

O nome não é decoração: a página se chama **A TESE** porque promete um
argumento que se sustenta, e cada seção precisa cumprir essa promessa.

**Não é** um "sobre nós". Sem fotos, sem bios, sem linha do tempo da empresa,
sem números de tração.

### Isto revoga uma decisão anterior, de propósito

`2026-07-28-main-page-202-design.md` §1 diz, com todas as letras: *"Não é um
site institucional. Não tem 'sobre nós', 'cases', 'carreiras' nem blog"*, e a
§13 lista "qualquer segunda página" como fora de escopo. Aquela decisão valia
para o site de uma tela só. A /tese a revoga conscientemente, e o §13 daquele
documento passa a valer só para o que continua fora: cases, carreiras, blog,
equipe, analytics.

**A regra dura não foi revogada — mudou de endereço.** "A página nunca rola"
virou "a HOME nunca rola". Ver §7.

---

## 2. Decisões fechadas com o Matheus (17/08/2026)

| Ponto | Decisão | Alternativas descartadas |
|---|---|---|
| Formato | Seções de tela cheia, scroll vertical livre | Deck horizontal navegável; uma tela só, densa |
| Rota e nome | `/tese` — "A TESE" / "THE THESIS" | `/manifesto`; `/sobre`; `/acreditamos` |
| Idioma | PT e EN juntos, desde o primeiro dia | PT agora e EN depois; só PT |
| Escopo | A tese inteira **mais** as frentes de operação | Só a tese, sem operação; tese + operação + tração |
| Tração | **Fora.** Sem os R$ 35 mil, sem o CTO roteado, sem a trilha de julho | Incluir como prova |
| Pessoas | **Nenhuma.** Nem fundadores, nem talentos | Fundadores no fecho; grupo inteiro no fecho |
| Âncora | "principais universidades brasileiras" no texto; as marcas entram no desenho quando os arquivos chegarem (§4) | ITA nomeado no texto; ITA como origem + expansão |
| Abertura | Começa pela conclusão ("o que falta são pessoas excepcionais") | Começar pela observação, como o deck |
| Copy | Reescrita a partir do deck para leitura em tela | Verbatim do deck; reescrita mais agressiva |
| Fundo | A malha viva da home, na página inteira, mais apagada | Só na abertura e no fecho; sem malha |
| Instrumentos | ~~Toda seção tem o seu~~ **Seis seções têm; quatro são texto puro (17/08, 2ª rodada — ver §4)** | Só duas ou três seções-chave; tipografia pura |
| Movimento | Abertura própria + revelação por seção, dirigida pelo scroll | Só revelação; estática |
| Frentes | **Cinco**, com alocação/headhunting entre elas (17/08, 2ª rodada) | Quatro; seis, com o spin-out separado |
| Produto | Não é só interno: o que amadurece **sai da 202 como empresa** | Produto só interno; spin-out como sexta frente |
| Saída | Duas portas, nesta ordem: **a home e depois o contato** (17/08, 2ª rodada) | Contato primeiro; uma porta só; destinos novos |
| Fecho | **Sem parágrafo de convite** (17/08, 2ª rodada). A frase basta | "Se você leu até aqui e concorda…" antes das portas |
| Ligação com a home | ~~Ainda não existe~~ **Feita em 17/08 (2ª rodada): `A TESE →` no canto inferior direito** | Link no topo; o oneliner vira link |

**Por que o canto inferior direito.** Era o único dos quatro cantos vazio, e
`globals.css` já registrava por escrito que o `.base` fora desenhado como um
flex `space-between` esperando um segundo filho — com a regra de empilhamento
em 720px anotada como "se algum dia ganhar um segundo filho, precisa voltar".
Voltou. A leitura também sai na ordem certa: a frase diz o que a 202 faz e o
link ao lado dela oferece o porquê. `→` e não `↗` porque a seta diagonal é do
CONTATO, que sai do site.

Na abertura o link entra na **mesma batida** de `PT/EN` e `CONTATO` (Ato 3),
pelo mesmo lado. Os três são navegação; chegarem juntos os lê como um gesto só,
e dar a ele um ato próprio roubaria a última batida da frase, que é o clímax da
entrada.

Falta só o deploy.

---

## 3. O argumento, seção a seção

Dez telas. As oito do meio são os oito beats do deck, na mesma ordem; a
primeira e a última são novas.

| # | `id` | Rótulo | O que afirma | Instrumento |
|---|---|---|---|---|
| 1 | `abertura` | A TESE | O que falta no mercado não é tecnologia | — |
| 2 | `ponto-de-partida` | O PONTO DE PARTIDA | Todo mundo carrega um PhD no bolso | — (ver §4) |
| 3 | `velocidade` | A VELOCIDADE DA FRONTEIRA | 18 meses contra 48 | A linha do tempo |
| 4 | `descompasso` | O DESCOMPASSO | Contínuo contra degraus | Contínua × escada |
| 5 | `o-que-supera` | O QUE SUPERA O QUÊ | Repertório envelhece; aprender, não | A comparação |
| 6 | `ecossistema` | O QUE ESTAMOS CONSTRUINDO | Ecossistema nas universidades | — por enquanto (logos pendentes, §4) |
| 7 | `pilares` | O QUE NÃO É NEGOCIÁVEL | Autodidatismo · AI como core · Fome | Três colunas |
| 8 | `frentes` | COMO ISSO VIRA PRÁTICA | Trilhas · Rede · Serviço · Produto · Alocação | O razão de cinco linhas |
| 9 | `missao` | A MISSÃO | A nova safra de startups que muda o Brasil | — |
| 10 | `fecho` | FIM DA TESE | A frase da home, agora merecida | As duas portas |

**Os `id` são idênticos em PT e EN**, e há teste para isso (`lib/tese.test.ts`
e `e2e/tese.spec.ts`). Um link compartilhado (`/tese#velocidade`) não pode
quebrar para quem escolheu o outro idioma.

**Toda a copy vive em `lib/tese.ts`**, PT e EN lado a lado. Nenhum texto de
marca no JSX. O fecho é **derivado** do oneliner em `lib/copy.ts`, não copiado:
a página inteira existe para que aquela frase deixe de ser slogan e vire
conclusão, então ela precisa continuar sendo a mesma frase, num lugar só.

---

## 4. O que a página não afirma

Registrado porque é fácil escorregar numa página de posicionamento:

- **Nenhum número que a 202 não possa sustentar.** "18 meses" e "2,7
  renovações" vêm do deck e são a tese da casa. Uma porcentagem inventada
  valeria menos que nenhuma.
- **A seção 2 não tem instrumento** (17/08, 2ª rodada). Teve dois, e os dois
  foram descartados pelo mesmo motivo: nenhum conseguia dizer "conhecimento de
  especialista ficou abundante" sem que o leitor precisasse ser ensinado a ler
  o gráfico antes. O pente de traços lia ao contrário (menos traços = menos
  conhecimento, quando a seção afirma o oposto); as duas barras de "anos contra
  segundos" liam melhor e ainda assim não convenceram. Um instrumento que
  precisa de manual é pior do que instrumento nenhum, e a frase da seção se
  sustenta sozinha.
- **A seção 6 também está sem instrumento, e este é temporário.** Ela vai
  receber a tira de logos das universidades, que depende de arquivos de marca
  que o Matheus vai fornecer. Duas tentativas caíram antes: uma constelação de
  pontos ligados (não dizia o que era, e desenhava uma rede pronta que
  contradizia o texto de apoio da própria seção — "o que não existe é um
  ambiente") e blocos de pontos sob nomes de universidade em tipo. Seções sem
  desenho eram três (abertura, missão, fecho); hoje são cinco.
- **Nenhum alcance geográfico.** Nada na página é um mapa do Brasil. Um mapa
  afirmaria presença que ainda não existe.
- **A decisão pendente das logos**, para quando os arquivos chegarem: nome de
  universidade em tipo lê como "é aqui que o talento está"; **logotipo lê como
  parceria firmada**. São afirmações diferentes, e a segunda é bem mais forte —
  só cabe se a relação existir. Além disso, brasão de universidade é
  ornamentado, colorido e desenhado para fundo claro: sobre preto, em
  monocromático e a ~60px, só a versão **wordmark chapada** de cada marca
  sobrevive.

---

## 5. Desenho

### A régua

A lateral esquerda, presa à viewport, com uma marca por seção. **Não é barra de
progresso — é instrumento de medida**, com gradação fina desenhada no próprio
fio. A página inteira argumenta sobre ritmo; o objeto que acompanha a leitura
precisa ser do mesmo tipo que os objetos dentro do argumento.

Ela navega de verdade: são links de âncora, funcionam sem JavaScript e são
alcançáveis por teclado. Só a marca de "onde estou" depende de JS
(`lib/usaSecaoAtiva.ts`, um `IntersectionObserver` com a área encolhida a uma
linha no meio da tela).

Some abaixo de 1100px: os rótulos precisam de uma calha de ~11rem que não
existe em tela estreita, e régua sem rótulo é enfeite ocupando margem.

### O ponto verde

Cada statement termina num ponto verde, e **quem o desenha é o componente**,
uma vez por seção — ele nunca é digitado dentro da copy. Assim a regra "um
verde por tela" é garantida pelo código, e há teste e2e contando.

Isto desvia da home, que restringe o verde à logo (`main-page-202-design.md`
§5), e o desvio é deliberado: lá havia um elemento só na tela e dois verdes
competiriam; aqui o verde é **pontuação**, e dá ritmo a dez telas.

**A regra de cor dos instrumentos: verde é a fronteira.** Ele marca o que se
move — as três renovações na linha do tempo, a linha contínua do descompasso.
Estrutura, medida e instituição são branco ou cinza. Sem essa regra o verde
vira enfeite e a página perde o único código de cor que tem.

### Tipografia e cor

Nada de fonte nova: Fraunces 300 (display), IBM Plex Mono (dados e rótulos),
Inter (corpo) — as três que a home já carrega.

Um token novo em `app/globals.css`: **`--fio-estrutura: #33332E`**. Não é cor
nova na marca — é o mesmo cinza que o `202.pdf` já usa nas linhas dos slides.
Ele existe porque `--cinza-linha` (`#262626`) foi desenhado para *separar
caixas*, e nisso é ótimo; mas a /tese usa fio como **desenho** (o eixo da linha
do tempo, a grade das quatro frentes, a régua) e nessa função ele desaparecia
por completo numa tela de escritório. Conferido no navegador: a grade das
frentes e as réguas dos pilares simplesmente não existiam. A home não usa este
token.

### Enquadramento

Nove telas ancoradas à esquerda e **uma centrada** — a missão. Depois de nove
seções na mesma postura, centrar é uma mudança que se sente sem precisar de
mais nenhum recurso. A capa é ancorada embaixo, para não abrir com o mesmo
enquadramento centrado da home.

---

## 6. Movimento

Quatro regimes, e a diferença entre eles não é gosto:

1. **A capa** já está na tela quando a página carrega: se monta no relógio,
   escalonada, com CSS comum.
2. **O texto do miolo** (rótulo, statement, apoio) se monta conforme entra na
   tela, com `animation-timeline: view()` — sem JavaScript de animação.
3. **Os instrumentos tocam no tempo**, disparados por `usaTocarAoVer` quando
   aparecem na tela. Ver §6.1: este regime **substituiu** o scroll, e o porquê
   importa.
4. **O fecho não anima.** É a última tela do documento: um elemento na metade
   de baixo dela nunca chega ao fim da própria faixa de `view()`, porque não há
   mais para onde rolar. Ficaria preso, invisível, para sempre. Estático é a
   única forma correta, e `e2e/tese.spec.ts` mede isso em cinco viewports.

Três defesas garantem que o estado final do **texto** seja sempre visível — sem
elas uma revelação por scroll vira uma página em branco:

- `@supports (animation-timeline: view())`: sem suporte, nada existe e tudo
  nasce montado;
- `@media (prefers-reduced-motion: no-preference)`: o bloco global de
  `globals.css` zera *duração*, e duração é ignorada numa timeline de scroll —
  precisa ser explícito;
- `animation-fill-mode: both`: passada a faixa, o estado final fica retido.

As faixas são medidas em `cover` e não em `entry`: `entry` de um elemento de
1px de altura — o eixo da linha do tempo é um — dura um pixel de rolagem, e o
desenho aparece estalando.

Scroll livre, **sem `scroll-snap`**: snap em trackpad dá sensação de página
quebrada. `scroll-behavior: smooth` existe para os saltos da régua — e vale
para qualquer rolagem programática, inclusive as dos testes, que por isso usam
`behavior: "instant"` explicitamente.

### 6.1 Por que os instrumentos saíram do scroll (17/08/2026, 2ª rodada)

A primeira versão desenhava a linha do tempo e o descompasso com
`animation-timeline: view()`, junto com o texto. Duas coisas quebravam nisso, e
as duas são fatais num instrumento de medida:

- **O movimento herda a mão de quem rola.** Sai aos trancos, e um gráfico aos
  trancos parece defeito.
- **Parar no meio é normal ao ler**, e cada parada congela um quadro
  intermediário: barra da graduação cortada, renovações pela metade, curvas
  desenhadas até um ponto arbitrário. Quem parou lê aquilo como o **resultado**.

Havia ainda um defeito medido, e mais grave, na revelação por scroll da caixa
do instrumento: numa faixa `cover` cada elemento é medido pelo próprio trajeto
pela tela, e o instrumento é o elemento mais **baixo** da seção. A 1440×900,
com a seção parada na posição natural de leitura, ele ficava em **opacidade
0,40** — o desenho era o elemento mais apagado da tela, abaixo do texto que ele
existe para provar. O escalonamento por `--ordem` piorava: dava ao mais
atrasado a faixa mais tardia.

Quem dispara agora é `lib/usaTocarAoVer.ts`, escrevendo `data-toque` na raiz do
instrumento. Três valores, e os três precisam ser estados corretos da página:

| `data-toque` | Quando | O que se vê |
|---|---|---|
| ausente | sem JS, sem `IntersectionObserver`, ou movimento reduzido | o desenho **completo** |
| `armado` | escrito antes da primeira pintura (`useLayoutEffect`) | o desenho vazio, sem lampejo do final |
| `tocando` | o desenho entrou na tela | roda uma vez, do começo ao fim |

O estado final mora nas regras **base** do CSS, e não numa keyframe: é isso que
faz "ausente" ser correto. Inverter (base vazia, keyframe cheia) deixaria a
página em branco para quem pediu menos movimento — e há teste e2e só para isso.

A animação toca **uma vez**. Não repete se o visitante subir e descer de novo:
a segunda exibição seria ruído, e o estado final já diz a mesma coisa.

### 6.2 A armadilha do `stroke-dasharray` (17/08/2026)

O descompasso era desenhado com a técnica clássica: `pathLength="1"` no
`<path>`, `stroke-dasharray: 1` e `stroke-dashoffset` de 1 a 0. **Não
funciona aqui**, e o defeito não era da animação — era do estado **final**.

`vector-effect: non-scaling-stroke` (necessário, porque
`preserveAspectRatio="none"` estica o eixo X em 1,44× e sem ele o traço sairia
com espessuras diferentes na horizontal e na vertical) faz o Chrome medir o
tracejado em **pixels de tela**, não no comprimento normalizado do caminho.
Resultado: o traço cobria ~71% da curva verde e ~74% da escada, e parava ali
para sempre — o preenchimento do vão inteiro ao lado de duas linhas que
morriam no meio do gráfico. Nenhum teste pegava, porque a **geometria**
continuava certa; só a pintura parava antes.

A substituição é geometria pura, imune a essa conversa: um `<clipPath>` com um
`<rect>` que varre da esquerda para a direita (`transform: scaleX(0)` → `1`,
com `transform-origin: left` — em SVG a origem padrão é o **centro** da
viewBox, e sem essa linha o recorte colapsaria para o meio do desenho). As
três camadas — vão, escada e curva — ficam dentro do grupo recortado, então
saem da mesma frente vertical, no mesmo instante e no mesmo x. Uma animação
só, e nenhuma chance de o preenchimento aparecer antes das linhas.

De quebra o desenho ficou melhor: o vão **cresce** com a varredura em vez de
surgir no fim, e a área entre as duas abrindo é o argumento da seção.

### 6.3 A conta única da linha do tempo

Tempo e geometria saem da **mesma conta**: cada elemento
recebe `--fracao` (mês ÷ 54), que define o `left` dele e o instante em que ele
entra. A marca do mês 18 acende exatamente quando a barra verde passa por cima
dela, e não pode divergir disso sem alguém mudar as duas coisas de uma vez. A
barra da graduação corre à **mesma velocidade** da fronteira e por isso para
sozinha em 48 enquanto a verde segue até 54 — se as duas terminassem juntas, o
desenho afirmaria o contrário do que a seção diz.

---

## 7. O interruptor do scroll

A regra dura era `html, body { overflow: hidden }` em `app/globals.css`. Agora
é:

```css
html:has(.tela), body:has(.tela) { overflow: hidden; }
```

`.tela` é desenhado só pela home. O valor da regra não mudou; ela agora
pergunta antes se a página é a home.

- `e2e/layout.spec.ts` continua guardando `/` exatamente como antes, em 5
  viewports × 2 idiomas × 2 estados de animação. Se este seletor parar de
  casar, aqueles testes quebram — que é o comportamento desejado.
- `e2e/tese.spec.ts` mede os **dois lados** do interruptor na mesma corrida: a
  home não rola, a tese rola.
- Sem suporte a `:has()` (navegador anterior a 2023) a home ainda não rola: o
  conteúdo dela cabe em `100dvh` por construção, e o `overflow: hidden` sempre
  foi cinto além do suspensório.

---

## 8. Custo e reaproveitamento

O fundo vivo é o **mesmo componente** da home (`Fundo202020` → `Lanterna` +
`Malha` + vinheta), sem alteração. Ele já nasce `position: fixed` — quem o
prende a uma seção é a home, com um override em `Palco.module.css`. Aqui ele
fica preso à viewport, então **o custo por quadro é idêntico ao da home**: o
canvas mede a tela, nunca o comprimento da página.

`lib/usaLanterna.ts` já escutava `scroll` em captura para remedir os ímãs
(linha 587), então a lanterna gruda certo mesmo com a página rolando — nenhuma
mudança foi necessária.

A trama é apagada de `#171717` para `#101010` nesta página, por override do
token `--padrao-repouso` no wrapper: na home a malha é o conteúdo e não há
texto para ler sobre ela; aqui há dez telas de argumento em cima.

---

## 9. Acessibilidade

- `prefers-reduced-motion: reduce` → página inteira estática, nada pendente.
  Testado.
- A régua é `<nav>` com `<ol>` e links reais; a seção lida carrega
  `aria-current="true"`.
- Os instrumentos que repetem o que o texto ao lado já diz são `aria-hidden`;
  os que carregam informação própria (os números da linha do tempo) são texto.
- Foco de teclado visível, herdado de `globals.css`.
- O `<h1>` é o statement da abertura; os outros nove são `<h2>`.
- Contraste: branco sobre `#0a0a0a` = 19:1; `--cinza-texto` = 7,4:1. O lado
  "superado" da seção 5 é o único texto deliberadamente abaixo disso — ele está
  sendo reabsorvido pelo fundo, que é o que a seção afirma, e o mesmo conteúdo
  está no parágrafo de apoio acima em contraste pleno.

---

## 10. Fragilidades conhecidas

1. **`animation-timeline: view()` não tem fallback animado.** Onde não houver
   suporte, o texto do miolo é estático. Foi decisão consciente: um fallback em
   JavaScript custaria mais que o ganho, e estático não é um estado quebrado.
   (Os instrumentos não passam por aqui: eles tocam por `IntersectionObserver`,
   que é suportado em tudo que interessa — ver §6.1.)
1b. **Quem pula a página inteira de uma vez não vê instrumento tocar.**
   Arrastando a barra de rolagem até o fim, o `IntersectionObserver` nunca
   reporta as seções puladas e elas ficam `armado`. Não é estado permanente: o
   observador continua ligado, e subir de volta toca cada uma na hora certa.
2. ~~A leitura de idioma está duplicada entre `app/page.tsx` e
   `app/tese/page.tsx`.~~ **Resolvido em 17/08 (2ª rodada):** virou
   `lib/usaIdioma.ts`, chamado pelas duas. A extração estava marcada para
   acontecer "quando as duas páginas forem ligadas", e foi o que aconteceu.
3. **A régua não existe abaixo de 1100px**, e nesses viewports não há indicador
   de progresso nenhum. Aceitável: o conteúdo não depende dela.
4. **Dez telas é muito para quem só quer saber o que a 202 faz.** Quem quer isso
   tem a home. A /tese é para quem quer o argumento.

---

## 11. Verificação

| O quê | Onde |
|---|---|
| Copy, ids e invariantes dos dois idiomas | `lib/tese.test.ts` (9 testes) |
| Scroll, régua, idioma, saídas, movimento | `e2e/tese.spec.ts` (30 testes) |
| A home continua sem rolar | `e2e/layout.spec.ts` (68 testes, intactos) |

Conferido no navegador em 1440×900, 1280×720 e 390×844, seção a seção, com e
sem movimento reduzido.

**Cuidado ao conferir animação com navegador automatizado:** o Chromium
headless costuma responder `prefers-reduced-motion: reduce`, e nesse estado o
bloco global de `globals.css` esmaga toda duração para 1µs — o instrumento
salta para o estado final e parece que nada anima. Confirmar com
`matchMedia("(prefers-reduced-motion: reduce)").matches` antes de concluir
qualquer coisa sobre movimento.
