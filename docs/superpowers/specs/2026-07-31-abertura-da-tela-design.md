# Abertura da tela — Design

**Data:** 31/07/2026
**Status:** aprovado pelo Lucas · revisado antes do plano (ver §11)
**Substitui:** a coreografia do Motion D (§6 do spec da main page), que passa a
ficar **arquivada, não apagada**.

---

## 1. O que estamos construindo

A entrada da página deixa de ser "a malha acende, depois a logo" e passa a ser
uma sequência de quatro batidas que atravessa a tela inteira — centro, topo e
rodapé:

1. A logo `202` está sozinha na tela, um pouco menor que o tamanho final.
2. Ela cresce até o tamanho final, centralizada. Durante o crescimento a letra
   `0` dá **uma volta completa em torno do próprio centro**, voltando à posição
   correta exatamente quando o tamanho final chega. O ponto verde é carregado
   junto e, ao assentar, **pulsa com brilho**.
3. Pausa de 0,4s. Os textos da borda superior (`PT / EN` e `CONTATO ↗`) entram
   **pelas laterais da tela**, cada um vindo da sua borda.
4. Pausa de 0,2s. A frase do rodapé é **digitada**, caractere a caractere, com
   uma barra de digitação à direita. Terminada a frase, a barra some.

### O que NÃO muda

- O estado final da página é, pixel a pixel, o que ela já é hoje.
- O fundo (malha, lanterna, vinheta) não é tocado — nem no código, nem no
  comportamento. Ver §7.
- Toca uma vez por sessão do navegador; `prefers-reduced-motion: reduce`
  entrega a página montada e estática. As duas regras seguem valendo.

---

## 2. Decisões fechadas nesta conversa

| Pergunta | Decisão |
|---|---|
| A malha no instante 0 | **Já está lá, parada.** O Ato 1 do Motion D (`clip-path: circle(0%→150%)`) é arquivado junto com o resto. A malha é textura de fundo desde o primeiro quadro. |
| "Entram pela parede horizontal" | **Pelas laterais**: `PT/EN` vem da borda esquerda, `CONTATO ↗` da direita, os dois ao mesmo tempo. |
| O teto de duração de 2000 ms | **Sobe para 4800 ms**, num teto novo e de escopo próprio (§4). O teto antigo continua governando o efeito arquivado. |
| "O ponto acompanha esse movimento" | **Acompanha o crescimento**, não o giro: é carregado pela logo, e pulsa ao assentar. |

---

## 3. Arquitetura

O problema estrutural: a coreografia agora governa `.topo` e `.base` (que moram
em `app/page.tsx`) **e** o `.centro` (que mora no componente de motion). Hoje
essas três regiões não têm nada em comum. A fonte única de tempos precisa subir
para cima das três.

### Zero JavaScript de animação

A coreografia inteira — inclusive a digitação — é **CSS**. Nada de timer, nada
de estado, nada de hook novo.

A digitação parecia exigir JS, e não exige: cada caractere é um `<span>` que
carrega o próprio índice numa custom property (`--i`, renderizada já no
servidor), e o atraso da animação dele é
`calc(var(--t-frase) + var(--i) * var(--d-caractere))`. O escalonamento sai da
aritmética do CSS.

Isso não é economia de linhas, são quatro propriedades boas de graça:

- **Funciona sem JavaScript.** Animação CSS não depende de hidratação. A frase
  se escreve sozinha, como o resto da entrada.
- **Sem piscada de hidratação.** Não existe um instante em que o HTML do
  servidor e o primeiro quadro do cliente discordam sobre quantos caracteres
  aparecem.
- **`prefers-reduced-motion` volta a ser só `@media`**, como já é no resto do
  projeto. Nenhuma consulta a `matchMedia` em JS, nenhum hook novo.
- Continua honrando a restrição do spec da main page: *"nenhuma dependência de
  biblioteca de animação se CSS/SVG derem conta"*.

### A costura

`<main class="tela">` passa a carregar três coisas:

- `className={`tela ${estilos.abertura}`}` — a classe do módulo existe para os
  seletores da coreografia **vencerem por especificidade**, nunca por ordem de
  import (ver §5f).
- `style={TEMPOS}` — as durações e os inícios, como custom properties. Descem
  por herança para as três regiões.
- `data-abertura="tocando" | "estatica"` — o interruptor do `.topo` e do
  `.centro`. Todo seletor da coreografia dessas duas regiões pendura nesse
  atributo, então elas não têm como discordar entre si.

  A `.base` (o rodapé) não é a terceira leitora do mesmo atributo: seu CSS
  mora em `FraseDigitada.module.css`, um CSS Module que não enxerga a classe
  `.abertura` de fora. A fonte da verdade continua sendo uma só — o booleano
  `estatica` calculado em `app/page.tsx` — mas ela chega à `.base` por um
  **segundo vocabulário**: a prop `estatica` vira `data-estatica="false" |
  "true"` no `<h1>`, com nome e polaridade diferentes do atributo do
  `<main>`. É a mesma verdade em duas palavras, não literalmente "o mesmo
  bit" — o split é deliberado (a fronteira do CSS Module é real), só a
  redação anterior desta seção exagerava o quanto as três regiões
  compartilham um único atributo.

### Arquivos

| Arquivo | Papel |
|---|---|
| `lib/abertura.ts` **(novo)** | `ATOS`, inícios derivados, duração por idioma, o teto e o objeto `TEMPOS` entregue ao CSS. Puro: sem React, sem DOM. **O único lugar do projeto com um número de tempo desta coreografia.** |
| `lib/abertura.test.ts` **(novo)** | A ordem dos atos e o teto. |
| `app/abertura.module.css` **(novo)** | A coreografia da logo e do topo. Alcança tudo por `data-*` que já existem. Nenhum tempo literal. |
| `components/Palco.tsx` + `.module.css` **(novos)** | O que sobra do Motion D sem a coreografia: `position:absolute; inset:0; overflow:hidden` + `<Fundo202020/>` + `<Logo202/>`, e o override que faz a malha ser fundo desta seção (e não `position:fixed`). |
| `components/FraseDigitada.tsx` + `.module.css` + teste **(novos)** | O `<h1 class="oneliner">` em `<span>` por caractere, mais o cursor. |
| `app/page.tsx` | Costura: emite `TEMPOS` e `data-abertura`, troca `<MotionD/>` por `<Palco/>` e o `<h1>` por `<FraseDigitada/>`. |
| `components/motion/MotionD.*`, `tipos.ts`, `motion.test.tsx` | **Arquivados**: ficam no repo, sem nenhum import, com cabeçalho explicando o que eram e como religar. Os testes deles continuam rodando e verdes. |

`Logo202.tsx`, `SeletorIdioma.tsx`, `Fundo202020.tsx` e `Lanterna.tsx` **não são
tocados**. Toda a coreografia os alcança por `[data-logo]`, `[data-glifo]`,
`[data-ponto]`, `[data-ima="idioma"]` e `[data-ima="contato"]`, que já existem —
é o mesmo padrão que o `MotionD.module.css` já usa.

---

## 4. A linha do tempo

### Os atos (`lib/abertura.ts`)

```
crescimento     1200 ms   logo scale 0.82 → 1, e o "0" gira 360°
pulso            360 ms   o ponto verde assenta e brilha
esperaTopo       400 ms   tela parada, de propósito
topo             520 ms   PT/EN e CONTATO entram pelas laterais
esperaFrase      200 ms   tela parada, de propósito
msPorCaractere    34 ms   o ritmo da digitação
saidaCursor      240 ms   a barra some
```

### Os inícios — derivados, nunca escritos

```
INICIO_PULSO = crescimento                              = 1200
INICIO_TOPO  = INICIO_PULSO + pulso + esperaTopo        = 1960
INICIO_FRASE = INICIO_TOPO + topo + esperaFrase         = 2680

o caractere de índice i surge em  INICIO_FRASE + i * msPorCaractere
duracaoTotal(idioma) = INICIO_FRASE
                     + (caracteres(idioma) - 1) * msPorCaractere
                     + saidaCursor
```

O `- 1` não é detalhe: o primeiro caractere tem índice **zero**, logo surge
exatamente em `INICIO_FRASE`. É o último que manda no fim.

Resultando em:

```
0     →1200   logo cresce · o "0" gira 360° · o ponto viaja junto
1200  →1560   o ponto pulsa com brilho
1560  →1960   ⏸ 0,4 s de tela parada
1960  →2480   PT/EN entra pela esquerda · CONTATO ↗ pela direita
2480  →2680   ⏸ 0,2 s
2680  →4244   a frase é digitada (47 caracteres em PT, um a cada 34 ms)
4244  →4484   o cursor some
```

`duracaoTotal("pt") = 4484 ms` · `duracaoTotal("en") = 4178 ms`
(47 e 38 code points, medidos — não estimados).

### O teto

`DURACAO_MAXIMA_MS = 4800` vive em `lib/abertura.ts` e é conferido no
carregamento do módulo contra **a mais longa das frases de `COPY`**, computada —
não contra um número copiado. Se alguém escrever amanhã uma frase que estoure o
teto, o teste morde antes do navegador.

O `DURACAO_MAXIMA_MS = 2000` de `components/motion/tipos.ts` **não é alterado**.
Ele documenta o acordo do spec §6 sobre os candidatos de motion, e o Motion D
arquivado continua obedecendo a ele. Subir aquele número faria o comentário dele
mentir sobre um efeito que ninguém mais roda. As duas constantes ganham
referência cruzada.

### Os gestos, com nome e sobrenome

| Gesto | De → para | Curva |
|---|---|---|
| Logo cresce | `scale(0.82)` → `scale(1)` em `[data-logo]` | `cubic-bezier(0.4, 0, 0.2, 1)` |
| O `0` gira | `rotate(0deg)` → `rotate(360deg)`, **sentido horário**, no `<path>` do glifo de índice 1 | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Ponto pulsa | `scale(1)` → `1.35` (aos 45%) → `1`, mais um halo | `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| Topo entra | `translateX(∓(100% + --margem))` + `opacity: 0` → `translateX(0)` + `opacity: 1`, os dois ao mesmo tempo | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Caractere surge | `opacity: 0` → `1`, em 1 ms | `linear` |
| Cursor sai | `opacity: 1` → `0` | `linear` |

O halo do ponto é um `::after` com `radial-gradient` em `--verde-sinal`, animando
só `transform: scale(0.4 → 2.2)` e `opacity: 0 → 0.7 → 0`. **Não** é `box-shadow`
animado: `box-shadow` não é composto na GPU e repinta a cada quadro, e o projeto
já escolheu duas vezes ficar na lista de propriedades baratas. O halo não deixa
resíduo — o estado final do ponto é o círculo chapado de hoje.

O caractere surge em 1 ms, não em fade: a 34 ms de cadência, um fade de 90 ms
deixaria três caracteres meio-transparentes ao mesmo tempo e leria como borrão,
não como digitação.

O cursor é uma barra de `0.06em` de largura por `1em` de altura, em
`--verde-sinal`.

### Por que o giro e o crescimento usam a mesma curva

Os dois duram 1200 ms e terminam juntos — é isso que faz o `0` "voltar à posição
correta assim que chegar no tamanho ideal". Mas terminar junto **no relógio** não
basta: com uma curva expo-out no crescimento (95% do caminho em 40% do tempo) e
uma ease-in-out no giro, a logo *parece* pronta aos 600 ms enquanto o `0` ainda
roda — lê como dois movimentos, não um. Os dois usam
`cubic-bezier(0.4, 0, 0.2, 1)`, e resolvem juntos também aos olhos.

---

## 5. Os seis pontos que carregam risco

### a) Girar o `0` sem perder o lugar dele

Em SVG, a propriedade CSS `transform` **sobrescreve o atributo** `transform`.
Aplicar a rotação no `<g data-glifo data-indice="1">` apagaria o
`translate(199.249752, 336.821489)` que o posiciona, e o glifo saltaria para fora
da palavra.

A rotação vai no `<path>` interno, que não tem atributo nenhum, com
`transform-box: fill-box; transform-origin: center` — a caixa do próprio glifo
vira o sistema de coordenadas, e o centro é o centro visual do `0`. `Logo202.tsx`
não muda uma linha.

### b) Crescer sem reflow

`transform: scale()` na raiz `[data-logo]`, nunca `width`. O layout fica imóvel,
então a regra dura do projeto — *a página nunca tem scroll, em nenhum viewport* —
não corre risco durante o crescimento. O ponto verde vem de graça: ele é filho da
raiz e é carregado junto, que é exatamente o comportamento pedido.

### c) O topo entrando de fora da tela

`PT/EN` sai de `translateX(calc(-100% - var(--margem)))` e `CONTATO` de
`translateX(calc(100% + var(--margem)))` — cada um exatamente fora da sua borda.
`html, body { overflow: hidden }` já recorta a pintura, então visualmente está
resolvido.

O problema é a medição. O e2e afere `document.body.scrollWidth`, que reporta a
extensão **real** do conteúdo mesmo quando o `overflow:hidden` a esconde — foi
justamente por isso que ele foi escrito assim. O `CONTATO` deslocado para a
direita infla essa medida **enquanto a animação roda**.

Não é defeito: com `overflow:hidden` ninguém consegue rolar, e o teste já mede
"rolou de verdade?" separadamente. É artefato de medição. A correção é honesta:
as esperas do e2e sobem de 2000 ms para depois do fim real, com o motivo escrito
no teste.

### d) Digitar sem quebrar leitor de tela, SEO nem layout

A frase inteira fica no DOM **desde o primeiro quadro**, um `<span>` por
caractere. O `<h1>` mantém o `textContent` completo — leitor de tela e busca
continuam lendo a frase inteira, e nada depende de a animação ter rodado.

Caracteres ainda não digitados usam **`opacity: 0`, e não `visibility: hidden`**.
A diferença importa: `visibility: hidden` **remove o elemento da árvore de
acessibilidade** — um leitor de tela encontraria um `<h1>` vazio durante os
primeiros 4 segundos e o anunciaria assim. Com `opacity: 0` o elemento continua
na árvore, ocupando o mesmo espaço.

Ocupar espaço é a segunda metade da decisão: não há pulo de layout enquanto
escreve, e o ímã da lanterna (que mede a caixa de `.oneliner`) continua acertando
o alvo do começo ao fim.

O cursor é um `::after` no `<span>` do caractere corrente, em `left: 100%` — sem
medição de DOM, sem `offsetLeft` lido quadro a quadro. Ele aparece durante a
fatia de tempo daquele caractere e some (`steps(1, end)`), de modo que só um
cursor está aceso por vez. O último caractere ganha `data-ultimo` e uma animação
diferente: o cursor fica e some em fade.

Os `<span>` ficam `position: relative` — que não altera o layout de um inline —
e **não** viram `inline-block`, para não estragar o kerning da fonte display.

**Custo real, e é uma mudança de teste:** o `getByText` do testing-library só casa
nós de texto **diretos** de um elemento. Com a linha quebrada em spans, as quatro
asserções `getByText("Potencializamos talentos e")` de `app/page.test.tsx` param
de casar e passam a usar `toHaveTextContent`. É correção legítima do teste ao DOM
novo, não contorno.

### e) O ponto verde deixa de ser a última batida

A §6 do spec da main page fecha com o Lucas: *"O ponto verde acende por último,
**sempre**, como batida final."* A sequência nova encerra com a frase digitada.

Emenda: **o cursor de digitação é `--verde-sinal`**. O último pixel a se mexer na
tela continua sendo verde, e a regra passa a ser "o verde fecha", não "o ponto
fecha". Registrada no spec da main page.

### f) Vencer por especificidade, nunca por ordem de import

A doc do Next é explícita: *"a ordem do seu CSS depende da ordem em que você
importa os estilos"*. Várias regras da coreografia competem com as dos módulos
dos componentes (`Logo202.module.css` define `.ponto`, `Fundo202020.module.css`
define `position: fixed`). Depender da ordem do bundle é depender de um detalhe
que muda sozinho.

Toda regra da coreografia é ancorada em
`.abertura[data-abertura="..."] :global([data-...])` — classe de módulo + dois
atributos, especificidade (0,3,0), contra os (0,1,0) das regras de componente.
É a mesma lição que `MotionD.module.css` já registrou por escrito para o
`position: fixed` do fundo.

---

## 6. O que este trabalho decidiu NÃO tocar

`prefers-reduced-motion` está consultado em JS, com a **mesma função copiada**,
em `lib/usaLanterna.ts:417` e `components/Malha.tsx:41`.

A versão anterior deste spec propunha extrair essa função para um módulo comum,
porque a digitação precisaria de uma terceira consulta. Com a coreografia em CSS
puro (§3), **a terceira consulta deixou de existir** — e com ela o motivo para
mexer em qualquer um dos dois arquivos.

A duplicação fica como está. Não é deste trabalho, e `components/Malha.tsx` é
território do chat paralelo (§7).

---

## 7. Território do chat paralelo

Há outra conversa mexendo no fundo neste mesmo worktree. Arquivos **intocáveis**
por este trabalho:

```
app/globals.css
components/Malha.tsx        lib/malha.ts        lib/malha.test.ts
components/Fundo202020.*    components/Lanterna.*
lib/usaLanterna.*
```

Consequência de projeto, não detalhe: as classes novas entram **ao lado** das
globais, via `className` composto e via `data-*`, nunca editando `.tela`,
`.topo`, `.base` ou `.oneliner` em `globals.css`. Se a coreografia exigir uma
mudança lá, o trabalho **para e avisa** em vez de editar.

`--margem` e `--verde-sinal` são **lidos** de `globals.css` — ler não é editar.

---

## 8. Estado estático e movimento reduzido

`app/page.tsx` já calcula `jaRodou` (o hook `usaMotionUmaVez`, sessionStorage).
Ele vira o atributo:

```
data-abertura = jaRodou ? "estatica" : "tocando"
```

- `data-abertura="estatica"` → todo o estado final explícito no CSS: logo sem
  `scale`, `0` sem rotação, ponto sem halo, topo sem `transform` e com
  `opacity: 1`, caracteres em `opacity: 1`, cursor ausente.
- `prefers-reduced-motion: reduce` é tratado **só em CSS**, como no resto do
  projeto. O bloco repete o estado final com `!important` — mesma lição já
  aprendida em `MotionD.module.css`: sem ele, a especificidade das cadeias de
  descendente vence e a animação roda mesmo com a preferência ligada.

O `@media (prefers-reduced-motion: reduce)` que já existe em `globals.css` zera
`animation-duration`, **mas não zera `animation-delay`**. Sozinho, ele deixaria
os 47 caracteres surgirem escalonados ao longo de 1,6 s — duração zero, atrasos
intactos. Por isso o bloco próprio da coreografia é obrigatório, e precisa zerar
o atraso também.

---

## 9. Verificação

TDD por arquivo: o teste antes do código de implementação, sempre.

**Unitário (vitest)**

- `lib/abertura.test.ts` — cada início **é** a soma dos atos anteriores (e não um
  número escrito à mão); a contagem de caracteres e `duracaoTotal` nos dois
  idiomas; o teto conferido contra a frase mais longa de `COPY`; `TEMPOS` só com
  valores derivados.
- `components/FraseDigitada.test.tsx` — o `<h1>` tem o `textContent` completo em
  **qualquer** estado; um `<span>` por caractere, com `--i` sequencial atravessando
  a quebra de linha; só o último caractere tem `data-ultimo`; a troca de idioma
  remonta a frase inteira.
- `app/page.test.tsx` — asserções migradas para `toHaveTextContent`;
  `data-abertura` e as custom properties chegam no `<main>`.

**e2e (playwright)**

- Esperas atualizadas para depois do fim real, importando o número de
  `lib/abertura.ts` — o `tsconfig.json` da raiz já mapeia `@/*`, e o Playwright lê
  `paths` do tsconfig mais próximo. Se a resolução falhar na prática, cai para
  literal **com comentário apontando para a fonte**.
- "sem scroll" e "nada é cortado" depois da entrada, nos 5 viewports × 2 idiomas —
  os testes que já existem, com a espera nova.
- **Novos:** a logo termina em `scale(1)` e o `0` com o giro fechado; a frase
  termina com todos os caracteres em `opacity: 1` e sem cursor aceso; com
  movimento reduzido a frase já está inteira desde o primeiro quadro.

**Visual** — gosto não se testa. Ao fim, o dev server sobe e o Lucas olha.

---

## 10. Fora de escopo

- Qualquer mudança no fundo, na malha ou na lanterna.
- Repetir a animação a pedido (botão "ver de novo").
- Cursor piscando: ele é sólido enquanto escreve — a 34 ms por caractere, um
  pisca-pisca brigaria com o próprio movimento — e some em fade no fim.
- Pausa extra na quebra de linha da frase.
- Unificar a consulta duplicada de `prefers-reduced-motion` (§6).

---

## 11. Revisão de 31/07, depois da aprovação

Três mudanças, todas encontradas ao detalhar o plano de implementação e todas
**reduzindo** o trabalho:

1. **A coreografia virou CSS puro** (§3). Some `lib/usaMaquinaDeEscrever.ts`,
   some `lib/usaMovimentoReduzido.ts`, some `lib/consultaMedia.ts` e some a
   migração do `lib/usaLanterna.ts`. Ganha-se funcionar sem JavaScript e não ter
   piscada de hidratação.
2. **`opacity: 0` no lugar de `visibility: hidden`** para os caracteres ainda não
   digitados (§5d). `visibility: hidden` remove da árvore de acessibilidade — um
   leitor de tela leria um `<h1>` vazio por 4 segundos.
3. **A duração total caiu de 4518 ms para 4484 ms** (§4), porque o primeiro
   caractere tem índice zero: são `n - 1` intervalos entre `n` caracteres, não
   `n`. Erro de contagem da primeira versão, corrigido.

### Fragilidade conhecida

Trocar de idioma **durante** a digitação reaproveita os `<span>` que o React
consegue casar por chave e troca só o texto deles — as animações não reiniciam, e
a frase nova aparece no ponto de escrita em que a antiga estava. Os caracteres
excedentes (PT tem 47, EN tem 38) são removidos. É comportamento aceitável e raro;
fica registrado para ninguém tratar como defeito novo.
