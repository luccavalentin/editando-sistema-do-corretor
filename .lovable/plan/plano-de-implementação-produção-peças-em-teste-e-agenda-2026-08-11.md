# Plano de Implementação: Produção, Peças em Teste e Agenda

Módulo de Produção (`/production`) focado em rastreabilidade de peças em teste, notificações entre vendedor/mecânico e agendamento de serviços.

## User-facing changes
- **Página de Produção**: Lista de peças em teste com status visual e prazos de vencimento.
- **Notificações**: Sistema de alertas no cabeçalho para avisar mecânicos sobre novas peças e vendedores sobre conclusões de testes.
- **Agenda de Serviços**: Visão de calendário/lista para organizar serviços por especialidade e mecânico.
- **Etiquetas**: Geração visual de etiquetas para identificação de peças físicas.

## Technical details
- **Schema**:
    - `pecas_teste`: Controle de fluxo de peças enviadas para laboratório ou teste em bancada.
    - `notificacoes`: Tabela centralizada para alertas operacionais em tempo real.
    - `agenda_servicos`: Planejamento de execução com status de pendente/em andamento.
- **Server Functions**:
    - `getPecasTeste`, `updatePecaStatus` (transiciona status e remove etiqueta).
    - `createNotificacao`, `getNotificacoes`, `markNotificacaoLida`.
    - `getAgendaServicos`, `upsertAgendaItem`.
- **UI**:
    - Kanban simplificado para Peças em Teste.
    - Componente de Notificações (`Bell`) no Header com dados reais.
    - Filtros por Especialidade (Elétrica, Socorro, etc.) na Agenda.
