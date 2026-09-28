-- ============================================================================
-- AGILLIZA — 0007 POR QUE `contadores` NÃO TEM POLÍTICA
--
-- O linter do Supabase avisa (nível INFO) que `public.contadores` tem RLS
-- ligada e nenhuma política. Aqui isso é a intenção, não um esquecimento:
-- RLS ligada sem política NEGA tudo. A tabela fica inalcançável pela API
-- PostgREST para qualquer papel, e só as funções `security definer` do schema
-- `app` escrevem nela.
--
-- O comentário existe para que a próxima pessoa que rodar o linter — ou uma
-- IA lendo o aviso — não "conserte" isso criando uma política. Uma política de
-- leitura aqui entregaria a contagem de negócios de cada concorrente; uma de
-- escrita permitiria zerar o contador e gerar códigos repetidos, que é
-- exatamente o defeito que a tabela foi criada para eliminar.
-- ============================================================================

comment on table public.contadores is
  'Contadores internos por tenant (codigo de negocio etc). RLS ligada SEM politica de proposito: inalcancavel pela API, gravavel somente por funcoes security definer do schema app. Nao adicionar politica aqui.';
