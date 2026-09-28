-- ============================================================================
-- AGILLIZA — 0010 O PORTFÓLIO PÚBLICO SEM VIEW `SECURITY DEFINER`
--
-- A 0009 resolveu o vazamento de coluna com duas views, mas elas rodavam com os
-- privilégios de quem as criou. O linter do Supabase aponta isso como ERRO, e
-- com razão: view definer é armadilha para quem mexer depois. Basta alguém
-- acrescentar uma coluna no `select` — ou afrouxar o `where` — e o vazamento
-- volta sem que nenhuma política tenha mudado. A proteção não fica onde se
-- procura por ela.
--
-- A causa de precisar de definer eram duas dependências que o papel `anon` não
-- pode ter:
--
--   1. O JOIN com `tenants`, para saber se a conta está ativa.
--   2. A leitura de `logradouro` e `numero` para montar o CASE do endereço.
--
-- Esta migração remove as duas, e aí `security_invoker = true` passa a
-- funcionar — que é o modo em que a RLS da tabela vale de verdade dentro da
-- view.
--
--   1. vira a coluna `visivel_no_portfolio`, mantida por gatilho. Suspender uma
--      conta continua tirando os anúncios do ar na hora, mas agora sem o anúncio
--      precisar consultar a conta a cada leitura.
--   2. vira coluna GERADA: o banco calcula o endereço público, e as colunas
--      cruas nunca são concedidas ao `anon`.
--
-- Resultado: a proteção passa a ser privilégio de coluna e política de RLS —
-- as duas coisas que um revisor procura — em vez de uma view que precisa ser
-- lida linha a linha para se ter certeza.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ENDEREÇO PÚBLICO COMO COLUNA GERADA
--
-- O `anon` recebe privilégio nestas colunas e NUNCA em `logradouro`, `numero`,
-- `latitude` e `longitude`. A condição vive no banco, não numa consulta que
-- alguém pode esquecer de repetir.
-- ----------------------------------------------------------------------------
alter table public.imoveis
  add column endereco_publico text generated always as (
    case
      when mostrar_endereco_no_portfolio
      then nullif(btrim(coalesce(logradouro, '') || ' ' || coalesce(numero, '')), '')
    end
  ) stored;

alter table public.imoveis
  add column latitude_publica numeric(10, 7) generated always as (
    case when mostrar_endereco_no_portfolio then latitude end
  ) stored;

alter table public.imoveis
  add column longitude_publica numeric(10, 7) generated always as (
    case when mostrar_endereco_no_portfolio then longitude end
  ) stored;

comment on column public.imoveis.endereco_publico is
  'Endereço mostrado no portfólio, ou NULL quando o anunciante não autorizou. Coluna gerada de propósito: `anon` recebe privilégio aqui e nunca em logradouro/numero.';

-- ----------------------------------------------------------------------------
-- 2. VISIBILIDADE COMO COLUNA, NÃO COMO JOIN
--
-- Não pode ser coluna gerada porque depende de OUTRA tabela (`tenants`), e
-- expressão de coluna gerada precisa ser imutável e local. Fica como coluna
-- comum mantida por dois gatilhos.
-- ----------------------------------------------------------------------------
alter table public.imoveis
  add column visivel_no_portfolio boolean not null default false;

comment on column public.imoveis.visivel_no_portfolio is
  'Verdadeiro quando o anúncio está publicado E a conta está ativa. Mantida por gatilho para que o portfólio público não precise consultar `tenants` — o que obrigaria a conceder `tenants` ao papel anon.';

create index imoveis_visiveis_idx on public.imoveis (visivel_no_portfolio, publicado_em desc)
  where visivel_no_portfolio;

/**
 * Recalcula a visibilidade de um imóvel.
 *
 * `security definer` porque precisa ler `tenants`, que o corretor comum não
 * alcança por completo. A função não recebe nada do usuário: ela só lê o estado
 * atual e grava um booleano.
 */
create or replace function app.calcular_visibilidade_do_imovel()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_situacao_tenant app.situacao_tenant;
  v_tenant_excluido timestamptz;
begin
  select t.situacao, t.excluido_em
    into v_situacao_tenant, v_tenant_excluido
  from public.tenants t
  where t.id = new.tenant_id;

  new.visivel_no_portfolio :=
    new.publicado_no_portfolio
    and new.excluido_em is null
    and new.situacao in ('disponivel', 'reservado')
    and v_tenant_excluido is null
    -- Conta cancelada ou suspensa some do ar. Inadimplente continua no ar: o
    -- produto cobra, não pune o cliente do corretor.
    and v_situacao_tenant in ('teste', 'ativo', 'inadimplente');

  return new;
end;
$$;

create trigger imoveis_visibilidade
  before insert or update of publicado_no_portfolio, situacao, excluido_em, tenant_id
  on public.imoveis
  for each row execute function app.calcular_visibilidade_do_imovel();

/**
 * Quando a conta muda de situação, os anúncios dela acompanham.
 *
 * É o que faz "suspender a conta tira os anúncios do ar" continuar valendo sem
 * o portfólio consultar `tenants` a cada leitura.
 */
create or replace function app.propagar_situacao_do_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.situacao is not distinct from old.situacao
     and new.excluido_em is not distinct from old.excluido_em then
    return null;
  end if;

  update public.imoveis i
  set visivel_no_portfolio =
    i.publicado_no_portfolio
    and i.excluido_em is null
    and i.situacao in ('disponivel', 'reservado')
    and new.excluido_em is null
    and new.situacao in ('teste', 'ativo', 'inadimplente')
  where i.tenant_id = new.id
    -- Só as linhas que realmente mudam: uma conta com 3.000 imóveis não
    -- precisa reescrever tudo porque o nome dela foi editado.
    and i.visivel_no_portfolio is distinct from (
      i.publicado_no_portfolio
      and i.excluido_em is null
      and i.situacao in ('disponivel', 'reservado')
      and new.excluido_em is null
      and new.situacao in ('teste', 'ativo', 'inadimplente')
    );

  return null;
end;
$$;

create trigger tenants_propagar_situacao
  after update of situacao, excluido_em on public.tenants
  for each row execute function app.propagar_situacao_do_tenant();

-- Preenche o que já existe.
update public.imoveis i
set visivel_no_portfolio = true
where i.publicado_no_portfolio
  and i.excluido_em is null
  and i.situacao in ('disponivel', 'reservado')
  and exists (
    select 1 from public.tenants t
    where t.id = i.tenant_id
      and t.excluido_em is null
      and t.situacao in ('teste', 'ativo', 'inadimplente')
  );

-- ----------------------------------------------------------------------------
-- 3. AS VIEWS PASSAM A SER `security_invoker`
--
-- Agora elas não dependem de nada que o `anon` não possa ver: o filtro é uma
-- coluna da própria tabela e o endereço já vem calculado.
-- ----------------------------------------------------------------------------
drop view if exists public.portfolio_imoveis;
drop view if exists public.portfolio_midias;

create view public.portfolio_imoveis
with (security_invoker = true)
as
select
  i.id, i.tenant_id, i.codigo, i.titulo, i.tipo, i.finalidade, i.situacao,
  i.uso, i.conservacao, i.slug,
  i.bairro, i.cidade, i.uf,
  i.endereco_publico, i.latitude_publica, i.longitude_publica,
  i.valor, i.valor_aluguel, i.valor_condominio, i.valor_iptu,
  i.aceita_financiamento, i.aceita_fgts,
  i.area_util, i.area_total, i.quartos, i.suites, i.banheiros, i.vagas,
  i.andar, i.ano_construcao, i.mobiliado, i.aceita_pet, i.comodidades,
  i.descricao_publica, i.publicado_em
from public.imoveis i
where i.visivel_no_portfolio;

comment on view public.portfolio_imoveis is
  'Recorte público do imóvel. security_invoker: a RLS de `imoveis` vale dentro dela. A proteção real são os privilégios de coluna abaixo — a view é conveniência, não fronteira.';

create view public.portfolio_midias
with (security_invoker = true)
as
select
  m.id, m.imovel_id, m.tipo, m.chave, m.url_externa, m.legenda,
  m.ordem, m.capa, m.largura, m.altura, m.tipo_conteudo
from public.imovel_midias m
where exists (
  select 1 from public.imoveis i
  where i.id = m.imovel_id and i.visivel_no_portfolio
);

comment on view public.portfolio_midias is
  'Fotos dos imóveis visíveis no portfólio. security_invoker: a RLS de imovel_midias vale dentro dela.';

-- ----------------------------------------------------------------------------
-- 4. POLÍTICA E PRIVILÉGIO — A PROTEÇÃO DE VERDADE
--
-- A política decide as LINHAS; o privilégio de coluna decide as COLUNAS. As
-- duas juntas são o que impede `observacoes_internas` de vazar, e as duas
-- aparecem no lugar onde um revisor procura.
-- ----------------------------------------------------------------------------
create policy imoveis_portfolio_publico on public.imoveis
  for select to anon
  using (visivel_no_portfolio);

create policy imovel_midias_portfolio_publico on public.imovel_midias
  for select to anon
  using (
    exists (
      select 1 from public.imoveis i
      where i.id = public.imovel_midias.imovel_id and i.visivel_no_portfolio
    )
  );

-- Privilégio por COLUNA. O que não está nesta lista é inalcançável para o
-- visitante, mesmo que ele descubra o id do imóvel e monte a consulta à mão.
-- Fora da lista, de propósito: observacoes_internas, comissao_percentual,
-- exclusividade, proprietario_id, responsavel_id, criado_por, cep, logradouro,
-- numero, complemento, latitude, longitude, visualizacoes, contatos_gerados,
-- favoritos, pedidos_visita.
grant select (
  id, tenant_id, codigo, titulo, tipo, finalidade, situacao, uso, conservacao,
  slug, bairro, cidade, uf, endereco_publico, latitude_publica, longitude_publica,
  valor, valor_aluguel, valor_condominio, valor_iptu,
  aceita_financiamento, aceita_fgts,
  area_util, area_total, quartos, suites, banheiros, vagas, andar,
  ano_construcao, mobiliado, aceita_pet, comodidades,
  descricao_publica, publicado_em, visivel_no_portfolio
) on public.imoveis to anon;

grant select (
  id, imovel_id, tipo, chave, url_externa, legenda, ordem, capa,
  largura, altura, tipo_conteudo
) on public.imovel_midias to anon;

grant select on public.portfolio_imoveis to anon, authenticated;
grant select on public.portfolio_midias to anon, authenticated;
