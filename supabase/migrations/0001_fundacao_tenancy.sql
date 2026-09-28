-- ============================================================================
-- AGILLIZA — 0001 FUNDAÇÃO: MULTI-TENANCY, PAPÉIS, PERMISSÕES E AUDITORIA
--
-- Esta é a migração mais importante do sistema. A seção 17 exige isolamento
-- garantido "no banco, API, cache, storage, busca e filas", e a seção 20 do
-- critério de aceite diz que o produto precisa "crescer sem reescrever a base
-- de segurança e multi-tenancy". Isolamento adicionado depois nunca fecha: ele
-- precisa nascer aqui.
--
-- DECISÃO CENTRAL: o isolamento vive no banco, via Row Level Security, não na
-- aplicação. Se a API tiver um bug, uma rota nova esquecer um filtro ou alguém
-- usar a chave publicável no navegador, o Postgres continua barrando. A regra
-- "nunca confiar apenas na interface para esconder dados" (seção 17) só é real
-- assim.
--
-- Aplicar com: supabase db push   (ou pelo SQL Editor, na ordem numérica)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- EXTENSÕES
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto"; -- gen_random_uuid, digest
create extension if not exists "pg_trgm"; -- busca por nome com erro de digitação
create extension if not exists "btree_gin"; -- índices compostos para filtros do CRM

-- ----------------------------------------------------------------------------
-- ESQUEMA PRIVADO
-- As funções de autorização NÃO ficam em `public`: lá elas seriam expostas pela
-- API REST do Supabase e qualquer cliente poderia chamá-las. Em `app`, sem
-- GRANT para anon/authenticated, só o próprio Postgres as usa dentro das
-- políticas.
-- ----------------------------------------------------------------------------
create schema if not exists app;
revoke all on schema app from public;
revoke all on schema app from anon, authenticated;

-- ============================================================================
-- TIPOS
-- ============================================================================

-- Papéis conforme a seção 14. A ordem importa: é usada para hierarquia.
create type app.papel as enum (
  'proprietario',      -- dono da conta; não pode ser removido nem rebaixado
  'admin_equipe',      -- administra usuários e configurações
  'corretor',          -- opera CRM, imóveis, simulações
  'assistente',        -- apoia o corretor, sem dado financeiro
  'secretaria',        -- agenda e atendimento
  'sdr',               -- prospecção e primeiro contato
  'financeiro',        -- vê dado financeiro, não vê CRM inteiro
  'visualizacao'       -- somente leitura, escopo limitado
);

-- Situação da conta do tenant (seção 16).
create type app.situacao_tenant as enum (
  'teste',             -- período de avaliação
  'ativo',
  'inadimplente',      -- em atraso, acesso degradado
  'suspenso',          -- bloqueado pelo administrador da plataforma
  'cancelado'          -- encerrado; dados retidos pelo prazo configurado
);

create type app.situacao_membro as enum ('ativo', 'convidado', 'suspenso', 'removido');

-- Resultado de uma ação auditada. Tentativa negada também é registro: é o que
-- permite detectar alguém sondando dado de outro tenant.
create type app.resultado_auditoria as enum ('permitido', 'negado', 'erro');

-- ============================================================================
-- TENANTS
-- Cada corretor independente ou equipe é um tenant. Nenhum vê o outro.
-- ============================================================================
create table public.tenants (
  id uuid primary key default gen_random_uuid(),

  nome text not null check (length(btrim(nome)) between 2 and 160),
  -- Usado no portfólio público: agilliza.com.br/c/<slug>.
  -- `text` e não `citext`: a resolução de citext depende do search_path do
  -- Supabase. Aqui a caixa é garantida por CHECK, sem depender de extensão.
  slug text unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$'),

  situacao app.situacao_tenant not null default 'teste',

  -- Documento do corretor ou da imobiliária. Só números.
  cpf_cnpj text check (cpf_cnpj ~ '^[0-9]{11}$' or cpf_cnpj ~ '^[0-9]{14}$'),
  creci text,

  -- Limites do plano. Ficam no tenant, não no plano, para que uma negociação
  -- comercial pontual não exija criar um plano novo. O plano define o padrão;
  -- estes campos são a verdade aplicada.
  limite_usuarios int not null default 1 check (limite_usuarios > 0),
  limite_imoveis int not null default 50 check (limite_imoveis > 0),
  limite_armazenamento_mb int not null default 1024 check (limite_armazenamento_mb > 0),

  -- Política de segurança da conta (seção 3.1: "MFA opcional ou obrigatório
  -- conforme a política da conta").
  mfa_obrigatorio boolean not null default false,
  -- Retenção de dado pessoal após cancelamento, em dias (seção 18).
  retencao_dias int not null default 1825 check (retencao_dias between 30 and 3650),

  fuso_horario text not null default 'America/Sao_Paulo',

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  -- Exclusão é lógica: dado de cliente não desaparece por clique errado.
  excluido_em timestamptz
);

comment on table public.tenants is
  'Conta de um corretor independente ou equipe. Raiz do isolamento de dados.';

create index tenants_situacao_idx on public.tenants (situacao) where excluido_em is null;
create index tenants_slug_idx on public.tenants (slug) where excluido_em is null;

-- ============================================================================
-- PERFIS
-- Espelho de auth.users. Existe porque auth.users é do Supabase e não pode
-- receber coluna nossa, e porque precisamos de RLS sobre dado de perfil.
-- ============================================================================
create table public.perfis (
  -- Mesmo id de auth.users: 1 para 1.
  id uuid primary key references auth.users (id) on delete cascade,

  nome text not null default '' check (length(nome) <= 160),
  -- Sempre gravado em minúscula pela aplicação; o índice único abaixo
  -- garante que duas caixas diferentes não virem dois perfis.
  email text not null check (email = lower(email) and position('@' in email) > 1),
  telefone text,
  avatar_url text,

  -- Preferências de interface. Modo compacto e modo foco são da seção 5.
  tema text not null default 'sistema' check (tema in ('claro', 'escuro', 'sistema')),
  densidade text not null default 'confortavel'
    check (densidade in ('compacta', 'confortavel')),

  -- Administrador da plataforma Agilliza (seção 16). NÃO é papel de tenant:
  -- é uma condição global, e por isso mora aqui e não em membros.
  -- Nunca pode ser alterada pelo próprio usuário — ver as políticas abaixo.
  admin_plataforma boolean not null default false,

  ultimo_acesso_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create unique index perfis_email_idx on public.perfis (email);

comment on column public.perfis.admin_plataforma is
  'Administrador da Agilliza. Concede acesso a todos os tenants, sempre auditado. Só pode ser alterado por outro admin_plataforma ou direto no banco.';

-- ============================================================================
-- MEMBROS
-- Liga usuário a tenant com um papel. Um usuário pode pertencer a mais de um
-- tenant (um corretor que também é assistente na equipe de outro), e é por isso
-- que isto é tabela e não coluna em perfis.
-- ============================================================================
create table public.membros (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  usuario_id uuid not null references public.perfis (id) on delete cascade,

  papel app.papel not null default 'corretor',
  situacao app.situacao_membro not null default 'ativo',

  -- Permissões pontuais que se somam ou subtraem do papel. O papel é o padrão;
  -- estas são a exceção negociada. Formato: {"imoveis.excluir": false}.
  permissoes_extra jsonb not null default '{}'::jsonb,

  convidado_por uuid references public.perfis (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  -- Um usuário tem no máximo um vínculo por tenant.
  unique (tenant_id, usuario_id)
);

-- Índice que sustenta TODA política de RLS do sistema: cada consulta de cada
-- tabela passa por aqui. Sem ele, o isolamento fica caro em escala.
create index membros_usuario_ativo_idx
  on public.membros (usuario_id, tenant_id)
  where situacao = 'ativo';

create index membros_tenant_idx on public.membros (tenant_id, papel);

-- Exatamente um proprietário por tenant: sem isso, uma conta pode ficar órfã
-- ou com dois donos disputando cobrança.
create unique index membros_um_proprietario_idx
  on public.membros (tenant_id)
  where papel = 'proprietario' and situacao = 'ativo';

-- ============================================================================
-- FUNÇÕES DE AUTORIZAÇÃO
--
-- `security definer` para poderem ler `membros` sem cair na RLS de membros
-- (que dependeria delas: recursão infinita).
-- `stable` para o Postgres avaliar uma vez por statement em vez de por linha —
-- a diferença entre uma consulta rápida e um scan por linha em tabela grande.
-- `set search_path = ''` para impedir sequestro de nome por objeto criado num
-- esquema que o usuário controle.
-- ============================================================================

-- Tenants em que o usuário autenticado é membro ativo.
create or replace function app.tenants_do_usuario()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.tenant_id
  from public.membros m
  where m.usuario_id = (select auth.uid())
    and m.situacao = 'ativo'
$$;

-- `true` se o usuário é administrador da plataforma.
create or replace function app.e_admin_plataforma()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.admin_plataforma from public.perfis p where p.id = (select auth.uid())),
    false
  )
$$;

-- Acesso de leitura ao tenant: membro ativo OU administrador da plataforma.
-- A seção 17 permite acesso administrativo, exigindo que seja "controlado,
-- auditado e justificável" — o registro fica na auditoria.
create or replace function app.pode_ler_tenant(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_tenant_id in (select app.tenants_do_usuario())
      or app.e_admin_plataforma()
$$;

-- Papel do usuário dentro de um tenant, ou null se não for membro.
create or replace function app.papel_no_tenant(p_tenant_id uuid)
returns app.papel
language sql
stable
security definer
set search_path = ''
as $$
  select m.papel
  from public.membros m
  where m.tenant_id = p_tenant_id
    and m.usuario_id = (select auth.uid())
    and m.situacao = 'ativo'
$$;

-- `true` se o usuário administra o tenant (dono ou admin de equipe).
create or replace function app.administra_tenant(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.papel_no_tenant(p_tenant_id) in ('proprietario', 'admin_equipe')
      or app.e_admin_plataforma()
$$;

-- `true` se o papel permite escrever dado operacional (CRM, imóvel, agenda).
-- 'visualizacao' e 'financeiro' não escrevem no CRM; 'financeiro' tem escopo
-- próprio, tratado nas migrações de cobrança.
create or replace function app.pode_escrever(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.papel_no_tenant(p_tenant_id)
         in ('proprietario', 'admin_equipe', 'corretor', 'assistente', 'secretaria', 'sdr')
$$;

-- ============================================================================
-- AUDITORIA
-- Seção 18: registrar quem acessou, o que fez, quando, em qual tenant, qual
-- registro afetou, o resultado e a origem. "Auditoria não pode ser editada ou
-- apagada por usuários comuns" — aqui nem pelo dono do tenant.
-- ============================================================================
create table public.auditoria (
  id bigserial primary key,

  -- Nulo quando a ação é da plataforma e não de um tenant (ex.: login).
  tenant_id uuid references public.tenants (id) on delete set null,
  -- Nulo quando o autor é o sistema (job, automação, webhook).
  autor_id uuid references public.perfis (id) on delete set null,
  autor_email text,
  -- Preserva o papel no momento do ato: se o papel mudar depois, o registro
  -- histórico continua verdadeiro.
  autor_papel app.papel,

  acao text not null check (length(acao) between 3 and 80),
  entidade text not null check (length(entidade) between 2 and 60),
  entidade_id text,

  resultado app.resultado_auditoria not null default 'permitido',

  -- Contexto do acesso. `ip` como inet para permitir consulta por faixa.
  ip inet,
  agente_usuario text,
  -- Motivo declarado — obrigatório para consulta de crédito (seção 11) e para
  -- acesso administrativo a tenant de terceiro (seção 17).
  justificativa text,

  -- Alteração em si. Dado sensível entra mascarado: a auditoria registra que o
  -- CPF mudou, não qual é o CPF.
  antes jsonb,
  depois jsonb,
  metadados jsonb not null default '{}'::jsonb,

  criado_em timestamptz not null default now()
);

comment on table public.auditoria is
  'Registro imutável de ação relevante. Sem UPDATE e sem DELETE para qualquer papel.';

create index auditoria_tenant_data_idx on public.auditoria (tenant_id, criado_em desc);
create index auditoria_autor_idx on public.auditoria (autor_id, criado_em desc);
create index auditoria_entidade_idx on public.auditoria (entidade, entidade_id);
-- Negativa e erro são o que se investiga primeiro num incidente.
create index auditoria_negados_idx on public.auditoria (criado_em desc)
  where resultado in ('negado', 'erro');

-- ============================================================================
-- CONVITES
-- Seção 18: "convite de usuários com expiração".
-- ============================================================================
create table public.convites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,

  email text not null check (email = lower(email) and position('@' in email) > 1),
  papel app.papel not null default 'corretor',

  -- Guarda só o HASH do token. Se o banco vazar, os convites não viram acesso.
  token_hash text not null unique,

  convidado_por uuid references public.perfis (id) on delete set null,
  expira_em timestamptz not null,
  aceito_em timestamptz,
  revogado_em timestamptz,
  criado_em timestamptz not null default now(),

  -- Expiração no futuro é condição de existência, não de uso.
  constraint convite_expira_depois_de_criado check (expira_em > criado_em)
);

create index convites_email_idx on public.convites (email) where aceito_em is null;
create unique index convites_pendente_unico_idx
  on public.convites (tenant_id, email)
  where aceito_em is null and revogado_em is null;

-- ============================================================================
-- GATILHO DE atualizado_em
-- ============================================================================
create or replace function app.tocar_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger tenants_atualizado_em before update on public.tenants
  for each row execute function app.tocar_atualizado_em();
create trigger perfis_atualizado_em before update on public.perfis
  for each row execute function app.tocar_atualizado_em();
create trigger membros_atualizado_em before update on public.membros
  for each row execute function app.tocar_atualizado_em();

-- ============================================================================
-- PERFIL AUTOMÁTICO NO CADASTRO
-- Sem isto, um usuário criado pelo Supabase Auth ficaria sem perfil e sem
-- vínculo, e a aplicação quebraria no primeiro acesso.
-- ============================================================================
create or replace function app.criar_perfil_no_cadastro()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfis (id, email, nome)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'nome', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger criar_perfil_apos_cadastro
  after insert on auth.users
  for each row execute function app.criar_perfil_no_cadastro();

-- ============================================================================
-- LIMITE DE USUÁRIOS DO PLANO
-- Regra comercial, não autorização — por isso gatilho e não política.
--
-- O `pg_advisory_xact_lock` serializa as inclusões do MESMO tenant: sem ele,
-- dois aceites de convite simultâneos leriam a mesma contagem e ambos
-- passariam, deixando a conta acima do plano. A trava é por tenant, então não
-- há contenção entre contas diferentes, e é liberada no fim da transação.
-- ============================================================================
create or replace function app.conferir_limite_usuarios()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limite int;
  v_ativos int;
begin
  -- Só conta quem passa a ocupar vaga.
  if new.situacao <> 'ativo' then
    return new;
  end if;

  -- Em UPDATE, se já estava ativo, a vaga já era dele.
  if tg_op = 'UPDATE' and old.situacao = 'ativo' and old.tenant_id = new.tenant_id then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.tenant_id::text, 0));

  select t.limite_usuarios into v_limite
  from public.tenants t
  where t.id = new.tenant_id;

  if v_limite is null then
    raise exception 'Tenant % não existe', new.tenant_id
      using errcode = 'foreign_key_violation';
  end if;

  select count(*) into v_ativos
  from public.membros m
  where m.tenant_id = new.tenant_id
    and m.situacao = 'ativo'
    and (tg_op = 'INSERT' or m.id <> new.id);

  if v_ativos >= v_limite then
    raise exception
      'Limite de % usuário(s) do plano atingido. Aumente o plano para incluir mais pessoas.',
      v_limite
      using errcode = 'check_violation',
            hint = 'limite_plano_usuarios';
  end if;

  return new;
end;
$$;

create trigger membros_limite_plano
  before insert or update of situacao, tenant_id on public.membros
  for each row execute function app.conferir_limite_usuarios();

-- ============================================================================
-- ROW LEVEL SECURITY
--
-- Ligada em TODAS as tabelas. Uma tabela sem RLS num projeto Supabase fica
-- exposta a quem tiver a chave publicável — que por definição está no
-- navegador de todo mundo.
-- ============================================================================
alter table public.tenants enable row level security;
alter table public.perfis enable row level security;
alter table public.membros enable row level security;
alter table public.auditoria enable row level security;
alter table public.convites enable row level security;

-- Nem o dono da tabela escapa da RLS. Protege contra engano com a chave de
-- serviço em rotina que não precisava de privilégio total.
alter table public.tenants force row level security;
alter table public.membros force row level security;
alter table public.auditoria force row level security;
alter table public.convites force row level security;

-- ---------------------------------------------------------------- tenants ----
create policy tenants_ler on public.tenants
  for select to authenticated
  using (app.pode_ler_tenant(id) and excluido_em is null);

-- Criação de tenant passa pela aplicação (precisa criar o membro proprietário
-- na mesma transação). Nenhuma política de insert: só a chave de serviço.

create policy tenants_atualizar on public.tenants
  for update to authenticated
  using (app.administra_tenant(id))
  with check (app.administra_tenant(id));

-- Sem política de delete: tenant não se apaga pela API. Exclusão é lógica.

-- ----------------------------------------------------------------- perfis ----
create policy perfis_ler_proprio on public.perfis
  for select to authenticated
  using (id = (select auth.uid()));

-- Um membro precisa ver o nome dos colegas para atribuir tarefa e responsável.
create policy perfis_ler_colegas on public.perfis
  for select to authenticated
  using (
    exists (
      select 1
      from public.membros m
      where m.usuario_id = public.perfis.id
        and m.situacao = 'ativo'
        and m.tenant_id in (select app.tenants_do_usuario())
    )
  );

create policy perfis_ler_admin on public.perfis
  for select to authenticated
  using (app.e_admin_plataforma());

-- O usuário edita o próprio perfil, MENOS `admin_plataforma`: quem pudesse
-- editar a própria linha se promoveria a administrador da plataforma inteira.
create policy perfis_atualizar_proprio on public.perfis
  for update to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and admin_plataforma = (
      select p.admin_plataforma from public.perfis p where p.id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------- membros ----
create policy membros_ler on public.membros
  for select to authenticated
  using (app.pode_ler_tenant(tenant_id));

-- A política cuida só de AUTORIZAÇÃO. O limite de usuários do plano é regra
-- comercial e fica no gatilho `app.conferir_limite_usuarios`: dentro de uma
-- política, a contagem seria avaliada sem travar a tabela e dois convites
-- simultâneos passariam os dois, estourando o plano.
create policy membros_inserir on public.membros
  for insert to authenticated
  with check (
    app.administra_tenant(tenant_id)
    -- Ninguém cria um proprietário pela API: o dono nasce junto com o tenant.
    and papel <> 'proprietario'
  );

create policy membros_atualizar on public.membros
  for update to authenticated
  using (
    app.administra_tenant(tenant_id)
    -- O proprietário não pode ser rebaixado nem suspenso por um admin.
    and papel <> 'proprietario'
  )
  with check (app.administra_tenant(tenant_id) and papel <> 'proprietario');

create policy membros_remover on public.membros
  for delete to authenticated
  using (app.administra_tenant(tenant_id) and papel <> 'proprietario');

-- -------------------------------------------------------------- auditoria ----
-- Ler: quem administra o tenant. Um corretor não precisa ver o log dos colegas.
create policy auditoria_ler on public.auditoria
  for select to authenticated
  using (app.administra_tenant(tenant_id));

-- Escrever: só a chave de serviço, pelo servidor. Se o cliente pudesse
-- inserir, poderia forjar registro de auditoria — pior que não ter auditoria.
-- Sem política de insert para authenticated, portanto.

-- SEM política de update. SEM política de delete. A imutabilidade exigida pela
-- seção 18 vem da ausência de política, que é negação por padrão, e não de um
-- gatilho que alguém possa desabilitar.

-- --------------------------------------------------------------- convites ----
create policy convites_ler on public.convites
  for select to authenticated
  using (app.administra_tenant(tenant_id));

create policy convites_criar on public.convites
  for insert to authenticated
  with check (app.administra_tenant(tenant_id) and papel <> 'proprietario');

create policy convites_revogar on public.convites
  for update to authenticated
  using (app.administra_tenant(tenant_id))
  with check (app.administra_tenant(tenant_id));

-- ============================================================================
-- PRIVILÉGIOS
-- RLS filtra linha; GRANT decide se a tabela é alcançável. Os dois são
-- necessários: RLS sem GRANT não abre, GRANT sem RLS abre demais.
-- ============================================================================
grant usage on schema public to anon, authenticated;

grant select, update on public.tenants to authenticated;
grant select, update on public.perfis to authenticated;
grant select, insert, update, delete on public.membros to authenticated;
grant select on public.auditoria to authenticated;
grant select, insert, update on public.convites to authenticated;

-- `anon` não alcança nada por padrão. O portfólio público e o portal do
-- cliente recebem acesso explícito e restrito nas suas próprias migrações.
revoke all on all tables in schema public from anon;

-- A sequência da auditoria não pode ser manipulada pelo cliente.
revoke all on sequence public.auditoria_id_seq from anon, authenticated;
