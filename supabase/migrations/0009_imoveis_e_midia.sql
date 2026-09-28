-- ============================================================================
-- AGILLIZA — 0009 IMÓVEIS, MÍDIA E INTERESSE
--
-- O PROPRIETÁRIO É UMA `pessoa`, não um campo de texto. O princípio 2 do produto
-- — "uma pessoa, um cadastro" — vale também para quem vende: a mesma pessoa é
-- compradora num negócio e proprietária em outro, com o mesmo cadastro e o mesmo
-- histórico. Guardar "nome do proprietário" como texto criaria uma segunda base
-- de pessoas, invisível e sem CPF.
--
-- A MÍDIA NÃO FICA NO BANCO nem no storage do Supabase. O que fica aqui é a
-- CHAVE do arquivo no storage próprio (MinIO no VPS, ou qualquer S3). Foto de
-- imóvel é o ativo mais pesado do produto: um portfólio com 200 imóveis e 15
-- fotos cada são 3.000 arquivos de vários megabytes, e a banda de saída disso
-- num storage cobrado por transferência fica cara antes de o produto dar lucro.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TIPOS
-- ----------------------------------------------------------------------------

-- Códigos alinhados com o contrato da Homefin (AP/CS/GA/TE/TC), para que a
-- simulação não precise de uma tabela de tradução no meio do caminho.
create type app.tipo_imovel as enum (
  'apartamento',
  'casa',
  'casa_condominio',
  'terreno',
  'terreno_condominio',
  'galpao',
  'sala_comercial',
  'loja',
  'chacara',
  'sobrado',
  'cobertura',
  'kitnet',
  'outro'
);

create type app.finalidade_imovel as enum ('venda', 'aluguel', 'venda_aluguel');

create type app.situacao_imovel as enum (
  'rascunho',      -- ainda sendo cadastrado, não aparece em lugar nenhum
  'disponivel',
  'reservado',
  'em_negociacao',
  'vendido',
  'alugado',
  'suspenso'       -- retirado temporariamente pelo corretor ou pelo proprietário
);

create type app.uso_imovel as enum ('residencial', 'comercial');

-- Novo ou usado: a Homefin pede em `situacaoImovel` (N/U).
create type app.conservacao_imovel as enum ('novo', 'usado', 'na_planta', 'em_construcao');

create type app.tipo_midia as enum ('foto', 'video', 'planta', 'tour_virtual', 'documento');

-- Interesse de uma pessoa por um imóvel (seção 9: favoritos, pedidos de visita).
create type app.tipo_interesse as enum (
  'favorito',
  'pedido_visita',
  'pedido_simulacao',
  'visualizacao',
  'contato'
);

-- ----------------------------------------------------------------------------
-- IMÓVEIS
-- ----------------------------------------------------------------------------
create table public.imoveis (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,

  -- Código legível que o corretor fala ao telefone e usa no anúncio.
  codigo text not null,

  titulo text not null check (length(btrim(titulo)) between 3 and 200),
  tipo app.tipo_imovel not null default 'apartamento',
  finalidade app.finalidade_imovel not null default 'venda',
  situacao app.situacao_imovel not null default 'rascunho',
  uso app.uso_imovel not null default 'residencial',
  conservacao app.conservacao_imovel not null default 'usado',

  -- O proprietário é uma pessoa do CRM. `restrict` de propósito: apagar a
  -- pessoa por engano não pode levar junto o vínculo com o imóvel.
  proprietario_id uuid references public.pessoas (id) on delete restrict,

  -- Endereço. `cep` só com dígitos, como no resto do sistema.
  cep text check (cep is null or cep ~ '^[0-9]{8}$'),
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  uf char(2) check (uf is null or uf ~ '^[A-Z]{2}$'),
  -- Endereço exato só aparece para quem está autenticado; o portfólio público
  -- mostra bairro e cidade. Quem anuncia não quer o endereço exposto.
  mostrar_endereco_no_portfolio boolean not null default false,

  latitude numeric(10, 7) check (latitude is null or latitude between -90 and 90),
  longitude numeric(10, 7) check (longitude is null or longitude between -180 and 180),

  -- Valores. `numeric` e nunca `float`.
  valor numeric(14, 2) check (valor is null or valor >= 0),
  valor_aluguel numeric(14, 2) check (valor_aluguel is null or valor_aluguel >= 0),
  valor_condominio numeric(12, 2) check (valor_condominio is null or valor_condominio >= 0),
  valor_iptu numeric(12, 2) check (valor_iptu is null or valor_iptu >= 0),
  aceita_financiamento boolean not null default true,
  aceita_fgts boolean not null default true,
  aceita_permuta boolean not null default false,

  -- Características.
  area_util numeric(10, 2) check (area_util is null or area_util > 0),
  area_total numeric(10, 2) check (area_total is null or area_total > 0),
  quartos smallint check (quartos is null or quartos between 0 and 30),
  suites smallint check (suites is null or suites between 0 and 30),
  banheiros smallint check (banheiros is null or banheiros between 0 and 30),
  vagas smallint check (vagas is null or vagas between 0 and 50),
  andar smallint,
  ano_construcao smallint check (ano_construcao is null or ano_construcao between 1800 and 2100),
  mobiliado boolean not null default false,
  aceita_pet boolean not null default false,

  -- Lazer, segurança e diferenciais. Lista de chaves, não texto livre: assim o
  -- filtro "com piscina" funciona e a exportação para portal encontra o campo.
  comodidades text[] not null default '{}',

  -- Comercial.
  comissao_percentual numeric(5, 2)
    check (comissao_percentual is null or (comissao_percentual >= 0 and comissao_percentual <= 100)),
  exclusividade boolean not null default false,
  exclusividade_ate date,

  -- Conteúdo.
  descricao_publica text,
  observacoes_internas text,

  -- Publicação.
  publicado_no_portfolio boolean not null default false,
  publicado_em timestamptz,
  -- Endereço amigável dentro do portfólio do corretor.
  slug text check (slug is null or slug ~ '^[a-z0-9][a-z0-9-]{1,80}[a-z0-9]$'),

  -- Métricas (seção 9). Colunas e não contagem ao vivo: a lista de imóveis
  -- mostra os números em cada linha, e contar interesses por linha seria uma
  -- consulta por imóvel a cada carregamento.
  visualizacoes int not null default 0 check (visualizacoes >= 0),
  contatos_gerados int not null default 0 check (contatos_gerados >= 0),
  favoritos int not null default 0 check (favoritos >= 0),
  pedidos_visita int not null default 0 check (pedidos_visita >= 0),

  responsavel_id uuid references public.perfis (id) on delete set null,
  criado_por uuid references public.perfis (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz,

  unique (tenant_id, codigo),
  unique (tenant_id, slug),

  -- Publicar sem preço nem descrição gera um anúncio que não converte e ainda
  -- ocupa vaga no plano. O banco recusa antes de virar problema comercial.
  constraint publicacao_exige_conteudo
    check (
      not publicado_no_portfolio
      or (
        descricao_publica is not null
        and length(btrim(descricao_publica)) >= 40
        and (valor is not null or valor_aluguel is not null)
        and cidade is not null
      )
    ),

  constraint exclusividade_com_prazo
    check (not exclusividade or exclusividade_ate is not null),

  -- Venda precisa de valor de venda; aluguel precisa de valor de aluguel.
  constraint valor_coerente_com_finalidade
    check (
      situacao = 'rascunho'
      or (finalidade = 'venda' and valor is not null)
      or (finalidade = 'aluguel' and valor_aluguel is not null)
      or (finalidade = 'venda_aluguel' and valor is not null and valor_aluguel is not null)
    ),

  constraint suites_cabem_nos_quartos
    check (suites is null or quartos is null or suites <= quartos)
);

comment on table public.imoveis is
  'Imóveis do corretor. O proprietário é uma pessoa do CRM, não texto livre.';

create index imoveis_tenant_idx on public.imoveis (tenant_id, situacao)
  where excluido_em is null;
create index imoveis_disponiveis_idx
  on public.imoveis (tenant_id, valor)
  where situacao = 'disponivel' and excluido_em is null;
create index imoveis_portfolio_idx
  on public.imoveis (tenant_id, publicado_em desc)
  where publicado_no_portfolio and excluido_em is null;
create index imoveis_proprietario_idx on public.imoveis (proprietario_id)
  where proprietario_id is not null;
create index imoveis_responsavel_idx on public.imoveis (tenant_id, responsavel_id)
  where excluido_em is null;
create index imoveis_local_idx on public.imoveis (tenant_id, cidade, bairro)
  where excluido_em is null;

-- Busca por título tolerante a erro de digitação, como em pessoas.
create index imoveis_titulo_busca_idx
  on public.imoveis using gin (titulo extensions.gin_trgm_ops);

-- Filtro por comodidade ("com piscina", "com portaria 24h") sem varrer a tabela.
create index imoveis_comodidades_idx on public.imoveis using gin (comodidades);

-- ----------------------------------------------------------------------------
-- MÍDIA
--
-- A coluna `chave` é o caminho do arquivo no storage PRÓPRIO, não uma URL
-- completa. Guardar a URL inteira amarra o banco ao endereço do storage: trocar
-- de provedor, ou só mudar o domínio do CDN, exigiria reescrever todas as linhas.
-- Com a chave, a URL é montada na hora a partir da configuração.
-- ----------------------------------------------------------------------------
create table public.imovel_midias (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  imovel_id uuid not null references public.imoveis (id) on delete cascade,

  tipo app.tipo_midia not null default 'foto',
  -- Ex.: tenants/<tenant>/imoveis/<imovel>/8f3a....jpg
  chave text not null check (length(chave) between 8 and 500),
  -- Para vídeo e tour hospedados fora (YouTube, Matterport).
  url_externa text,

  legenda text,
  ordem smallint not null default 0,
  capa boolean not null default false,

  largura int check (largura is null or largura > 0),
  altura int check (altura is null or altura > 0),
  bytes bigint check (bytes is null or bytes > 0),
  tipo_conteudo text,

  criado_por uuid references public.perfis (id) on delete set null,
  criado_em timestamptz not null default now(),

  unique (tenant_id, chave)
);

create index imovel_midias_imovel_idx on public.imovel_midias (imovel_id, ordem);

-- Uma capa por imóvel: duas capas fazem a lista mostrar fotos diferentes a cada
-- carregamento, dependendo da ordem que o banco devolver.
create unique index imovel_midias_capa_idx
  on public.imovel_midias (imovel_id)
  where capa;

-- ----------------------------------------------------------------------------
-- INTERESSE
-- Liga pessoa a imóvel: favoritou, pediu visita, pediu simulação.
-- ----------------------------------------------------------------------------
create table public.imovel_interesses (
  id bigserial primary key,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  imovel_id uuid not null references public.imoveis (id) on delete cascade,
  -- Nulo quando o interesse veio do portfólio público, antes de a pessoa virar
  -- cadastro. É assim que o corretor descobre qual anúncio gerou o contato.
  pessoa_id uuid references public.pessoas (id) on delete cascade,

  tipo app.tipo_interesse not null,
  origem app.canal,
  observacao text,

  criado_em timestamptz not null default now()
);

create index imovel_interesses_imovel_idx
  on public.imovel_interesses (imovel_id, tipo, criado_em desc);
create index imovel_interesses_pessoa_idx
  on public.imovel_interesses (pessoa_id, criado_em desc)
  where pessoa_id is not null;
create index imovel_interesses_tenant_idx
  on public.imovel_interesses (tenant_id, criado_em desc);

-- Favorito não se repete: favoritar duas vezes é o mesmo favorito.
create unique index imovel_interesses_favorito_unico_idx
  on public.imovel_interesses (imovel_id, pessoa_id)
  where tipo = 'favorito' and pessoa_id is not null;

-- ============================================================================
-- GATILHOS
-- ============================================================================

create trigger imoveis_atualizado_em before update on public.imoveis
  for each row execute function app.tocar_atualizado_em();

-- Coerência de tenant: o imóvel não pode apontar para pessoa de outra conta.
create trigger imoveis_tenant_coerente
  before insert or update on public.imoveis
  for each row execute function app.conferir_tenant_coerente();
create trigger imovel_interesses_tenant_coerente
  before insert or update on public.imovel_interesses
  for each row execute function app.conferir_tenant_coerente();

-- Código sequencial por tenant, pelo mesmo contador da migração 0003.
create or replace function app.gerar_codigo_imovel()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.codigo is not null and length(btrim(new.codigo)) > 0 then
    return new;
  end if;

  new.codigo := 'IM-' || lpad(app.proximo_contador(new.tenant_id, 'imovel')::text, 4, '0');
  return new;
end;
$$;

create trigger imoveis_codigo
  before insert on public.imoveis
  for each row execute function app.gerar_codigo_imovel();

-- Marca a data de publicação quando o imóvel entra no portfólio.
create or replace function app.marcar_publicacao_do_imovel()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.publicado_no_portfolio and not coalesce(old.publicado_no_portfolio, false) then
    new.publicado_em := now();
  elsif not new.publicado_no_portfolio then
    new.publicado_em := null;
  end if;
  return new;
end;
$$;

create trigger imoveis_publicacao
  before insert or update of publicado_no_portfolio on public.imoveis
  for each row execute function app.marcar_publicacao_do_imovel();

-- ----------------------------------------------------------------------------
-- CONTADORES DE INTERESSE
--
-- Mantidos por gatilho, e não recalculados a cada leitura: a lista de imóveis
-- mostra favoritos e pedidos de visita em cada linha, e contar por linha seria
-- uma consulta por imóvel a cada carregamento de tela.
-- ----------------------------------------------------------------------------
create or replace function app.atualizar_metricas_do_imovel()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_imovel uuid := coalesce(new.imovel_id, old.imovel_id);
  v_tipo app.tipo_interesse := coalesce(new.tipo, old.tipo);
  v_delta int := case when tg_op = 'INSERT' then 1 else -1 end;
begin
  update public.imoveis
  set
    favoritos = greatest(0, favoritos + case when v_tipo = 'favorito' then v_delta else 0 end),
    pedidos_visita =
      greatest(0, pedidos_visita + case when v_tipo = 'pedido_visita' then v_delta else 0 end),
    visualizacoes =
      greatest(0, visualizacoes + case when v_tipo = 'visualizacao' then v_delta else 0 end),
    contatos_gerados =
      greatest(0, contatos_gerados + case when v_tipo = 'contato' then v_delta else 0 end)
  where id = v_imovel;

  return null;
end;
$$;

create trigger imovel_interesses_metricas
  after insert or delete on public.imovel_interesses
  for each row execute function app.atualizar_metricas_do_imovel();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.imoveis enable row level security;
alter table public.imovel_midias enable row level security;
alter table public.imovel_interesses enable row level security;

-- NENHUMA das três leva `force row level security`, e é decisão consciente.
--
-- `imoveis` e `imovel_midias`: o portfólio público é servido por view, e uma
-- view sem `security_invoker` roda com os privilégios de quem a criou. Com
-- `force`, o dono passaria a obedecer às políticas — que só contemplam
-- `authenticated` — e as views devolveriam ZERO linha. O portfólio abriria
-- vazio, sem erro, sem log, sem ninguém entender por quê.
--
-- `imovel_interesses`: o gatilho de métricas roda como dono da tabela.
--
-- A RLS continua LIGADA nas três, então `authenticated` e `anon` seguem
-- filtrados normalmente. O que se abre mão é da proteção extra contra uso
-- descuidado da chave de serviço nestas três tabelas — que, diferente de
-- `pessoas` e `negocios`, não guardam dado pessoal sensível.

create policy imoveis_ler on public.imoveis
  for select to authenticated
  using (app.pode_ler_tenant(tenant_id) and excluido_em is null);
create policy imoveis_inserir on public.imoveis
  for insert to authenticated with check (app.pode_escrever(tenant_id));
create policy imoveis_atualizar on public.imoveis
  for update to authenticated using (app.pode_escrever(tenant_id))
  with check (app.pode_escrever(tenant_id));

create policy imovel_midias_ler on public.imovel_midias
  for select to authenticated using (app.pode_ler_tenant(tenant_id));
create policy imovel_midias_inserir on public.imovel_midias
  for insert to authenticated with check (app.pode_escrever(tenant_id));
create policy imovel_midias_atualizar on public.imovel_midias
  for update to authenticated using (app.pode_escrever(tenant_id))
  with check (app.pode_escrever(tenant_id));
create policy imovel_midias_remover on public.imovel_midias
  for delete to authenticated using (app.pode_escrever(tenant_id));

create policy imovel_interesses_ler on public.imovel_interesses
  for select to authenticated using (app.pode_ler_tenant(tenant_id));
create policy imovel_interesses_inserir on public.imovel_interesses
  for insert to authenticated with check (app.pode_escrever(tenant_id));
create policy imovel_interesses_remover on public.imovel_interesses
  for delete to authenticated using (app.pode_escrever(tenant_id));

-- ============================================================================
-- PRIVILÉGIOS
-- ============================================================================
grant select, insert, update on public.imoveis to authenticated;
grant select, insert, update, delete on public.imovel_midias to authenticated;
grant select, insert, delete on public.imovel_interesses to authenticated;

-- ============================================================================
-- PORTFÓLIO PÚBLICO: VIEW, NÃO A TABELA
--
-- Política de RLS controla LINHAS, não COLUNAS. Conceder `select` na tabela
-- `imoveis` ao papel `anon` deixaria qualquer visitante pedir
-- `observacoes_internas`, `comissao_percentual` e `proprietario_id` dos imóveis
-- publicados — basta uma requisição ao PostgREST com a chave publicável, que por
-- definição está no navegador de todo mundo. A anotação interna "aceita 740 mil"
-- viraria informação pública, e o comprador chegaria sabendo o piso do vendedor.
--
-- A view resolve porque ela ESCOLHE as colunas, e o endereço exato só aparece
-- quando o anunciante autorizou — condição que privilégio por coluna não
-- consegue expressar.
--
-- A view roda com os privilégios de QUEM A CRIOU, de propósito. Com
-- `security_invoker = true` o anônimo precisaria de privilégio nas colunas da
-- tabela para a view conseguir lê-las, e o problema voltaria inteiro. Sendo a
-- view a fronteira, o filtro inteiro mora dentro dela — inclusive a situação da
-- conta — e o anônimo não alcança a tabela de jeito nenhum.
-- ============================================================================
create view public.portfolio_imoveis as
select
  i.id,
  i.tenant_id,
  i.codigo,
  i.titulo,
  i.tipo,
  i.finalidade,
  i.situacao,
  i.uso,
  i.conservacao,
  i.slug,

  -- Bairro e cidade sempre; rua e número só com autorização explícita.
  i.bairro,
  i.cidade,
  i.uf,
  case when i.mostrar_endereco_no_portfolio then i.logradouro end as logradouro,
  case when i.mostrar_endereco_no_portfolio then i.numero end as numero,
  case when i.mostrar_endereco_no_portfolio then i.latitude end as latitude,
  case when i.mostrar_endereco_no_portfolio then i.longitude end as longitude,

  i.valor,
  i.valor_aluguel,
  i.valor_condominio,
  i.valor_iptu,
  i.aceita_financiamento,
  i.aceita_fgts,

  i.area_util,
  i.area_total,
  i.quartos,
  i.suites,
  i.banheiros,
  i.vagas,
  i.andar,
  i.ano_construcao,
  i.mobiliado,
  i.aceita_pet,
  i.comodidades,

  i.descricao_publica,
  i.publicado_em
from public.imoveis i
join public.tenants t on t.id = i.tenant_id
where i.publicado_no_portfolio
  and i.excluido_em is null
  and i.situacao in ('disponivel', 'reservado')
  and t.excluido_em is null
  -- Conta suspensa ou cancelada tira os anúncios do ar na hora.
  and t.situacao in ('teste', 'ativo', 'inadimplente');

comment on view public.portfolio_imoveis is
  'Recorte público do imóvel. Existe porque RLS filtra linha e não coluna: sem esta view, anon leria observacoes_internas e comissao_percentual dos imóveis publicados.';

-- O anônimo alcança a VIEW, nunca a tabela.
revoke all on public.imoveis from anon;
grant select on public.portfolio_imoveis to anon, authenticated;

-- A mídia segue o mesmo caminho: view, não tabela. `criado_por` fica de fora
-- porque é o id de um usuário interno do corretor.
create view public.portfolio_midias as
select
  m.id,
  m.imovel_id,
  m.tipo,
  m.chave,
  m.url_externa,
  m.legenda,
  m.ordem,
  m.capa,
  m.largura,
  m.altura,
  m.tipo_conteudo
from public.imovel_midias m
join public.imoveis i on i.id = m.imovel_id
join public.tenants t on t.id = i.tenant_id
where i.publicado_no_portfolio
  and i.excluido_em is null
  and i.situacao in ('disponivel', 'reservado')
  and t.excluido_em is null
  and t.situacao in ('teste', 'ativo', 'inadimplente');

comment on view public.portfolio_midias is
  'Fotos dos imóveis publicados. O anônimo alcança esta view, nunca imovel_midias.';

revoke all on public.imovel_midias from anon;
grant select on public.portfolio_midias to anon, authenticated;

revoke all on sequence public.imovel_interesses_id_seq from anon, authenticated;
