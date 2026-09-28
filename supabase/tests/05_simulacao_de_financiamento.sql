-- ============================================================================
-- QA — SIMULAÇÃO DE FINANCIAMENTO (migrações 0013 e 0014)
--
-- Três grupos de asserção, e cada um existe por um motivo concreto:
--
--   1. REGRAS DE ENTRADA. Financiar mais do que o imóvel vale, ou mandar uma
--      conta que não fecha, gasta uma chamada à API e devolve ao corretor um
--      erro do banco que não diz nada. O banco de dados recusa antes.
--
--   2. A ARMADILHA DO INT-006. A Homefin JÁ cria o participante titular ao
--      abrir a oportunidade. Postar um segundo participante com o mesmo
--      documento deixa dois compradores idênticos e o Bradesco devolve
--      `INT-006 ... falhou: undefined` — erro que não menciona duplicidade e
--      custou horas de diagnóstico no sistema anterior. A restrição
--      `coparticipante_diferente_do_titular` fecha isso na origem.
--
--   3. CONSOLIDAÇÃO. Uma simulação tem N bancos com desfechos diferentes. Um
--      "sim" vale mais que dois "não", porque basta um banco aprovar para o
--      negócio andar — e é isso que o corretor precisa ver na lista.
--
-- O último bloco é REGRESSÃO: a 0014 revogou privilégios do papel `anon`, e
-- precisa ficar provado que ela não derrubou o portfólio público junto.
--
-- COMO RODAR
--   psql "$DATABASE_URL" -f supabase/tests/05_simulacao_de_financiamento.sql
--
-- Termina com P0001 de propósito: imprime o relatório e desfaz tudo.
-- ============================================================================

do $$
declare
  v_tA uuid; v_tB uuid; v_pA uuid; v_pB uuid; v_imB uuid; v_sim uuid;
  v_b1 uuid; v_b2 uuid; v_b3 uuid; v_u uuid := gen_random_uuid();
  v_txt text; v_num numeric; v_n int; v_rel text := ''; v_ok int := 0; v_falhou int := 0;
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values (v_u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'sim.qa@teste.local', '{"nome":"Corretor QA"}'::jsonb, now(), now());

  insert into public.tenants (nome) values ('Imob Simulacao') returning id into v_tA;
  insert into public.tenants (nome) values ('Imob Rival') returning id into v_tB;
  insert into public.membros (tenant_id, usuario_id, papel) values (v_tA, v_u, 'proprietario');

  insert into public.pessoas (tenant_id, nome, cpf, data_nascimento)
  values (v_tA, 'Mariana Duarte', '11144477735', '1988-04-12') returning id into v_pA;
  insert into public.pessoas (tenant_id, nome) values (v_tB, 'Cliente do Rival') returning id into v_pB;
  insert into public.imoveis (tenant_id, titulo, situacao, valor, finalidade)
  values (v_tB, 'Imovel do rival', 'disponivel', 900000, 'venda') returning id into v_imB;

  -- =================================================== 1. regras de entrada
  insert into public.simulacoes (
    tenant_id, pessoa_id, valor_imovel, valor_entrada, valor_financiamento,
    prazo_meses, renda_total, uf, nome_titular, cpf_titular, data_nascimento_titular
  ) values (
    v_tA, v_pA, 800000, 240000, 560000, 360, 18400, 'SP',
    'Mariana Duarte', '11144477735', '1988-04-12'
  ) returning id into v_sim;

  select codigo into v_txt from public.simulacoes where id = v_sim;
  if v_txt = 'SIM-0001' then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    codigo gerado pelo contador: SIM-0001'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] codigo veio "'||coalesce(v_txt,'nulo')||'"'||E'\n';
  end if;

  begin
    insert into public.simulacoes (tenant_id, pessoa_id, valor_imovel, valor_entrada,
      valor_financiamento, prazo_meses, renda_total, uf, nome_titular, cpf_titular, data_nascimento_titular)
    values (v_tA, v_pA, 800000, 100000, 560000, 360, 18400, 'SP', 'X', '11144477735', '1988-04-12');
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] aceitou conta que nao fecha'||E'\n';
  exception when check_violation then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    entrada + financiamento precisam fechar com o imovel'||E'\n';
  end;

  begin
    insert into public.simulacoes (tenant_id, pessoa_id, valor_imovel, valor_entrada,
      valor_financiamento, prazo_meses, renda_total, uf, nome_titular, cpf_titular, data_nascimento_titular)
    values (v_tA, v_pA, 500000, 0, 600000, 360, 18400, 'SP', 'X', '11144477735', '1988-04-12');
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] financiou mais que o valor do imovel'||E'\n';
  exception when check_violation then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    nao financia mais do que o imovel vale'||E'\n';
  end;

  -- ============================================ 2. a armadilha do INT-006
  begin
    insert into public.simulacoes (tenant_id, pessoa_id, valor_imovel, valor_entrada,
      valor_financiamento, prazo_meses, renda_total, uf, nome_titular, cpf_titular,
      data_nascimento_titular, compoe_renda, nome_coparticipante, cpf_coparticipante)
    values (v_tA, v_pA, 800000, 240000, 560000, 360, 18400, 'SP', 'Mariana', '11144477735',
            '1988-04-12', true, 'Mariana de novo', '11144477735');
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] aceitou coparticipante com o CPF do titular (INT-006)'||E'\n';
  exception when check_violation then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    coparticipante nao pode ter o CPF do titular'||E'\n';
  end;

  begin
    insert into public.simulacoes (tenant_id, pessoa_id, valor_imovel, valor_entrada,
      valor_financiamento, prazo_meses, renda_total, uf, nome_titular, cpf_titular,
      data_nascimento_titular, compoe_renda)
    values (v_tA, v_pA, 800000, 240000, 560000, 360, 18400, 'SP', 'M', '11144477735', '1988-04-12', true);
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] compos renda sem dizer com quem'||E'\n';
  exception when check_violation then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    compor renda exige nome e CPF do coparticipante'||E'\n';
  end;

  -- ================================================== coerência de tenant
  begin
    insert into public.simulacoes (tenant_id, pessoa_id, valor_imovel, valor_entrada,
      valor_financiamento, prazo_meses, renda_total, uf, nome_titular, cpf_titular, data_nascimento_titular)
    values (v_tA, v_pB, 800000, 240000, 560000, 360, 18400, 'SP', 'X', '11144477735', '1988-04-12');
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] simulou para pessoa de OUTRO tenant'||E'\n';
  exception when others then
    if sqlerrm like '%outro tenant%' then
      v_ok := v_ok+1; v_rel := v_rel||'[ok]    pessoa de outro tenant barrada pelo gatilho'||E'\n';
    else
      v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] erro inesperado: '||sqlerrm||E'\n';
    end if;
  end;

  begin
    update public.simulacoes set imovel_id = v_imB where id = v_sim;
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] apontou para imovel de OUTRO tenant'||E'\n';
  exception when others then
    if sqlerrm like '%outro tenant%' then
      v_ok := v_ok+1; v_rel := v_rel||'[ok]    imovel de outro tenant barrado pelo gatilho'||E'\n';
    else
      v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] erro inesperado: '||sqlerrm||E'\n';
    end if;
  end;

  -- ====================================================== 3. consolidação
  insert into public.simulacao_bancos (tenant_id, simulacao_id, homefin_id_banco, codigo_banco, nome_banco)
  values (v_tA, v_sim, 45, 237, 'Banco Bradesco') returning id into v_b1;
  insert into public.simulacao_bancos (tenant_id, simulacao_id, homefin_id_banco, codigo_banco, nome_banco)
  values (v_tA, v_sim, 61, 341, 'Banco Itau') returning id into v_b2;
  insert into public.simulacao_bancos (tenant_id, simulacao_id, homefin_id_banco, codigo_banco, nome_banco)
  values (v_tA, v_sim, 9, 33, 'Banco Santander') returning id into v_b3;

  update public.simulacao_bancos set situacao = 'em_analise' where simulacao_id = v_sim;
  if (select situacao from public.simulacoes where id = v_sim) = 'em_analise' then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    tres bancos em analise consolidam em "em_analise"'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] consolidou como '||
      (select situacao from public.simulacoes where id = v_sim)||E'\n';
  end if;

  update public.simulacao_bancos set situacao = 'recusado' where id in (v_b2, v_b3);
  update public.simulacao_bancos set situacao = 'aprovado', valor_parcela = 4320.55,
    valor_financiamento_aprovado = 560000, prazo_aprovado = 360, taxa_juros_ano = 10.49
  where id = v_b1;

  if (select situacao from public.simulacoes where id = v_sim) = 'aprovado' then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    um aprovado entre dois recusados consolida "aprovado"'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] consolidou como '||
      (select situacao from public.simulacoes where id = v_sim)||E'\n';
  end if;

  if (select respondido_em from public.simulacoes where id = v_sim) is not null then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    respondido_em marcado no primeiro desfecho'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] respondido_em ficou nulo'||E'\n';
  end if;

  select melhor_parcela into v_num from public.simulacoes where id = v_sim;
  if v_num = 4320.55 and (select melhor_banco_id from public.simulacoes where id = v_sim) = v_b1 then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    melhor banco resumido na simulacao'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] melhor parcela = '||coalesce(v_num::text,'nulo')||E'\n';
  end if;

  update public.simulacao_bancos set situacao = 'aprovado', valor_parcela = 4180.00 where id = v_b2;
  select melhor_parcela into v_num from public.simulacoes where id = v_sim;
  if v_num = 4180.00 then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    aprovado mais barato assume o resumo'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] melhor parcela ficou em '||coalesce(v_num::text,'nulo')||E'\n';
  end if;

  update public.simulacao_bancos set escolhido = true where id = v_b2;
  begin
    update public.simulacao_bancos set escolhido = true where id = v_b1;
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] dois bancos escolhidos na mesma simulacao'||E'\n';
  exception when unique_violation then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    so um banco escolhido por simulacao'||E'\n';
  end;

  begin
    insert into public.simulacao_bancos (tenant_id, simulacao_id, homefin_id_banco, nome_banco)
    values (v_tA, v_sim, 45, 'Banco Bradesco de novo');
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] mesmo banco duas vezes'||E'\n';
  exception when unique_violation then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    mesmo banco nao se repete na simulacao'||E'\n';
  end;

  -- ================================================= isolamento por tenant
  perform set_config('request.jwt.claims', json_build_object('sub', v_u, 'role','authenticated')::text, true);
  execute 'set local role authenticated';

  if (select count(*) from public.simulacoes) = 1 then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    corretor ve so as simulacoes da propria conta'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] corretor viu '||
      (select count(*) from public.simulacoes)||' simulacoes'||E'\n';
  end if;

  if (select count(*) from public.simulacao_bancos) = 3 then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    ve os 3 bancos da propria simulacao'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] viu '||(select count(*) from public.simulacao_bancos)||' bancos'||E'\n';
  end if;

  execute 'reset role';

  -- ==================== 4. a 0014, e a regressão que ela poderia causar
  -- Duas camadas independentes: a RLS não devolve linha, E o privilégio nem
  -- existe. A segunda protege do dia em que a primeira for afrouxada por
  -- engano — uma política permissiva demais, uma view sem security_invoker.
  execute 'set local role anon';

  begin
    perform count(*) from public.simulacoes;
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] anonimo alcanca simulacoes'||E'\n';
  exception when insufficient_privilege then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    simulacoes fora do alcance do anonimo (CPF e renda)'||E'\n';
  end;

  begin
    perform count(*) from public.simulacao_bancos;
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] anonimo alcanca simulacao_bancos'||E'\n';
  exception when insufficient_privilege then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    simulacao_bancos fora do alcance'||E'\n';
  end;

  begin
    perform count(*) from public.integracao_chamadas;
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] anonimo alcanca o log de integracao'||E'\n';
  exception when insufficient_privilege then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    log de integracao fora do alcance'||E'\n';
  end;

  execute 'reset role';

  -- A 0014 mexeu em privilégio do papel `anon`. O portfólio público VIVE desse
  -- papel — se ela tivesse ido longe demais, a vitrine sairia do ar em
  -- silêncio, e ninguém notaria até um corretor reclamar.
  update public.tenants
  set slug = 'imob-regressao', portfolio_ativo = true, portfolio_titulo = 'Imob Regressao'
  where id = v_tA;

  insert into public.imoveis (tenant_id, titulo, situacao, valor, finalidade, cidade,
                              descricao_publica, publicado_no_portfolio, slug)
  values (v_tA, 'Apto no ar', 'disponivel', 780000, 'venda', 'Sao Paulo',
          'Apartamento reformado com varanda ampla, duas vagas e lazer completo no condominio.',
          true, 'apto-no-ar-xyz123');

  execute 'set local role anon';

  select count(*) into v_n from public.portfolio_imoveis where tenant_id = v_tA;
  if v_n = 1 then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    REGRESSAO: portfolio publico continua no ar'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] portfolio quebrou: '||v_n||' anuncios'||E'\n';
  end if;

  select count(*) into v_n from public.portfolio_corretores where id = v_tA;
  if v_n = 1 then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    REGRESSAO: vitrine do corretor continua visivel'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] vitrine do corretor sumiu'||E'\n';
  end if;

  begin
    execute 'select observacoes_internas from public.imoveis limit 1';
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] observacoes_internas voltou a vazar'||E'\n';
  exception when insufficient_privilege then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    REGRESSAO: observacoes_internas continua negada'||E'\n';
  end;

  execute 'reset role';

  raise exception E'\n===== QA — SIMULACAO DE FINANCIAMENTO =====\n%aprovados: %   reprovados: %\n(revertido de proposito: o banco nao guardou nada)',
    v_rel, v_ok, v_falhou;
end $$;
