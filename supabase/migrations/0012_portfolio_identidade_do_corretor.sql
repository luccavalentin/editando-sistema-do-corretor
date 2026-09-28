-- ============================================================================
-- AGILLIZA — 0012 A IDENTIDADE PÚBLICA DO CORRETOR
--
-- A 0010 abriu os IMÓVEIS para o visitante. Falta o corretor: a página
-- `/c/<slug>` precisa dizer de quem é aquele portfólio, e hoje `tenants` é
-- inalcançável para o papel `anon` — o que está certo, porque a tabela guarda
-- CPF/CNPJ, limites do plano e situação de pagamento.
--
-- A saída é a mesma da 0010, e pelo mesmo motivo: privilégio COLUNA A COLUNA,
-- mais uma política que decide as linhas. Nada de view `security definer`.
--
-- PUBLICAR É DECISÃO, NÃO EFEITO COLATERAL
--
-- `portfolio_ativo` nasce `false`. Um corretor que criou a conta e ainda não
-- lançou nada não tem o nome dele numa página indexada pelo Google sem ter
-- pedido. Ter um `slug` preenchido não basta — o slug é gerado no cadastro, a
-- publicação é um ato.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. OS CAMPOS DA VITRINE
-- ----------------------------------------------------------------------------
alter table public.tenants
  add column portfolio_ativo boolean not null default false,
  add column portfolio_titulo text check (
    portfolio_titulo is null or length(btrim(portfolio_titulo)) between 3 and 120
  ),
  add column portfolio_bio text check (
    portfolio_bio is null or length(portfolio_bio) <= 2000
  ),
  add column portfolio_whatsapp text check (
    portfolio_whatsapp is null or portfolio_whatsapp ~ '^[0-9]{10,13}$'
  ),
  add column portfolio_email text check (
    portfolio_email is null or portfolio_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  add column portfolio_logo_chave text,
  add column portfolio_capa_chave text;

comment on column public.tenants.portfolio_ativo is
  'O corretor publicou a vitrine. Nasce falso de proposito: ter slug nao e ter consentido em aparecer numa pagina publica indexavel.';

comment on column public.tenants.portfolio_whatsapp is
  'Numero publicado na vitrine. E diferente do telefone de cadastro: o corretor escolhe qual numero o mundo ve.';

-- Publicar exige ter o que mostrar e como ser encontrado. Vitrine no ar sem
-- slug é URL impossível; sem título, é uma página sem nome no resultado da
-- busca.
alter table public.tenants
  add constraint portfolio_exige_slug_e_titulo
  check (
    not portfolio_ativo
    or (slug is not null and portfolio_titulo is not null)
  );

-- ----------------------------------------------------------------------------
-- 2. A LINHA QUE O VISITANTE ALCANÇA
--
-- Só conta publicada, não excluída e com a vitrine ligada. Inadimplente
-- continua no ar pela mesma razão da 0010: a cobrança é com o corretor, e
-- derrubar a vitrine dele pune o cliente que estava procurando um imóvel.
-- ----------------------------------------------------------------------------
create policy tenants_portfolio_publico on public.tenants
  for select to anon
  using (
    portfolio_ativo
    and excluido_em is null
    and situacao in ('teste', 'ativo', 'inadimplente')
  );

-- Índice para a busca por slug, que é o primeiro passo de TODA visita à
-- vitrine. Sem ele, cada página pública faria varredura na tabela de contas.
create unique index tenants_slug_publico_idx on public.tenants (slug)
  where portfolio_ativo and excluido_em is null;

-- ----------------------------------------------------------------------------
-- 3. PRIVILÉGIO DE COLUNA
--
-- Fora da lista, de propósito: cpf_cnpj, situacao, limite_usuarios,
-- limite_imoveis, limite_armazenamento_mb, retencao_dias, mfa_obrigatorio,
-- fuso_horario, excluido_em, criado_em, atualizado_em.
--
-- `situacao` merece nota: a POLÍTICA acima a lê para decidir a linha, e isso
-- funciona sem o privilégio — política e privilégio são checagens separadas.
-- O visitante nunca descobre se o corretor está inadimplente.
-- ----------------------------------------------------------------------------
grant select (
  id, nome, slug, creci,
  portfolio_ativo, portfolio_titulo, portfolio_bio,
  portfolio_whatsapp, portfolio_email,
  portfolio_logo_chave, portfolio_capa_chave
) on public.tenants to anon;

-- ----------------------------------------------------------------------------
-- 4. A VISTA DE CONVENIÊNCIA
--
-- `security_invoker`: a política acima é que decide, não o dono da view.
-- ----------------------------------------------------------------------------
create view public.portfolio_corretores
with (security_invoker = true)
as
select
  t.id, t.nome, t.slug, t.creci,
  t.portfolio_titulo, t.portfolio_bio,
  t.portfolio_whatsapp, t.portfolio_email,
  t.portfolio_logo_chave, t.portfolio_capa_chave
from public.tenants t
where t.portfolio_ativo;

comment on view public.portfolio_corretores is
  'Recorte publico do corretor para a vitrine. A protecao real sao os privilegios de coluna e a politica em tenants; a view e conveniencia.';

grant select on public.portfolio_corretores to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5. A VITRINE DESLIGADA TIRA OS IMÓVEIS DO AR JUNTO
--
-- Sem isto, desligar a vitrine deixaria a página do corretor inacessível mas os
-- anúncios individuais continuariam alcançáveis por URL direta — e por
-- buscador, que já os indexou. "Tirei do ar" precisa significar fora do ar.
-- ----------------------------------------------------------------------------
create or replace function app.calcular_visibilidade_do_imovel()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_situacao_tenant app.situacao_tenant;
  v_tenant_excluido timestamptz;
  v_portfolio_ativo boolean;
begin
  select t.situacao, t.excluido_em, t.portfolio_ativo
    into v_situacao_tenant, v_tenant_excluido, v_portfolio_ativo
  from public.tenants t
  where t.id = new.tenant_id;

  new.visivel_no_portfolio :=
    new.publicado_no_portfolio
    and new.excluido_em is null
    and new.situacao in ('disponivel', 'reservado')
    and v_tenant_excluido is null
    and coalesce(v_portfolio_ativo, false)
    and v_situacao_tenant in ('teste', 'ativo', 'inadimplente');

  return new;
end;
$$;

create or replace function app.propagar_situacao_do_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.situacao is not distinct from old.situacao
     and new.excluido_em is not distinct from old.excluido_em
     and new.portfolio_ativo is not distinct from old.portfolio_ativo then
    return null;
  end if;

  update public.imoveis i
  set visivel_no_portfolio =
    i.publicado_no_portfolio
    and i.excluido_em is null
    and i.situacao in ('disponivel', 'reservado')
    and new.excluido_em is null
    and new.portfolio_ativo
    and new.situacao in ('teste', 'ativo', 'inadimplente')
  where i.tenant_id = new.id
    and i.visivel_no_portfolio is distinct from (
      i.publicado_no_portfolio
      and i.excluido_em is null
      and i.situacao in ('disponivel', 'reservado')
      and new.excluido_em is null
      and new.portfolio_ativo
      and new.situacao in ('teste', 'ativo', 'inadimplente')
    );

  return null;
end;
$$;

drop trigger if exists tenants_propagar_situacao on public.tenants;
create trigger tenants_propagar_situacao
  after update of situacao, excluido_em, portfolio_ativo on public.tenants
  for each row execute function app.propagar_situacao_do_tenant();

-- Reavalia o que já existe com a regra nova. Como `portfolio_ativo` nasce
-- falso, isto tira do ar tudo que estava publicado — e está correto: ninguém
-- consentiu ainda. O corretor liga a vitrine e os anúncios voltam.
update public.imoveis i
set visivel_no_portfolio = false
where i.visivel_no_portfolio
  and not exists (
    select 1 from public.tenants t
    where t.id = i.tenant_id and t.portfolio_ativo
  );
