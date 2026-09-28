-- ============================================================================
-- AGILLIZA — 0005 CORRIGE RECURSÃO INFINITA NA POLÍTICA DE PERFIS
--
-- Achado por teste de isolamento, não por revisão de código. Com o schema da
-- 0001 aplicado, QUALQUER atualização de perfil falhava com
--
--   42P17: infinite recursion detected in policy for relation "perfis"
--
-- Isso incluía o usuário trocar o próprio tema ou a própria densidade de
-- interface: o produto inteiro ficaria travado nesse ponto.
--
-- CAUSA. A política `perfis_atualizar_proprio` da 0001 tinha, no WITH CHECK:
--
--   and admin_plataforma = (
--     select p.admin_plataforma from public.perfis p where p.id = (select auth.uid())
--   )
--
-- A intenção estava certa — impedir que alguém se promova a administrador da
-- plataforma editando a própria linha. A execução, não: para avaliar a política
-- de `perfis`, o Postgres precisa LER `perfis`, o que exige avaliar a política
-- de `perfis` outra vez. Recursão sem fundo.
--
-- CORREÇÃO. Ler o valor atual por uma função `security definer`, que roda como
-- dono da tabela e portanto não passa pela RLS. A função `app.e_admin_plataforma`
-- já existe e faz exatamente essa leitura.
--
-- A garantia continua a mesma: o valor novo de `admin_plataforma` precisa ser
-- igual ao valor já gravado. Quem não é administrador não pode virar; quem é,
-- não pode deixar de ser por conta própria. Promover alguém é ato de outro
-- administrador ou operação direta no banco, e fica na auditoria.
--
-- LIÇÃO GERAL: dentro de uma política de RLS, nunca consultar a própria tabela
-- que a política protege. Toda leitura de contexto passa por função
-- `security definer` no schema `app`.
-- ============================================================================

drop policy if exists perfis_atualizar_proprio on public.perfis;

create policy perfis_atualizar_proprio on public.perfis
  for update to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    -- `app.e_admin_plataforma()` é security definer: lê o valor já gravado sem
    -- reentrar na RLS de `perfis`.
    and admin_plataforma = app.e_admin_plataforma()
  );
