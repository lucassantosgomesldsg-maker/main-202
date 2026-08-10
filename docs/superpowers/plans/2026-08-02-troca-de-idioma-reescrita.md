# Troca de idioma: apagar e reescrever a frase

**Data:** 2026-08-02
**Escopo:** o `<h1>` do rodapé (`components/FraseDigitada`), a coreografia em
`lib/abertura` e os testes das duas pontas.

## Problema

Na abertura, a frase do rodapé se escreve caractere a caractere. Ao trocar
PT ↔ EN, ela não faz movimento nenhum: o React troca o texto dos `<span>` e a
frase nova aparece inteira, de um quadro para o outro. A troca de idioma é a
única interação real da página, e é justamente a que não tem resposta.

O pedido: ao trocar de idioma, a frase deve ser **apagada como quem apaga uma
digitação** (de trás para frente, com o cursor voltando) e **reescrita** na
língua nova. E precisa aguentar o visitante martelando PT/EN/PT/EN sem embolar.

## Como a coreografia funciona hoje (o que não pode quebrar)

- Zero JavaScript de animação: cada `<span>` carrega o próprio índice em `--i`
  e o CSS deriva o atraso com `calc(var(--t-frase) + var(--i) * var(--d-caractere))`.
  Funciona com JS desligado e não pisca entre o HTML do servidor e a hidratação.
- A frase INTEIRA está no DOM desde o primeiro quadro (`opacity: 0`, nunca
  `visibility: hidden`) — leitor de tela e busca enxergam o `<h1>` completo.
- `prefers-reduced-motion` é resolvido só por `@media`.
- O `<h1>` é o ímã da lanterna (`data-ima="oneliner"`).

Nada disso muda. A entrada continua sendo CSS puro disparado pelo mount.

## Abordagem

### 1. Quatro fases explícitas, um atributo só

`data-estatica={true|false}` no `<h1>` vira `data-fase`:

| fase | quando | atraso base | ordem |
|---|---|---|---|
| `entrada` | a abertura da página | `--t-frase` | 0 → n-1 |
| `apagando` | saída da frase antiga | 0 | n-1 → 0 |
| `escrevendo` | reescrita depois da troca | `--t-troca` | 0 → n-1 |
| `parada` | repouso, tudo aceso, sem cursor | — | — |

Um atributo com quatro valores, e não `data-estatica` + `data-fase`: dois
booleanos que precisam concordar criam estado impossível
(`estatica=true` + `fase=apagando`). O CSS deriva o atraso de `--t-base`, que
cada fase redefine — a aritmética do `calc()` continua sendo quem escalona.

O apagamento precisa do índice reverso, então o `<h1>` passa a carregar
`--n` (total de caracteres) e o CSS calcula `(--n - 1 - --i)`. Uma custom
property no pai, não uma a mais em cada um dos 47 `<span>`.

### 2. A máquina de estado (a parte que precisa aguentar martelada)

Estado interno de `FraseDigitada`: `{ texto, fase, tomada }` — qual idioma está
no DOM, em que fase está, e um contador de tomada.

| clique chega em | o que acontece |
|---|---|
| `parada` | vai para `apagando` (texto antigo continua no DOM) |
| `entrada` / `escrevendo` | corta e vai direto para `escrevendo` no idioma novo |
| `apagando` | **nada** — só o alvo muda; ao terminar de apagar, escreve o alvo do momento |

Por que cortar em vez de apagar quando a frase está no meio de uma escrita: na
fase `apagando` a base é `opacity: 1` (tudo aceso, some em ordem reversa). Se
entrássemos em `apagando` com a frase pela metade, os caracteres que ainda não
tinham sido escritos **acenderiam** para poder apagar — um flash. Frase
incompleta não tem o que apagar; recomeçar é o movimento honesto.

Nunca há mais de um timer vivo (um `useEffect` por fase, com `clearTimeout` no
cleanup), e o alvo é lido de um ref no disparo — clicar durante o apagamento
não reinicia nem prolonga o apagamento. Qualquer sequência de cliques converge
para o último idioma clicado.

**`tomada` existe por um motivo específico:** trocar o texto de um `<span>` não
reinicia a animação CSS dele. No corte `escrevendo → escrevendo` o
`animation-name` não muda, então sem uma `key` nova a frase nova apareceria
meio escrita, herdando o relógio da anterior. A `key` de cada `<span>` passa a
ser `${tomada}-${i}`: tomada nova, nós novos, animação do zero.

### 3. `prefers-reduced-motion`

O `@media` zera as animações, mas não zeraria os **timers** — quem prefere menos
movimento veria o texto antigo parado por ~0,8s antes de trocar. Pior que a
troca seca de hoje. Então o efeito consulta `matchMedia` no agendamento (mesmo
helper `consulta()` de `Malha.tsx` e `usaLanterna.ts`) e usa duração 0: a troca
volta a ser instantânea. Sem `matchMedia` (jsdom, SSR) o helper devolve `false`,
que é o caminho com animação.

### 4. Tempos, em `lib/abertura.ts`

Continuam derivados, nunca escritos à mão no CSS:

- `msPorCaractereApagando: 14` — apagar é mais rápido que digitar, como um
  backspace segurado. 47 caracteres × 14ms ≈ 658ms.
- `esperaTroca: 120` — o respiro entre a frase apagada e a nova começando.
- A **reescrita usa a mesma cadência da abertura** (34ms/caractere): a digitação
  é a assinatura do site, e uma segunda cadência faria a troca parecer outro
  efeito. Custo: PT→EN leva ~2,3s de ponta a ponta. Se ficar longo, é um número
  em `ATOS`, e o resto se ajusta sozinho.

## Descartado

- **Duas frases sobrepostas** (a antiga apagando enquanto a nova escreve, em
  grid stack): resolveria o flash sem máquina de estado, mas põe dois `<h1>`
  com o mesmo papel no DOM — texto duplicado para leitor de tela e ambiguidade
  sobre qual caixa é o ímã da lanterna.
- **Empilhar `caractere-surge` + `caractere-some` na mesma declaração**, para
  apagar sem acender quem não estava aceso: funciona no papel (a segunda
  animação não contribui durante o próprio delay), mas depende de o navegador
  não reiniciar a primeira quando a lista de animações muda — comportamento que
  eu teria que provar em cada navegador para poder confiar.
- **Contar em JS quantos caracteres estão acesos** (`(agora - t0) / 34`) para
  apagar só o prefixo escrito: exigiria um `t0` que o componente não tem — a
  animação CSS começa na primeira pintura, que pode ser bem antes da hidratação.
  Precisão inventada.
- **Enfileirar os cliques** (terminar o ciclo antes de atender o próximo):
  simples, mas o clique fica até ~2s sem resposta visível. Parece travado.

## Verificação

- `npm test` — unidade: as fases e a máquina de estado com fake timers
  (incluindo a martelada PT/EN/PT/EN), as durações derivadas em `lib/abertura`,
  e a garantia que já existia (nenhum caractere preso a um atraso vencido).
- `npm run lint` e `npm run build`.
- `npx playwright test` — é o único lugar que enxerga opacidade computada:
  que a frase realmente esvazia depois do clique, que reescreve inteira e sem
  cursor aceso no fim, e que a caixa do `.oneliner` (o ímã) continua certa.
- O que jsdom não prova e o e2e prova: a remontagem por `tomada` reiniciando a
  animação de verdade.
