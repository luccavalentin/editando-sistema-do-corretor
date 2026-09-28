-- ============================================================================
-- AGILLIZA — 0004 A COLUNA GERADA DO COMPROMISSO NÃO PODE ESTOURAR ANTES DA
-- RESTRIÇÃO
--
-- Achado por teste funcional, não por leitura de código.
--
-- A 0003 definiu `intervalo` como `tstzrange(inicio, fim, '[)')` e uma restrição
-- `fim > inicio`. O Postgres calcula a coluna gerada ANTES de avaliar a
-- restrição, então um compromisso com fim antes do início nunca chega à
-- restrição: `tstzrange` estoura primeiro com
--
--   22000: range lower bound must be less than or equal to range upper bound
--
-- O efeito prático é ruim de dois jeitos. O corretor vê uma mensagem de erro de
-- tipo de dado do Postgres em vez de "o horário de fim deve ser depois do
-- início", e a aplicação não consegue tratar o caso: o código de erro é
-- genérico de dado, o mesmo de uma dúzia de outras falhas.
--
-- A correção deixa a expressão devolver nulo quando a faixa é inválida. Aí a
-- restrição `compromisso_fim_depois_do_inicio` é alcançada e dá a mensagem
-- certa, com `check_violation` — que a aplicação sabe traduzir. Como a restrição
-- garante `fim > inicio` em toda linha gravada, o intervalo nunca é nulo na
-- prática.
--
-- A coluna precisa ser recriada porque o Postgres não permite alterar a
-- expressão de uma coluna gerada. A tabela está vazia, então não há
-- reconstrução de dado; o índice de conflito é recriado junto.
-- ============================================================================

drop index if exists public.compromissos_conflito_idx;

alter table public.compromissos drop column intervalo;

alter table public.compromissos
  add column intervalo tstzrange
  generated always as (
    case when fim > inicio then tstzrange(inicio, fim, '[)') end
  ) stored;

create index compromissos_conflito_idx
  on public.compromissos using gist (responsavel_id extensions.gist_uuid_ops, intervalo)
  where situacao in ('agendado', 'confirmado');

comment on column public.compromissos.intervalo is
  'Faixa do compromisso, para detecção de conflito por sobreposição. Nula apenas se fim <= inicio, caso que a restrição rejeita — existe para que a restrição dê a mensagem em vez do erro cru de tstzrange.';
