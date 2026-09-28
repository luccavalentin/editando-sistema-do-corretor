-- ============================================================================
-- QA — FUNÇÕES DE AGREGAÇÃO DO PAINEL (migração 0008)
--
-- O caso mais importante deste arquivo é o segundo: passar o `tenant_id` do
-- CONCORRENTE para a função e conferir que ela devolve zero. As funções são
-- `security invoker`, então a RLS filtra dentro delas — mas isso é uma
-- afirmação até alguém testar.
--
-- COMO RODAR
--   psql "$DATABASE_URL" -f supabase/tests/02_funcoes_do_painel.sql
--
-- Termina com erro P0001 DE PROPÓSITO: o `raise exception` imprime o relatório
-- e desfaz tudo. Nenhuma linha de teste fica no banco.
-- ============================================================================

do $$
declare
  v_tA uuid; v_tB uuid; v_uA uuid := gen_random_uuid();
  v_pA uuid; v_pB uuid; v_e0 uuid; v_eB uuid; v_neg uuid;
  v_rel text := ''; v_ok int := 0; v_falhou int := 0; v_n int; v_num numeric;
begin
  insert into public.tenants (nome, limite_usuarios) values ('Painel A', 3) returning id into v_tA;
  insert into public.tenants (nome, limite_usuarios) values ('Painel B', 3) returning id into v_tB;

  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values (v_uA, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'painel@teste.local', '{"nome":"Corretor Painel"}'::jsonb, now(), now());
  insert into public.membros (tenant_id, usuario_id, papel) values (v_tA, v_uA, 'proprietario');

  select id into v_e0 from public.etapas where tenant_id = v_tA and ordem = 0;
  select id into v_eB from public.etapas where tenant_id = v_tB and ordem = 0;

  -- Tenant A: cliente quente parado, negócio parado há 12 dias, follow-up
  -- vencido e uma visita de hoje sem confirmação.
  insert into public.pessoas (tenant_id, nome, cpf, temperatura, ultima_interacao_em)
  values (v_tA, 'Mariana Duarte', '11144477735', 'quente', now() - interval '4 days')
  returning id into v_pA;

  insert into public.negocios (tenant_id, pessoa_id, etapa_id, valor)
  values (v_tA, v_pA, v_e0, 780000) returning id into v_neg;
  update public.negocios set etapa_desde = now() - interval '12 days' where id = v_neg;

  insert into public.followups (tenant_id, pessoa_id, negocio_id, motivo, prazo)
  values (v_tA, v_pA, v_neg, 'Responder sobre financiamento', now() - interval '5 hours');

  insert into public.compromissos (tenant_id, titulo, tipo, situacao, pessoa_id, negocio_id, inicio, fim)
  values (v_tA, 'Visita Vila Mariana', 'visita', 'agendado', v_pA, v_neg,
          (now() at time zone 'America/Sao_Paulo')::date + interval '15 hours',
          (now() at time zone 'America/Sao_Paulo')::date + interval '16 hours');

  -- Tenant B: dados que NÃO podem aparecer para o corretor A.
  insert into public.pessoas (tenant_id, nome, cpf, temperatura)
  values (v_tB, 'Cliente do concorrente', '52998224725', 'quente') returning id into v_pB;
  insert into public.negocios (tenant_id, pessoa_id, etapa_id, valor)
  values (v_tB, v_pB, v_eB, 5000000);

  -- ===== a partir daqui somos o corretor A =====
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_uA::text, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select negocios_ativos, valor_em_negociacao into v_n, v_num
  from public.painel_indicadores(v_tA, now() - interval '30 days', now());
  if v_n = 1 and v_num = 780000 then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    indicadores: 1 negocio ativo, R$ 780.000 em negociacao'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] indicadores devolveram '||v_n||' e '||coalesce(v_num::text,'nulo')||E'\n';
  end if;

  -- O CASO CRÍTICO: passar o tenant do concorrente.
  select negocios_ativos, valor_em_negociacao into v_n, v_num
  from public.painel_indicadores(v_tB, now() - interval '30 days', now());
  if coalesce(v_n,0) = 0 and coalesce(v_num,0) = 0 then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    passar o tenant_id do CONCORRENTE devolve zero (RLS dentro da funcao)'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] VAZAMENTO: funcao devolveu '||v_n||' negocios / R$ '||v_num||' do tenant B'||E'\n';
  end if;

  select negocios_parados into v_n
  from public.painel_indicadores(v_tA, now() - interval '30 days', now());
  if v_n = 1 then v_ok := v_ok+1; v_rel := v_rel||'[ok]    negocio parado ha 12 dias contabilizado'||E'\n';
  else v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] parados = '||v_n||E'\n'; end if;

  select followups_vencidos into v_n
  from public.painel_indicadores(v_tA, now() - interval '30 days', now());
  if v_n = 1 then v_ok := v_ok+1; v_rel := v_rel||'[ok]    followup vencido contabilizado'||E'\n';
  else v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] followups vencidos = '||v_n||E'\n'; end if;

  -- Etapa vazia precisa aparecer no funil: se sumir, o corretor não vê que
  -- ninguém está em "proposta".
  select count(*) into v_n from public.painel_funil(v_tA);
  if v_n = 9 then v_ok := v_ok+1; v_rel := v_rel||'[ok]    funil traz as 9 etapas nao terminais, inclusive as vazias'||E'\n';
  else v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] funil trouxe '||v_n||' etapas, esperado 9'||E'\n'; end if;

  select count(*) into v_n from public.painel_funil(v_tB);
  if v_n = 0 then v_ok := v_ok+1; v_rel := v_rel||'[ok]    funil do tenant B devolve vazio'||E'\n';
  else v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] VAZAMENTO no funil: '||v_n||' etapas do tenant B'||E'\n'; end if;

  select count(*) into v_n from public.painel_prioridades(v_tA, 5);
  if v_n between 3 and 5 then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    prioridades geradas: '||v_n||' itens'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] prioridades = '||v_n||E'\n';
  end if;

  declare v_primeiro text;
  begin
    select tipo into v_primeiro from public.painel_prioridades(v_tA, 5) limit 1;
    if v_primeiro in ('followup_vencido', 'visita_sem_confirmacao') then
      v_ok := v_ok+1; v_rel := v_rel||'[ok]    ordenacao por impacto: primeiro item e "'||v_primeiro||'"'||E'\n';
    else
      v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] primeiro item foi "'||v_primeiro||'"'||E'\n';
    end if;
  end;

  select count(*) into v_n from public.painel_prioridades(v_tB, 5);
  if v_n = 0 then v_ok := v_ok+1; v_rel := v_rel||'[ok]    prioridades do tenant B devolvem vazio'||E'\n';
  else v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] VAZAMENTO nas prioridades: '||v_n||' itens'||E'\n'; end if;

  select count(*) into v_n from public.painel_prioridades(v_tA, 1);
  if v_n = 1 then v_ok := v_ok+1; v_rel := v_rel||'[ok]    limite de prioridades respeitado'||E'\n';
  else v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] limite 1 devolveu '||v_n||E'\n'; end if;

  execute 'reset role';
  raise exception E'\n===== QA — FUNCOES DO PAINEL =====\n%aprovados: %   reprovados: %\n(revertido de proposito: o banco nao guardou nada)',
    v_rel, v_ok, v_falhou;
end $$;
