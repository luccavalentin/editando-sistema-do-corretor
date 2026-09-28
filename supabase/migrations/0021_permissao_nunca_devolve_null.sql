-- ============================================================================
-- AGILLIZA — 0021 PERMISSÃO NUNCA DEVOLVE NULL
--
-- O QUE A 0020 NÃO RESOLVEU, E POR QUÊ
--
-- A 0020 pôs uma trava no invólucro das automações:
--
--     if not app.administra_tenant(p_tenant_id) then raise ... end if;
--
-- Rodei o teste de novo esperando "recusado". Continuou passando. A função no
-- banco estava certa, letra por letra. O que estava errado era o TIPO da
-- resposta:
--
--     papel_no_tenant(conta alheia)          -> NULL   (nao e membro)
--     NULL in ('proprietario','admin_equipe') -> NULL   (nao FALSE)
--     NULL or e_admin_plataforma()            -> NULL   (nao FALSE)
--     if not NULL then                        -> nao dispara
--
-- Ou seja: a trava FALHAVA ABERTA. Quanto mais estranho o chamador, mais NULL
-- aparecia, e mais a trava se calava. É o pior feitio possível para uma
-- verificação de permissão.
--
-- POR QUE ISSO NUNCA APARECEU NOS TESTES DE ISOLAMENTO
--
-- Porque em política de RLS o Postgres trata NULL como falso. `using (NULL)`
-- não devolve linha. Os testes 01 a 08 exercitam as funções POR DENTRO da RLS,
-- onde o defeito é invisível — e continuaria invisível até a primeira vez que
-- alguém as usasse fora dela. Essa primeira vez foi a 0020.
--
-- A CORREÇÃO É NA RAIZ, NÃO NO CHAMADOR
--
-- Dava para escrever `if not coalesce(...)` na 0020 e seguir a vida. Mas aí a
-- armadilha continuaria armada para a próxima função que chamasse qualquer uma
-- destas fora de uma política — e quem escrevesse essa função não teria motivo
-- para desconfiar. Função de permissão responde SIM ou NÃO. Não responde
-- "não sei".
--
-- O `coalesce` no chamador fica também, de propósito: se um dia alguém reeditar
-- estas funções e reintroduzir o NULL, a trava da 0020 não volta a falhar
-- aberta junto.
--
-- NENHUMA MUDANÇA DE COMPORTAMENTO NA RLS
--
-- Onde antes vinha NULL, a política já se comportava como falso. Agora vem
-- falso de verdade. As linhas visíveis são exatamente as mesmas.
-- ============================================================================

-- `papel_no_tenant` continua podendo devolver NULL: ela responde "qual papel",
-- e "nenhum" é uma resposta legítima. Quem converte isso em SIM/NÃO são as três
-- abaixo.

create or replace function app.administra_tenant(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    app.papel_no_tenant(p_tenant_id) in ('proprietario', 'admin_equipe'),
    false
  ) or app.e_admin_plataforma()
$$;

create or replace function app.pode_escrever(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    app.papel_no_tenant(p_tenant_id)
      in ('proprietario', 'admin_equipe', 'corretor', 'assistente', 'secretaria', 'sdr'),
    false
  )
$$;

create or replace function app.pode_ler_tenant(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(p_tenant_id in (select app.tenants_do_usuario()), false)
      or app.e_admin_plataforma()
$$;

comment on function app.administra_tenant is
  'SIM/NAO, nunca NULL (ver 0021): usada tambem fora de politica RLS, onde NULL faria a trava falhar aberta.';
comment on function app.pode_escrever is
  'SIM/NAO, nunca NULL (ver 0021).';
comment on function app.pode_ler_tenant is
  'SIM/NAO, nunca NULL (ver 0021).';

-- ---------------------------------------------------------------------------
-- E o cinto, além do suspensório: a trava da 0020 passa a ser imune a um NULL
-- que volte no futuro.
-- ---------------------------------------------------------------------------

create or replace function public.executar_automacoes(p_tenant_id uuid)
returns table (regra text, criados int, limitado boolean)
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- A PRIMEIRA COISA. Antes de qualquer leitura, antes de qualquer escrita.
  -- O `coalesce` e deliberado: ver 0021. Sem ele, um NULL vindo da funcao de
  -- permissao faria este `if not` nao disparar, e a trava falharia ABERTA.
  if not coalesce(app.administra_tenant(p_tenant_id), false) then
    raise exception 'Sem permissao para executar automacoes nesta conta.'
      using errcode = '42501';
  end if;

  return query select * from app.executar_automacoes(p_tenant_id);
end;
$$;
