-- ============================================================================
-- AGILLIZA — 0018 AUTOMAÇÕES DE FOLLOW-UP
--
-- A promessa central de um CRM é "o sistema te lembra". Até aqui, ela não era
-- cumprida: `followups.automatico` e `followups.gerado_por` existem desde a
-- 0003 e nada os preenchia. Todo follow-up precisava ser criado à mão — ou
-- seja, o corretor precisava lembrar de criar o lembrete.
--
-- REGRAS FIXAS, NÃO MOTOR GENÉRICO
--
-- A tentação aqui é construir um construtor de regras: "se X então Y", com
-- condições combináveis. Seria mais poderoso e muito pior. Um motor genérico é
-- impossível de testar (o espaço de combinações é infinito), difícil de
-- explicar ao corretor, e é onde nasce a automação que dispara mil mensagens
-- por causa de um operador trocado.
--
-- Quatro regras, escritas à mão, cada uma com nome e propósito claros. Se uma
-- quinta for necessária, ela é escrita aqui — com teste.
--
-- AS TRÊS TRAVAS DE SEGURANÇA
--
-- Automação que escreve dados sozinha precisa de limites explícitos, e estes
-- não são opcionais:
--
--   1. NASCE DESLIGADA. `ativa` é `false` por padrão. O corretor escolhe.
--   2. É IDEMPOTENTE. Rodar duas vezes no mesmo dia não cria dois follow-ups
--      para a mesma coisa. A conferência é por `gerado_por`, não por tempo.
--   3. TEM TETO. No máximo 50 criações por regra por execução. Se um erro de
--      lógica fizesse a regra casar com tudo, o estrago para em 50 linhas em
--      vez de encher a lista do corretor com mil itens e destruir a confiança
--      dele na ferramenta para sempre.
-- ============================================================================

create type app.regra_automacao as enum (
  'negocio_parado',
  'visita_sem_retorno',
  'simulacao_aprovada',
  'aniversario_do_cliente'
);

create table public.automacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  regra app.regra_automacao not null,

  -- Nasce desligada. Ver trava 1.
  ativa boolean not null default false,

  /**
   * Parâmetros da regra, com o formato dependendo dela:
   *   negocio_parado          { "dias": 7 }
   *   visita_sem_retorno      { "horas": 24 }
   *   simulacao_aprovada      {}
   *   aniversario_do_cliente  { "dias_de_antecedencia": 3 }
   */
  parametros jsonb not null default '{}'::jsonb,

  ultima_execucao_em timestamptz,
  ultimo_resultado jsonb,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  unique (tenant_id, regra)
);

comment on table public.automacoes is
  'Regras FIXAS de criacao automatica de follow-up, ligadas por tenant. Nascem desligadas; um motor generico seria mais poderoso e impossivel de testar.';

create index automacoes_ativas_idx on public.automacoes (tenant_id) where ativa;

alter table public.automacoes enable row level security;

create policy automacoes_ler on public.automacoes
  for select to authenticated
  using (app.pode_ler_tenant(tenant_id));

create policy automacoes_escrever on public.automacoes
  for all to authenticated
  using (app.administra_tenant(tenant_id))
  with check (app.administra_tenant(tenant_id));

create trigger automacoes_atualizado_em
  before update on public.automacoes
  for each row execute function app.tocar_atualizado_em();

-- ----------------------------------------------------------------------------
-- O TETO. Constante nomeada para não virar número mágico espalhado.
-- ----------------------------------------------------------------------------
create or replace function app.teto_por_execucao()
returns int language sql immutable as $$ select 50 $$;

comment on function app.teto_por_execucao is
  'Maximo de follow-ups que UMA regra cria em UMA execucao. Existe para que um erro de logica pare em 50 linhas em vez de encher a lista do corretor com mil.';

-- ----------------------------------------------------------------------------
-- O MOTOR
--
-- `security definer` porque roda por agendador, sem usuário. Devolve um resumo
-- por regra — o que a tela mostra e o que fica em `ultimo_resultado`.
-- ----------------------------------------------------------------------------
create or replace function app.executar_automacoes(p_tenant_id uuid)
returns table (regra text, criados int, limitado boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_teto int := app.teto_por_execucao();
  v_dias int;
  v_horas int;
  v_criados int;
begin
  -- ======================================================== negócio parado
  if exists (
    select 1 from public.automacoes a
    where a.tenant_id = p_tenant_id and a.regra = 'negocio_parado' and a.ativa
  ) then
    select coalesce((a.parametros->>'dias')::int, 7) into v_dias
    from public.automacoes a
    where a.tenant_id = p_tenant_id and a.regra = 'negocio_parado';

    with candidatos as (
      select n.id, n.tenant_id, n.pessoa_id, n.responsavel_id, n.codigo, n.atualizado_em
      from public.negocios n
      where n.tenant_id = p_tenant_id
        and n.situacao = 'aberto'
        and n.excluido_em is null
        and n.atualizado_em < now() - make_interval(days => v_dias)
        -- IDEMPOTÊNCIA: já existe follow-up em aberto gerado por esta regra
        -- para este negócio? Então não cria outro. A conferência é pelo
        -- `gerado_por`, e não por tempo — rodar duas vezes no mesmo minuto ou
        -- com uma semana de diferença dá o mesmo resultado.
        and not exists (
          select 1 from public.followups f
          where f.negocio_id = n.id
            and f.situacao = 'pendente'
            and f.gerado_por = 'negocio_parado'
        )
      order by n.atualizado_em asc
      limit v_teto
    )
    insert into public.followups (
      tenant_id, pessoa_id, negocio_id, motivo, prazo, responsavel_id,
      prioridade, automatico, gerado_por
    )
    select
      c.tenant_id, c.pessoa_id, c.id,
      'Negócio ' || c.codigo || ' parado há ' || v_dias || ' dias',
      -- O prazo é HOJE, não amanhã: a regra só dispara depois de o negócio já
      -- estar parado tempo demais. Dar mais prazo seria adiar de novo.
      now(),
      c.responsavel_id,
      'alta',
      true,
      'negocio_parado'
    from candidatos c;

    get diagnostics v_criados = row_count;

    regra := 'negocio_parado';
    criados := v_criados;
    limitado := v_criados >= v_teto;
    return next;
  end if;

  -- =================================================== visita sem retorno
  if exists (
    select 1 from public.automacoes a
    where a.tenant_id = p_tenant_id and a.regra = 'visita_sem_retorno' and a.ativa
  ) then
    select coalesce((a.parametros->>'horas')::int, 24) into v_horas
    from public.automacoes a
    where a.tenant_id = p_tenant_id and a.regra = 'visita_sem_retorno';

    with candidatos as (
      select c.id, c.tenant_id, c.pessoa_id, c.negocio_id, c.responsavel_id, c.fim
      from public.compromissos c
      where c.tenant_id = p_tenant_id
        and c.tipo in ('visita', 'avaliacao')
        and c.situacao = 'realizado'
        and c.pessoa_id is not null
        and c.fim < now() - make_interval(hours => v_horas)
        -- Só visitas recentes: abrir follow-up de uma visita de seis meses
        -- atrás não é lembrete, é arqueologia.
        and c.fim > now() - interval '30 days'
        and not exists (
          select 1 from public.followups f
          where f.pessoa_id = c.pessoa_id
            and f.gerado_por = 'visita_sem_retorno'
            and f.criado_em > c.fim
        )
      order by c.fim asc
      limit v_teto
    )
    insert into public.followups (
      tenant_id, pessoa_id, negocio_id, motivo, prazo, responsavel_id,
      prioridade, canal_sugerido, automatico, gerado_por
    )
    select
      c.tenant_id, c.pessoa_id, c.negocio_id,
      'Visita realizada e ainda sem retorno',
      now(),
      c.responsavel_id,
      'alta',
      'whatsapp',
      true,
      'visita_sem_retorno'
    from candidatos c;

    get diagnostics v_criados = row_count;

    regra := 'visita_sem_retorno';
    criados := v_criados;
    limitado := v_criados >= v_teto;
    return next;
  end if;

  -- =================================================== simulação aprovada
  if exists (
    select 1 from public.automacoes a
    where a.tenant_id = p_tenant_id and a.regra = 'simulacao_aprovada' and a.ativa
  ) then
    with candidatos as (
      select s.id, s.tenant_id, s.pessoa_id, s.negocio_id, s.responsavel_id, s.codigo
      from public.simulacoes s
      where s.tenant_id = p_tenant_id
        and s.situacao = 'aprovado'
        and s.excluido_em is null
        and s.respondido_em > now() - interval '30 days'
        and not exists (
          select 1 from public.followups f
          where f.pessoa_id = s.pessoa_id
            and f.gerado_por = 'simulacao_aprovada'
            and f.motivo like '%' || s.codigo || '%'
        )
      order by s.respondido_em desc
      limit v_teto
    )
    insert into public.followups (
      tenant_id, pessoa_id, negocio_id, motivo, prazo, responsavel_id,
      prioridade, automatico, gerado_por
    )
    select
      c.tenant_id, c.pessoa_id, c.negocio_id,
      'Crédito aprovado na simulação ' || c.codigo || ' — avisar o cliente',
      now(),
      c.responsavel_id,
      -- Crédito aprovado é a notícia mais valiosa que o corretor tem para dar,
      -- e ela esfria: o cliente aprovado hoje procura outro corretor amanhã.
      'critica',
      true,
      'simulacao_aprovada'
    from candidatos c;

    get diagnostics v_criados = row_count;

    regra := 'simulacao_aprovada';
    criados := v_criados;
    limitado := v_criados >= v_teto;
    return next;
  end if;

  -- =============================================== aniversário do cliente
  if exists (
    select 1 from public.automacoes a
    where a.tenant_id = p_tenant_id and a.regra = 'aniversario_do_cliente' and a.ativa
  ) then
    select coalesce((a.parametros->>'dias_de_antecedencia')::int, 0) into v_dias
    from public.automacoes a
    where a.tenant_id = p_tenant_id and a.regra = 'aniversario_do_cliente';

    with candidatos as (
      select p.id, p.tenant_id, p.nome, p.responsavel_id
      from public.pessoas p
      where p.tenant_id = p_tenant_id
        and p.excluido_em is null
        and p.data_nascimento is not null
        -- Compara DIA E MÊS, ignorando o ano. `to_char` é o jeito direto e
        -- evita a armadilha de 29 de fevereiro somada a `age`.
        and to_char(p.data_nascimento, 'MM-DD')
            = to_char((now() + make_interval(days => v_dias))::date, 'MM-DD')
        and not exists (
          select 1 from public.followups f
          where f.pessoa_id = p.id
            and f.gerado_por = 'aniversario_do_cliente'
            -- Uma vez por ano. Sem este recorte, rodar o motor duas vezes no
            -- mesmo dia criaria dois — e no ano seguinte, nenhum.
            and f.criado_em > now() - interval '300 days'
        )
      order by p.nome
      limit v_teto
    )
    insert into public.followups (
      tenant_id, pessoa_id, motivo, prazo, responsavel_id,
      prioridade, canal_sugerido, mensagem_sugerida, automatico, gerado_por
    )
    select
      c.tenant_id, c.id,
      'Aniversário de ' || c.nome,
      now(),
      c.responsavel_id,
      'baixa',
      'whatsapp',
      'Parabéns, ' || split_part(c.nome, ' ', 1) || '! Muitas felicidades. Um abraço!',
      true,
      'aniversario_do_cliente'
    from candidatos c;

    get diagnostics v_criados = row_count;

    regra := 'aniversario_do_cliente';
    criados := v_criados;
    limitado := v_criados >= v_teto;
    return next;
  end if;

  -- Marca a passagem, com ou sem criação: saber que rodou e não achou nada é
  -- diferente de não saber se rodou.
  update public.automacoes
  set ultima_execucao_em = now()
  where tenant_id = p_tenant_id and ativa;

  return;
end;
$$;

comment on function app.executar_automacoes is
  'Roda as regras ATIVAS de um tenant. Idempotente e com teto por regra. NAO e agendada por esta migracao: ligar um processo que escreve dados sozinho e decisao de quem opera.';

revoke all on function app.executar_automacoes(uuid) from public, anon;
grant execute on function app.executar_automacoes(uuid) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- NENHUM AGENDAMENTO É CRIADO AQUI, E ISSO É DELIBERADO
--
-- `pg_cron` está disponível neste projeto, e seria fácil agendar a execução
-- horária. Não foi feito: ligar um processo que ESCREVE dados na conta de
-- alguém, sem essa pessoa pedir, não é decisão de quem escreve a migração.
--
-- Para ligar, depois de conferir o comportamento com as regras desligadas:
--
--   create extension if not exists pg_cron with schema extensions;
--
--   select cron.schedule(
--     'automacoes-horarias', '0 * * * *',
--     $cron$
--       select app.executar_automacoes(t.id)
--       from public.tenants t
--       where t.excluido_em is null
--         and t.situacao in ('teste', 'ativo', 'inadimplente')
--     $cron$
--   );
--
-- Enquanto isso, a tela de Automações roda sob demanda, com o corretor vendo
-- quantos follow-ups cada regra criou.
-- ----------------------------------------------------------------------------
