# Plan: Reports, Ranking, and Automatic Scoring Implementation

Implementing functional reports with CSV export, a ranking system with automated scoring integrated into existing RPCs and workflows, and specialized scoring logic.

## 1. Database Schema Extensions (Supabase Migration)
- Create `ranking_config` table (type_event, points).
- Create `ranking_eventos` table (tracking user points per event).
- Seed `ranking_config` with: `checklist_sem_retrabalho`, `retorno_servico` (negative), `os_concluida_no_prazo`.
- Update `transicionar_status_os` RPC to handle automatic scoring logic.

## 2. Server Functions (`src/integrations/`)
- `getReportsData`: Fetches aggregated OS data, timing per stage (using `os_historico_status`), and performance by role (admin, mechanic, seller).
- `getRanking`: Fetches current leaderboard based on `ranking_eventos`, supporting daily/weekly/monthly filters.
- Update `saveChecklist` (if exists in a dedicated file) to trigger scoring logic.

## 3. Reports Module (`src/routes/reports.tsx`)
- Dashboard-style overview of volumes and timing.
- Data tables with filters (period, client, mechanic).
- Functional CSV export using Blob and browser download.

## 4. Ranking Module (`src/routes/ranking.tsx`)
- Podium visualization for top performers.
- Sortable table with levels and medals logic.
- Admin-only configuration UI for points.

## 5. Automated Scoring Integration
- **Final Checklist:** If closed with no re-opened "NOT OK" items -> `checklist_sem_retrabalho`.
- **Rework Detection:** If OS transitions back to `aguardando_peca` or re-opens after `checklist_final` -> `retorno_servico`.
- **Deadline Performance:** If OS completed before `limite_horas_amarelo` -> `os_concluida_no_prazo`.

## Technical Details
- CSV Generation: pure JS using `new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })`.
- Performance: use Supabase views or complex queries for report aggregation to keep it snappy.
- Security: RBAC check for `ranking_config` edits.
