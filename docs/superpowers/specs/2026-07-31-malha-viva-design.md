# Malha viva e lanterna por caractere — Design

> Evolução do fundo e da lanterna da main page.
> Escrita em 31/07/2026, a partir de conversa com o Lucas.
> Referência visual: `Hero 2020 Glow v2.dc.html`, em
> `C:\Users\Lucas\Downloads\Lucas_dos_Santos\efeito` — rodada e conferida no
> navegador em 31/07/2026, não lida só no código.

**Substitui duas decisões do spec de 28/07** (`2026-07-28-main-page-202-design.md`,
seção 2):

| Decisão de 28/07 | O que vale a partir de agora |
|---|---|
| Canto inferior direito: coordenadas do ITA + `SÃO JOSÉ DOS CAMPOS, BR` | Canto vazio. As coordenadas saem da página. |
| Fundo: preto + padrão `202020` sutil | O padrão continua, mas vira malha desenhada em canvas, visível em repouso e acesa caractere a caractere. |

Todo o resto daquele spec continua valendo.

---

## 1. O que estamos construindo

Duas mudanças na página principal, que já está construída e funcionando:

1. **Remover as coordenadas** do canto inferior direito.
2. **Trocar o motor do fundo e da lanterna** pelo da referência: a malha passa a
   ser visível em repouso, respira sozinha, e o verde acende caractere a
   caractere com rastro em vez de um círculo uniforme.

Não é reconstrução. O sistema de ímãs, a animação de entrada e todo o conteúdo
da página permanecem exatamente como estão.

### Critérios de sucesso

1. As coordenadas não existem mais no HTML da página.
2. Com a página parada e o mouse fora dela, a trama de `20` é **perceptível** na
   tela inteira — não é preto liso.
3. A trama cintila: cada caractere pulsa no seu próprio ritmo, sem sincronia
   visível entre vizinhos.
4. Movendo o mouse, caracteres individuais acendem em intensidades diferentes e
   deixam rastro que apaga atrás do cursor.
5. A luz continua sendo capturada pelos três ímãs (`contato`, `idioma`,
   `oneliner`), crescendo ao dobro do raio, com a mesma histerese de hoje.
6. A animação de entrada roda igual: malha 900ms → logo 700ms → ponto 400ms.
7. A página continua cabendo em uma tela, sem barra de rolagem.
8. Nenhum erro no console.

---

## 2. Decisões fechadas com o Lucas

| Ponto | Decisão | Alternativas descartadas |
|---|---|---|
| Escopo da mudança | Textura visível **e** luz viva, mantendo ímãs e entrada | Substituir o efeito inteiro pelo da referência; só clarear a textura |
| Letra da malha | **The Seasons**, idêntica à referência | Fraunces (recomendada por mim); IBM Plex Mono (a atual) |
| Verde da luz | **`#28d305`**, o da referência | `#39ff14`, o token atual `--verde-codigo` |
| Celular | Textura **com** cintilação | Textura parada; luz seguindo o dedo |
| Vinheta nos cantos | Incluída | Sem vinheta |
| Movimento reduzido | Textura parada, luz sem rastro nem inércia | Desligar o efeito por completo |

### Registro sobre a licença da The Seasons

Levantei, antes da decisão, que o design system da 202 (`design_system/tokens.css`
no repo da trilha) registra a The Seasons como **licença demo da Fontspring,
restrita a logo e wordmark**, e que o `globals.css` deste repo documenta que ela
foi deixada de fora justamente por isso. Usá-la como textura de tela inteira em
produção está fora dessa permissão, e o arquivo passa a ser servido publicamente
pelo site.

O Lucas escolheu a The Seasons com esse alerta na mão. A decisão é dele e está
registrada aqui. **Resolver a licença é tarefa dele, não deste plano** — o código
não tem como saber se a 202 comprou ou não.

### Registro sobre o verde

`--verde-codigo` carrega no código um comentário dizendo que `#39ff14` foi
exceção consciente do fundador e ganhou token próprio *para ninguém trocar
depois pelo verde da marca*. A troca para `#28d305` é decisão do Lucas nesta
rodada, e o comentário do token deve ser atualizado para dizer isso — senão a
próxima pessoa lê como se alguém tivesse "corrigido" a exceção por engano.

---

## 3. O que muda na tela

| | Hoje | Depois |
|---|---|---|
| Malha em repouso | `#0c0c0c` — invisível na prática | `#171717` — textura perceptível |
| Letra | IBM Plex Mono, `1.25rem`, `+0.08em`, linha `1.35` | The Seasons, `18px`, `-0.03em`, linha `0.9` |
| Caracteres | `202` repetido | `2` e `0` alternando por célula |
| Luz | Círculo de máscara CSS: tudo dentro acende igual | Caractere a caractere, cada um com intensidade própria |
| Rastro | Não existe | Acende na hora, apaga a 0.9 por quadro |
| Em repouso | Estática | Cintilação por caractere |
| Cantos | Nada | Vinheta |
| Canto inferior direito | Coordenadas + cidade | Vazio |

---

## 4. Arquitetura

### 4.1 Por que canvas

A máscara de CSS de hoje recorta uma forma — tudo dentro dela fica igual. Não há
como dar intensidade própria a cada caractere, nem rastro por célula. Isso exige
desenhar caractere a caractere, e é o que o canvas faz.

### 4.2 As peças

```
MotionD (palco, dono da coreografia de entrada)
└── Fundo202020            .fundo — recebe o clip-path da entrada
    ├── Lanterna           física do cursor + ímãs (inalterada)
    │   └── Malha          <canvas> — lê a posição viva da lanterna
    └── vinheta            <div> com o radial-gradient
```

**`lib/malha.ts` — a matemática, sem navegador.**
Funções puras, testáveis sem DOM. Mesmo padrão que `passo` em
`lib/usaLanterna.ts`, pelo mesmo motivo: é onde mora a lógica de verdade.

- `montarGrade({ larguraCss, alturaCss, larguraChar, alturaLinha, padX, padY })`
  → `{ colunas, linhas, total }`
- `semearCelulas(total, aleatorio)` → `{ fatores, fases, chars }`, onde
  `aleatorio` é injetado para o teste ser determinístico
- `brilhoDaCelula({ anterior, fator, fase, tempo, distancia2, raio2, temCursor, cintila })`
  → número entre 0 e 1

Regras que `brilhoDaCelula` implementa, todas vindas da referência:

- decaimento: `v = anterior * 0.9` por quadro
- cintilação: `amb = 0.035 * fator * (0.5 + 0.5 * sin(tempo * 0.8 + fase))`;
  vence o decaimento se for maior. Com `cintila = false`, vale 0.
- proximidade: dentro do raio, `alvo = (1 - dist/raio)^1.6 * fator`; vence se for
  maior. Subida instantânea, sem suavização — quem suaviza é a lanterna.

**`components/Malha.tsx` — o desenho.**
Um `<canvas>` e o laço. Duas camadas, como hoje:

- **base**: canvas fora da tela, desenhado uma vez por mudança de tamanho ou por
  chegada da fonte. Caracteres em `#171717` sobre `--preto-202`.
- **acesos**: a cada quadro, copia a base e redesenha por cima **apenas** as
  células com brilho ≥ 0.02.

Cor de cada célula acesa: interpolação de `#171717` até `#28d305` por
`g = min(1, brilho * intensidade)`. Com `g > 0.25`, ganha `shadowBlur = g * 9` na
cor do verde a `g * 0.7` de opacidade — é esse halo que faz o caractere parecer
emitir luz, e não só estar pintado.

**`lib/usaLanterna.ts` — um acréscimo, sem mudança de comportamento.**
Hoje ele escreve `--lanterna-x` / `--lanterna-y` / `--escala-lanterna` como texto
CSS. O canvas precisa dos números. Passa a manter também um ref com
`{ x, y, escala, ativa }`, atualizado no mesmo ponto em que as variáveis CSS são
escritas, e exposto no retorno do hook.

Ler `getComputedStyle` a cada quadro seria a alternativa e está **descartada**:
força recálculo de estilo em todo quadro, exatamente o custo que o comentário de
`medirImas` diz que o projeto evita de propósito.

### 4.3 Dois laços, e por quê

`usaLanterna` **dorme** quando a luz assenta — economia deliberada, documentada
no próprio arquivo. A cintilação, ao contrário, nunca para.

Então passam a existir dois laços independentes:

| Laço | Dono | Vida |
|---|---|---|
| Lanterna | `usaLanterna` | Acorda no `mousemove`, dorme ao assentar. **Inalterado.** |
| Malha | `Malha.tsx` | Contínuo enquanto a aba está à frente |

A malha nunca acorda a lanterna; ela só lê o ref. Se a lanterna estiver dormindo,
o ref guarda a última posição — que é exatamente onde a luz está.

**Pausas do laço da malha:**
- `document.visibilityState === "hidden"` → cancela o quadro; retoma no
  `visibilitychange`. Sem isso a aba em segundo plano continuaria desenhando.
- ponteiro grosso → limita a ~30 quadros por segundo (pula um quadro sim, um
  não). A cintilação usa `sin(tempo * 0.8)`, lenta o bastante para a diferença
  não ser visível, e corta o trabalho pela metade.
- `prefers-reduced-motion: reduce` → `cintila = false` e `decaimento = 0`: a
  célula apaga no quadro em que a luz sai, sem rastro, e a trama não respira. O
  laço continua existindo, mas **pula o desenho quando nada mudou** (sem
  cintilação, com a lanterna parada e nenhuma célula acesa acima do limiar, o
  quadro anterior já é a imagem certa). Assim o visitante que pediu menos
  movimento vê uma imagem parada, sem precisar de um segundo mecanismo de
  notificação entre a lanterna e a malha.

### 4.4 Parâmetros

Todos em um único objeto exportado de `lib/malha.ts`, para ajuste ser troca de
número e não caça ao valor:

| Parâmetro | Valor | Origem |
|---|---|---|
| `tamanhoFonte` | `18px` | referência |
| `tracking` | `-0.03 × tamanhoFonte` | referência |
| `alturaLinha` | `0.9 × tamanhoFonte` | referência |
| `padX` / `padY` | `6` / `4` | referência |
| `corRepouso` | `#171717` | referência |
| `corLuz` | `#28d305` | decisão do Lucas |
| `intensidade` | `0.85` | ver nota abaixo |
| `decaimento` | `0.9` | referência |
| `amplitudeCintilacao` | `0.035` | referência |
| `raioBase` | `300px` | referência (hoje o token é `12rem` = 192px) |
| `dprMaximo` | `2` | referência |

**Nota sobre `intensidade`.** A referência declara `0.3` como padrão da
propriedade, mas o código usa `?? 0.85` quando a propriedade não chega. Na
captura que fiz do efeito rodando, o verde estava claramente mais forte do que
`0.3` produziria (a `0.3` o pico seria `rgb(28,79,18)`, um verde quase apagado),
então o valor em vigor na referência é `0.85`. Adotamos `0.85` e conferimos com
os próprios olhos ao final. Se ficar forte demais, é este número que baixa —
não a cor.

**Tokens que saem do CSS.** `--padrao-base` e `--padrao-luz` deixam de existir:
as duas cores viram parâmetros de `lib/malha.ts`, porque agora quem pinta é o
canvas. `--padrao-202020` também sai — ele só servia ao fallback de ponteiro
grosso, que a cintilação no celular torna desnecessário. `--verde-codigo`
**permanece**, com o valor novo e o comentário atualizado: ele é a origem de
`corLuz`.

`raioBase` fica no token `--raio-lanterna`, lido **uma vez** por montagem e por
resize — nunca por quadro. Passa de `12rem` para `300px`: o efeito inteiro é
medido em pixels (fonte fixa em 18px), e manter uma ponta em `rem` faria o raio
dessincronizar da malha se o visitante mudasse o tamanho de fonte do navegador.

O raio efetivo é `raioBase × escala`, e `escala` vem da lanterna — é assim que o
ímã continua fazendo a luz crescer ao dobro.

### 4.5 A fonte

- O `.ttf` de origem (230 KB) **não entra no git**. Fica documentado no script.
- `scripts/gerar-fonte-malha.mjs` recorta a fonte para os glifos `2` e `0` e
  gera `public/fonts/the-seasons-20.woff2`. Ferramenta: pacote `subset-font`
  como devDependency.
- O `.woff2` gerado **é commitado**, para o build não depender da máquina do
  Lucas nem do arquivo em `Downloads`.
- `@font-face` com `font-display: swap`. Enquanto a fonte não chega, a malha
  desenha com Fraunces (já em memória, zero download extra).
- `document.fonts.load("400 18px 'The Seasons'")` → ao resolver, remonta a
  camada base com a métrica certa. É o que a referência faz com a Cormorant.

Se `subset-font` falhar na conversão, o fallback é gerar o `.woff2` da fonte
inteira e seguir — pesa mais, não bloqueia a entrega, e fica anotado como dívida.

---

## 5. Remoção das coordenadas

| Arquivo | Mudança |
|---|---|
| `app/page.tsx` | Remove o `<p className="label coordenadas">` inteiro |
| `lib/copy.ts` | Remove os exports `COORDENADAS` e `LOCAL` |
| `lib/copy.test.ts` | Remove os testes desses dois exports |
| `app/globals.css` | Remove `.coordenadas` e sua regra dentro do `@media (max-width: 720px)` |
| `app/page.test.tsx` | Passa a exigir **ausência** do texto |
| `e2e/layout.spec.ts` | Idem |

`.base` é `flex` com `justify-content: space-between`. Com um filho só, o
`oneliner` fica à esquerda — que é o desejado. O `@media` que empilhava os dois
em coluna no celular perde a razão de existir e sai junto.

Nenhum dos três ímãs está nas coordenadas, então o sistema de captura não é
afetado.

---

## 6. Testes

**Unitários — `lib/malha.test.ts`:**
- `montarGrade` cobre a tela: `colunas × larguraChar ≥ largura - padX`
- `semearCelulas` alterna `2` e `0`, e devolve fatores em `[0.5, 1]`
- `brilhoDaCelula` decai a 0.9 sem cursor e sem cintilação
- cintilação nunca ultrapassa `amplitudeCintilacao`
- brilho é 1.0 no centro exato da luz e 0 fora do raio
- com `cintila = false`, dois quadros seguidos sem cursor caem monotonicamente

**Componente — `components/Malha.test.tsx`:**
- renderiza um `<canvas>` com `aria-hidden`
- **não quebra quando `getContext("2d")` devolve `null`** — é o que o jsdom faz
  sem o pacote `canvas` instalado, então o componente precisa sair de fininho em
  vez de estourar. Isso é requisito de código, não só de teste.
- com `prefers-reduced-motion`, a cintilação está desligada e o rastro é
  imediato: dois quadros seguidos com a lanterna parada produzem desenho
  idêntico, e o segundo quadro não repinta
- desmontar cancela o quadro e remove o listener de `visibilitychange`

**`components/Fundo202020.test.tsx`:** reescrito — as camadas de texto não
existem mais. Passa a conferir que a `Malha` está dentro da `Lanterna` e que a
vinheta existe.

**`lib/usaLanterna.test.ts`:** ganha um caso garantindo que o ref numérico
acompanha o estado — os testes existentes de `passo` seguem intocados.

**E2E — `e2e/layout.spec.ts`:** sem rolagem, nada cortado, o canvas cobre a
viewport, as coordenadas não aparecem.

**O que teste nenhum cobre:** se ficou bonito, se a serifada embolou, se a
cintilação incomoda. Isso é o Lucas olhando — e é por isso que a última etapa da
execução é subir o servidor e mostrar.

---

## 7. Fora de escopo

- Logo, frase, seletor de idioma e link de contato: intocados.
- Animação de entrada: intocada.
- Repositório da trilha (`C:\Users\Lucas\202`): não se toca.
- Substituir o `202_Branco.svg` ou mexer no `Logo202`: assunto encerrado, não
  entra aqui.
- Analytics, novas seções, scroll: seguem fora, como no spec de 28/07.

---

## 8. Riscos

| Risco | Probabilidade | O que fazemos |
|---|---|---|
| Licença da The Seasons | Certo, se a 202 só tem a demo | Registrado. Decisão e resolução são do Lucas. |
| Serifada em 18px embola e vira sujeira | Média | `tamanhoFonte` e `tracking` são parâmetros. Se não resolver, trocar por Fraunces é mudar uma string. |
| Bateria no celular pela cintilação | Média | 30 quadros por segundo, pausa em segundo plano. Trade-off aceito pelo Lucas. |
| Canvas de tela cheia cai de quadros em máquina fraca | Baixa | Ver a nota abaixo: medido, com folga. A base é cópia de bitmap e o `dpr` é limitado a 2. |
| `getContext("2d")` nulo no jsdom quebra a suíte | Alta se ignorado | Tratado como requisito de código, com teste próprio. |

### Correção de 31/07/2026 — "só as células acesas são redesenhadas"

A linha original desta tabela dizia que o custo estava contido porque **"só as
células acesas são redesenhadas"**. A afirmação era substancialmente falsa nesta
composição de parâmetros, e fica registrada aqui em vez de apagada.

O motivo: `amplitudeCintilacao` (0.035) é **maior** que `limiarAceso` (0.02).
Os dois vieram da referência aprovada e nenhum dos dois muda — mas a
consequência é que, em repouso absoluto e sem mouse nenhum, a própria
respiração já empurra boa parte da malha acima do limiar, todo quadro, para
sempre. "Só as acesas" não quer dizer "poucas".

**Medição na página real** (Chromium, 1440x900, DPR 2, `--raio-lanterna: 300px`,
malha de 7.068 células; tempo médio dentro do laço de desenho, por quadro):

| Cenário | Células redesenhadas | Com halo | Tempo médio |
|---|---|---|---|
| (a) repouso, sem mouse | ~1.940 (27%) | 0 | **2,6 ms** |
| (b) lanterna livre | ~2.830 (40%) | ~280 | **4,3 ms** |
| (c) presa num ímã (raio 2x) | ~3.120 (44%) | ~515 | **4,6 ms** |

A folga é grande: o pior caso medido usa 28% do orçamento de 16,7 ms dos 60
quadros por segundo, e o p95 dos três cenários ficou em 6,9 ms. Mas ela vem de
`fillText` ser barato nesse tamanho de fonte, **não** do limiar estar segurando
o trabalho. Quem mexer em `amplitudeCintilacao`, em `tamanhoFonte` ou no
`--raio-lanterna` mexe direto nesses números e precisa medir de novo.
