-- ============================================================================
-- AGILLIZA — 0008 FUNÇÕES DE AGREGAÇÃO DO PAINEL
--
-- O painel da seção 5 precisa de somas, médias e contagens por etapa. A
-- alternativa — trazer as linhas e somar em JavaScript — funciona com 30
-- negócios e cai com 3.000: o servidor passa a transferir a carteira inteira a
-- cada carregamento de tela.
--
-- SEGURANÇA: `security invoker` em todas. A função roda com a identidade de quem
-- chamou, então a Row Level Security continua valendo dentro dela. Um corretor
-- que passe o `tenant_id` do concorrente recebe zero — não por causa de uma
-- verificação escrita aqui, mas porque o Postgres não entrega as linhas.
--
-- É o oposto de `security definer`, usado nas funções de autorização, que PRECISA
-- ignorar a RLS. Confundir os dois é como se vaza dado entre tenants.
--
-- `stable` permite ao Postgres reaproveitar o resultado dentro do mesmo
-- statement e habilita o uso em subconsulta sem penalidade.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- INDICADORES DO PERÍODO (bloco 2 da seção 5)
-- ----------------------------------------------------------------------------
create or replace function public.painel_indicadores(
  p_tenant_id uuid,
  p_inicio timestamptz,
  p_fim timestamptz
)
returns table (
  negocios_ativos bigint,
  negocios_ganhos bigint,
  negocios_perdidos bigint,
  valor_em_negociacao numeric,
  valor_fechado numeric,
  ticket_medio numeric,
  taxa_conversao numeric,
  visitas_marcadas bigint,
  visitas_realizadas bigint,
  followups_pendentes bigint,
  followups_vencidos bigint,
  tarefas_vencidas bigint,
  pessoas_novas bigint,
  pessoas_quentes bigint,
  negocios_parados bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with
  -- Negócios abertos AGORA. Não filtra por período: o funil é uma fotografia do
  -- presente, não do intervalo escolhido.
  abertos as (
    select count(*) as qtd, coalesce(sum(valor), 0) as soma
    from negocios
    where tenant_id = p_tenant_id and situacao = 'aberto' and excluido_em is null
  ),
  -- Fechados DENTRO do período: aqui o intervalo importa.
  fechados as (
    select
      count(*) filter (where situacao = 'ganho') as ganhos,
      count(*) filter (where situacao = 'perdido') as perdidos,
      coalesce(sum(valor) filter (where situacao = 'ganho'), 0) as valor_ganho,
      coalesce(avg(valor) filter (where situacao = 'ganho'), 0) as ticket
    from negocios
    where tenant_id = p_tenant_id
      and excluido_em is null
      and situacao in ('ganho', 'perdido')
      and fechado_em between p_inicio and p_fim
  ),
  visitas as (
    select
      count(*) filter (where situacao in ('agendado', 'confirmado', 'realizado')) as marcadas,
      count(*) filter (where situacao = 'realizado') as realizadas
    from compromissos
    where tenant_id = p_tenant_id
      and tipo = 'visita'
      and inicio between p_inicio and p_fim
  ),
  fups as (
    select
      count(*) filter (where situacao = 'pendente') as pendentes,
      count(*) filter (where situacao = 'pendente' and prazo < now()) as vencidos
    from followups
    where tenant_id = p_tenant_id
  ),
  tfs as (
    select count(*) as vencidas
    from tarefas
    where tenant_id = p_tenant_id and situacao = 'aberta' and prazo < now()
  ),
  pes as (
    select
      count(*) filter (where criado_em between p_inicio and p_fim) as novas,
      count(*) filter (where temperatura = 'quente') as quentes
    from pessoas
    where tenant_id = p_tenant_id and excluido_em is null
  ),
  -- "Parado" é negócio aberto sem mudança de etapa há mais de 7 dias. O limite
  -- é fixo de propósito: virar configuração faria cada conta ter um significado
  -- diferente para a mesma palavra no painel.
  parados as (
    select count(*) as qtd
    from negocios
    where tenant_id = p_tenant_id
      and situacao = 'aberto'
      and excluido_em is null
      and etapa_desde < now() - interval '7 days'
  )
  select
    abertos.qtd,
    fechados.ganhos,
    fechados.perdidos,
    abertos.soma,
    fechados.valor_ganho,
    round(fechados.ticket, 2),
    -- Conversão só existe se algo fechou. Sem isso, zero dividido por zero
    -- devolveria nulo e a tela mostraria "—" onde deveria mostrar "0%".
    case
      when fechados.ganhos + fechados.perdidos = 0 then 0
      else round(fechados.ganhos::numeric * 100 / (fechados.ganhos + fechados.perdidos), 1)
    end,
    visitas.marcadas,
    visitas.realizadas,
    fups.pendentes,
    fups.vencidos,
    tfs.vencidas,
    pes.novas,
    pes.quentes,
    parados.qtd
  from abertos, fechados, visitas, fups, tfs, pes, parados;
$$;

comment on function public.painel_indicadores is
  'Indicadores do painel para um período. security invoker: a RLS filtra por tenant.';

-- ----------------------------------------------------------------------------
-- FUNIL (bloco 4 da seção 5)
-- ----------------------------------------------------------------------------
create or replace function public.painel_funil(p_tenant_id uuid)
returns table (
  etapa_id uuid,
  etapa_nome text,
  etapa_ordem int,
  etapa_cor text,
  quantidade bigint,
  valor_total numeric,
  segundos_medios_na_etapa numeric,
  parados bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    e.id,
    e.nome,
    e.ordem,
    e.cor,
    count(n.id),
    coalesce(sum(n.valor), 0),
    -- Tempo médio de permanência HISTÓRICO nesta etapa, vindo do histórico de
    -- movimentação. É o que responde "onde o negócio empaca".
    (
      select round(avg(h.segundos_na_etapa_anterior), 0)
      from negocio_etapa_historico h
      where h.tenant_id = p_tenant_id
        and h.etapa_de = e.id
        and h.segundos_na_etapa_anterior is not null
    ),
    count(n.id) filter (where n.etapa_desde < now() - interval '7 days')
  from etapas e
  -- LEFT JOIN de propósito: etapa vazia precisa aparecer com zero. Some do
  -- gráfico e o corretor não vê que ninguém está em "proposta".
  left join negocios n
    on n.etapa_id = e.id
    and n.situacao = 'aberto'
    and n.excluido_em is null
  where e.tenant_id = p_tenant_id
    -- Etapas terminais não são funil: são resultado.
    and e.encerra_como is null
  group by e.id, e.nome, e.ordem, e.cor
  order by e.ordem;
$$;

comment on function public.painel_funil is
  'Funil por etapa com valor, tempo médio de permanência e negócios parados.';

-- ----------------------------------------------------------------------------
-- PRIORIDADES (bloco 1 da seção 5)
--
-- A ordenação é a inteligência do produto: "ação antes de informação". O peso de
-- cada motivo está explícito para poder ser discutido e ajustado, em vez de
-- escondido num ORDER BY ilegível.
-- ----------------------------------------------------------------------------
create or replace function public.painel_prioridades(
  p_tenant_id uuid,
  p_limite int default 5
)
returns table (
  tipo text,
  pessoa_id uuid,
  pessoa_nome text,
  -- `text` e nao `app.temperatura`: o papel `authenticated` nao tem USAGE no
  -- schema `app`, e devolver um tipo de la faria a chamada falhar por permissao
  -- de schema, com uma mensagem que nao ajuda ninguem a entender o motivo.
  temperatura text,
  negocio_id uuid,
  negocio_codigo text,
  negocio_valor numeric,
  motivo text,
  risco text,
  acao text,
  parado_desde timestamptz,
  peso int
)
language sql
stable
security invoker
set search_path = public
as $$
  with candidatos as (
    -- 1. Follow-up vencido: alguém prometeu contato e não cumpriu.
    select
      'followup_vencido' as tipo,
      f.pessoa_id,
      p.nome as pessoa_nome,
      p.temperatura::text,
      f.negocio_id,
      n.codigo as negocio_codigo,
      n.valor as negocio_valor,
      f.motivo,
      'Follow-up combinado já passou do prazo' as risco,
      'Responder' as acao,
      f.prazo as parado_desde,
      -- Cliente quente pesa mais: a janela de decisão dele é curta.
      case p.temperatura when 'quente' then 100 when 'morno' then 70 else 40 end as peso
    from followups f
    join pessoas p on p.id = f.pessoa_id and p.excluido_em is null
    left join negocios n on n.id = f.negocio_id and n.excluido_em is null
    where f.tenant_id = p_tenant_id
      and f.situacao = 'pendente'
      and f.prazo < now()

    union all

    -- 2. Negócio parado: aberto, sem mudar de etapa há mais de uma semana.
    select
      'negocio_parado',
      n.pessoa_id,
      p.nome,
      p.temperatura::text,
      n.id,
      n.codigo,
      n.valor,
      'Sem avançar de etapa desde ' || to_char(n.etapa_desde, 'DD/MM'),
      'Negócio esfriando sem atividade',
      'Retomar',
      n.etapa_desde,
      case p.temperatura when 'quente' then 85 when 'morno' then 55 else 25 end
    from negocios n
    join pessoas p on p.id = n.pessoa_id and p.excluido_em is null
    where n.tenant_id = p_tenant_id
      and n.situacao = 'aberto'
      and n.excluido_em is null
      and n.etapa_desde < now() - interval '7 days'

    union all

    -- 3. Visita de hoje sem confirmação: some o cliente e some a tarde.
    select
      'visita_sem_confirmacao',
      c.pessoa_id,
      p.nome,
      p.temperatura::text,
      c.negocio_id,
      n.codigo,
      n.valor,
      'Visita hoje às ' || to_char(c.inicio at time zone 'America/Sao_Paulo', 'HH24:MI')
        || ' ainda não confirmada',
      'Deslocamento perdido se o cliente não aparecer',
      'Confirmar',
      c.inicio,
      95
    from compromissos c
    join pessoas p on p.id = c.pessoa_id and p.excluido_em is null
    left join negocios n on n.id = c.negocio_id and n.excluido_em is null
    where c.tenant_id = p_tenant_id
      and c.tipo = 'visita'
      and c.situacao = 'agendado'
      and c.confirmado_em is null
      and c.inicio::date = (now() at time zone 'America/Sao_Paulo')::date

    union all

    -- 4. Cliente quente sem interação há mais de 2 dias.
    select
      'quente_sem_contato',
      p.id,
      p.nome,
      p.temperatura::text,
      null::uuid,
      null::text,
      null::numeric,
      'Cliente quente sem contato desde '
        || coalesce(to_char(p.ultima_interacao_em, 'DD/MM'), 'o cadastro'),
      'Concorrente pode atender primeiro',
      'Falar agora',
      coalesce(p.ultima_interacao_em, p.criado_em),
      90
    from pessoas p
    where p.tenant_id = p_tenant_id
      and p.excluido_em is null
      and p.temperatura = 'quente'
      and coalesce(p.ultima_interacao_em, p.criado_em) < now() - interval '2 days'
  )
  select
    c.tipo, c.pessoa_id, c.pessoa_nome, c.temperatura, c.negocio_id, c.negocio_codigo,
    c.negocio_valor, c.motivo, c.risco, c.acao, c.parado_desde, c.peso
  from candidatos c
  -- Peso primeiro, tempo parado depois: entre dois itens de peso igual, o que
  -- está parado há mais tempo vem antes.
  order by c.peso desc, c.parado_desde asc
  limit greatest(1, least(p_limite, 20));
$$;

comment on function public.painel_prioridades is
  'As prioridades comerciais do dia, ordenadas por impacto. Peso explícito por motivo e temperatura.';

-- ----------------------------------------------------------------------------
-- PRIVILÉGIOS
-- `authenticated` pode chamar; `anon` não. A RLS dentro das funções faz o resto.
-- ----------------------------------------------------------------------------
revoke all on function public.painel_indicadores(uuid, timestamptz, timestamptz) from public, anon;
revoke all on function public.painel_funil(uuid) from public, anon;
revoke all on function public.painel_prioridades(uuid, int) from public, anon;

grant execute on function public.painel_indicadores(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.painel_funil(uuid) to authenticated;
grant execute on function public.painel_prioridades(uuid, int) to authenticated;
