-- ============================================================================
-- AGILLIZA — 0020 A AUTOMAÇÃO SÓ RODA NA SUA PRÓPRIA CONTA
--
-- O QUE ESTAVA ERRADO
--
-- A 0019 publicou `public.executar_automacoes(p_tenant_id uuid)` como
-- `security definer`, liberada para `authenticated`, recebendo o tenant COMO
-- ARGUMENTO e sem conferir quem chamava. Qualquer corretor da plataforma
-- mandava a automação rodar na conta de qualquer outro.
--
-- E não era leitura: era ESCRITA. A função criava follow-ups dentro da conta
-- alheia, até 50 por regra, indistinguíveis dos legítimos — cliente certo, data
-- certa, sem rastro de terem vindo de fora. O retorno ainda dizia quantos
-- negócios parados o vizinho tinha.
--
-- Reproduzido antes de corrigir, em `supabase/tests/09`:
--   [FALHA] corretor A executou a automacao da conta de B sem erro nenhum
--   [FALHA] 1 follow-up(s) criados na conta de B por um estranho
--
-- A LIÇÃO, ESCRITA PARA NÃO SE REPETIR
--
-- `security definer` existe para passar por cima da RLS. Quem escreve uma assim
-- ASSUME a conferência que a RLS faria — e se a função ainda recebe o tenant
-- por argumento, o argumento é entrada do usuário, não um fato.
--
-- Regra daqui em diante: toda função `security definer` em `public` liberada
-- para `authenticated` e que receba `p_tenant_id` confere o chamador na
-- PRIMEIRA linha. Sem exceção.
--
-- POR QUE `administra_tenant` E NÃO `pode_ler_tenant`
--
-- Porque é exatamente quem a política de escrita da tabela `automacoes` já
-- deixa ligar e desligar as regras (0018). Quem pode ligar, pode rodar; quem
-- não pode ligar, não roda. Divergência entre a permissão da aplicação e a do
-- banco já custou caro neste projeto — aqui as duas dizem a mesma coisa.
--
-- O AGENDADOR NÃO PASSA POR AQUI
--
-- Um agendador roda com a chave de serviço e chama `app.executar_automacoes`
-- direto, como a 0019 já previa. Ele não tem `auth.uid()`, então não teria como
-- passar nesta conferência — e nem deve: a porta de quem tem a chave de serviço
-- é outra, de propósito.
-- ============================================================================

create or replace function public.executar_automacoes(p_tenant_id uuid)
returns table (regra text, criados int, limitado boolean)
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- A PRIMEIRA COISA. Antes de qualquer leitura, antes de qualquer escrita.
  if not app.administra_tenant(p_tenant_id) then
    raise exception 'Sem permissao para executar automacoes nesta conta.'
      using errcode = '42501';
  end if;

  return query select * from app.executar_automacoes(p_tenant_id);
end;
$$;

comment on function public.executar_automacoes is
  'Involucro de app.executar_automacoes para a aplicacao alcancar. CONFERE o chamador com app.administra_tenant antes de qualquer coisa: a funcao e security definer e recebe o tenant por argumento, entao o argumento e entrada do usuario. Ver migracao 0020 e supabase/tests/09.';

revoke all on function public.executar_automacoes(uuid) from public, anon;
grant execute on function public.executar_automacoes(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- E o search_path que faltava.
--
-- `app.teto_por_execucao` era a única função do projeto sem `set search_path`.
-- Numa função sem ele, quem chama escolhe em que schema os nomes não
-- qualificados são resolvidos — e numa `security definer` isso vira caminho
-- para execução com privilégio alheio. Esta aqui só devolve um número e não
-- referencia nada, então o risco real é nenhum; mas "hoje não referencia nada"
-- não é garantia que sobreviva à próxima edição, e a função ao lado que a
-- chama É security definer.
-- ---------------------------------------------------------------------------

create or replace function app.teto_por_execucao()
returns int
language sql
immutable
set search_path = ''
as $$
  select 50;
$$;

comment on function app.teto_por_execucao is
  'Maximo de follow-ups que uma regra cria por execucao. Numero unico para as regras e para os testes citarem o mesmo teto.';
