# A Inscrição da Trilha — Design

> Especificação de `202lab.com.br/trilha/inscricao`, a terceira página do site.
> Escrita em 20/08/2026, a partir de dez rodadas de perguntas com o Matheus.
> Este documento **não foi implementado por esta conversa** — de propósito. Ele
> é a entrada da próxima, e a conversa de origem faz parte dele (§2).
>
> Contexto herdado: `2026-07-28-main-page-202-design.md` (identidade, tokens,
> stack) e `2026-08-17-a-tese-design.md` (a segunda página, e o precedente de
> revogar uma decisão anterior de propósito).

---

## 1. O que é

Uma **lista de inscrição para a próxima trilha da 202**. A pessoa entrega
contato, retrato de universidade, méritos, experiência com AI, situação de
trabalho e disponibilidade. A 202 recebe isso num banco e usa para escolher a
dedo quem entra.

**O que ela não é:**

- **Não é um formulário de captura de lead.** Não existe para inflar número. O
  link é passado a dedo, no privado, e a página fica **fora dos buscadores**.
- **Não é uma prova.** Não tem pergunta que a pessoa possa errar. Tem perguntas
  que a posicionam.
- **Não é um "conte sua história".** A regra dura do Matheus: *"não quero que
  ela escreva textão"*. Quase tudo é clique. O texto livre existe em três
  lugares, todos opcionais e todos com limite de caracteres (§4.8).

### Isto revoga (parcialmente) uma decisão anterior, de novo

A `2026-07-28-main-page-202-design.md` §13 já foi flexibilizada uma vez, pela
tese. Ela continua valendo para o que segue fora: cases, carreiras, blog,
equipe, analytics de visitante. **Um formulário de inscrição não é nenhuma
dessas coisas** — é uma porta operacional, não conteúdo institucional. E ela
não é linkada de lugar nenhum do site (§11), então o argumento de "o site tem
uma tela só" não é tocado: quem não recebeu o link nunca a encontra.

---

## 2. Decisões fechadas com o Matheus (20/08/2026)

| Ponto | Decisão | Alternativas descartadas |
|---|---|---|
| Rota | `/trilha/inscricao` | `/trilha` (fica reservada para a página da trilha); `/trilha/wishlist`; `/trilha/lista`; `/wishlist` |
| Idioma | **Só PT** | PT+EN como o resto do site |
| Público | Universitário **+ recém-formado** | Só universitário em curso; aberto a qualquer um; incluir ensino médio |
| Formato | **Passo a passo, 5 blocos**, com progresso | Uma página só com scroll; uma pergunta por tela (Typeform) |
| Tamanho | **~3 min, ~25 campos** | ~90s / 12–15 campos; ~5 min / 30–40 campos |
| Texto livre | **3 campos, todos opcionais**, com limite | 2 obrigatórios; 1 só no fecho; zero |
| Universidades | **Lista curta de 9 + "Outra"** | Lista curada de ~30 com busca; campo aberto; lista fechada sem "Outra" |
| Unidade | **Só a USP**: POLI, Med Pinheiros, FEA, San Fran, Outra | Estender a FGV e Unicamp; campus em vez de unidade; todas as instituições |
| Curso | **Lista de ~40 com busca** + "Outro" | Área → curso em dois passos; só a grande área |
| Ano | **Ano atual + ano previsto de conclusão** | Só o ano atual; só o previsto |
| Prêmios | **Repeater de texto curto**, um por bloco | Categorias marcáveis + nível; categorias sem nível; uma única "maior conquista"; texto + nível |
| Nível de AI | **Escala de 5 degraus + checklist de ferramentas** | Só a escala; só o checklist; nota de 1 a 10 |
| Trabalho | **3 perguntas fechadas** (situação, AI no trabalho/estudo, empreendedorismo) | 2 perguntas; 5 perguntas com porte e tempo de casa |
| Contato | Nome, e-mail, **WhatsApp obrigatório**, **idade**, cidade/estado, LinkedIn opcional | Só os três; sem idade; sem LinkedIn |
| LGPD | **Aceite explícito**, checkbox obrigatório | Sem aceite formal |
| Confirmar intenção | **Não existe checkbox.** Inscrever-se já é a confirmação | Checkbox "confirmo que quero participar" |
| Disponibilidade | **Faixas de horas/semana** | Número livre; faixas + período do dia |
| Origem | **7 opções + "quem te indicou?" condicional** | 7 sem quem indicou; 4 amplas |
| Banco | **Supabase (Postgres)** | Google Sheets; Airtable; Neon/Vercel Postgres |
| E-mail | **Sim, Resend**, de `trilha@202lab.com.br`, **destacável por variável** | Sem e-mail; só aviso para o Matheus; `resend.dev` |
| Anti-abuso | **E-mail único + honeypot + limite por IP** | Só e-mail único; captcha (Turnstile) |
| Admin | **Página no site, com senha** | Painel do Supabase puro; magic link; basic auth |
| Uso do admin | **Painel de BI + filtro global**; sem score automático | Score calculado que ordena sozinho; só tabela + CSV |
| Triagem | **sim / talvez / não + nota livre**, salvos | Só sim/talvez/não; organizar fora, na planilha |
| Prazo | **Sem data visível + interruptor no admin** | Data de encerramento visível; sem interruptor |
| Depois de enviar | **Confirmação + convite para ler a `/tese`** | Confirmação seca; pedir para passar o link adiante |
| Busca | **`noindex`, fora do Google** | Indexada normalmente |
| Estética | **Preto, sem malha viva**, sem lanterna | Preto com a malha viva da home; claro e neutro; híbrido |
| Formato da trilha | **Não é afirmado na copy** — ainda não está fechado | Remoto assíncrono; remoto com encontro fixo; híbrido presencial |
| Custo | **Gratuita, e a copy diz isso** | Paga; não mencionar |
| Fases | **1 = página + banco + e-mail. 2 = admin/BI** | Tudo de uma vez |

### Três decisões que merecem o porquê escrito

**A lista de universidades é curta de propósito, e eu recomendei o contrário.**
Argumentei por ~30 instituições com busca, porque com 9 opções a maioria cai em
"Outra" e a comparação some justamente onde importa. O Matheus escolheu 9 —
FGV, IME, Insper, Inteli, ITA, Link, Unicamp, Unifesp, USP. Olhando a lista
depois de fechada, a escolha se explica sozinha e o meu argumento estava mal
calibrado: **a lista não é um índice de universidades boas, é a declaração de
onde a 202 caça.** ITA e IME de um lado, USP/Unicamp/Unifesp de outro, e as
quatro escolas de negócio novas (FGV, Insper, Inteli, Link) de um terceiro.
Quem não está em nenhuma delas não é barrado — cai em "Outra" e segue. Se o
volume em "Outra" incomodar depois, a lista mora num arquivo só (§5) e cresce
sem tocar em mais nada.

**Os prêmios são texto livre, e isso custa o eixo de seleção automático.**
Argumentei por categorias marcáveis com nível (regional → internacional),
porque isso ordena 400 inscritos sem leitura humana. O Matheus recusou pelo
motivo certo: *"deixar a pessoa escrever aqui é mais fácil, devido ao grande
número de possibilidades"*. Ele tem razão sobre o domínio — a cauda de prêmios
brasileiros é longa demais para enumerar sem irritar quem tem muitos. A solução
que ele deu resolve o problema real: **um bloco por prêmio, adicionados um a
um**, em vez de uma caixa gigante. Não é textão, e é comparável a olho. **A
consequência é aceita e explícita: ranquear mérito é sempre leitura humana.** É
coerente com a decisão de não ter score automático.

**Não há score automático, e isso foi escolhido, não esquecido.** Eu propus uma
pontuação calculada que já entregasse a lista ordenada. O Matheus: *"Quero um
processo de Score, mas não automático do zero. Nós mesmo organizamos. Quero
ter o potencial principalmente de analisar as inscrições para BI. A seleção
fazemos na mão."* O admin, então, **não opina** — ele mostra o conjunto
(distribuições, cruzamentos, filtro global) para que a decisão seja informada,
e guarda a marcação humana. Um número que ordena candidatos é fácil de
construir e difícil de desconfiar depois; um painel que mostra a distribuição
obriga a olhar.

---

## 3. As duas fases

O Matheus cortou o escopo, e o corte é bom:

> *"não precisamos fazer tudo junto. Devemos criar a pág de inscrição com
> armazenamento de dados, depois criamos o admin para visualizar"*

**Fase 1 — a inscrição.** A página `/trilha/inscricao` inteira, o banco no
Supabase gravando, o anti-abuso, o e-mail de confirmação (destacável), a tela
de fecho, `noindex`, testes. **Sai desta fase uma página que pode receber o
link no mesmo dia.**

**Fase 2 — o admin.** `/trilha/inscricao/admin` com senha, painel de BI com
filtro global, marcação sim/talvez/não com nota, export CSV, e o interruptor
que encerra as inscrições.

**O que a fase 1 tem que garantir para a fase 2 existir sem retrabalho:** o
schema (§6) já nasce completo, com as colunas de triagem (`status`, `nota`,
`avaliado_em`) e o `estado_inscricoes` da chave-geral. A fase 2 lê e escreve o
que a fase 1 já criou; não migra nada.

**Enquanto a fase 2 não existe**, o Matheus lê as inscrições pelo painel do
Supabase — que já vem com tabela, filtro e export. Não é o que ele quer no
fim, mas cobre a primeira semana sem nenhuma linha de código.

---

## 4. O formulário, bloco a bloco

Cinco blocos depois da abertura. Um por tela, com indicador de progresso
(`3 de 5`). Voltar é sempre possível e **não perde o que já foi preenchido**.

O estado do formulário vive em `sessionStorage` enquanto a pessoa preenche, e
é apagado no envio bem-sucedido. Motivo: o público chega pelo WhatsApp, no
celular, e uma notificação que troca de app não pode custar 3 minutos de
digitação. Não é `localStorage` de propósito — a inscrição pela metade não deve
sobreviver a fechar o navegador e ressuscitar semanas depois.

### 4.0 Abertura

Uma tela curta antes do primeiro campo. Três a cinco linhas: **o que é, para
quem é, o que exige, e que é gratuita.**

**A copy não afirma o formato da trilha** (remoto, presencial, duração,
calendário) porque ele **ainda não está fechado**. Ela fala do que a trilha
*exige* — ritmo próprio, autonomia, entrega no fim — que é o que a `/tese` já
afirma em "TRILHAS · Percursos autodidatas" e que não vai mudar. Nada aqui pode
ser desmentido depois.

**A gratuidade é dita, e é dita cedo.** É a primeira dúvida de todo mundo, e
"gratuita, e o filtro é a seleção" eleva o valor percebido em vez de baixar.

**Por que existe uma abertura.** O link vai ser passado no privado, para quem
já tem contexto. Mas link no privado é encaminhado, e a segunda pessoa a abrir
não tem contexto nenhum. A abertura também é o que faz a pessoa certa se
reconhecer e a errada desistir antes de gastar 3 minutos.

**Um botão só:** `COMEÇAR`. Sem link para a home, sem link para a tese, sem
troca de idioma. A página tem uma função.

### 4.1 Bloco 1 — Quem é você

| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| Nome completo | texto | sim | Nome completo mesmo, não apelido — o rótulo diz isso |
| E-mail | e-mail | sim | Validado no cliente e no servidor. É a **chave** da inscrição (§6) |
| WhatsApp | telefone | sim | Máscara BR `(11) 91234-5678`, validação de DDD e de 10/11 dígitos |
| Idade | select | sim | 16 a 30, depois `31+`. Select e não campo numérico — é um clique, e evita "2005" no campo de idade |
| Estado | select | sim | As 27 UFs |
| Cidade | texto | sim | Livre. Enumerar 5.570 municípios não cabe; o par UF+cidade já agrupa bem no BI |
| LinkedIn | URL | **não** | Aceita `linkedin.com/in/...` ou só o usuário. Poupa cinco perguntas depois, mas trava quem é de 1º ano e não tem perfil — por isso opcional |

**A idade importa por dois motivos:** fecha o retrato e sinaliza menor de 18,
o que muda o aceite de LGPD (§8).

### 4.2 Bloco 2 — Universidade e méritos

| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| Instituição | select | sim | As 9 (§5.1) + `Outra` |
| Qual instituição | texto | condicional | Só se `Outra` |
| Unidade da USP | select | condicional | Só se `USP`. POLI, Med Pinheiros, FEA, San Fran, `Outra` (§5.2) |
| Curso | select com busca | sim | ~40 (§5.3) + `Outro` |
| Qual curso | texto | condicional | Só se `Outro` |
| Ano atual | select | sim | 1º a 6º ano, `Trancado`, `Já formado` |
| Conclusão prevista | select | sim | 2026 a 2033, `Já formei` |
| Prêmios e honrarias | **repeater** | **não** | Ver abaixo |

**O repeater de prêmios.** Uma linha de texto curto (máx. 120 caracteres) por
prêmio, com um botão `+ adicionar prêmio`. Começa com um campo vazio; o
`+` só aparece depois que o campo atual tem conteúdo. Máximo de 8 blocos — não
para limitar quem tem muitos, mas porque quem tem 8 já disse tudo que precisa
para ser lido por um humano.

Placeholder de exemplo no primeiro campo: `Medalha de ouro na OBMEP 2023`. O
exemplo faz mais pelo formato da resposta do que qualquer instrução.

**Se a pessoa não tem prêmio nenhum, ela simplesmente avança.** Não existe
"nenhum ainda" para marcar — marcar a própria ausência é humilhante e não
acrescenta dado nenhum (vazio já é vazio).

**Por que ano atual E conclusão prevista.** "3º ano" quer dizer coisas
diferentes num curso de 4 e num de 6 anos, e não diz nada de quem trancou. O
ano de conclusão é o único dos dois que não envelhece: uma inscrição de agosto
de 2026 continua legível em 2027.

### 4.3 Bloco 3 — AI

| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| Nível | radio, 5 degraus | sim | §5.4 |
| Ferramentas que já usou | checkbox | sim (mín. 1) | §5.5. Inclui `Nenhuma dessas` |
| AI nos estudos | select | sim | Nunca / às vezes / quase todo dia / é o meu principal jeito de estudar |
| Sua história com AI | texto, 300 chars | **não** | Contador visível. Placeholder: `A coisa mais interessante que você já fez com AI.` |

**Por que a escala descreve comportamento e não adjetivo.** "Iniciante /
intermediário / avançado" mede autoconfiança, não habilidade — e nota de 1 a 10
transforma a curva numa linha reta em 7. Cada degrau da escala (§5.4) é uma
frase sobre o que a pessoa *faz*. O checklist de ferramentas serve de
contraprova: quem se declara no degrau 4 e marca só `ChatGPT` está dizendo
outra coisa.

### 4.4 Bloco 4 — Trabalho e empreendedorismo

| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| Situação hoje | select | sim | §5.6 |
| AI no trabalho | select | condicional | Só se trabalha. §5.7 |
| Empreendedorismo | select, escada de 6 | sim | §5.8 |

**A escada de empreendedorismo é uma escada, e a ordem é a informação.** De
"nunca pensei nisso" a "já levantei investimento", cada degrau pressupõe o
anterior. Isso é o que permite agrupar no BI sem inventar critério depois.

**"AI no trabalho" é diferente de "nível de AI".** Usar sob pressão de entrega,
num lugar onde outra pessoa depende do resultado, é outro dado — e o degrau
`Eu implantei AI pro time` é o mais informativo do formulário inteiro.

### 4.5 Bloco 5 — A trilha

| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| Disponibilidade | select | sim | Até 5h / 5–10h / 10–20h / 20–30h / mais de 30h por semana |
| Como conheceu a 202 | select | sim | §5.9 |
| Quem te indicou | texto | condicional | Só se `Indicação de alguém` |
| Detalhar como conheceu | texto, 300 chars | **não** | |
| Algo que a gente deveria saber e não perguntou | texto, 300 chars | **não** | |
| Aceite de dados | checkbox | **sim** | §8 |

**Não existe checkbox "confirmo que quero participar".** Decisão do Matheus:
*"a pessoa se inscrever já confirma a participação"*. Ele está certo — pedir
para confirmar depois de 25 campos sugere que os 25 campos não contavam.

**Por que "quem te indicou" vale um campo condicional.** Ele te mostra quais
pessoas estão trazendo outras. É a única informação do formulário que **só dá
para coletar na hora** — perguntar depois, na conversa, ninguém lembra.

**A disponibilidade é faixa e não número.** "10–20h" é uma resposta honesta;
"14h" é chute com cara de precisão. E faixa é um clique.

### 4.6 O envio

Botão `ENVIAR INSCRIÇÃO`. Enquanto o servidor responde: estado de carregando,
botão desabilitado, sem possibilidade de duplo clique.

**Erros são mostrados no bloco onde moram, não numa lista no fim.** Se a
validação do servidor derrubar algo, a pessoa volta para o bloco daquele campo
com o erro ao lado dele.

**Se o envio falhar por rede**, o conteúdo não é perdido (`sessionStorage`) e o
botão volta a funcionar.

### 4.7 A tela de confirmação

Confirmação curta — *recebemos, a gente entra em contato* — mais **um convite
para ler a `/tese`**.

**Por que a tese e não outra coisa.** A pessoa acabou de dizer que quer entrar:
é o minuto de maior atenção que a 202 vai ter dela. Quem lê a tese e concorda
chega diferente na conversa. Descartado o *"passe o link adiante"*: o link é
passado a dedo de propósito, e pedir encaminhamento troca curadoria por volume.

**Se o e-mail estiver desligado** (§7), a tela não promete e-mail nenhum. O
texto é condicional à variável.

**Reinscrição.** Se o e-mail já existe, a inscrição anterior é atualizada e a
tela diz isso: *atualizamos a sua inscrição*. Nunca "você já se inscreveu" com
cara de erro — a pessoa fez tudo certo duas vezes.

### 4.8 O texto livre, e por que ele é exatamente este

Três campos, **todos opcionais**, todos com contador visível:

1. **Sua história com AI** (bloco 3, 300 chars)
2. **Detalhar como conheceu a 202** (bloco 5, 300 chars)
3. **Algo que a gente deveria saber e não perguntou** (bloco 5, 300 chars)

Mais o repeater de prêmios, que é texto livre em blocos curtos (§4.2).

**O limite é quem impede o textão, não o rótulo.** Pedir "seja breve" não
funciona; um contador descendo de 300 funciona. E 300 caracteres é o suficiente
para uma coisa boa e insuficiente para uma redação.

**Todos opcionais foi decisão consciente** contra a alternativa de obrigar. Um
campo aberto obrigatório produz respostas vazias de quem só quer passar, e aí
a leitura de 300 fichas fica pior, não melhor.

---

## 5. As listas enumeradas

Todas vivem em **um arquivo só**, `lib/inscricao.ts`, exportadas como
`as const`, no mesmo padrão de `lib/tese.ts` e `lib/copy.ts`. Nenhuma opção
escrita no JSX. O Matheus edita esse arquivo sem tocar em mais nada.

### 5.1 Instituições

Em ordem alfabética, para varredura visual:

`FGV` · `IME` · `Insper` · `Inteli` · `ITA` · `Link` · `Unicamp` · `Unifesp` ·
`USP` · **`Outra`**

`Outra` abre um campo de texto. Ver o porquê da lista curta em §2.

### 5.2 Unidades da USP

Só aparece se a instituição for `USP`:

`POLI` · `Med Pinheiros` · `FEA` · `San Fran` · **`Outra`**

Os rótulos são os do Matheus, verbatim. **A confirmar antes de implementar**
(§15): se `Med Pinheiros` deve aparecer assim ou como `Medicina`, e se
`San Fran` deve trazer `(Direito)` entre parênteses para quem não é de São
Paulo e não reconhece o apelido.

### 5.3 Cursos

Campo com busca por digitação (`combobox`) sobre ~40 opções, mais `Outro`. Duas
letras já filtram. Rascunho da lista, a revisar na implementação:

Administração · Arquitetura e Urbanismo · Biomedicina · Ciência da Computação ·
Ciência de Dados · Ciências Atuariais · Ciências Contábeis · Ciências
Econômicas · Ciências Sociais · Design · Direito · Educação Física ·
Enfermagem · Eng. Aeronáutica · Eng. Ambiental · Eng. Civil · Eng. de
Computação · Eng. de Controle e Automação · Eng. de Materiais · Eng. de
Produção · Eng. de Software · Eng. Elétrica · Eng. Mecânica · Eng. Mecatrônica ·
Eng. Naval · Eng. Química · Estatística · Farmácia · Física · Fisioterapia ·
Geologia · Jornalismo · Letras · Matemática · Matemática Aplicada · Medicina ·
Medicina Veterinária · Nutrição · Odontologia · Psicologia · Publicidade e
Propaganda · Química · Relações Internacionais · Sistemas de Informação ·
**Outro**

### 5.4 Nível de AI — a escala de 5 degraus

Guardados como `0`–`4`, exibidos como frases:

| # | Rótulo |
|---|---|
| 0 | Nunca usei, ou usei uma ou duas vezes |
| 1 | Uso de vez em quando, para tirar dúvida |
| 2 | Uso quase todo dia no estudo ou no trabalho, e sei escrever um bom prompt |
| 3 | Já construí algo com AI além do chat — automação, integração via API, agente, ou programo com AI dentro do editor |
| 4 | É o meu trabalho, ou perto disso — construo produto ou sistema com AI, ou levo isso para outras pessoas |

### 5.5 Ferramentas de AI (múltipla escolha, mínimo 1)

`ChatGPT` · `Claude` · `Gemini` · `Copilot no editor` · `Cursor / Windsurf /
Claude Code` · `n8n / Make / Zapier com AI` · `API da OpenAI, Anthropic ou
Google` · `Geração de imagem (Midjourney, etc.)` · `NotebookLM` · `Perplexity` ·
`Alguma que eu mesmo construí` · **`Nenhuma dessas`**

`Nenhuma dessas` é exclusiva: marcá-la desmarca as outras.

### 5.6 Situação hoje

`Só estudo` · `Estágio` · `CLT ou PJ` · `Freelancer` · `Iniciação científica ou
pesquisa` · `Tenho empresa própria` · `Outro`

### 5.7 AI no trabalho (só para quem trabalha)

`Não uso` · `Uso, mas não é oficial` · `Uso e é aceito pelo time` · `É central
para o que eu entrego` · `Eu implantei AI para o time`

### 5.8 Empreendedorismo — a escada

| # | Rótulo |
|---|---|
| 0 | Nunca pensei nisso |
| 1 | Já pensei, nunca tirei do papel |
| 2 | Já tentei algo que não foi para a frente |
| 3 | Tenho algo rodando hoje, ainda sem receita |
| 4 | Já tive receita, com cliente pagante |
| 5 | Já levantei investimento |

### 5.9 Como conheceu a 202

`Indicação de alguém` · `LinkedIn` · `Instagram` · `Evento ou palestra` ·
`Grupo ou comunidade` · `Já conhecia a 202` · `Outro`

`Indicação de alguém` abre o campo `quem te indicou?`.

---

## 6. Os dados

### 6.1 Onde

**Supabase (Postgres).** Escolhido contra Google Sheets, Airtable e
Neon/Vercel Postgres por ser banco de verdade com painel de leitura pronto —
o que cobre a fase 1 sem admin nenhum (§3).

### 6.2 Como a inscrição chega lá

**Nunca direto do navegador.** O formulário envia para uma Route Handler do
Next (`POST /trilha/inscricao/api`), que valida tudo de novo no servidor e
escreve no Supabase com a **service role key**.

**RLS ligada, sem nenhuma policy pública.** Consequência: com a chave anônima —
a única que poderia vazar — não se lê nem se escreve nada. A chave que escreve
vive só em variável de ambiente do servidor e nunca é enviada ao navegador.

Isso não é zelo abstrato: a tabela guarda nome, e-mail, telefone e idade de
estudantes, alguns menores de idade.

### 6.3 Schema

Uma tabela, `inscricoes`. **Nasce completa na fase 1**, com as colunas que só a
fase 2 usa — assim a fase 2 não migra nada.

| Coluna | Tipo | Nota |
|---|---|---|
| `id` | uuid, PK | |
| `criado_em` | timestamptz | |
| `atualizado_em` | timestamptz | Muda na reinscrição |
| `nome` | text | |
| `email` | citext, **unique** | A chave. Ver §6.4 |
| `whatsapp` | text | Guardado só com dígitos; formatado na leitura |
| `idade` | smallint | `31` representa "31+" |
| `estado` | char(2) | |
| `cidade` | text | |
| `linkedin` | text, null | |
| `instituicao` | text | Um dos 9 ou `OUTRA` |
| `instituicao_outra` | text, null | |
| `unidade_usp` | text, null | |
| `curso` | text | |
| `curso_outro` | text, null | |
| `ano_atual` | text | |
| `conclusao_prevista` | smallint, null | `null` = já formado |
| `premios` | jsonb | Array de strings curtas. `[]` se nenhum |
| `nivel_ai` | smallint | 0–4 |
| `ferramentas_ai` | text[] | |
| `ai_estudos` | text | |
| `historia_ai` | text, null | ≤ 300 |
| `situacao` | text | |
| `ai_trabalho` | text, null | |
| `empreendedorismo` | smallint | 0–5 |
| `disponibilidade` | text | |
| `origem` | text | |
| `origem_quem_indicou` | text, null | |
| `origem_detalhe` | text, null | ≤ 300 |
| `algo_mais` | text, null | ≤ 300 |
| `aceite_dados` | boolean | Sempre `true` — existe para registrar |
| `aceite_em` | timestamptz | Quando o aceite foi dado |
| `ip_hash` | text | §8 |
| `status` | text | **Fase 2.** `novo` \| `sim` \| `talvez` \| `nao` |
| `nota` | text, null | **Fase 2.** Observação do avaliador |
| `avaliado_em` | timestamptz, null | **Fase 2.** |

Mais uma tabela de uma linha só, `config`, com `inscricoes_abertas boolean` — o
interruptor da §9.4.

**Por que `premios` é `jsonb` e não uma tabela filha.** São strings livres que
ninguém vai agregar; virar tabela só acrescentaria um `join` em toda leitura.
Se um dia os prêmios ganharem estrutura (nível, ano, categoria), aí a tabela
filha se justifica — e o `jsonb` migra sem perda.

**`ferramentas_ai` é `text[]` e não `jsonb`** porque *é* agregado: o painel de
BI conta quantas pessoas marcaram cada ferramenta, e `unnest` sobre `text[]`
faz isso direto no SQL.

### 6.4 E-mail é a chave, e reinscrever atualiza

Índice único em `email`. Segunda inscrição com o mesmo e-mail faz **upsert**:
sobrescreve tudo, atualiza `atualizado_em`, **preserva `criado_em`,
`status` e `nota`**.

Preservar `status` e `nota` importa: senão alguém já avaliado como `sim`
reenviar o formulário apaga a avaliação, e a lista de triagem mente.

---

## 7. O e-mail de confirmação

**Resend**, de `trilha@202lab.com.br`. Endereço escolhido contra
`no-reply@` porque sempre tem quem responda, e uma resposta que se perde é uma
conversa que não aconteceu.

**Destacável por variável de ambiente** (`EMAIL_CONFIRMACAO_ATIVO`). Motivo: a
verificação do domínio no Resend depende de propagação de DNS no Registro.br,
que pode levar horas. Com o interruptor, **a página vai ao ar gravando
inscrições mesmo antes de o e-mail funcionar**, e o Matheus liga o e-mail
depois sem novo deploy de código.

**Falha de envio nunca derruba a inscrição.** A gravação no banco acontece
primeiro; o e-mail é tentado depois e o erro é registrado, não propagado. Uma
inscrição perdida é irrecuperável; um e-mail não enviado é um aborrecimento.

**O conteúdo é curto:** confirma que chegou, diz que a 202 entra em contato,
linka a `/tese`. Sem HTML elaborado — e-mail de confirmação com layout de
newsletter cai em promoções.

**Ninguém é avisado a cada inscrição.** Descartado o aviso para o Matheus: útil
nas primeiras semanas, insuportável a partir da terceira.

---

## 8. Privacidade, LGPD e anti-abuso

**Aceite explícito**, checkbox obrigatório no último bloco, com texto curto:
o que é coletado, para que serve (contato sobre a trilha), e que não é
repassado a terceiros. `aceite_dados` e `aceite_em` ficam gravados — o registro
é o ponto, não a caixinha.

**Menores de idade.** A `idade` é coletada (§4.1) justamente porque parte do
público tem 16 ou 17 anos. **A ser decidido antes do go-live** (§15): se o
texto de aceite ganha uma linha específica para menores, e se o admin deve
sinalizar visualmente quem é menor.

**O IP não é guardado.** Guarda-se `sha256(ip + IP_SALT)`, com o sal em
variável de ambiente. Serve para o limite de taxa e não serve para identificar
ninguém.

**Três camadas de anti-abuso, nenhuma visível para quem é real:**

1. **E-mail único** — resolve o caso comum, que é a pessoa enviar duas vezes
   por insegurança (§6.4).
2. **Honeypot** — um campo escondido que só robô preenche. Se vier preenchido,
   o servidor responde sucesso e não grava nada.
3. **Limite por IP** — máximo de 5 inscrições por hora pelo mesmo `ip_hash`.

Descartado captcha (Turnstile): mais uma conta, mais duas chaves e fricção real
num link que vai ser passado a dedo, no privado.

---

## 9. O admin e o painel de BI (fase 2)

Rota: `/trilha/inscricao/admin`. `noindex`, como a página pai.

### 9.1 A senha

**Senha única em variável de ambiente**, trocada por um cookie de sessão
assinado, válido por alguns dias. Sem conta, sem serviço externo, e a senha
nunca chega ao navegador.

Descartado magic link via Supabase Auth (mais peças montadas para um usuário
só) e basic auth (não tem como sair, só fechando o navegador).

### 9.2 O painel

Decisão do Matheus: **painel completo, com filtro que atravessa tudo.**

- **Topo:** total de inscrições, inscrições desta semana, taxa de conclusão
  (quantos começaram × quantos enviaram).
- **Distribuições**, uma por campo fechado: instituição, unidade da USP, curso,
  ano atual, conclusão prevista, nível de AI, ferramentas, AI nos estudos,
  situação, AI no trabalho, empreendedorismo, disponibilidade, origem, estado,
  idade.
- **Cruzamento livre:** dois selects (eixo × eixo) sobre qualquer par de campos
  fechados. Ex.: nível de AI × ano atual.
- **Filtro global:** clicar em `ITA` numa distribuição faz **todos** os gráficos
  e a tabela passarem a falar só do ITA. Filtros acumulam e são removíveis um a
  um.
- **Tabela** com todas as inscrições e **export CSV** do recorte filtrado.
- **Ficha individual**, com os textos livres e os prêmios legíveis de corrido.

**O painel não ordena por mérito e não calcula pontuação** (§2).

### 9.3 A triagem

Em cada ficha: `sim` / `talvez` / `não` mais uma **nota livre**. Salvos no
banco, presentes no CSV, e disponíveis como mais um eixo do BI — *"quantos
'sim' vieram de cada instituição"*.

A nota livre existe porque marcar sem escrever o motivo garante esquecer o
motivo até a semana seguinte.

### 9.4 O interruptor

Um botão que grava `config.inscricoes_abertas = false`. Com ele desligado, a
`/trilha/inscricao` mostra uma tela de **inscrições encerradas** em vez do
formulário — sem deploy, sem mexer em código.

**Nenhuma data aparece na página.** Data visível cria urgência real, mas vira
mentira no dia em que o prazo for estendido — e ele vai ser.

---

## 10. Movimento e estética

**Preto, sem a malha viva.** Mesma paleta do resto do site (`--preto-202`,
`--branco-202`, `--cinza-texto`, `--fio-estrutura`, `--verde-sinal`), fundo
estático. O Matheus escolheu contra a malha viva, e o motivo se sustenta: a
maioria chega pelo celular, e nada deve disputar atenção com o campo ativo.

**Sem lanterna.** Não é opcional: um cursor que vira foco de luz é ótimo numa
tela para contemplar e péssimo numa tela para preencher.

**`--verde-sinal` marca o estado ativo** — o campo em foco, o passo atual do
progresso, o botão de avançar. É o único uso de cor forte.

**Contraste alto nos campos.** Texto branco sobre preto, borda em
`--fio-estrutura` no repouso e `--verde-sinal` no foco. Erro em vermelho
legível, nunca só cor: erro sempre tem texto junto.

**Celular primeiro.** Alvos de toque grandes, teclado certo por campo
(`inputmode="email"`, `inputmode="tel"`, `inputmode="numeric"`), select nativo
onde ele é melhor que qualquer coisa customizada — e ele quase sempre é, no
celular.

**Transição entre blocos:** um deslocamento curto, com `prefers-reduced-motion`
respeitado. Nada elaborado. Cada bloco novo devolve o foco para o primeiro
campo, pelo teclado e pelo leitor de tela.

---

## 11. Rota, metadados e descoberta

**Rota:** `/trilha/inscricao`. `/trilha` fica **livre** — a decisão do Matheus
foi reservar a raiz para a página da trilha, que vem depois.

**Subpath, e não subdomínio** (decidido em 20/08/2026, no fecho do Q&A). O
`trilha.202lab.com.br` dos planos de julho **não responde mais** (NXDOMAIN na
mesma data), então a pergunta não era escolher entre dois endereços no ar — era
decidir se valia ressuscitar um. Não vale, para o que é público:

- **Um domínio só diz uma coisa só.** `202lab.com.br/trilha` lê como parte da
  202; `trilha.202lab.com.br` lê como outro produto. A `/tese` já posiciona
  trilhas como uma das cinco frentes da casa, não como empresa separada.
- **Um repo, um deploy, os mesmos tokens.** Esta página reusa `globals.css`, a
  paleta e a pipeline de teste do site. No subdomínio ela vira código do repo da
  trilha e perde tudo isso.
- **O link vai ser colado no WhatsApp.** Dois domínios empilhados são mais
  fáceis de digitar errado e de ler como golpe.

**O subdomínio nunca foi decisão de endereço, foi de infraestrutura.** A §8 da
spec de julho criou o repo do site separado para que mexer nele não derrubasse a
trilha. Esse motivo continua válido — mas só para a **aplicação** da trilha, não
para a página que a apresenta.

**A fronteira, se os dois voltarem a existir:**

| Endereço | O que é |
|---|---|
| `202lab.com.br/trilha` | Descobrir a trilha e se inscrever. Público, sem login, neste repo |
| `trilha.202lab.com.br` | **Fazer** a trilha. App logado, repo próprio, deploy próprio |

Não é confusão de dois endereços para a mesma coisa: é a fronteira entre
"entrar" e "estar dentro".

**O que não fazer:** proxy de `/trilha/*` para o app da trilha por rewrite no
`next.config.ts`. Isso faz o deploy do site virar ponto único de falha para os
dois — exatamente o que a separação de julho comprou.

**`noindex, nofollow`** no metadata da rota e de tudo abaixo dela. Combina com
o que o Matheus disse: sem menção na home, link passado a dedo. Reversível numa
linha.

**Nenhum link para ela em lugar nenhum do site.** Nem home, nem tese, nem
rodapé. A página existe para quem recebe o link.

**Open Graph mínimo.** O link vai ser colado no WhatsApp e no LinkedIn, então
título e descrição precisam existir e ser decentes. Sem imagem própria — a
`opengraph-image` do site serve.

---

## 12. Testes

Segue o padrão da casa (vitest + Playwright, já configurados).

**Unidade (`lib/inscricao.test.ts`):**
- Validação de e-mail, WhatsApp (DDD válido, 10/11 dígitos), URL de LinkedIn.
- Limites dos textos livres (300) e do prêmio (120), e o teto de 8 prêmios.
- Coerência das listas: sem duplicata, sem string vazia, `Outra`/`Outro` sempre
  em último.
- Regras condicionais: `Outra` exige `instituicao_outra`; `USP` exige
  `unidade_usp`; `Indicação de alguém` exige `origem_quem_indicou`; quem não
  trabalha não manda `ai_trabalho`.
- `Nenhuma dessas` é exclusiva no checklist de ferramentas.

**Servidor:**
- Payload inválido é recusado **no servidor**, mesmo passando pelo cliente.
- Honeypot preenchido → resposta de sucesso, nada gravado.
- Sexta inscrição do mesmo `ip_hash` na mesma hora é recusada.
- Upsert por e-mail preserva `criado_em`, `status` e `nota`.
- Falha do Resend não derruba a gravação.

**E2E (`e2e/inscricao.spec.ts`):**
- Percurso completo, do primeiro campo à tela de confirmação.
- Voltar um bloco preserva o preenchido.
- Recarregar no meio recupera do `sessionStorage`; enviar limpa.
- Campos condicionais aparecem e somem na hora certa.
- Com `config.inscricoes_abertas = false`, a página mostra a tela de encerrado.
- Navegação inteira por teclado, e foco no primeiro campo a cada bloco.

---

## 13. O que fica fora

- **Score automático.** §2, por decisão.
- **Nível ou categoria nos prêmios.** §2, por decisão.
- **Inglês.** Só PT.
- **Login de candidato.** Ninguém volta para editar; reinscrever com o mesmo
  e-mail atualiza (§6.4).
- **Upload de arquivo** (currículo, certificado). Não foi pedido, e muda o
  perfil de custo e de privacidade da coisa inteira.
- **Analytics de visitante.** Continua fora, como nas duas specs anteriores.
- **Notificação a cada inscrição.** §7.
- **Captcha.** §8.
- **Múltiplas turmas.** A tabela é de uma trilha. Se houver uma segunda, entra
  uma coluna `turma` — e isso é uma decisão futura, não uma preparação agora.

---

## 14. O que depende do Matheus

Ele escolheu criar as contas com um roteiro clicado. São dois, e o segundo tem
espera de DNS — por isso o e-mail é destacável (§7).

**Supabase** (~5 min): criar conta, criar projeto na região `sa-east-1`, copiar
a URL do projeto e a `service_role key`. Rodar um SQL que a fase 1 entrega
pronto (cria as duas tabelas, o índice único e liga a RLS).

**Resend** (~5 min + espera): criar conta, adicionar o domínio
`202lab.com.br`, copiar os 3 registros que ele gerar (MX do `send`, TXT de SPF,
TXT de DKIM) e colar no Registro.br, onde a zona vive. Copiar a API key. A
verificação leva de minutos a algumas horas.

**Variáveis de ambiente na Vercel** (o site está lá — `216.198.79.1`):

| Variável | Fase | O que é |
|---|---|---|
| `SUPABASE_URL` | 1 | URL do projeto |
| `SUPABASE_SERVICE_ROLE_KEY` | 1 | A chave que escreve. **Nunca no cliente** |
| `IP_SALT` | 1 | String aleatória, gerada uma vez |
| `RESEND_API_KEY` | 1 | |
| `EMAIL_CONFIRMACAO_ATIVO` | 1 | `true` / `false` |
| `ADMIN_SENHA` | 2 | A senha do painel |
| `ADMIN_COOKIE_SECRET` | 2 | String aleatória, para assinar o cookie |

**Nenhuma dessas chaves entra no repositório.** O `.env.local` fica no
`.gitignore`; o repo ganha um `.env.example` com os nomes e sem os valores.

---

## 15. Perguntas em aberto

Nenhuma bloqueia a fase 1. Todas devem ser resolvidas antes do go-live.

1. **Os rótulos das unidades da USP.** `Med Pinheiros` e `San Fran` são os
   termos do Matheus. Confirmar se ficam assim ou se ganham a forma longa entre
   parênteses para quem não é de São Paulo (§5.2).
2. **Menores de idade.** O aceite ganha linha específica? O admin sinaliza?
   (§8)
3. **A lista de ~40 cursos** é rascunho meu, não do Matheus. Revisar na
   implementação — em particular se `Link` e `Inteli` têm cursos com nome
   próprio que não estão ali.
4. ~~**O `trilha.202lab.com.br`** volta?~~ **Resolvido em 20/08/2026** — o
   público fica em `202lab.com.br/trilha`; o subdomínio, se voltar, é a
   aplicação logada. Ver §11.
5. **A copy da abertura** precisa de uma passada do Matheus. O formato da
   trilha não é afirmado (§4.0), mas *o que ela exige* é — e essa frase é dele,
   não minha.
6. **Quem mais entra no admin** além do Matheus. A senha única funciona para
   uma ou duas pessoas; para cinco, magic link volta à mesa (§9.1).

---

## 16. A conversa que gerou este documento

Registrado porque o Matheus pediu que o contexto entrasse na spec: as decisões
da §2 saíram de **dez rodadas de perguntas de múltipla escolha**, em 20/08/2026,
antes de qualquer linha de código — o método que ele já usou na `/tese` e que
está anotado como preferência dele.

Três vezes ele contrariou a minha recomendação: lista curta de universidades,
prêmios em texto livre, e nenhum score automático. As três estão argumentadas
na §2 com o que eu tinha defendido e por que a escolha dele venceu. Se alguém
reabrir uma delas depois, que reabra sabendo o que já foi pesado.
