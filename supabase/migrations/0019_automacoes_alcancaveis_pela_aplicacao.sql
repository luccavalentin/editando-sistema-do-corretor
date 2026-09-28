-- ============================================================================
-- AGILLIZA — 0019 A REGRA QUE FICOU CLARA DEPOIS DE TROPEÇAR NELA DUAS VEZES
--
-- O gerador de tipos (`npm run db:types`) cobre apenas o schema `public`. Toda
-- função que a APLICAÇÃO chama por RPC precisa estar lá — senão o TypeScript
-- não a conhece, e a chamada só compila com cast, que é exatamente onde a
-- conferência acaba e o erro passa a aparecer só em produção.
--
-- A divisão, daqui em diante:
--   `app`     gatilhos e auxiliares chamados de dentro do SQL
--   `public`  o que a aplicação chama
--
-- Isso aconteceu com `autenticar_no_portal` na 0016, e de novo aqui. Duas vezes
-- é padrão, não coincidência — daí a regra escrita.
--
-- POR QUE UM INVÓLUCRO, E NÃO UMA CÓPIA
--
-- Duplicar as 150 linhas de regras da 0018 garantiria que as duas versões
-- divergissem na primeira alteração, e a que divergisse em silêncio seria a que
-- a aplicação usa. A lógica continua num lugar só.
-- ============================================================================

create or replace function public.executar_automacoes(p_tenant_id uuid)
returns table (regra text, criados int, limitado boolean)
language sql
security definer
set search_path = ''
as $$
  select * from app.executar_automacoes(p_tenant_id);
$$;

comment on function public.executar_automacoes is
  'Involucro de app.executar_automacoes para a aplicacao alcancar (o gerador de tipos so cobre `public`). A logica das regras continua em `app`, com um unico ponto de verdade.';

revoke all on function public.executar_automacoes(uuid) from public, anon;
grant execute on function public.executar_automacoes(uuid) to authenticated, service_role;

-- A função de `app` deixa de ser chamável diretamente pela aplicação: quem
-- entra por ela é o invólucro, e um agendador com a chave de serviço.
revoke all on function app.executar_automacoes(uuid) from authenticated;
