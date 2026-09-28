-- ============================================================================
-- AGILLIZA — 0022 A RLS QUE AGUENTA ESCALA
--
-- O QUE FOI MEDIDO, NÃO IMAGINADO
--
-- 60.000 pessoas em 300 contas. A consulta mais quente do sistema — a lista de
-- clientes, `select ... from pessoas order by criado_em desc limit 50`:
--
--     Seq Scan on pessoas  (actual time=0.346..11796.993 rows=200)
--       Filter: (excluido_em IS NULL) AND app.pode_ler_tenant(tenant_id)
--       Rows Removed by Filter: 59800
--     Execution Time: 11798.150 ms
--
-- Onze segundos e oitocentos para devolver cinquenta linhas.
--
-- POR QUE
--
-- `app.pode_ler_tenant(tenant_id)` recebe a COLUNA como argumento. Para o
-- planejador isso é uma função opaca aplicada a cada linha: ele não tem como
-- transformar aquilo numa condição de índice, então varre a tabela inteira e
-- chama a função 60.000 vezes para descobrir quais 200 são suas.
--
-- O índice em `pessoas(tenant_id)` existia o tempo todo. Ele não era inútil —
-- era INALCANÇÁVEL, porque a condição nunca falava de `tenant_id` diretamente.
--
-- A CORREÇÃO
--
-- Trocar "esta linha é minha?" (uma pergunta por linha) por "quais contas são
-- minhas?" (uma pergunta só):
--
--     app.pode_ler_tenant(tenant_id)
--     ->  tenant_id in (select app.tenants_do_usuario())
--         or (select app.e_admin_plataforma())
--
-- Um `in (select ...)` sobre função STABLE vira `hashed SubPlan`, e o `(select
-- f())` solto vira `InitPlan`: ambos avaliados UMA VEZ por consulta. A mesma
-- medição, com a mesma carga, depois da troca:
--
--     Execution Time: 11.631 ms
--
-- De 11.798 ms para 11,6 ms. Mil vezes. E a diferença CRESCE com o número de
-- contas na plataforma — que é exatamente o eixo em que este sistema precisa
-- crescer sem sofrer.
--
-- A SEMÂNTICA NÃO MUDA, E ISSO É O PONTO
--
-- Quem enxerga o quê continua idêntico, linha por linha. As funções antigas
-- continuam existindo e corretas; elas só saem do caminho quente, onde o custo
-- é por linha. Onde a chamada é uma só — como a trava da 0020 — continuam sendo
-- a forma certa de perguntar.
--
-- Os testes 01 a 09 são a rede de proteção desta migração: se qualquer política
-- tiver mudado de sentido, o isolamento entre contas quebra e o 01 acusa.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. OS CONJUNTOS
--
-- `tenants_do_usuario` já existia. Faltavam os dois recortes por papel, que até
-- agora só existiam embutidos dentro das funções booleanas.
-- ---------------------------------------------------------------------------

create or replace function app.tenants_onde_escrevo()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.tenant_id
  from public.membros m
  where m.usuario_id = (select auth.uid())
    and m.situacao = 'ativo'
    and m.papel in ('proprietario', 'admin_equipe', 'corretor', 'assistente', 'secretaria', 'sdr')
$$;

comment on function app.tenants_onde_escrevo is
  'Contas em que o usuario atual pode escrever. Mesma regra de app.pode_escrever, em forma de CONJUNTO: usada nas politicas para o planejador avaliar uma vez por consulta, e nao uma vez por linha (ver 0022).';

create or replace function app.tenants_que_administro()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.tenant_id
  from public.membros m
  where m.usuario_id = (select auth.uid())
    and m.situacao = 'ativo'
    and m.papel in ('proprietario', 'admin_equipe')
$$;

comment on function app.tenants_que_administro is
  'Contas que o usuario atual administra. NAO inclui admin de plataforma: onde a politica precisa dele, soma-se `or (select app.e_admin_plataforma())` (ver 0022).';

grant execute on function app.tenants_onde_escrevo() to authenticated;
grant execute on function app.tenants_que_administro() to authenticated;

-- ---------------------------------------------------------------------------
-- 2. AS POLÍTICAS
--
-- Traduções, uma para uma:
--
--   app.pode_ler_tenant(X)    ->  X in (select app.tenants_do_usuario())
--                                 or (select app.e_admin_plataforma())
--   app.pode_escrever(X)      ->  X in (select app.tenants_onde_escrevo())
--   app.administra_tenant(X)  ->  X in (select app.tenants_que_administro())
--                                 or (select app.e_admin_plataforma())
--
-- `pode_escrever` não tinha o admin de plataforma, e continua sem: o console é
-- de leitura, e não é aqui que isso muda.
-- ---------------------------------------------------------------------------

-- ============================================================ tenants
drop policy if exists tenants_ler on public.tenants;
create policy tenants_ler on public.tenants for select to authenticated
using (
  excluido_em is null
  and (id in (select app.tenants_do_usuario()) or (select app.e_admin_plataforma()))
);

drop policy if exists tenants_atualizar on public.tenants;
create policy tenants_atualizar on public.tenants for update to authenticated
using (id in (select app.tenants_que_administro()) or (select app.e_admin_plataforma()))
with check (id in (select app.tenants_que_administro()) or (select app.e_admin_plataforma()));

-- ============================================================ membros
drop policy if exists membros_ler on public.membros;
create policy membros_ler on public.membros for select to authenticated
using (tenant_id in (select app.tenants_do_usuario()) or (select app.e_admin_plataforma()));

drop policy if exists membros_inserir on public.membros;
create policy membros_inserir on public.membros for insert to authenticated
with check (
  (tenant_id in (select app.tenants_que_administro()) or (select app.e_admin_plataforma()))
  and papel <> 'proprietario'
);

drop policy if exists membros_atualizar on public.membros;
create policy membros_atualizar on public.membros for update to authenticated
using (
  (tenant_id in (select app.tenants_que_administro()) or (select app.e_admin_plataforma()))
  and papel <> 'proprietario'
)
with check (
  (tenant_id in (select app.tenants_que_administro()) or (select app.e_admin_plataforma()))
  and papel <> 'proprietario'
);

drop policy if exists membros_remover on public.membros;
create policy membros_remover on public.membros for delete to authenticated
using (
  (tenant_id in (select app.tenants_que_administro()) or (select app.e_admin_plataforma()))
  and papel <> 'proprietario'
);

-- ============================================================ convites
drop policy if exists convites_ler on public.convites;
create policy convites_ler on public.convites for select to authenticated
using (tenant_id in (select app.tenants_que_administro()) or (select app.e_admin_plataforma()));

drop policy if exists convites_criar on public.convites;
create policy convites_criar on public.convites for insert to authenticated
with check (
  (tenant_id in (select app.tenants_que_administro()) or (select app.e_admin_plataforma()))
  and papel <> 'proprietario'
);

drop policy if exists convites_revogar on public.convites;
create policy convites_revogar on public.convites for update to authenticated
using (tenant_id in (select app.tenants_que_administro()) or (select app.e_admin_plataforma()))
with check (tenant_id in (select app.tenants_que_administro()) or (select app.e_admin_plataforma()));

-- ============================================================ etapas
drop policy if exists etapas_ler on public.etapas;
create policy etapas_ler on public.etapas for select to authenticated
using (tenant_id in (select app.tenants_do_usuario()) or (select app.e_admin_plataforma()));

drop policy if exists etapas_inserir on public.etapas;
create policy etapas_inserir on public.etapas for insert to authenticated
with check (tenant_id in (select app.tenants_que_administro()) or (select app.e_admin_plataforma()));

drop policy if exists etapas_atualizar on public.etapas;
create policy etapas_atualizar on public.etapas for update to authenticated
using (tenant_id in (select app.tenants_que_administro()) or (select app.e_admin_plataforma()))
with check (tenant_id in (select app.tenants_que_administro()) or (select app.e_admin_plataforma()));

drop policy if exists etapas_remover on public.etapas;
create policy etapas_remover on public.etapas for delete to authenticated
using (tenant_id in (select app.tenants_que_administro()) or (select app.e_admin_plataforma()));

-- ============================================================ pessoas
drop policy if exists pessoas_ler on public.pessoas;
create policy pessoas_ler on public.pessoas for select to authenticated
using (
  excluido_em is null
  and (tenant_id in (select app.tenants_do_usuario()) or (select app.e_admin_plataforma()))
);

drop policy if exists pessoas_inserir on public.pessoas;
create policy pessoas_inserir on public.pessoas for insert to authenticated
with check (tenant_id in (select app.tenants_onde_escrevo()));

drop policy if exists pessoas_atualizar on public.pessoas;
create policy pessoas_atualizar on public.pessoas for update to authenticated
using (tenant_id in (select app.tenants_onde_escrevo()))
with check (tenant_id in (select app.tenants_onde_escrevo()));

-- ============================================================ pessoa_telefones
drop policy if exists pessoa_telefones_ler on public.pessoa_telefones;
create policy pessoa_telefones_ler on public.pessoa_telefones for select to authenticated
using (tenant_id in (select app.tenants_do_usuario()) or (select app.e_admin_plataforma()));

drop policy if exists pessoa_telefones_inserir on public.pessoa_telefones;
create policy pessoa_telefones_inserir on public.pessoa_telefones for insert to authenticated
with check (tenant_id in (select app.tenants_onde_escrevo()));

drop policy if exists pessoa_telefones_atualizar on public.pessoa_telefones;
create policy pessoa_telefones_atualizar on public.pessoa_telefones for update to authenticated
using (tenant_id in (select app.tenants_onde_escrevo()))
with check (tenant_id in (select app.tenants_onde_escrevo()));

drop policy if exists pessoa_telefones_remover on public.pessoa_telefones;
create policy pessoa_telefones_remover on public.pessoa_telefones for delete to authenticated
using (tenant_id in (select app.tenants_onde_escrevo()));

-- ============================================================ negocios
drop policy if exists negocios_ler on public.negocios;
create policy negocios_ler on public.negocios for select to authenticated
using (
  excluido_em is null
  and (tenant_id in (select app.tenants_do_usuario()) or (select app.e_admin_plataforma()))
);

drop policy if exists negocios_inserir on public.negocios;
create policy negocios_inserir on public.negocios for insert to authenticated
with check (tenant_id in (select app.tenants_onde_escrevo()));

drop policy if exists negocios_atualizar on public.negocios;
create policy negocios_atualizar on public.negocios for update to authenticated
using (tenant_id in (select app.tenants_onde_escrevo()))
with check (tenant_id in (select app.tenants_onde_escrevo()));

-- ============================================================ negocio_participantes
drop policy if exists negocio_participantes_ler on public.negocio_participantes;
create policy negocio_participantes_ler on public.negocio_participantes for select to authenticated
using (tenant_id in (select app.tenants_do_usuario()) or (select app.e_admin_plataforma()));

drop policy if exists negocio_participantes_inserir on public.negocio_participantes;
create policy negocio_participantes_inserir on public.negocio_participantes for insert to authenticated
with check (tenant_id in (select app.tenants_onde_escrevo()));

drop policy if exists negocio_participantes_atualizar on public.negocio_participantes;
create policy negocio_participantes_atualizar on public.negocio_participantes for update to authenticated
using (tenant_id in (select app.tenants_onde_escrevo()))
with check (tenant_id in (select app.tenants_onde_escrevo()));

drop policy if exists negocio_participantes_remover on public.negocio_participantes;
create policy negocio_participantes_remover on public.negocio_participantes for delete to authenticated
using (tenant_id in (select app.tenants_onde_escrevo()));

-- ============================================================ negocio_etapa_historico
drop policy if exists negocio_etapa_historico_ler on public.negocio_etapa_historico;
create policy negocio_etapa_historico_ler on public.negocio_etapa_historico for select to authenticated
using (tenant_id in (select app.tenants_do_usuario()) or (select app.e_admin_plataforma()));

-- ============================================================ compromissos
drop policy if exists compromissos_ler on public.compromissos;
create policy compromissos_ler on public.compromissos for select to authenticated
using (tenant_id in (select app.tenants_do_usuario()) or (select app.e_admin_plataforma()));

drop policy if exists compromissos_inserir on public.compromissos;
create policy compromissos_inserir on public.compromissos for insert to authenticated
with check (tenant_id in (select app.tenants_onde_escrevo()));

drop policy if exists compromissos_atualizar on public.compromissos;
create policy compromissos_atualizar on public.compromissos for update to authenticated
using (tenant_id in (select app.tenants_onde_escrevo()))
with check (tenant_id in (select app.tenants_onde_escrevo()));

drop policy if exists compromissos_remover on public.compromissos;
create policy compromissos_remover on public.compromissos for delete to authenticated
using (tenant_id in (select app.tenants_onde_escrevo()));

-- ============================================================ tarefas
drop policy if exists tarefas_ler on public.tarefas;
create policy tarefas_ler on public.tarefas for select to authenticated
using (tenant_id in (select app.tenants_do_usuario()) or (select app.e_admin_plataforma()));

drop policy if exists tarefas_inserir on public.tarefas;
create policy tarefas_inserir on public.tarefas for insert to authenticated
with check (tenant_id in (select app.tenants_onde_escrevo()));

drop policy if exists tarefas_atualizar on public.tarefas;
create policy tarefas_atualizar on public.tarefas for update to authenticated
using (tenant_id in (select app.tenants_onde_escrevo()))
with check (tenant_id in (select app.tenants_onde_escrevo()));

drop policy if exists tarefas_remover on public.tarefas;
create policy tarefas_remover on public.tarefas for delete to authenticated
using (tenant_id in (select app.tenants_onde_escrevo()));

-- ============================================================ followups
drop policy if exists followups_ler on public.followups;
create policy followups_ler on public.followups for select to authenticated
using (tenant_id in (select app.tenants_do_usuario()) or (select app.e_admin_plataforma()));

drop policy if exists followups_inserir on public.followups;
create policy followups_inserir on public.followups for insert to authenticated
with check (tenant_id in (select app.tenants_onde_escrevo()));

drop policy if exists followups_atualizar on public.followups;
create policy followups_atualizar on public.followups for update to authenticated
using (tenant_id in (select app.tenants_onde_escrevo()))
with check (tenant_id in (select app.tenants_onde_escrevo()));

drop policy if exists followups_remover on public.followups;
create policy followups_remover on public.followups for delete to authenticated
using (tenant_id in (select app.tenants_onde_escrevo()));

-- ============================================================ imoveis
-- `imoveis_portfolio_publico` continua como está: ela não fala de conta, fala
-- de `visivel_no_portfolio`, e é a política que serve a vitrine ao anônimo.
drop policy if exists imoveis_ler on public.imoveis;
create policy imoveis_ler on public.imoveis for select to authenticated
using (
  excluido_em is null
  and (tenant_id in (select app.tenants_do_usuario()) or (select app.e_admin_plataforma()))
);

drop policy if exists imoveis_inserir on public.imoveis;
create policy imoveis_inserir on public.imoveis for insert to authenticated
with check (tenant_id in (select app.tenants_onde_escrevo()));

drop policy if exists imoveis_atualizar on public.imoveis;
create policy imoveis_atualizar on public.imoveis for update to authenticated
using (tenant_id in (select app.tenants_onde_escrevo()))
with check (tenant_id in (select app.tenants_onde_escrevo()));

-- ============================================================ imovel_midias
drop policy if exists imovel_midias_ler on public.imovel_midias;
create policy imovel_midias_ler on public.imovel_midias for select to authenticated
using (tenant_id in (select app.tenants_do_usuario()) or (select app.e_admin_plataforma()));

drop policy if exists imovel_midias_inserir on public.imovel_midias;
create policy imovel_midias_inserir on public.imovel_midias for insert to authenticated
with check (tenant_id in (select app.tenants_onde_escrevo()));

drop policy if exists imovel_midias_atualizar on public.imovel_midias;
create policy imovel_midias_atualizar on public.imovel_midias for update to authenticated
using (tenant_id in (select app.tenants_onde_escrevo()))
with check (tenant_id in (select app.tenants_onde_escrevo()));

drop policy if exists imovel_midias_remover on public.imovel_midias;
create policy imovel_midias_remover on public.imovel_midias for delete to authenticated
using (tenant_id in (select app.tenants_onde_escrevo()));

-- ============================================================ imovel_interesses
drop policy if exists imovel_interesses_ler on public.imovel_interesses;
create policy imovel_interesses_ler on public.imovel_interesses for select to authenticated
using (tenant_id in (select app.tenants_do_usuario()) or (select app.e_admin_plataforma()));

drop policy if exists imovel_interesses_inserir on public.imovel_interesses;
create policy imovel_interesses_inserir on public.imovel_interesses for insert to authenticated
with check (tenant_id in (select app.tenants_onde_escrevo()));

drop policy if exists imovel_interesses_remover on public.imovel_interesses;
create policy imovel_interesses_remover on public.imovel_interesses for delete to authenticated
using (tenant_id in (select app.tenants_onde_escrevo()));

-- ============================================================ simulacoes
drop policy if exists simulacoes_ler on public.simulacoes;
create policy simulacoes_ler on public.simulacoes for select to authenticated
using (
  excluido_em is null
  and (tenant_id in (select app.tenants_do_usuario()) or (select app.e_admin_plataforma()))
);

drop policy if exists simulacoes_inserir on public.simulacoes;
create policy simulacoes_inserir on public.simulacoes for insert to authenticated
with check (tenant_id in (select app.tenants_onde_escrevo()));

drop policy if exists simulacoes_atualizar on public.simulacoes;
create policy simulacoes_atualizar on public.simulacoes for update to authenticated
using (tenant_id in (select app.tenants_onde_escrevo()))
with check (tenant_id in (select app.tenants_onde_escrevo()));

-- ============================================================ simulacao_bancos
drop policy if exists simulacao_bancos_ler on public.simulacao_bancos;
create policy simulacao_bancos_ler on public.simulacao_bancos for select to authenticated
using (tenant_id in (select app.tenants_do_usuario()) or (select app.e_admin_plataforma()));

drop policy if exists simulacao_bancos_inserir on public.simulacao_bancos;
create policy simulacao_bancos_inserir on public.simulacao_bancos for insert to authenticated
with check (tenant_id in (select app.tenants_onde_escrevo()));

drop policy if exists simulacao_bancos_atualizar on public.simulacao_bancos;
create policy simulacao_bancos_atualizar on public.simulacao_bancos for update to authenticated
using (tenant_id in (select app.tenants_onde_escrevo()))
with check (tenant_id in (select app.tenants_onde_escrevo()));

-- ============================================================ integracao_chamadas
-- A original somava três condições. A do meio (`pode_ler_tenant`) era redundante
-- com a terceira: um admin de plataforma que não fosse membro passava em
-- `pode_ler_tenant`, mas `papel_no_tenant` devolvia NULL e a linha caía fora.
-- O conjunto `tenants_que_administro` diz exatamente a mesma coisa, direto.
drop policy if exists integracao_chamadas_leitura on public.integracao_chamadas;
create policy integracao_chamadas_leitura on public.integracao_chamadas for select to authenticated
using (tenant_id is not null and tenant_id in (select app.tenants_que_administro()));

-- ============================================================ portal_acessos
drop policy if exists portal_acessos_do_tenant on public.portal_acessos;
create policy portal_acessos_do_tenant on public.portal_acessos for select to authenticated
using (
  tenant_id is not null
  and (tenant_id in (select app.tenants_do_usuario()) or (select app.e_admin_plataforma()))
);

-- ============================================================ auditoria
drop policy if exists auditoria_ler on public.auditoria;
create policy auditoria_ler on public.auditoria for select to authenticated
using (tenant_id in (select app.tenants_que_administro()) or (select app.e_admin_plataforma()));

-- ============================================================ automacoes
--
-- Aqui havia um segundo problema, apontado pelo mesmo parecer: `automacoes_ler`
-- e `automacoes_escrever` (que era `for all`) se sobrepunham no SELECT. Duas
-- políticas permissivas para o mesmo papel e a mesma ação rodam as DUAS em toda
-- linha lida, de graça.
--
-- Separando por ação, cada comando passa por uma política só — e de quebra fica
-- explícito que ler é de todo mundo da conta, enquanto mexer é de quem
-- administra.
drop policy if exists automacoes_ler on public.automacoes;
drop policy if exists automacoes_escrever on public.automacoes;

create policy automacoes_ler on public.automacoes for select to authenticated
using (tenant_id in (select app.tenants_do_usuario()) or (select app.e_admin_plataforma()));

create policy automacoes_inserir on public.automacoes for insert to authenticated
with check (tenant_id in (select app.tenants_que_administro()) or (select app.e_admin_plataforma()));

create policy automacoes_atualizar on public.automacoes for update to authenticated
using (tenant_id in (select app.tenants_que_administro()) or (select app.e_admin_plataforma()))
with check (tenant_id in (select app.tenants_que_administro()) or (select app.e_admin_plataforma()));

create policy automacoes_remover on public.automacoes for delete to authenticated
using (tenant_id in (select app.tenants_que_administro()) or (select app.e_admin_plataforma()));
