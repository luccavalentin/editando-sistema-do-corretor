-- ============================================================================
-- QA — ISOLAMENTO ENTRE TENANTS E IMUTABILIDADE DA AUDITORIA
--
-- A seção 17 do documento do produto exige: "testes automatizados devem tentar
-- acessar dados de outro tenant". É literalmente o que este arquivo faz — ele
-- assume a identidade de um corretor real, via `set local role authenticated` e
-- claim de JWT, e tenta vazar dados do vizinho.
--
-- COMO RODAR
--   psql "$DATABASE_URL" -f supabase/tests/01_isolamento_entre_tenants.sql
--   ou cole no SQL Editor do Supabase.
--
-- O script TERMINA COM ERRO DE PROPÓSITO. O `raise exception` final imprime o
-- relatório e desfaz tudo: nenhuma linha de teste fica no banco. Um erro
-- `P0001` com o relatório é sucesso; qualquer outro código é falha real.
--
-- Leia a linha final: `aprovados: N   reprovados: 0`. Qualquer reprovado é um
-- vazamento e bloqueia o lançamento.
--
-- HISTÓRICO: este teste encontrou dois defeitos que revisão de código não pegou
--   - recursão infinita na política de `perfis` (corrigida na 0005)
--   - código de negócio sempre NEG-00001 por RLS no gatilho (corrigido na 0003)
-- ============================================================================

do $$
declare
  v_tA uuid; v_tB uuid;
  v_uA uuid := gen_random_uuid();
  v_uB uuid := gen_random_uuid();
  v_pA uuid; v_pB uuid;
  v_n int; v_rel text := ''; v_ok int := 0; v_falhou int := 0;
begin
  -- Cenário: duas imobiliárias que não têm nada a ver uma com a outra.
  insert into public.tenants (nome, limite_usuarios) values ('Imobiliaria A', 1) returning id into v_tA;
  insert into public.tenants (nome, limite_usuarios) values ('Imobiliaria B', 1) returning id into v_tB;

  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values (v_uA, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'corretor.a@teste.local', '{"nome":"Corretor A"}'::jsonb, now(), now());
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values (v_uB, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'corretor.b@teste.local', '{"nome":"Corretor B"}'::jsonb, now(), now());

  if (select count(*) from public.perfis where id in (v_uA, v_uB)) = 2 then
    v_ok := v_ok + 1; v_rel := v_rel || '[ok]    perfil criado automaticamente no cadastro do usuario' || E'\n';
  else
    v_falhou := v_falhou + 1; v_rel := v_rel || '[FALHA] gatilho de perfil nao rodou' || E'\n';
  end if;

  insert into public.membros (tenant_id, usuario_id, papel) values (v_tA, v_uA, 'proprietario');
  insert into public.membros (tenant_id, usuario_id, papel) values (v_tB, v_uB, 'proprietario');

  insert into public.pessoas (tenant_id, nome, cpf) values (v_tA, 'Cliente da A', '11144477735')
  returning id into v_pA;
  insert into public.pessoas (tenant_id, nome, cpf) values (v_tB, 'Cliente da B', '52998224725')
  returning id into v_pB;

  insert into public.auditoria (tenant_id, acao, entidade, entidade_id)
  values (v_tA, 'criar', 'pessoa', v_pA::text);
  insert into public.auditoria (tenant_id, acao, entidade, entidade_id)
  values (v_tB, 'criar', 'pessoa', v_pB::text);

  -- ===== A partir daqui somos o CORRETOR A, com as permissões dele =====
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_uA::text, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into v_n from public.tenants;
  if v_n = 1 then v_ok := v_ok + 1; v_rel := v_rel || '[ok]    corretor A ve 1 tenant (o dele), nao 2' || E'\n';
  else v_falhou := v_falhou + 1; v_rel := v_rel || '[FALHA] corretor A ve ' || v_n || ' tenants' || E'\n'; end if;

  select count(*) into v_n from public.pessoas;
  if v_n = 1 then v_ok := v_ok + 1; v_rel := v_rel || '[ok]    corretor A ve 1 pessoa (a dele), nao 2' || E'\n';
  else v_falhou := v_falhou + 1; v_rel := v_rel || '[FALHA] corretor A ve ' || v_n || ' pessoas — VAZAMENTO' || E'\n'; end if;

  -- Busca dirigida: saber o id do vizinho não pode ajudar.
  select count(*) into v_n from public.pessoas where id = v_pB;
  if v_n = 0 then v_ok := v_ok + 1; v_rel := v_rel || '[ok]    busca pelo id exato da pessoa do tenant B devolve 0' || E'\n';
  else v_falhou := v_falhou + 1; v_rel := v_rel || '[FALHA] pessoa do tenant B visivel pelo id — VAZAMENTO' || E'\n'; end if;

  select count(*) into v_n from public.etapas;
  if v_n = 11 then v_ok := v_ok + 1; v_rel := v_rel || '[ok]    ve 11 etapas (as suas), nao 22' || E'\n';
  else v_falhou := v_falhou + 1; v_rel := v_rel || '[FALHA] ve ' || v_n || ' etapas' || E'\n'; end if;

  select count(*) into v_n from public.perfis;
  if v_n = 1 then v_ok := v_ok + 1; v_rel := v_rel || '[ok]    ve 1 perfil (o proprio), nao o do corretor B' || E'\n';
  else v_falhou := v_falhou + 1; v_rel := v_rel || '[FALHA] ve ' || v_n || ' perfis' || E'\n'; end if;

  begin
    insert into public.pessoas (tenant_id, nome) values (v_tB, 'Invasao');
    v_falhou := v_falhou + 1; v_rel := v_rel || '[FALHA] gravou pessoa no tenant B — VAZAMENTO GRAVE' || E'\n';
  exception when insufficient_privilege then
    v_ok := v_ok + 1; v_rel := v_rel || '[ok]    insercao no tenant B negada pela RLS' || E'\n';
  end;

  update public.pessoas set nome = 'Alterado por A' where id = v_pB;
  if not found then v_ok := v_ok + 1; v_rel := v_rel || '[ok]    update na pessoa do tenant B nao atingiu nenhuma linha' || E'\n';
  else v_falhou := v_falhou + 1; v_rel := v_rel || '[FALHA] alterou pessoa do tenant B — VAZAMENTO GRAVE' || E'\n'; end if;

  select count(*) into v_n from public.auditoria;
  if v_n = 1 then v_ok := v_ok + 1; v_rel := v_rel || '[ok]    auditoria mostra so o registro do proprio tenant' || E'\n';
  else v_falhou := v_falhou + 1; v_rel := v_rel || '[FALHA] auditoria mostra ' || v_n || ' registros' || E'\n'; end if;

  -- Imutabilidade: nem o dono da conta mexe no log.
  begin
    delete from public.auditoria where tenant_id = v_tA;
    if not found then v_ok := v_ok + 1; v_rel := v_rel || '[ok]    proprietario NAO apaga auditoria' || E'\n';
    else v_falhou := v_falhou + 1; v_rel := v_rel || '[FALHA] proprietario APAGOU auditoria' || E'\n'; end if;
  exception when insufficient_privilege then
    v_ok := v_ok + 1; v_rel := v_rel || '[ok]    delete na auditoria negado por privilegio' || E'\n';
  end;

  begin
    update public.auditoria set acao = 'forjado' where tenant_id = v_tA;
    if not found then v_ok := v_ok + 1; v_rel := v_rel || '[ok]    proprietario NAO altera auditoria' || E'\n';
    else v_falhou := v_falhou + 1; v_rel := v_rel || '[FALHA] auditoria ALTERADA' || E'\n'; end if;
  exception when insufficient_privilege then
    v_ok := v_ok + 1; v_rel := v_rel || '[ok]    update na auditoria negado por privilegio' || E'\n';
  end;

  begin
    insert into public.auditoria (tenant_id, acao, entidade) values (v_tA, 'forjar', 'teste');
    v_falhou := v_falhou + 1; v_rel := v_rel || '[FALHA] cliente INSERIU auditoria — pode forjar log' || E'\n';
  exception when insufficient_privilege then
    v_ok := v_ok + 1; v_rel := v_rel || '[ok]    cliente nao insere auditoria (nao forja log)' || E'\n';
  end;

  -- Este caso encontrou a recursão infinita da política de perfis.
  begin
    update public.perfis set tema = 'escuro' where id = v_uA;
    if (select tema from public.perfis where id = v_uA) = 'escuro' then
      v_ok := v_ok + 1; v_rel := v_rel || '[ok]    usuario altera a propria preferencia de tema' || E'\n';
    else
      v_falhou := v_falhou + 1; v_rel := v_rel || '[FALHA] preferencia nao foi salva' || E'\n';
    end if;
  exception when others then
    v_falhou := v_falhou + 1; v_rel := v_rel || '[FALHA] alterar perfil quebrou: ' || sqlstate || ' ' || sqlerrm || E'\n';
  end;

  begin
    update public.perfis set admin_plataforma = true where id = v_uA;
    if (select admin_plataforma from public.perfis where id = v_uA) = false then
      v_ok := v_ok + 1; v_rel := v_rel || '[ok]    usuario NAO se promove a admin da plataforma' || E'\n';
    else
      v_falhou := v_falhou + 1; v_rel := v_rel || '[FALHA] usuario se promoveu a ADMIN DA PLATAFORMA' || E'\n';
    end if;
  exception when check_violation or insufficient_privilege then
    v_ok := v_ok + 1; v_rel := v_rel || '[ok]    auto-promocao a admin barrada pela politica' || E'\n';
  end;

  begin
    perform app.e_admin_plataforma();
    v_falhou := v_falhou + 1; v_rel := v_rel || '[FALHA] cliente chamou funcao do schema app' || E'\n';
  exception when others then
    v_ok := v_ok + 1; v_rel := v_rel || '[ok]    schema app inacessivel ao cliente (' || sqlstate || ')' || E'\n';
  end;

  begin
    perform count(*) from public.contadores;
    v_falhou := v_falhou + 1; v_rel := v_rel || '[FALHA] cliente leu a tabela de contadores' || E'\n';
  exception when insufficient_privilege then
    v_ok := v_ok + 1; v_rel := v_rel || '[ok]    tabela de contadores inalcancavel pelo cliente' || E'\n';
  end;

  begin
    insert into public.membros (tenant_id, usuario_id, papel) values (v_tA, v_uB, 'corretor');
    v_falhou := v_falhou + 1; v_rel := v_rel || '[FALHA] segundo usuario entrou num plano de 1 usuario' || E'\n';
  exception when others then
    v_ok := v_ok + 1; v_rel := v_rel || '[ok]    limite de usuarios do plano barrou o segundo membro (' || sqlstate || ')' || E'\n';
  end;

  execute 'reset role';

  raise exception E'\n======== QA — ISOLAMENTO ENTRE TENANTS E IMUTABILIDADE ========\n%aprovados: %   reprovados: %\n(revertido de proposito: o banco nao guardou nada)',
    v_rel, v_ok, v_falhou;
end $$;
