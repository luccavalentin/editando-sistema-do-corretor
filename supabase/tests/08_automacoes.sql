-- ============================================================================
-- QA — AUTOMAÇÕES DE FOLLOW-UP (migrações 0018 e 0019)
--
-- Automação que escreve dados sozinha é a funcionalidade mais perigosa de um
-- CRM. Um erro de lógica aqui não dá tela de erro: ele enche a lista do
-- corretor com mil follow-ups falsos, e a confiança dele na ferramenta acaba
-- ali. Ele nunca mais liga uma automação.
--
-- Por isso as três travas da 0018 são o centro deste arquivo, e não detalhe:
--
--   1. NASCE DESLIGADA — a primeira asserção é que uma regra desligada não
--      cria absolutamente nada.
--   2. É IDEMPOTENTE — rodar três vezes seguidas cria uma vez só. É o que
--      permite agendar de hora em hora sem medo.
--   3. TEM TETO — 50 por regra por execução, e a função AVISA que limitou. Sem
--      o aviso, o corretor veria 50 e acharia que eram todos.
--
-- UMA ARMADILHA QUE ESTE TESTE ENCONTROU
--
-- A primeira versão envelhecia o negócio com `update ... set atualizado_em`, e
-- a regra não encontrava nada. O gatilho `tocar_atualizado_em` desfazia o
-- envelhecimento no mesmo comando. A data precisa ir no INSERT.
--
-- Isso não é só detalhe de teste: significa que "parado" é medido por uma
-- coluna que QUALQUER toque no negócio reinicia — que é a semântica certa para
-- "parado", e vale saber que é assim.
--
-- COMO RODAR
--   psql "$DATABASE_URL" -f supabase/tests/08_automacoes.sql
--
-- Termina com P0001 de propósito: imprime o relatório e desfaz tudo.
-- ============================================================================

do $$
declare
  v_t uuid; v_p uuid; v_neg uuid; v_etapa uuid; v_n int; v_r record;
  v_rel text := ''; v_ok int := 0; v_falhou int := 0;
begin
  insert into public.tenants (nome) values ('Imob Automacao') returning id into v_t;
  select id into v_etapa from public.etapas where tenant_id = v_t order by ordem limit 1;
  insert into public.pessoas (tenant_id, nome, data_nascimento)
  values (v_t, 'Mariana Duarte', '1988-04-12') returning id into v_p;

  -- A data no PRÓPRIO insert: ver o cabeçalho.
  insert into public.negocios (tenant_id, pessoa_id, etapa_id, titulo, valor, atualizado_em)
  values (v_t, v_p, v_etapa, 'Apto Vila Mariana', 780000, now() - interval '20 days')
  returning id into v_neg;

  -- ============================================ 1. nasce desligada
  perform app.executar_automacoes(v_t);
  select count(*) into v_n from public.followups where tenant_id = v_t;
  if v_n = 0 then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    regra desligada NAO cria nada'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] criou '||v_n||' com a regra desligada'||E'\n';
  end if;

  insert into public.automacoes (tenant_id, regra, ativa, parametros)
  values (v_t, 'negocio_parado', true, '{"dias": 7}'::jsonb);

  select * into v_r from app.executar_automacoes(v_t) where regra = 'negocio_parado';
  if v_r.criados = 1 then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    regra ligada cria o follow-up do negocio parado'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] criou '||coalesce(v_r.criados,-1)||E'\n';
  end if;

  select count(*) into v_n from public.followups
  where tenant_id = v_t and automatico and gerado_por = 'negocio_parado' and prioridade = 'alta';
  if v_n = 1 then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    marcado como automatico, com origem e prioridade'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] follow-up sem as marcas corretas'||E'\n';
  end if;

  -- ============================================ 2. idempotência
  perform app.executar_automacoes(v_t);
  perform app.executar_automacoes(v_t);
  select count(*) into v_n from public.followups where tenant_id = v_t;
  if v_n = 1 then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    rodar 3x NAO duplica (idempotente)'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] 3 execucoes geraram '||v_n||' follow-ups'||E'\n';
  end if;

  -- Resolvido o follow-up, a regra PODE criar outro: o negócio segue parado, e
  -- a cobrança continua legítima.
  update public.followups set situacao = 'feito', concluido_em = now() where tenant_id = v_t;
  perform app.executar_automacoes(v_t);
  select count(*) into v_n from public.followups where tenant_id = v_t and situacao = 'pendente';
  if v_n = 1 then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    apos resolver, cria de novo (o negocio segue parado)'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] nao recriou apos resolucao'||E'\n';
  end if;

  -- ============================================ 3. o teto
  delete from public.followups where tenant_id = v_t;
  for v_n in 1..60 loop
    insert into public.negocios (tenant_id, pessoa_id, etapa_id, titulo, valor, atualizado_em)
    values (v_t, v_p, v_etapa, 'Negocio ' || v_n, 100000, now() - interval '20 days');
  end loop;

  select * into v_r from app.executar_automacoes(v_t) where regra = 'negocio_parado';
  if v_r.criados = 50 and v_r.limitado then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    o teto segura em 50 e AVISA que limitou'||E'\n';
  else
    v_falhou := v_falhou+1;
    v_rel := v_rel||'[FALHA] criou '||coalesce(v_r.criados,-1)||', limitado='||coalesce(v_r.limitado::text,'?')||E'\n';
  end if;

  -- O resto entra na execução seguinte, sem repetir os 50 primeiros.
  perform app.executar_automacoes(v_t);
  select count(*) into v_n from public.followups where tenant_id = v_t;
  if v_n = 61 then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    a execucao seguinte pega o resto sem repetir (61 ao todo)'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] total ficou em '||v_n||', esperado 61'||E'\n';
  end if;

  -- ============================================ 4. aniversário
  delete from public.followups where tenant_id = v_t;
  delete from public.negocios where tenant_id = v_t;
  update public.pessoas
  set data_nascimento = make_date(1988, extract(month from now())::int, extract(day from now())::int)
  where id = v_p;
  insert into public.automacoes (tenant_id, regra, ativa) values (v_t, 'aniversario_do_cliente', true);

  select * into v_r from app.executar_automacoes(v_t) where regra = 'aniversario_do_cliente';
  if v_r.criados = 1 then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    aniversario do dia vira follow-up'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] aniversario criou '||coalesce(v_r.criados,-1)||E'\n';
  end if;

  select count(*) into v_n from public.followups
  where tenant_id = v_t and gerado_por = 'aniversario_do_cliente'
    and mensagem_sugerida like 'Parabéns, Mariana!%';
  if v_n = 1 then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    a mensagem sugerida usa o PRIMEIRO nome'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] mensagem sugerida errada'||E'\n';
  end if;

  perform app.executar_automacoes(v_t);
  select count(*) into v_n from public.followups
  where tenant_id = v_t and gerado_por = 'aniversario_do_cliente';
  if v_n = 1 then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    aniversario nao repete no mesmo dia'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] aniversario duplicou'||E'\n';
  end if;

  -- ============================================ 5. isolamento
  if (select count(*) from public.followups where tenant_id <> v_t and automatico) = 0 then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    nao tocou em conta nenhuma alem da pedida'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] criou follow-up em OUTRO tenant'||E'\n';
  end if;

  raise exception E'\n===== QA — AUTOMACOES =====\n%aprovados: %   reprovados: %\n(revertido de proposito: o banco nao guardou nada)',
    v_rel, v_ok, v_falhou;
end $$;
