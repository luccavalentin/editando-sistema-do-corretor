-- ============================================================================
-- AGILLIZA — 0011 O NEGÓCIO PASSA A APONTAR PARA O IMÓVEL
--
-- Lacuna encontrada ao escrever a tela do imóvel: `negocios` não tinha
-- `imovel_id`. A 0003 criou o funil antes de existir cadastro de imóvel, e a
-- 0009 criou o imóvel sem voltar para ligar as duas pontas.
--
-- O efeito prático da falta: não havia como responder "quantas propostas este
-- apartamento já recebeu?" nem "qual imóvel o cliente está negociando?" — que
-- são as duas perguntas que um corretor faz o dia inteiro. A comissão também
-- depende disso: ela é percentual do valor DO IMÓVEL, e sem o vínculo o cálculo
-- teria que ser redigitado a cada negócio.
--
-- `on delete set null` e não `restrict`: um imóvel arquivado por engano não
-- pode travar o histórico de um negócio fechado. O negócio sobrevive à remoção
-- do imóvel, com o valor que já estava registrado nele.
-- ============================================================================

alter table public.negocios
  add column imovel_id uuid references public.imoveis (id) on delete set null;

comment on column public.negocios.imovel_id is
  'Imóvel sendo negociado. Nulo em negócio de captação, onde o corretor ainda vai encontrar o imóvel.';

-- Índice parcial: a maioria das consultas é "negócios deste imóvel", e negócio
-- sem imóvel não precisa ocupar espaço no índice.
create index negocios_imovel_idx on public.negocios (imovel_id)
  where imovel_id is not null;

-- ----------------------------------------------------------------------------
-- COERÊNCIA DE TENANT
--
-- A RLS impede LER o que é de outra conta, mas não impede ESCREVER um id de
-- outra conta num campo — a política de UPDATE confere a linha alterada, não o
-- que ela referencia. Sem isto, um negócio poderia apontar para o imóvel de um
-- concorrente, e a ficha do imóvel passaria a listar um negócio que não é dela.
--
-- A 0003 já criou `app.conferir_tenant_coerente` para `pessoa_id` e `etapa_id`.
-- Aqui ela ganha mais uma coluna para vigiar.
-- ----------------------------------------------------------------------------
create or replace function app.conferir_imovel_do_mesmo_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant_do_imovel uuid;
begin
  if new.imovel_id is null then
    return new;
  end if;

  select i.tenant_id into v_tenant_do_imovel
  from public.imoveis i
  where i.id = new.imovel_id;

  if v_tenant_do_imovel is null then
    raise exception 'Imóvel % não existe.', new.imovel_id
      using hint = 'imovel_inexistente';
  end if;

  if v_tenant_do_imovel <> new.tenant_id then
    raise exception 'O imóvel pertence a outro tenant.'
      using hint = 'cruzamento_de_tenant';
  end if;

  return new;
end;
$$;

create trigger negocios_imovel_coerente
  before insert or update of imovel_id, tenant_id on public.negocios
  for each row execute function app.conferir_imovel_do_mesmo_tenant();

-- ----------------------------------------------------------------------------
-- CONTADOR DE PROPOSTAS NO IMÓVEL
--
-- Contar na hora da leitura custaria um `count` por imóvel em toda listagem.
-- O contador é mantido por gatilho, como as demais métricas da 0009.
-- ----------------------------------------------------------------------------
alter table public.imoveis
  add column negocios_abertos int not null default 0 check (negocios_abertos >= 0);

comment on column public.imoveis.negocios_abertos is
  'Negócios em aberto neste imóvel. Mantido por gatilho: contar na leitura custaria um count por linha em toda listagem.';

create or replace function app.recontar_negocios_do_imovel()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_alvos uuid[];
begin
  -- Reúne os imóveis afetados: o antigo e o novo, quando o negócio muda de
  -- imóvel ou de situação.
  v_alvos := array_remove(
    array[
      case when tg_op in ('UPDATE', 'DELETE') then old.imovel_id end,
      case when tg_op in ('UPDATE', 'INSERT') then new.imovel_id end
    ],
    null
  );

  if array_length(v_alvos, 1) is null then
    return null;
  end if;

  update public.imoveis i
  set negocios_abertos = (
    select count(*)
    from public.negocios n
    where n.imovel_id = i.id
      and n.situacao = 'aberto'
      and n.excluido_em is null
  )
  where i.id = any(v_alvos);

  return null;
end;
$$;

create trigger negocios_recontar_no_imovel
  after insert or delete or update of imovel_id, situacao, excluido_em
  on public.negocios
  for each row execute function app.recontar_negocios_do_imovel();

-- ----------------------------------------------------------------------------
-- O CONTADOR NÃO É PÚBLICO
--
-- `negocios_abertos` fica DE FORA do privilégio concedido ao papel `anon` na
-- 0010, junto com `visualizacoes`, `favoritos` e `pedidos_visita`. Quantas
-- propostas um imóvel recebeu é informação do pipeline do corretor: publicada,
-- ela diz ao concorrente quais anúncios estão esquentando e ao comprador quanta
-- pressa ele precisa ter. Como a 0010 concede coluna a coluna, a nova coluna
-- nasce inalcançável — esta linha existe para o caso de alguém conceder por
-- engano mais tarde, e para deixar a decisão escrita.
-- ----------------------------------------------------------------------------
revoke select (negocios_abertos) on public.imoveis from anon;
