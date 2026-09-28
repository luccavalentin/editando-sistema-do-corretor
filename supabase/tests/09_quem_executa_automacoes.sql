-- ============================================================================
-- QA — QUEM PODE MANDAR A AUTOMAÇÃO RODAR (migrações 0020 e 0021)
--
-- O parecer de segurança do Supabase apontou que
-- `public.executar_automacoes(uuid)` era `security definer`, estava liberada
-- para `authenticated` e recebia o tenant COMO ARGUMENTO, sem conferir quem
-- chamava. Qualquer corretor mandava a automação rodar na conta de outro.
--
-- Não era leitura: era ESCRITA. Até 50 follow-ups por regra dentro da conta
-- alheia, com cliente e data certos, indistinguíveis dos legítimos. O corretor
-- invadido não teria como saber que vieram de fora.
--
-- ESTE ARQUIVO GUARDA DOIS ACHADOS, NÃO UM
--
-- 1. A falta da trava (corrigida na 0020).
--
-- 2. A trava não funcionar. Depois da 0020, o teste CONTINUOU deixando o
--    invasor passar. A função no banco estava certa, letra por letra — o errado
--    era o TIPO da resposta:
--
--        papel_no_tenant(conta alheia)           -> NULL
--        NULL in ('proprietario','admin_equipe') -> NULL   (não FALSE)
--        if not NULL then                        -> não dispara
--
--    A trava FALHAVA ABERTA, e quanto mais estranho o chamador, mais calada
--    ela ficava. Corrigido na 0021, na raiz: função de permissão responde SIM
--    ou NÃO, nunca "não sei".
--
-- POR QUE OS TESTES 01 A 08 NÃO PEGARAM
--
-- Porque em política de RLS o Postgres já trata NULL como falso. `using (NULL)`
-- não devolve linha, então o defeito é invisível por dentro de uma política — e
-- continuaria invisível até alguém usar essas funções FORA de uma. A 0020 foi a
-- primeira vez.
--
-- Por isso as três primeiras asserções medem a CAUSA (o tipo devolvido), e não
-- só o sintoma. Testar apenas o sintoma deixaria a armadilha armada para a
-- próxima função que chamasse permissão fora de uma política.
--
-- COMO RODAR
--   psql "$DATABASE_URL" -f supabase/tests/09_quem_executa_automacoes.sql
--
-- Termina com P0001 de propósito: imprime o relatório e desfaz tudo.
-- ============================================================================

do $$
declare
  v_tA uuid; v_tB uuid;
  v_uA uuid := gen_random_uuid();
  v_uB uuid := gen_random_uuid();
  v_pB uuid; v_etapaB uuid;
  v_n int; v_rel text := ''; v_ok int := 0; v_falhou int := 0;
  v_erro text; v_b boolean;
begin
  -- ===================== 1. A CAUSA: SIM/NÃO, nunca NULL ====================
  -- Medido como postgres: o schema `app` não é alcançável pelo papel
  -- `authenticated`, e isso também está certo.
  select app.administra_tenant(gen_random_uuid()) into v_b;
  if v_b is false then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    administra_tenant(conta desconhecida) devolve FALSE, nao NULL'||E'\n';
  else
    v_falhou := v_falhou+1;
    v_rel := v_rel||'[FALHA] devolveu '||coalesce(v_b::text,'NULL')||' — a trava volta a falhar aberta'||E'\n';
  end if;

  select app.pode_escrever(gen_random_uuid()) into v_b;
  if v_b is false then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    pode_escrever(conta desconhecida) devolve FALSE, nao NULL'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] pode_escrever devolveu '||coalesce(v_b::text,'NULL')||E'\n';
  end if;

  select app.pode_ler_tenant(null) into v_b;
  if v_b is false then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    pode_ler_tenant(NULL) devolve FALSE, nao NULL'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] pode_ler_tenant(NULL) devolveu '||coalesce(v_b::text,'NULL')||E'\n';
  end if;

  -- ============== 2. O SINTOMA: duas imobiliárias sem relação ===============
  insert into public.tenants (nome) values ('Imob A (invasora)') returning id into v_tA;
  insert into public.tenants (nome) values ('Imob B (vitima)')   returning id into v_tB;

  insert into auth.users (id, email, instance_id, aud, role)
  values (v_uA, 'a@exemplo.test', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
         (v_uB, 'b@exemplo.test', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

  insert into public.membros (tenant_id, usuario_id, papel)
  values (v_tA, v_uA, 'proprietario'),
         (v_tB, v_uB, 'proprietario');

  -- A vítima tem a regra LIGADA e um negócio parado: há o que colher. Sem isso,
  -- o ataque "não faria nada" por falta de matéria-prima, não por estar barrado.
  select id into v_etapaB from public.etapas where tenant_id = v_tB order by ordem limit 1;
  insert into public.pessoas (tenant_id, nome) values (v_tB, 'Cliente da B') returning id into v_pB;
  insert into public.negocios (tenant_id, pessoa_id, etapa_id, titulo, valor, atualizado_em)
  values (v_tB, v_pB, v_etapaB, 'Negocio parado da B', 500000, now() - interval '30 days');
  insert into public.automacoes (tenant_id, regra, ativa, parametros)
  values (v_tB, 'negocio_parado', true, '{"dias": 7}'::jsonb);

  -- O ATAQUE: A manda rodar a automação da conta de B.
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_uA::text, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.executar_automacoes(v_tB);
    v_erro := null;
  exception when others then v_erro := sqlstate;
  end;
  execute 'reset role';

  if v_erro = '42501' then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    corretor A RECUSADO na conta de B (42501)'||E'\n';
  else
    v_falhou := v_falhou+1;
    v_rel := v_rel||'[FALHA] esperado 42501, veio '||coalesce(v_erro,'NENHUM ERRO')||E'\n';
  end if;

  -- A prova material: sobrou follow-up dentro da conta da vítima?
  select count(*) into v_n from public.followups where tenant_id = v_tB;
  if v_n = 0 then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    NADA foi escrito na conta de B'||E'\n';
  else
    v_falhou := v_falhou+1;
    v_rel := v_rel||'[FALHA] '||v_n||' follow-up(s) na conta de B — ESCRITA ENTRE CONTAS'||E'\n';
  end if;

  -- ============ 3. A correção não pode ter passado do ponto ================
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_uB::text, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.executar_automacoes(v_tB);
    v_erro := null;
  exception when others then v_erro := sqlstate;
  end;
  execute 'reset role';

  if v_erro is null then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    o DONO da conta B continua executando normalmente'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] o dono foi barrado ('||v_erro||')'||E'\n';
  end if;

  select count(*) into v_n from public.followups where tenant_id = v_tB;
  if v_n = 1 then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    o dono colheu o negocio parado da propria conta'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] o dono gerou '||v_n||', esperado 1'||E'\n';
  end if;

  select count(*) into v_n from public.followups where tenant_id = v_tA;
  if v_n = 0 then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    a conta A ficou intacta'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] apareceu follow-up na conta A'||E'\n';
  end if;

  raise exception E'\n===== QA — QUEM EXECUTA AUTOMACOES =====\n%aprovados: %   reprovados: %\n(revertido de proposito: o banco nao guardou nada)',
    v_rel, v_ok, v_falhou;
end $$;
