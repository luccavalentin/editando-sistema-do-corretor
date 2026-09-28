-- ============================================================================
-- AGILLIZA — 0002 MOVE AS EXTENSÕES PARA FORA DO `public`
--
-- A 0001 criou `pg_trgm` e `btree_gin` sem informar esquema, e o Postgres as
-- colocou em `public`. O linter de segurança do Supabase reprova isso, e com
-- razão: função de extensão em `public` fica no caminho de resolução de nome de
-- qualquer consulta, o que abre espaço para sequestro de nome — alguém cria
-- `public.similarity(...)` e passa a interceptar chamadas que deveriam ir para
-- a extensão.
--
-- Mover para `extensions`, o esquema que o Supabase já mantém para isso, tira
-- as funções do caminho padrão sem quebrar nada: os índices GIN e trigram
-- resolvem a extensão pelo catálogo, não pelo search_path.
--
-- `pgcrypto` não aparece aqui porque o Supabase já a mantém em `extensions`; o
-- `create extension if not exists` da 0001 foi um no-op para ela.
--
-- Nenhum índice usa trigram ou GIN ainda, então a relocação acontece sem
-- reconstrução de índice.
-- ============================================================================

create schema if not exists extensions;

alter extension pg_trgm set schema extensions;
alter extension btree_gin set schema extensions;
