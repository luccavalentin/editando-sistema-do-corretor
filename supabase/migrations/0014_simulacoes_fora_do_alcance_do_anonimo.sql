-- ============================================================================
-- AGILLIZA — 0014 SIMULAÇÃO FORA DO ALCANCE DO VISITANTE
--
-- Encontrado pelo QA da 0013: o papel `anon` conseguia ENDEREÇAR
-- `public.simulacoes`. Não houve vazamento — a política de RLS não devolve
-- nenhuma linha para quem não é membro do tenant — mas o privilégio de tabela
-- existia, porque o Supabase concede `select` a `anon` e `authenticated` por
-- padrão em tudo que nasce no schema `public`.
--
-- POR QUE ISSO IMPORTA SE A RLS JÁ BARRA
--
-- Porque são duas camadas independentes, e a segunda existe justamente para o
-- dia em que a primeira falhar. Basta alguém criar uma política de leitura
-- permissiva demais — ou uma view sem `security_invoker`, ou um `security
-- definer` mal escrito — para a RLS deixar de barrar. Com o privilégio
-- revogado, o visitante esbarra em `insufficient_privilege` antes de qualquer
-- política ser avaliada.
--
-- `simulacoes` guarda CPF, data de nascimento e renda do comprador. É o
-- conjunto de dados mais sensível do sistema depois de `pessoas` — que já
-- tinha o revoke, e é de lá que veio o padrão seguido aqui.
-- ============================================================================

revoke all on public.simulacoes from anon;
revoke all on public.simulacao_bancos from anon;

-- O log de integração não guarda dado pessoal legível (ele é mascarado na
-- origem), mas guarda o desenho da integração: caminhos, operações e a
-- frequência de erro. Nada disso é assunto de visitante.
revoke all on public.integracao_chamadas from anon;

-- ----------------------------------------------------------------------------
-- E PARA O QUE VIER DEPOIS
--
-- O mesmo descuido se repetiria na próxima tabela criada. O `alter default
-- privileges` faz o padrão passar a ser "o anônimo não alcança", e cada
-- exceção — como as colunas públicas do portfólio na 0010 — passa a ser
-- concedida de propósito, uma a uma.
--
-- Isso vale para tabelas criadas pelo papel `postgres`, que é quem roda as
-- migrações.
-- ----------------------------------------------------------------------------
alter default privileges for role postgres in schema public
  revoke all on tables from anon;

comment on table public.simulacoes is
  'Simulacao de financiamento. Guarda COPIA dos valores enviados, nao referencia viva. Inalcancavel pelo papel anon: privilegio revogado na 0014, alem da RLS.';
