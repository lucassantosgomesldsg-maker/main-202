-- ═══════════════════════════════════════════════════════════════════════════
-- /trilha/inscricao — schema do Supabase (fase 1)
--
-- Cole isto inteiro no SQL Editor do Supabase e rode. Pode rodar duas vezes:
-- tudo aqui é idempotente (`if not exists`, `on conflict do nothing`,
-- `create or replace`), porque este arquivo vai ser colado num editor web por
-- uma pessoa e não aplicado por uma ferramenta de migração que sabe o que já
-- rodou.
--
-- "Idempotente" aqui quer dizer **criar do zero sem dar erro duas vezes**, e
-- não "migrar uma tabela que já existe". Se a tabela `inscricoes` já existir
-- com colunas diferentes das daqui, este arquivo não a conserta — nesse caso a
-- alteração é manual e consciente, com `alter table`.
--
-- A tabela nasce **completa**, com `status`, `nota` e `avaliado_em`, que só a
-- fase 2 usa (spec §3 e §6.3). Elas custam três colunas nulas hoje e poupam
-- uma migração num banco com dados de gente de verdade depois.
--
-- ── A regra que quebra em silêncio ─────────────────────────────────────────
-- Os `check` abaixo listam os **`id`** que `lib/inscricao.ts` grava, e não os
-- rótulos que a pessoa lê na tela. São coisas diferentes de propósito: a tela
-- mostra "10 a 20h por semana", o banco guarda `DE_10_A_20H`. Um `check`
-- escrito com o rótulo bonito faria o Postgres recusar **toda** inscrição real,
-- e o erro apareceria como um 500 genérico no envio.
--
-- Por isso `lib/inscricao-servidor.test.ts` lê este arquivo e compara cada
-- lista de `check` com a lista correspondente de `lib/inscricao.ts`. Acrescentar
-- um curso lá e esquecer daqui quebra `npm test`, e não a inscrição de alguém.
-- ═══════════════════════════════════════════════════════════════════════════


-- `citext` é o que faz "Ana@Gmail.com" e "ana@gmail.com" colidirem no índice
-- único de `email` (spec §6.4). A validação do servidor já normaliza para
-- minúsculas, mas o tipo é a garantia que não depende de o código estar certo.
create extension if not exists citext;


-- ── A tabela ───────────────────────────────────────────────────────────────

create table if not exists public.inscricoes (
  id uuid primary key default gen_random_uuid(),

  -- `criado_em` nunca muda na reinscrição (spec §6.4): é ele que a cota por IP
  -- conta, e é ele que diz quando a pessoa chegou de verdade.
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  nome text not null,
  email citext not null,

  -- Só dígitos, 10 ou 11 (a validação tira máscara e `+55`). A formatação é
  -- coisa da leitura, não do armazenamento.
  whatsapp text not null,

  -- A idade é escrita pela pessoa desde 21/08/2026, e não mais escolhida numa
  -- lista. O `between` sai de `LIMITES.idadeMin`/`idadeMax` e é um corretor de
  -- engano de digitação — o que ele existe para barrar é o ano de nascimento no
  -- campo da idade —, e não uma regra de quem pode se inscrever.
  idade smallint not null
    constraint inscricoes_idade_na_faixa check (idade between 14 and 99),

  estado char(2) not null
    constraint inscricoes_estado_conhecido
      check (estado in ('AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
                        'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
                        'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO')),

  cidade text not null,
  linkedin text,

  -- O `id` de `INSTITUICOES` **é** o nome (spec §6.3: "um dos 9 ou `OUTRA`"),
  -- porque é esta coluna que o painel agrupa e ela precisa ser legível sem
  -- tradução. Repare que a opção "Outra" grava `OUTRA`, em caixa alta: o rótulo
  -- é que é bonito.
  instituicao text not null
    constraint inscricoes_instituicao_conhecida
      check (instituicao in ('FGV', 'IME', 'Insper', 'Inteli', 'ITA', 'Link',
                             'Mackenzie', 'Unicamp', 'Unifesp', 'USP', 'OUTRA')),
  instituicao_outra text,

  -- Token curto, e não o rótulo: "San Fran (Direito)" ainda pode mudar de
  -- forma, e mudar o rótulo não pode partir a série histórica.
  unidade_usp text
    constraint inscricoes_unidade_usp_conhecida
      check (unidade_usp is null
             or unidade_usp in ('POLI', 'MEDICINA', 'FEA', 'SAN_FRAN', 'OUTRA')),
  unidade_usp_outra text,

  -- A lista de cursos é rascunho até o Matheus revisar (spec §15.3). Ela está
  -- aqui como `check` mesmo assim porque o teste de servidor compara as duas
  -- listas: acrescentar um curso em `lib/inscricao.ts` sem acrescentar aqui
  -- falha no `npm test`, que é onde esse erro custa barato.
  curso text not null
    constraint inscricoes_curso_conhecido
      check (curso in ('Administração', 'Arquitetura e Urbanismo', 'Biomedicina',
                       'Ciência da Computação', 'Ciência de Dados',
                       'Ciências Atuariais', 'Ciências Contábeis',
                       'Ciências Econômicas', 'Ciências Sociais', 'Design',
                       'Direito', 'Educação Física', 'Enfermagem',
                       'Eng. Aeronáutica', 'Eng. Ambiental', 'Eng. Civil',
                       'Eng. de Computação', 'Eng. de Controle e Automação',
                       'Eng. de Materiais', 'Eng. de Produção',
                       'Eng. de Software', 'Eng. Elétrica', 'Eng. Mecânica',
                       'Eng. Mecatrônica', 'Eng. Naval', 'Eng. Química',
                       'Farmácia', 'Física', 'Fisioterapia',
                       'Geologia', 'Jornalismo', 'Letras', 'Matemática',
                       'Matemática Aplicada', 'Medicina', 'Medicina Veterinária',
                       'Nutrição', 'Odontologia', 'Psicologia',
                       'Publicidade e Propaganda', 'Química',
                       'Engenharia', 'Estatística', 'Relações Internacionais',
                       'Sistemas de Informação', 'OUTRO')),
  curso_outro text,

  ano_atual text not null
    constraint inscricoes_ano_atual_conhecido
      check (ano_atual in ('1', '2', '3', '4', '5', '6', 'TRANCADO', 'FORMADO')),

  -- `null` = já formado, e não um sentinela como `0` ou `9999`: é `null` que
  -- deixa o painel calcular "média de anos até a formatura" sem filtrar lixo.
  conclusao_prevista smallint
    constraint inscricoes_conclusao_na_faixa
      check (conclusao_prevista is null
             or conclusao_prevista between 2026 and 2033),

  -- `jsonb` e não tabela filha: são strings livres que ninguém vai agregar, e
  -- virar tabela só acrescentaria um `join` em toda leitura (spec §6.3).
  premios jsonb not null default '[]'::jsonb
    constraint inscricoes_premios_sao_lista check (jsonb_typeof(premios) = 'array'),

  nivel_ai smallint not null
    constraint inscricoes_nivel_ai_na_faixa check (nivel_ai between 0 and 4),

  -- `text[]` e não `jsonb` porque **é** agregado: o painel conta quantas pessoas
  -- marcaram cada ferramenta, e `unnest` sobre `text[]` faz isso direto no SQL.
  -- O `<@` é contenção de conjunto: todo elemento tem de estar na lista.
  ferramentas_ai text[] not null
    constraint inscricoes_ferramentas_conhecidas
      check (ferramentas_ai <@ array['CHATGPT', 'CLAUDE', 'GEMINI', 'COPILOT',
                                     'EDITOR_AGENTE', 'AUTOMACAO', 'API',
                                     'IMAGEM', 'NOTEBOOKLM', 'PERPLEXITY',
                                     'PROPRIA', 'NENHUMA']::text[]
             and cardinality(ferramentas_ai) >= 1),

  ai_estudos text not null
    constraint inscricoes_ai_estudos_conhecido
      check (ai_estudos in ('NUNCA', 'AS_VEZES', 'QUASE_TODO_DIA', 'PRINCIPAL')),

  historia_ai text,

  situacao text not null
    constraint inscricoes_situacao_conhecida
      check (situacao in ('SO_ESTUDO', 'ESTAGIO', 'CLT_PJ', 'FREELA',
                          'PESQUISA', 'EMPRESA_PROPRIA', 'OUTRO')),
  situacao_outra text,

  -- Perguntado a todo mundo desde 21/08/2026, e por isso `not null`: quem não
  -- usa responde `NAO_USO`, que é um dado — coluna vazia não é. O `is null` do
  -- check continua ali porque uma tabela criada antes desta data mantém a
  -- coluna anulável (o `create table` acima é `if not exists`), e ali as linhas
  -- antigas precisam continuar válidas.
  ai_trabalho text not null
    constraint inscricoes_ai_trabalho_conhecido
      check (ai_trabalho is null
             or ai_trabalho in ('NAO_USO', 'NAO_OFICIAL', 'ACEITO', 'CENTRAL',
                                'IMPLANTEI')),

  -- Escada de 0 a 5, e a ordem é a informação: "quem já teve receita" é `>= 4`.
  empreendedorismo smallint not null
    constraint inscricoes_empreendedorismo_na_faixa
      check (empreendedorismo between 0 and 5),

  disponibilidade text not null
    constraint inscricoes_disponibilidade_conhecida
      check (disponibilidade in ('ATE_5H', 'DE_5_A_10H', 'DE_10_A_20H',
                                 'DE_20_A_30H', 'MAIS_DE_30H')),

  origem text not null
    constraint inscricoes_origem_conhecida
      check (origem in ('INDICACAO', 'LINKEDIN', 'INSTAGRAM', 'EVENTO',
                        'COMUNIDADE', 'JA_CONHECIA', 'OUTRO')),
  origem_quem_indicou text,
  origem_outra text,
  origem_detalhe text,
  algo_mais text,

  -- Até três pessoas indicadas: `[{"nome": ..., "linkedin": ...}]`.
  --
  -- `jsonb` e não tabela filha, pelo mesmo motivo de `premios` (spec §6.3): são
  -- três linhas por ficha, ninguém vai agregar por elas, e uma tabela filha
  -- acrescentaria um `join` em toda leitura do painel.
  --
  -- A checagem é de FORMA, e só de forma: **é uma lista** e **cabe em três**.
  -- Ela NÃO olha dentro dos objetos — `[1,2,3]` e `[{"a":1}]` passariam. Isto
  -- está escrito com todas as letras porque a versão anterior deste comentário
  -- prometia "três objetos com as duas chaves de texto", e quem confiasse nela
  -- ao mexer aqui contaria com uma defesa que não existe.
  --
  -- Quem julga conteúdo é `validarInscricao`, uma vez só, no cliente e no
  -- servidor — duplicar a regra aqui em SQL criaria uma segunda verdade que
  -- diverge na primeira URL estranha.
  indicacoes jsonb not null default '[]'::jsonb
    constraint inscricoes_indicacoes_sao_lista
      check (jsonb_typeof(indicacoes) = 'array' and jsonb_array_length(indicacoes) <= 3),

  -- O aceite é sempre `true` quando a linha existe (a validação recusa sem
  -- ele). A coluna existe para **registrar**, junto com `aceite_em`: o registro
  -- é o ponto da LGPD, não a caixinha (spec §8).
  aceite_dados boolean not null,
  aceite_em timestamptz not null default now(),

  -- O IP não é guardado. Isto é `sha256(ip + IP_SALT)`, com o sal em variável
  -- de ambiente do servidor: serve para o limite de taxa e não serve para
  -- identificar ninguém (spec §8).
  ip_hash text not null,

  -- ── Fase 2 (spec §9.3). Nascem aqui para que a fase 2 não migre nada. ──
  status text not null default 'novo'
    constraint inscricoes_status_conhecido
      check (status in ('novo', 'sim', 'talvez', 'nao')),
  nota text,
  avaliado_em timestamptz
);


-- ── Índices ────────────────────────────────────────────────────────────────

-- ── Migração das três colunas de "Outro" ───────────────────────────────────

-- O `create table` acima é `if not exists`: num banco que já rodou a versão
-- anterior deste arquivo, ele não faz nada, e as três colunas nascidas em
-- 21/08/2026 nunca apareceriam. Estes `alter` são o que torna o arquivo
-- idempotente **e** aplicável de novo — rodar tudo por cima é seguro, e é
-- exatamente assim que ele foi feito para ser usado (spec §14).
alter table public.inscricoes add column if not exists unidade_usp_outra text;
alter table public.inscricoes add column if not exists situacao_outra text;
alter table public.inscricoes add column if not exists origem_outra text;


-- ── Migração das indicações (01/09/2026) ────────────────────────────

-- Mesmo caso das três acima. O `default '[]'` é o que deixa a coluna nascer
-- `not null` num banco que já tem inscrições: as fichas antigas passam a ter
-- lista vazia, que é a verdade — ninguém indicou ninguém porque a pergunta não
-- existia.
alter table public.inscricoes
  add column if not exists indicacoes jsonb not null default '[]'::jsonb;

-- O `check` vem separado porque `add column if not exists` não repete a
-- constraint quando a coluna já existe, e `add constraint` não aceita
-- `if not exists` em Postgres. O `do $$` deixa rodar o arquivo inteiro de novo
-- sem erro, que é a promessa do cabeçalho.
do $$
begin
  -- `conrelid` não é zelo: nome de constraint é único POR TABELA, não por banco.
  -- Sem ele, qualquer outra tabela do mesmo banco com uma constraint de mesmo
  -- nome (um schema `staging`, uma tabela de arquivo) fazia este bloco pular em
  -- silêncio — e `public.inscricoes` ficava SEM o check, sem erro nenhum. O
  -- sintoma só apareceria quando algo gravasse uma lista de 4 ou mais.
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.inscricoes'::regclass
      and conname = 'inscricoes_indicacoes_sao_lista'
  ) then
    alter table public.inscricoes
      add constraint inscricoes_indicacoes_sao_lista
      check (jsonb_typeof(indicacoes) = 'array' and jsonb_array_length(indicacoes) <= 3);
  end if;
end $$;


-- O e-mail é a chave da inscrição (spec §6.4). É este índice que o
-- `on conflict (email)` da função abaixo usa como árbitro — sem ele o upsert
-- vira erro em tempo de execução, não erro de sintaxe.
create unique index if not exists inscricoes_email_unico
  on public.inscricoes (email);

-- Exatamente a forma da consulta do limite por IP: filtra por `ip_hash` e
-- corta por `criado_em`. Sem ele a cota faz varredura na tabela inteira a cada
-- envio — o que hoje não custa nada e em novembro custa.
create index if not exists inscricoes_ip_hash_criado_em
  on public.inscricoes (ip_hash, criado_em desc);

-- Para a leitura no painel do Supabase, que é o "admin" da fase 1 (spec §6.1).
create index if not exists inscricoes_criado_em
  on public.inscricoes (criado_em desc);


-- ── O interruptor (spec §9.4) ──────────────────────────────────────────────

-- Tabela de **uma linha só**. O truque do `id boolean primary key check (id)` é
-- o que garante isso no banco em vez de na disciplina de quem edita: só o valor
-- `true` passa no check, e a chave primária só deixa existir um `true`. Uma
-- segunda linha de config seria pior do que nenhuma — o servidor leria uma
-- delas e ninguém saberia qual.
create table if not exists public.config (
  id boolean primary key default true,
  inscricoes_abertas boolean not null default true,
  constraint config_linha_unica check (id)
);

insert into public.config (id, inscricoes_abertas)
values (true, true)
on conflict (id) do nothing;


-- ── RLS ligada, e nenhuma policy. Isto é intencional. ──────────────────────
--
-- Com RLS ligada e zero policies, a chave anônima — a única que pode vazar,
-- porque é a que iria para o navegador — **não lê e não escreve nada**. Não é
-- zelo abstrato: esta tabela guarda nome, e-mail, telefone e idade de
-- estudantes, e parte deles é menor de idade (spec §6.2 e §8).
--
-- Quem escreve é a `service_role`, que tem `bypassrls` e vive só em variável de
-- ambiente do servidor. Se um dia alguém acrescentar uma policy aqui "só para
-- testar", é a página inteira de dados pessoais que fica legível de fora.
alter table public.inscricoes enable row level security;
alter table public.config enable row level security;

-- Cinto e suspensório: além da RLS, tirar o privilégio de tabela dos papéis
-- públicos do Supabase. O `alter default privileges` da plataforma concede
-- `all` a `anon` e `authenticated` em toda tabela nova de `public`, e depender
-- de uma única camada para dados de menor de idade é pouco. O bloco checa se o
-- papel existe para que este arquivo também rode num Postgres comum.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on table public.inscricoes from anon';
    execute 'revoke all on table public.config from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on table public.inscricoes from authenticated';
    execute 'revoke all on table public.config from authenticated';
  end if;
end
$$;


-- ── O upsert, como função e não como `Prefer: resolution=merge-duplicates` ──
--
-- O caminho óbvio seria `POST /rest/v1/inscricoes` com
-- `Prefer: resolution=merge-duplicates`. Ele funciona, e é uma armadilha: ali o
-- conjunto de colunas que o `on conflict do update` toca é **inferido do
-- payload**. Quer dizer que "preservar `criado_em`, `status` e `nota`" (spec
-- §6.4) passaria a depender de quais chaves o JSON por acaso tinha naquela
-- chamada — um campo opcional ausente num envio e `null` no outro mudaria a
-- semântica do banco sem ninguém perceber.
--
-- Aqui a lista de colunas está escrita à mão, versionada e legível. `criado_em`,
-- `status`, `nota` e `avaliado_em` **não estão** no `do update set`, e é isso
-- que impede que quem já foi avaliado como `sim` perca a avaliação por reenviar
-- o formulário. E a função ainda devolve de graça o `atualizada` que a tela de
-- confirmação precisa (spec §4.7), que o PostgREST não daria.
--
-- `security definer` porque quem chama é a `service_role`, que já tem tudo —
-- mas a função precisa continuar funcionando se um dia a chamada vier de um
-- papel mais restrito. O `set search_path` fixo é o que impede alguém de trocar
-- o significado de `now()` ou de uma tabela criando objetos homônimos num
-- esquema à frente no caminho. `extensions` entra no caminho porque é onde o
-- Supabase costuma instalar o `citext`, e sem ele o operador `=` de `citext`
-- (que o `on conflict (email)` usa) não resolve.
create or replace function public.upsert_inscricao(dados jsonb)
returns table (atualizada boolean)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  return query
  insert into public.inscricoes (
    nome, email, whatsapp, idade, estado, cidade, linkedin,
    instituicao, instituicao_outra, unidade_usp, unidade_usp_outra,
    curso, curso_outro,
    ano_atual, conclusao_prevista, premios, nivel_ai, ferramentas_ai,
    ai_estudos, historia_ai, situacao, situacao_outra, ai_trabalho,
    empreendedorismo,
    disponibilidade, origem, origem_quem_indicou, origem_outra,
    origem_detalhe, algo_mais, indicacoes,
    aceite_dados, aceite_em, ip_hash
  )
  values (
    dados->>'nome',
    dados->>'email',
    dados->>'whatsapp',
    (dados->>'idade')::smallint,
    dados->>'estado',
    dados->>'cidade',
    dados->>'linkedin',
    dados->>'instituicao',
    dados->>'instituicao_outra',
    dados->>'unidade_usp',
    dados->>'unidade_usp_outra',
    dados->>'curso',
    dados->>'curso_outro',
    dados->>'ano_atual',
    (dados->>'conclusao_prevista')::smallint,
    coalesce(dados->'premios', '[]'::jsonb),
    (dados->>'nivel_ai')::smallint,
    array(select jsonb_array_elements_text(dados->'ferramentas_ai')),
    dados->>'ai_estudos',
    dados->>'historia_ai',
    dados->>'situacao',
    dados->>'situacao_outra',
    dados->>'ai_trabalho',
    (dados->>'empreendedorismo')::smallint,
    dados->>'disponibilidade',
    dados->>'origem',
    dados->>'origem_quem_indicou',
    dados->>'origem_outra',
    dados->>'origem_detalhe',
    dados->>'algo_mais',
    -- `dados->` e não `dados->>`: o primeiro devolve o jsonb da lista, o
    -- segundo devolveria o TEXTO dela, e o texto entraria na coluna jsonb como
    -- uma string JSON — `"[{...}]"` em vez de `[{...}]`. O mesmo cuidado de
    -- `premios` e `ferramentas_ai` logo acima.
    coalesce(dados->'indicacoes', '[]'::jsonb),
    coalesce((dados->>'aceite_dados')::boolean, false),
    -- `aceite_em` é carimbado aqui, com o relógio do banco, e não vem do
    -- payload: é um registro de consentimento, e registro de consentimento com
    -- data escolhida pelo cliente não vale nada.
    now(),
    dados->>'ip_hash'
  )
  on conflict (email) do update set
    -- `email` fica de fora porque é a chave do conflito e já chega normalizado
    -- em minúsculas pela validação — reatribuí-lo não mudaria nada e só daria a
    -- impressão de que a chave é editável aqui.
    nome = excluded.nome,
    whatsapp = excluded.whatsapp,
    idade = excluded.idade,
    estado = excluded.estado,
    cidade = excluded.cidade,
    linkedin = excluded.linkedin,
    instituicao = excluded.instituicao,
    instituicao_outra = excluded.instituicao_outra,
    unidade_usp = excluded.unidade_usp,
    unidade_usp_outra = excluded.unidade_usp_outra,
    curso = excluded.curso,
    curso_outro = excluded.curso_outro,
    ano_atual = excluded.ano_atual,
    conclusao_prevista = excluded.conclusao_prevista,
    premios = excluded.premios,
    nivel_ai = excluded.nivel_ai,
    ferramentas_ai = excluded.ferramentas_ai,
    ai_estudos = excluded.ai_estudos,
    historia_ai = excluded.historia_ai,
    situacao = excluded.situacao,
    situacao_outra = excluded.situacao_outra,
    ai_trabalho = excluded.ai_trabalho,
    empreendedorismo = excluded.empreendedorismo,
    disponibilidade = excluded.disponibilidade,
    origem = excluded.origem,
    origem_quem_indicou = excluded.origem_quem_indicou,
    origem_outra = excluded.origem_outra,
    origem_detalhe = excluded.origem_detalhe,
    algo_mais = excluded.algo_mais,
    indicacoes = excluded.indicacoes,
    aceite_dados = excluded.aceite_dados,
    -- O aceite foi dado de novo, agora: a data acompanha o envio mais recente.
    aceite_em = now(),
    -- O `ip_hash` passa a ser o do envio que está gravado. A cota por IP conta
    -- `criado_em`, então trocar isto não abre brecha nenhuma no limite.
    ip_hash = excluded.ip_hash,
    atualizado_em = now()
    -- Nada de `criado_em`, `status`, `nota` ou `avaliado_em` nesta lista. É a
    -- linha inteira da spec §6.4, e a ausência delas aqui é a regra.
  returning not (xmax = 0);
  -- O truque padrão do Postgres para distinguir insert de update: numa inserção
  -- limpa o `xmax` da linha devolvida é 0; vindo do `do update`, não é. Duas
  -- minúcias de forma, ambas para não depender de detalhe de versão: escrito
  -- como `not (… = 0)` e não como `<> 0`, porque o tipo `xid` só define o
  -- operador de igualdade; e sem qualificar com apelido de tabela, porque
  -- coluna de sistema em `returning` é lida sem apelido em toda versão.
end;
$$;

-- ── O `revoke` mais importante do arquivo ──────────────────────────────────
--
-- A função é `security definer`: ela roda com os poderes de quem a criou e
-- **passa por cima da RLS**. Se ela ficar executável por `anon`, a chave
-- pública — a que vai para o navegador — escreve na tabela de dados pessoais
-- por `POST /rest/v1/rpc/upsert_inscricao`, e toda a RLS acima vira decoração.
--
-- Duas concessões precisam ser desfeitas, e é fácil parar na primeira:
--
-- 1. `create function` concede `execute` a `public` por padrão. É o que este
--    primeiro `revoke` desfaz.
-- 2. **O Supabase ainda concede explicitamente a `anon` e `authenticated`**,
--    por `alter default privileges ... grant all on functions`, e essa
--    concessão sobrevive ao `revoke ... from public`. Conferido em 20/08/2026
--    contra a imagem `supabase/postgres:17.6.1.155`: só com o primeiro
--    `revoke`, `set role anon; select upsert_inscricao(…)` **grava**.
--
-- Os dois rodam a cada colada. `create or replace` preserva a ACL de uma função
-- que já existia, então repetir é inofensivo — e necessário, porque a primeira
-- criação é que aplica as concessões padrão.
revoke all on function public.upsert_inscricao(jsonb) from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on function public.upsert_inscricao(jsonb) from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on function public.upsert_inscricao(jsonb) from authenticated';
  end if;
  -- Quem escreve é a `service_role`, e só ela. Ela vive em variável de ambiente
  -- do servidor e nunca chega ao navegador.
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.upsert_inscricao(jsonb) to service_role';
  end if;
end
$$;
