-- ============================================================================
-- AGILLIZA — 0006 DESEMPENHO: POLÍTICAS SEM SOBREPOSIÇÃO E ÍNDICES DE FK
--
-- Apontado pelo linter de desempenho do Supabase depois da 0003. Duas correções,
-- ambas com efeito direto no requisito de suportar milhares de usuários.
--
-- 1. POLÍTICAS PERMISSIVAS DUPLICADAS
--    Usar `for all` junto com um `for select` cria DUAS políticas para a mesma
--    ação. O Postgres avalia todas as políticas permissivas de uma ação e une o
--    resultado com OR — então cada SELECT executava a função de autorização duas
--    vezes. Em lista de negócios paginada, isso dobra o custo do filtro de
--    tenant em cada linha.
--    Correção: uma política por ação. `for all` sai; entram insert, update e
--    delete explícitos. Fica mais verboso e mais rápido, e a intenção de cada
--    permissão passa a ser legível isoladamente.
--
--    `perfis` tinha três políticas de SELECT. Viram uma, com as condições unidas
--    por OR na ordem do mais barato para o mais caro: comparar o próprio id não
--    toca em disco, o EXISTS em `membros` toca.
--
-- 2. CHAVES ESTRANGEIRAS SEM ÍNDICE
--    Sem índice na coluna filha, o Postgres varre a tabela inteira para validar
--    um DELETE ou UPDATE no pai. Duas consequências: apagar um usuário ou uma
--    etapa fica progressivamente mais lento conforme a base cresce, e os JOINs
--    da ficha 360 (tarefas e follow-ups de uma pessoa, compromissos de um
--    negócio) não têm por onde entrar.
--    Os índices abaixo cobrem as FKs que a aplicação realmente percorre e as que
--    participam de cascata. FK puramente de autoria (`criado_por`) em tabela de
--    baixo volume de exclusão fica sem índice de propósito: índice que nunca é
--    lido custa escrita em todo INSERT.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. UMA POLÍTICA POR AÇÃO
-- ----------------------------------------------------------------------------

-- perfis: três políticas de SELECT viram uma.
drop policy if exists perfis_ler_proprio on public.perfis;
drop policy if exists perfis_ler_colegas on public.perfis;
drop policy if exists perfis_ler_admin on public.perfis;

create policy perfis_ler on public.perfis
  for select to authenticated
  using (
    -- Ordem deliberada: a condição mais barata primeiro.
    id = (select auth.uid())
    or app.e_admin_plataforma()
    or exists (
      select 1
      from public.membros m
      where m.usuario_id = public.perfis.id
        and m.situacao = 'ativo'
        and m.tenant_id in (select app.tenants_do_usuario())
    )
  );

-- etapas
drop policy if exists etapas_administrar on public.etapas;

create policy etapas_inserir on public.etapas
  for insert to authenticated with check (app.administra_tenant(tenant_id));
create policy etapas_atualizar on public.etapas
  for update to authenticated using (app.administra_tenant(tenant_id))
  with check (app.administra_tenant(tenant_id));
create policy etapas_remover on public.etapas
  for delete to authenticated using (app.administra_tenant(tenant_id));

-- negocio_participantes
drop policy if exists negocio_participantes_escrever on public.negocio_participantes;

create policy negocio_participantes_inserir on public.negocio_participantes
  for insert to authenticated with check (app.pode_escrever(tenant_id));
create policy negocio_participantes_atualizar on public.negocio_participantes
  for update to authenticated using (app.pode_escrever(tenant_id))
  with check (app.pode_escrever(tenant_id));
create policy negocio_participantes_remover on public.negocio_participantes
  for delete to authenticated using (app.pode_escrever(tenant_id));

-- followups
drop policy if exists followups_escrever on public.followups;

create policy followups_inserir on public.followups
  for insert to authenticated with check (app.pode_escrever(tenant_id));
create policy followups_atualizar on public.followups
  for update to authenticated using (app.pode_escrever(tenant_id))
  with check (app.pode_escrever(tenant_id));
create policy followups_remover on public.followups
  for delete to authenticated using (app.pode_escrever(tenant_id));

-- tarefas
drop policy if exists tarefas_escrever on public.tarefas;

create policy tarefas_inserir on public.tarefas
  for insert to authenticated with check (app.pode_escrever(tenant_id));
create policy tarefas_atualizar on public.tarefas
  for update to authenticated using (app.pode_escrever(tenant_id))
  with check (app.pode_escrever(tenant_id));
create policy tarefas_remover on public.tarefas
  for delete to authenticated using (app.pode_escrever(tenant_id));

-- compromissos
drop policy if exists compromissos_escrever on public.compromissos;

create policy compromissos_inserir on public.compromissos
  for insert to authenticated with check (app.pode_escrever(tenant_id));
create policy compromissos_atualizar on public.compromissos
  for update to authenticated using (app.pode_escrever(tenant_id))
  with check (app.pode_escrever(tenant_id));
create policy compromissos_remover on public.compromissos
  for delete to authenticated using (app.pode_escrever(tenant_id));

-- ----------------------------------------------------------------------------
-- 2. ÍNDICES DE CHAVE ESTRANGEIRA
-- ----------------------------------------------------------------------------

-- Percorridas pela aplicação: a ficha 360 abre as tarefas e os follow-ups de
-- uma pessoa e os compromissos de um negócio.
create index if not exists tarefas_pessoa_idx on public.tarefas (pessoa_id)
  where pessoa_id is not null;
create index if not exists followups_negocio_idx on public.followups (negocio_id)
  where negocio_id is not null;
create index if not exists compromissos_negocio_idx on public.compromissos (negocio_id)
  where negocio_id is not null;

-- Responsável: a tela "meus negócios" e a divisão de carteira da equipe filtram
-- por isto, e o painel soma por responsável.
create index if not exists followups_resp_idx on public.followups (responsavel_id)
  where responsavel_id is not null;
create index if not exists tarefas_resp_idx on public.tarefas (responsavel_id)
  where responsavel_id is not null;
create index if not exists pessoas_resp_simples_idx on public.pessoas (responsavel_id)
  where responsavel_id is not null;
create index if not exists negocios_resp_simples_idx on public.negocios (responsavel_id)
  where responsavel_id is not null;

-- Cascata e integridade: sem estes, apagar uma etapa ou um tenant varre tabela
-- inteira. `negocios.etapa_id` já aparece em índice composto, mas com
-- `tenant_id` na frente — o que não serve para a validação da FK, que precisa de
-- `etapa_id` como coluna líder.
create index if not exists negocios_etapa_simples_idx on public.negocios (etapa_id);
create index if not exists negocio_participantes_tenant_idx
  on public.negocio_participantes (tenant_id);
create index if not exists historico_etapa_para_idx
  on public.negocio_etapa_historico (etapa_para);
create index if not exists historico_etapa_de_idx
  on public.negocio_etapa_historico (etapa_de) where etapa_de is not null;
