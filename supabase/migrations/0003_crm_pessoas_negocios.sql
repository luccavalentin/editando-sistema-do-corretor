-- ============================================================================
-- AGILLIZA — 0003 CRM: PESSOAS, NEGÓCIOS, ETAPAS, FOLLOW-UPS, AGENDA
--
-- O princípio 2 do produto é "uma pessoa, um cadastro": nunca duplicar o
-- cliente por causa de novos negócios ou papéis. O critério de aceite 2 exige
-- que o sistema IMPEÇA a duplicidade pelo CPF. Isso não é validação de
-- formulário — é índice único no banco, porque formulário se contorna e
-- importação de planilha não passa por formulário nenhum.
--
-- Papel é RELAÇÃO com o negócio, nunca cópia da pessoa (seção 6.1). A mesma
-- pessoa é compradora num negócio, proprietária em outro e fiadora num
-- terceiro, com um único cadastro.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- EXTENSÃO
-- `btree_gist` é necessária para o índice de conflito de agenda: um índice GiST
-- não sabe indexar `uuid` sem ela, e sem o uuid do responsável no índice a
-- detecção de conflito varreria a agenda inteira do tenant.
-- ----------------------------------------------------------------------------
create extension if not exists btree_gist with schema extensions;

-- ----------------------------------------------------------------------------
-- TIPOS
-- ----------------------------------------------------------------------------

-- Temperatura do cliente. Nunca é o único canal de informação na interface:
-- sempre acompanha rótulo e ícone.
create type app.temperatura as enum ('quente', 'morno', 'frio');

-- Papel de uma pessoa DENTRO de um negócio (seção 6.1).
create type app.papel_no_negocio as enum (
  'comprador',
  'proprietario',
  'fiador',
  'conjuge',
  'participante_renda',
  'procurador'
);

create type app.situacao_negocio as enum ('aberto', 'ganho', 'perdido', 'pausado');

create type app.canal as enum (
  'whatsapp',
  'telefone',
  'email',
  'presencial',
  'portal',
  'portal_imobiliario',
  'indicacao',
  'outro'
);

create type app.situacao_followup as enum ('pendente', 'feito', 'cancelado', 'sem_resposta');

create type app.prioridade as enum ('baixa', 'media', 'alta', 'critica');

create type app.situacao_tarefa as enum ('aberta', 'feita', 'cancelada');

create type app.tipo_compromisso as enum (
  'visita',
  'retorno',
  'ligacao',
  'reuniao',
  'assinatura',
  'avaliacao',
  'parceiro',
  'interna'
);

create type app.situacao_compromisso as enum (
  'agendado',
  'confirmado',
  'realizado',
  'faltou',
  'cancelado',
  'remarcado'
);

-- ----------------------------------------------------------------------------
-- PESSOAS
-- Um cadastro por pessoa por tenant. A regra é garantida por índice.
-- ----------------------------------------------------------------------------
create table public.pessoas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,

  nome text not null check (length(btrim(nome)) between 2 and 160),

  -- Somente dígitos. A validação dos dígitos verificadores acontece na
  -- aplicação (src/lib/privacidade/documentos.ts); aqui garantimos o formato.
  cpf text check (cpf ~ '^[0-9]{11}$'),
  -- A faixa é fixa porque `CHECK` exige expressão imutável: `current_date`
  -- mudaria de valor a cada dia e o Postgres recusa a restrição. "Não pode ser
  -- data futura" é validado na aplicação, junto com a idade mínima.
  data_nascimento date check (data_nascimento between '1900-01-01' and '2030-12-31'),

  email text check (email is null or (email = lower(email) and position('@' in email) > 1)),
  cidade text,
  uf char(2) check (uf is null or uf ~ '^[A-Z]{2}$'),

  -- Renda declarada. `numeric` e nunca `float`: dinheiro em ponto flutuante
  -- gera centavo fantasma em soma de carteira.
  renda numeric(14, 2) check (renda is null or renda >= 0),
  renda_composta numeric(14, 2) check (renda_composta is null or renda_composta >= 0),

  origem app.canal,
  origem_detalhe text,
  temperatura app.temperatura not null default 'frio',

  -- Objetivo de compra (seção 6.3).
  faixa_valor_min numeric(14, 2) check (faixa_valor_min is null or faixa_valor_min >= 0),
  faixa_valor_max numeric(14, 2) check (faixa_valor_max is null or faixa_valor_max >= 0),
  objetivo text,
  observacoes text,

  responsavel_id uuid references public.perfis (id) on delete set null,

  -- Portal do cliente (seção 6.5). Acesso por CPF + data de nascimento, sem
  -- senha — então liberar o portal sem CPF ou sem nascimento é impossível, e a
  -- restrição abaixo garante isso.
  portal_liberado boolean not null default false,
  portal_liberado_em timestamptz,
  portal_ultimo_acesso_em timestamptz,

  ultima_interacao_em timestamptz,

  criado_por uuid references public.perfis (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz,

  constraint faixa_valor_coerente
    check (faixa_valor_min is null or faixa_valor_max is null or faixa_valor_max >= faixa_valor_min),

  -- O portal autentica por CPF e data de nascimento; sem os dois, não há como
  -- autenticar ninguém.
  constraint portal_exige_cpf_e_nascimento
    check (not portal_liberado or (cpf is not null and data_nascimento is not null))
);

comment on table public.pessoas is
  'Cadastro único de pessoa por tenant. Papéis são relações com negócios, nunca cópias.';

-- ESTE ÍNDICE É O CRITÉRIO DE ACEITE 2.
-- Único por tenant + CPF, ignorando quem ainda não informou CPF e quem foi
-- excluído. Sem ele, "impedir duplicidade" seria só uma intenção da interface.
create unique index pessoas_tenant_cpf_idx
  on public.pessoas (tenant_id, cpf)
  where cpf is not null and excluido_em is null;

-- Busca por nome tolerante a erro de digitação (seção 6.2). `extensions.` é
-- obrigatório: a 0002 tirou pg_trgm do search_path padrão.
create index pessoas_nome_busca_idx
  on public.pessoas using gin (nome extensions.gin_trgm_ops);

create index pessoas_tenant_idx on public.pessoas (tenant_id) where excluido_em is null;
create index pessoas_temperatura_idx
  on public.pessoas (tenant_id, temperatura, ultima_interacao_em desc nulls last)
  where excluido_em is null;
create index pessoas_responsavel_idx on public.pessoas (tenant_id, responsavel_id)
  where excluido_em is null;
create index pessoas_email_idx on public.pessoas (tenant_id, email) where email is not null;

-- ----------------------------------------------------------------------------
-- TELEFONES
-- Tabela própria porque cliente tem celular, fixo e o telefone do cônjuge, e
-- porque a busca por telefone precisa de índice.
-- ----------------------------------------------------------------------------
create table public.pessoa_telefones (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  pessoa_id uuid not null references public.pessoas (id) on delete cascade,

  -- Somente dígitos, com DDD, sem o 55 do país.
  numero text not null check (numero ~ '^[1-9][0-9]{9,10}$'),
  rotulo text,
  whatsapp boolean not null default true,
  principal boolean not null default false,

  criado_em timestamptz not null default now(),

  unique (pessoa_id, numero)
);

create index pessoa_telefones_busca_idx on public.pessoa_telefones (tenant_id, numero);

-- Um telefone principal por pessoa.
create unique index pessoa_telefones_principal_idx
  on public.pessoa_telefones (pessoa_id)
  where principal;

-- ----------------------------------------------------------------------------
-- ETAPAS
-- Configuráveis por tenant. As 11 da seção 7 entram como padrão, mas o corretor
-- pode renomear e reordenar sem migração.
-- ----------------------------------------------------------------------------
create table public.etapas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,

  nome text not null check (length(btrim(nome)) between 2 and 60),
  -- Nome que o CLIENTE vê no portal. A seção 7 exige uma versão amigável, sem
  -- termo interno de CRM: o cliente lê "estamos negociando o valor", não
  -- "etapa 6 — negociação".
  nome_publico text,
  ordem int not null check (ordem >= 0),
  cor text check (cor is null or cor ~ '^#[0-9a-f]{6}$'),

  -- Etapa terminal encerra o negócio. `ganho` e `perdido` são as duas saídas.
  encerra_como app.situacao_negocio,

  criado_em timestamptz not null default now(),

  unique (tenant_id, ordem),
  unique (tenant_id, nome)
);

-- ----------------------------------------------------------------------------
-- NEGÓCIOS
-- ----------------------------------------------------------------------------
create table public.negocios (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,

  -- Código legível que o corretor fala ao telefone.
  codigo text not null,

  pessoa_id uuid not null references public.pessoas (id) on delete restrict,
  etapa_id uuid not null references public.etapas (id) on delete restrict,
  situacao app.situacao_negocio not null default 'aberto',

  titulo text,
  valor numeric(14, 2) check (valor is null or valor >= 0),
  valor_proposta numeric(14, 2) check (valor_proposta is null or valor_proposta >= 0),

  -- Probabilidade em pontos percentuais inteiros: 0 a 100, sem fração falsa.
  probabilidade smallint check (probabilidade between 0 and 100),
  previsao_fechamento date,

  responsavel_id uuid references public.perfis (id) on delete set null,

  -- Momento da última mudança de etapa. Alimenta "negócios parados" no painel
  -- sem precisar varrer o histórico a cada consulta.
  etapa_desde timestamptz not null default now(),
  ultima_atividade_em timestamptz not null default now(),

  motivo_perda text,
  fechado_em timestamptz,

  criado_por uuid references public.perfis (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz,

  unique (tenant_id, codigo),

  -- Negócio encerrado tem data de fechamento; negócio aberto não tem.
  constraint fechamento_coerente
    check (
      (situacao in ('ganho', 'perdido') and fechado_em is not null)
      or (situacao in ('aberto', 'pausado') and fechado_em is null)
    ),
  -- Perda exige motivo: é o dado que alimenta "onde mais se perde" no funil.
  constraint perda_exige_motivo
    check (situacao <> 'perdido' or (motivo_perda is not null and length(btrim(motivo_perda)) > 2))
);

create index negocios_tenant_etapa_idx
  on public.negocios (tenant_id, etapa_id, ultima_atividade_em desc)
  where excluido_em is null;
create index negocios_pessoa_idx on public.negocios (pessoa_id) where excluido_em is null;
create index negocios_responsavel_idx
  on public.negocios (tenant_id, responsavel_id, situacao)
  where excluido_em is null;
-- Sustenta o bloco "negócios parados" do painel.
create index negocios_parados_idx
  on public.negocios (tenant_id, etapa_desde)
  where situacao = 'aberto' and excluido_em is null;

-- ----------------------------------------------------------------------------
-- PARTICIPANTES DO NEGÓCIO
-- Aqui vive o princípio "uma pessoa, um cadastro": o papel é a relação.
-- ----------------------------------------------------------------------------
create table public.negocio_participantes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  negocio_id uuid not null references public.negocios (id) on delete cascade,
  pessoa_id uuid not null references public.pessoas (id) on delete restrict,

  papel app.papel_no_negocio not null,
  compoe_renda boolean not null default false,
  percentual numeric(5, 2) check (percentual is null or (percentual > 0 and percentual <= 100)),

  criado_em timestamptz not null default now(),

  -- A mesma pessoa não repete o mesmo papel no mesmo negócio.
  unique (negocio_id, pessoa_id, papel)
);

create index negocio_participantes_pessoa_idx on public.negocio_participantes (pessoa_id);
create index negocio_participantes_negocio_idx on public.negocio_participantes (negocio_id);

-- ----------------------------------------------------------------------------
-- HISTÓRICO DE ETAPA
-- Seção 7: cada movimento registra data, hora e autor, e permite desfazer com
-- registro de auditoria. Sem esta tabela não existe "tempo médio em cada
-- etapa" nem "taxa de avanço".
-- ----------------------------------------------------------------------------
create table public.negocio_etapa_historico (
  id bigserial primary key,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  negocio_id uuid not null references public.negocios (id) on delete cascade,

  etapa_de uuid references public.etapas (id) on delete set null,
  etapa_para uuid not null references public.etapas (id) on delete restrict,

  autor_id uuid references public.perfis (id) on delete set null,
  -- Quanto tempo o negócio passou na etapa anterior. Calculado no gatilho para
  -- que o relatório não precise de janela de tempo em cada consulta.
  segundos_na_etapa_anterior bigint,
  desfeito boolean not null default false,
  observacao text,

  criado_em timestamptz not null default now()
);

create index negocio_etapa_historico_negocio_idx
  on public.negocio_etapa_historico (negocio_id, criado_em desc);
create index negocio_etapa_historico_tenant_idx
  on public.negocio_etapa_historico (tenant_id, criado_em desc);

-- ----------------------------------------------------------------------------
-- FOLLOW-UPS
-- Seção 6.4. Mensagem sugerida pela IA fica aqui, e o campo `revisado_por`
-- existe porque a seção 15 proíbe enviar sugestão de IA sem revisão humana.
-- ----------------------------------------------------------------------------
create table public.followups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,

  pessoa_id uuid not null references public.pessoas (id) on delete cascade,
  negocio_id uuid references public.negocios (id) on delete set null,

  motivo text not null check (length(btrim(motivo)) between 3 and 300),
  canal_sugerido app.canal,
  mensagem_sugerida text,
  -- Null enquanto a sugestão da IA não passou por revisão humana. A aplicação
  -- não envia mensagem com este campo nulo.
  revisado_por uuid references public.perfis (id) on delete set null,
  revisado_em timestamptz,

  prazo timestamptz not null,
  responsavel_id uuid references public.perfis (id) on delete set null,
  prioridade app.prioridade not null default 'media',
  situacao app.situacao_followup not null default 'pendente',

  -- Quantas vezes já se tentou contato. Alimenta "histórico de tentativas".
  tentativas smallint not null default 0 check (tentativas >= 0),
  resultado text,

  -- Origem: criado à mão ou por automação. `gerado_por` guarda a regra.
  automatico boolean not null default false,
  gerado_por text,

  concluido_em timestamptz,
  criado_por uuid references public.perfis (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint conclusao_coerente
    check (
      (situacao = 'pendente' and concluido_em is null)
      or (situacao <> 'pendente' and concluido_em is not null)
    ),
  constraint revisao_coerente
    check ((revisado_por is null) = (revisado_em is null))
);

-- Sustenta o bloco 1 do painel: follow-up vencido, ordenado por prazo.
create index followups_vencidos_idx
  on public.followups (tenant_id, prazo)
  where situacao = 'pendente';
create index followups_pessoa_idx on public.followups (pessoa_id, criado_em desc);
create index followups_responsavel_idx
  on public.followups (tenant_id, responsavel_id, prazo)
  where situacao = 'pendente';

-- ----------------------------------------------------------------------------
-- TAREFAS
-- ----------------------------------------------------------------------------
create table public.tarefas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,

  titulo text not null check (length(btrim(titulo)) between 2 and 200),
  descricao text,

  pessoa_id uuid references public.pessoas (id) on delete set null,
  negocio_id uuid references public.negocios (id) on delete set null,

  responsavel_id uuid references public.perfis (id) on delete set null,
  prioridade app.prioridade not null default 'media',
  situacao app.situacao_tarefa not null default 'aberta',

  prazo timestamptz,
  concluida_em timestamptz,
  concluida_por uuid references public.perfis (id) on delete set null,

  criado_por uuid references public.perfis (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint tarefa_conclusao_coerente
    check ((situacao = 'feita') = (concluida_em is not null))
);

create index tarefas_abertas_idx
  on public.tarefas (tenant_id, responsavel_id, prazo nulls last)
  where situacao = 'aberta';
create index tarefas_negocio_idx on public.tarefas (negocio_id) where negocio_id is not null;

-- ----------------------------------------------------------------------------
-- COMPROMISSOS (AGENDA)
-- Seção 8. `intervalo` como coluna gerada permite detectar conflito de horário
-- com um índice, em vez de comparar par a par na aplicação.
-- ----------------------------------------------------------------------------
create table public.compromissos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,

  titulo text not null check (length(btrim(titulo)) between 2 and 200),
  tipo app.tipo_compromisso not null default 'visita',
  situacao app.situacao_compromisso not null default 'agendado',

  pessoa_id uuid references public.pessoas (id) on delete set null,
  negocio_id uuid references public.negocios (id) on delete set null,
  responsavel_id uuid references public.perfis (id) on delete set null,

  inicio timestamptz not null,
  fim timestamptz not null,
  -- Coluna gerada para consulta de conflito e de agenda por faixa.
  intervalo tstzrange generated always as (tstzrange(inicio, fim, '[)')) stored,

  endereco text,
  -- Minutos estimados de deslocamento até o endereço. Alimenta a sugestão de
  -- hora de saída (seção 5, bloco 5).
  deslocamento_min smallint check (deslocamento_min is null or deslocamento_min >= 0),

  -- Sincronização com Google Calendar (seção 8). Guardamos o id externo para
  -- que a sincronização seja idempotente e não duplique evento.
  google_evento_id text,
  google_sincronizado_em timestamptz,

  confirmado_em timestamptz,
  compareceu boolean,
  observacoes text,

  criado_por uuid references public.perfis (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint compromisso_fim_depois_do_inicio check (fim > inicio)
);

-- Detecção de conflito por sobreposição de intervalo do MESMO responsável.
-- A classe de operador vem explícita de `extensions` porque a 0002 tirou as
-- extensões do search_path padrão.
create index compromissos_conflito_idx
  on public.compromissos using gist (responsavel_id extensions.gist_uuid_ops, intervalo)
  where situacao in ('agendado', 'confirmado');

create index compromissos_agenda_idx on public.compromissos (tenant_id, inicio);
create index compromissos_pessoa_idx on public.compromissos (pessoa_id) where pessoa_id is not null;
create unique index compromissos_google_idx
  on public.compromissos (tenant_id, google_evento_id)
  where google_evento_id is not null;

-- ============================================================================
-- GATILHOS
-- ============================================================================

create trigger pessoas_atualizado_em before update on public.pessoas
  for each row execute function app.tocar_atualizado_em();
create trigger negocios_atualizado_em before update on public.negocios
  for each row execute function app.tocar_atualizado_em();
create trigger followups_atualizado_em before update on public.followups
  for each row execute function app.tocar_atualizado_em();
create trigger tarefas_atualizado_em before update on public.tarefas
  for each row execute function app.tocar_atualizado_em();
create trigger compromissos_atualizado_em before update on public.compromissos
  for each row execute function app.tocar_atualizado_em();

-- ----------------------------------------------------------------------------
-- COERÊNCIA DE TENANT
-- Um negócio do tenant A jamais pode apontar para uma pessoa do tenant B. A
-- chave estrangeira sozinha não impede isso, porque ela só olha o id.
-- Este gatilho fecha o furo — é isolamento de verdade, não confiança na
-- aplicação.
-- ----------------------------------------------------------------------------
-- A função serve a seis tabelas com colunas diferentes, então ela NÃO pode
-- acessar `new.negocio_id` diretamente: numa tabela sem essa coluna o Postgres
-- falha ao planejar a expressão, mesmo que um `if` a proteja — o plano é
-- montado antes do desvio acontecer. Ler o registro como jsonb resolve: chave
-- ausente devolve nulo em vez de estourar.
create or replace function app.conferir_tenant_coerente()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_registro jsonb := to_jsonb(new);
  v_tenant_id uuid := (v_registro ->> 'tenant_id')::uuid;
  v_pessoa_id uuid := (v_registro ->> 'pessoa_id')::uuid;
  v_negocio_id uuid := (v_registro ->> 'negocio_id')::uuid;
  v_etapa_id uuid := (v_registro ->> 'etapa_id')::uuid;
  v_dono uuid;
begin
  if v_pessoa_id is not null then
    select p.tenant_id into v_dono from public.pessoas p where p.id = v_pessoa_id;
    if v_dono is distinct from v_tenant_id then
      raise exception 'Pessoa % pertence a outro tenant', v_pessoa_id
        using errcode = 'raise_exception', hint = 'cruzamento_de_tenant';
    end if;
  end if;

  if v_negocio_id is not null then
    select n.tenant_id into v_dono from public.negocios n where n.id = v_negocio_id;
    if v_dono is distinct from v_tenant_id then
      raise exception 'Negócio % pertence a outro tenant', v_negocio_id
        using errcode = 'raise_exception', hint = 'cruzamento_de_tenant';
    end if;
  end if;

  if v_etapa_id is not null then
    select e.tenant_id into v_dono from public.etapas e where e.id = v_etapa_id;
    if v_dono is distinct from v_tenant_id then
      raise exception 'Etapa % pertence a outro tenant', v_etapa_id
        using errcode = 'raise_exception', hint = 'cruzamento_de_tenant';
    end if;
  end if;

  return new;
end;
$$;

create trigger negocios_tenant_coerente
  before insert or update on public.negocios
  for each row execute function app.conferir_tenant_coerente();
create trigger negocio_participantes_tenant_coerente
  before insert or update on public.negocio_participantes
  for each row execute function app.conferir_tenant_coerente();
create trigger followups_tenant_coerente
  before insert or update on public.followups
  for each row execute function app.conferir_tenant_coerente();
create trigger tarefas_tenant_coerente
  before insert or update on public.tarefas
  for each row execute function app.conferir_tenant_coerente();
create trigger compromissos_tenant_coerente
  before insert or update on public.compromissos
  for each row execute function app.conferir_tenant_coerente();
create trigger pessoa_telefones_tenant_coerente
  before insert or update on public.pessoa_telefones
  for each row execute function app.conferir_tenant_coerente();

-- ----------------------------------------------------------------------------
-- HISTÓRICO AUTOMÁTICO DE ETAPA
-- ----------------------------------------------------------------------------
-- São DOIS gatilhos, e a separação não é estilo.
--
-- O relógio da etapa (`etapa_desde`) precisa ser gravado ANTES, porque é coluna
-- da própria linha. O registro no histórico precisa ser gravado DEPOIS, porque
-- a chave estrangeira dele aponta para o negócio — num BEFORE INSERT o negócio
-- ainda não existe e a inserção no histórico estouraria a chave.

create or replace function app.marcar_relogio_da_etapa()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.etapa_id is not distinct from old.etapa_id then
    return new;
  end if;

  new.etapa_desde := now();
  new.ultima_atividade_em := now();
  return new;
end;
$$;

create trigger negocios_relogio_etapa
  before insert or update of etapa_id on public.negocios
  for each row execute function app.marcar_relogio_da_etapa();

create or replace function app.registrar_mudanca_de_etapa()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_segundos bigint;
begin
  if tg_op = 'UPDATE' and new.etapa_id is not distinct from old.etapa_id then
    return null;
  end if;

  -- Em UPDATE, `old.etapa_desde` ainda guarda o instante em que o negócio
  -- entrou na etapa anterior: é daí que sai o tempo de permanência.
  if tg_op = 'UPDATE' then
    v_segundos := extract(epoch from (now() - old.etapa_desde))::bigint;
  end if;

  insert into public.negocio_etapa_historico (
    tenant_id, negocio_id, etapa_de, etapa_para, autor_id, segundos_na_etapa_anterior
  )
  values (
    new.tenant_id,
    new.id,
    case when tg_op = 'UPDATE' then old.etapa_id else null end,
    new.etapa_id,
    auth.uid(),
    v_segundos
  );

  return null;
end;
$$;

create trigger negocios_historico_etapa
  after insert or update of etapa_id on public.negocios
  for each row execute function app.registrar_mudanca_de_etapa();

-- ----------------------------------------------------------------------------
-- CONTADORES POR TENANT
--
-- Existe porque a alternativa não funciona. A tentativa óbvia — ler
-- `max(codigo)` de `negocios` dentro de um gatilho SECURITY DEFINER — falha em
-- silêncio: `negocios` tem `force row level security`, o gatilho roda como dono
-- da tabela, e as políticas são concedidas a `authenticated`, não ao dono.
-- Nenhuma política se aplica, o padrão é negar, o `max()` volta vazio e TODO
-- negócio recebe `NEG-00001` — colidindo no segundo cadastro.
--
-- Esta tabela não tem política nenhuma e não recebe GRANT: só os gatilhos
-- SECURITY DEFINER a alcançam. O `on conflict do update` trava a linha, então
-- duas inserções simultâneas no mesmo tenant recebem números diferentes sem
-- precisar de trava consultiva.
-- ----------------------------------------------------------------------------
create table public.contadores (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  nome text not null,
  valor bigint not null default 0,
  primary key (tenant_id, nome)
);

alter table public.contadores enable row level security;
-- Sem política e sem `force`: inalcançável pela API, gravável pelo dono.

create or replace function app.proximo_contador(p_tenant_id uuid, p_nome text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_valor bigint;
begin
  insert into public.contadores (tenant_id, nome, valor)
  values (p_tenant_id, p_nome, 1)
  on conflict (tenant_id, nome)
    do update set valor = public.contadores.valor + 1
  returning valor into v_valor;

  return v_valor;
end;
$$;

-- ----------------------------------------------------------------------------
-- CÓDIGO DO NEGÓCIO
-- ----------------------------------------------------------------------------
create or replace function app.gerar_codigo_negocio()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.codigo is not null and length(btrim(new.codigo)) > 0 then
    return new;
  end if;

  new.codigo := 'NEG-' || lpad(app.proximo_contador(new.tenant_id, 'negocio')::text, 5, '0');
  return new;
end;
$$;

create trigger negocios_codigo
  before insert on public.negocios
  for each row execute function app.gerar_codigo_negocio();

-- ----------------------------------------------------------------------------
-- ETAPAS PADRÃO DO TENANT
-- As 11 etapas da seção 7. Criadas junto com o tenant para que a conta nova já
-- funcione, e renomeáveis depois sem migração.
-- ----------------------------------------------------------------------------
create or replace function app.semear_etapas_do_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.etapas (tenant_id, nome, nome_publico, ordem, cor, encerra_como)
  values
    (new.id, 'Novo atendimento',        'Estamos nos conhecendo',        0,  '#4338ca', null),
    (new.id, 'Entendendo o perfil',     'Entendendo o que você procura', 1,  '#4f46e5', null),
    (new.id, 'Simulação financeira',    'Vendo quanto o banco financia', 2,  '#4361ee', null),
    (new.id, 'Seleção de imóveis',      'Escolhendo os imóveis',         3,  '#2563eb', null),
    (new.id, 'Visitas',                 'Visitando os imóveis',          4,  '#0284c7', null),
    (new.id, 'Negociação',              'Negociando o valor',            5,  '#0891b2', null),
    (new.id, 'Análise de crédito',      'O banco está analisando',       6,  '#0d9488', null),
    (new.id, 'Aprovação',               'Crédito aprovado',              7,  '#059669', null),
    (new.id, 'Preparação para fechamento', 'Preparando a assinatura',    8,  '#16a34a', null),
    (new.id, 'Concluído',               'Imóvel é seu',                  9,  '#0c8164', 'ganho'),
    (new.id, 'Perdido',                 'Processo encerrado',            10, '#c8102e', 'perdido')
  on conflict (tenant_id, ordem) do nothing;

  return new;
end;
$$;

create trigger tenants_semear_etapas
  after insert on public.tenants
  for each row execute function app.semear_etapas_do_tenant();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.pessoas enable row level security;
alter table public.pessoa_telefones enable row level security;
alter table public.etapas enable row level security;
alter table public.negocios enable row level security;
alter table public.negocio_participantes enable row level security;
alter table public.negocio_etapa_historico enable row level security;
alter table public.followups enable row level security;
alter table public.tarefas enable row level security;
alter table public.compromissos enable row level security;

alter table public.pessoas force row level security;
alter table public.pessoa_telefones force row level security;
alter table public.negocios force row level security;
alter table public.negocio_participantes force row level security;
alter table public.followups force row level security;
alter table public.tarefas force row level security;
alter table public.compromissos force row level security;

-- Leitura: membro ativo do tenant. Escrita: papel operacional.
-- O padrão se repete de propósito: uma política por tabela, explícita, é mais
-- auditável que uma abstração esperta que ninguém consegue revisar.

create policy pessoas_ler on public.pessoas
  for select to authenticated using (app.pode_ler_tenant(tenant_id) and excluido_em is null);
create policy pessoas_inserir on public.pessoas
  for insert to authenticated with check (app.pode_escrever(tenant_id));
create policy pessoas_atualizar on public.pessoas
  for update to authenticated using (app.pode_escrever(tenant_id))
  with check (app.pode_escrever(tenant_id));

create policy pessoa_telefones_ler on public.pessoa_telefones
  for select to authenticated using (app.pode_ler_tenant(tenant_id));
create policy pessoa_telefones_inserir on public.pessoa_telefones
  for insert to authenticated with check (app.pode_escrever(tenant_id));
create policy pessoa_telefones_atualizar on public.pessoa_telefones
  for update to authenticated using (app.pode_escrever(tenant_id))
  with check (app.pode_escrever(tenant_id));
create policy pessoa_telefones_remover on public.pessoa_telefones
  for delete to authenticated using (app.pode_escrever(tenant_id));

-- `etapas` fica SEM `force row level security`, pelo mesmo motivo do histórico:
-- o gatilho `app.semear_etapas_do_tenant` roda como dono e cria as 11 etapas no
-- nascimento do tenant, quando ainda não existe `auth.uid()` nem membro algum.
-- Com `force`, a política negaria a inserção e criar uma conta nova falharia.
create policy etapas_ler on public.etapas
  for select to authenticated using (app.pode_ler_tenant(tenant_id));
create policy etapas_administrar on public.etapas
  for all to authenticated using (app.administra_tenant(tenant_id))
  with check (app.administra_tenant(tenant_id));

create policy negocios_ler on public.negocios
  for select to authenticated using (app.pode_ler_tenant(tenant_id) and excluido_em is null);
create policy negocios_inserir on public.negocios
  for insert to authenticated with check (app.pode_escrever(tenant_id));
create policy negocios_atualizar on public.negocios
  for update to authenticated using (app.pode_escrever(tenant_id))
  with check (app.pode_escrever(tenant_id));

create policy negocio_participantes_ler on public.negocio_participantes
  for select to authenticated using (app.pode_ler_tenant(tenant_id));
create policy negocio_participantes_escrever on public.negocio_participantes
  for all to authenticated using (app.pode_escrever(tenant_id))
  with check (app.pode_escrever(tenant_id));

-- Histórico de etapa é somente leitura pela API: quem escreve é o gatilho.
-- Reescrever histórico é reescrever a verdade do funil.
--
-- Esta é a única tabela desta migração SEM `force row level security`, e é de
-- propósito: o `force` sujeitaria o dono da tabela às políticas, e o gatilho
-- `app.registrar_mudanca_de_etapa` roda como dono. Com `force`, o gatilho
-- ficaria sem política de inserção e nenhuma mudança de etapa seria registrada.
-- A RLS continua ligada, então o cliente segue filtrado pelo tenant.
create policy negocio_etapa_historico_ler on public.negocio_etapa_historico
  for select to authenticated using (app.pode_ler_tenant(tenant_id));

create policy followups_ler on public.followups
  for select to authenticated using (app.pode_ler_tenant(tenant_id));
create policy followups_escrever on public.followups
  for all to authenticated using (app.pode_escrever(tenant_id))
  with check (app.pode_escrever(tenant_id));

create policy tarefas_ler on public.tarefas
  for select to authenticated using (app.pode_ler_tenant(tenant_id));
create policy tarefas_escrever on public.tarefas
  for all to authenticated using (app.pode_escrever(tenant_id))
  with check (app.pode_escrever(tenant_id));

create policy compromissos_ler on public.compromissos
  for select to authenticated using (app.pode_ler_tenant(tenant_id));
create policy compromissos_escrever on public.compromissos
  for all to authenticated using (app.pode_escrever(tenant_id))
  with check (app.pode_escrever(tenant_id));

-- ============================================================================
-- PRIVILÉGIOS
-- ============================================================================
grant select, insert, update on public.pessoas to authenticated;
grant select, insert, update, delete on public.pessoa_telefones to authenticated;
grant select, insert, update, delete on public.etapas to authenticated;
grant select, insert, update on public.negocios to authenticated;
grant select, insert, update, delete on public.negocio_participantes to authenticated;
grant select on public.negocio_etapa_historico to authenticated;
grant select, insert, update, delete on public.followups to authenticated;
grant select, insert, update, delete on public.tarefas to authenticated;
grant select, insert, update, delete on public.compromissos to authenticated;

revoke all on all tables in schema public from anon;
revoke all on sequence public.negocio_etapa_historico_id_seq from anon, authenticated;
