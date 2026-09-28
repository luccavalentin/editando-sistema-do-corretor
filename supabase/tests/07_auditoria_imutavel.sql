-- ============================================================================
-- QA — A AUDITORIA É MESMO IMUTÁVEL?
--
-- A tela de Segurança afirma ao corretor que nenhum usuário do sistema consegue
-- alterar ou apagar o registro de auditoria. Afirmação forte merece prova: sem
-- este arquivo, ela seria só uma frase bonita numa interface.
--
-- O QUE ESTE TESTE DESCOBRIU
--
-- Que a afirmação é verdadeira, mas por um motivo diferente do que os
-- privilégios sugerem. O papel `authenticated` TEM `delete` e `update`
-- concedidos na tabela — olhar só os grants daria a impressão de que o registro
-- é apagável. O que protege é a combinação de RLS FORÇADA com uma única
-- política, de SELECT: sem política de delete, o comando roda e não encontra
-- linha nenhuma. Zero linhas afetadas, sem erro.
--
-- Essa distinção importa: um `delete` que "funciona" e não apaga nada é
-- indistinguível de sucesso para quem não conta as linhas. Este teste conta.
--
-- A EXCEÇÃO HONESTA
--
-- `service_role` ignora RLS por natureza. Quem tem a chave do banco em mãos
-- alcança tudo — é assim em qualquer sistema, e é por isso que essa chave fica
-- fora do alcance da aplicação. A tela diz isso ao corretor em vez de prometer
-- uma imutabilidade absoluta que não existe.
--
-- COMO RODAR
--   psql "$DATABASE_URL" -f supabase/tests/07_auditoria_imutavel.sql
--
-- Termina com P0001 de propósito: imprime o relatório e desfaz tudo.
-- ============================================================================

do $$
declare
  v_t uuid; v_u uuid := gen_random_uuid(); v_n int;
  v_rel text := ''; v_ok int := 0; v_falhou int := 0;
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values (v_u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'auditoria.qa@teste.local', '{"nome":"Dono QA"}'::jsonb, now(), now());

  insert into public.tenants (nome) values ('Imob Auditoria') returning id into v_t;
  insert into public.membros (tenant_id, usuario_id, papel) values (v_t, v_u, 'proprietario');

  insert into public.auditoria (tenant_id, autor_id, autor_email, acao, entidade, resultado)
  values (v_t, v_u, 'auditoria.qa@teste.local', 'consultar_credito', 'simulacao', 'permitido');

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_u, 'role','authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into v_n from public.auditoria where tenant_id = v_t;
  if v_n = 1 then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    o proprietario LE a auditoria da propria conta'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] proprietario viu '||v_n||' linhas'||E'\n';
  end if;

  -- O `delete` NÃO estoura: ele roda e não encontra linha. Contar é o único
  -- jeito de distinguir isso de um apagamento bem-sucedido.
  delete from public.auditoria where tenant_id = v_t;
  get diagnostics v_n = row_count;
  if v_n = 0 then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    o proprietario NAO apaga a auditoria (0 linhas)'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] apagou '||v_n||' linhas da auditoria'||E'\n';
  end if;

  update public.auditoria set acao = 'mentira' where tenant_id = v_t;
  get diagnostics v_n = row_count;
  if v_n = 0 then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    o proprietario NAO altera a auditoria'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] alterou '||v_n||' linhas'||E'\n';
  end if;

  -- Forjar é tão grave quanto apagar: um log em que se pode plantar entrada
  -- falsa não prova nada sobre o que de fato aconteceu.
  begin
    insert into public.auditoria (tenant_id, acao, entidade, resultado)
    values (v_t, 'forjado', 'pessoa', 'permitido');
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] o usuario INSERIU auditoria (forjavel)'||E'\n';
  exception when insufficient_privilege or check_violation then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    o usuario nao forja entrada na auditoria'||E'\n';
  end;

  select count(*) into v_n from public.auditoria where tenant_id = v_t;
  if v_n = 1 then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    a linha original sobreviveu a tudo'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] restaram '||v_n||' linhas'||E'\n';
  end if;

  execute 'reset role';

  raise exception E'\n===== QA — AUDITORIA IMUTAVEL =====\n%aprovados: %   reprovados: %\n(revertido)',
    v_rel, v_ok, v_falhou;
end $$;
