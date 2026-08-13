# Plano de Auditoria Técnica e Correção - Pátio Inteligente Tecnoar

Este plano detalha a auditoria profunda solicitada para identificar e corrigir bugs, erros de lógica e falhas de integração no sistema.

## 1. Correções de Lógica e Integração

### Autenticação e Middleware
- **Problema:** O `requireSupabaseAuth` pode falhar silenciosamente ou retornar 401 sem redirecionar corretamente em loaders do TanStack Start.
- **Solução:** Validar a propagação de erros de autenticação para que o roteador capture e redirecione para `/login`.

### Integração Omie
- **Problema:** Funções de busca (`searchClientesOmie`, `searchProdutosOmie`) podem falhar se os parâmetros de filtro não estiverem exatos ou se houver problemas de rede.
- **Solução:** Implementar retentativas (já existentes, mas reforçadas) e garantir que a tipagem de retorno seja consistente (sempre array).
- **Problema:** O `pushOSOmie` automático em `updateOSStatus` pode falhar sem notificar o usuário.
- **Solução:** Melhorar o log de erros e retornar feedback específico sobre o sucesso da integração ERP.

### Dashboard (OS)
- **Problema:** O cálculo de "Atrasadas" no `getOSStatsServer` está fixado em `0`.
- **Solução:** Implementar a lógica real baseada em `SLA` por fase (ex: `aberta` > 2h sem técnico).

## 2. Interface e UX (Frontend)

### Checklist Offline-first
- **Problema:** `ChecklistPage.tsx` pode apresentar erros de chave inválida no Dexie se `selectedOS` for nulo durante renderização inicial.
- **Solução:** Adicionar guards robustos nos hooks do Dexie.
- **Problema:** A sincronização automática pode tentar enviar dados incompletos.
- **Solução:** Adicionar validação de payload antes do `syncMutation`.

### Design System Industrial
- **Problema:** Algumas cores podem estar fora dos tokens Navy/Laranja/Cyan.
- **Solução:** Varredura em `src/styles.css` e componentes para garantir fidelidade à marca.

## 3. Banco de Dados e Segurança

### Row Level Security (RLS)
- **Problema:** Permissões de `public.app_secrets` podem estar excessivamente abertas ou fechadas demais para leitura de sistema.
- **Solução:** Garantir que apenas `authenticated` possa ler status e apenas `superadmin` possa salvar/ler valores reais.

## Próximos Passos (Sequência de Implementação):
1. **Auditoria de Erros de Console:** Executar Playwright para capturar erros em tempo real.
2. **Correção de Tipagem e Validação Zod:** Padronizar inputs de server functions.
3. **Refinamento de UX:** Melhorar feedbacks de loading e estados vazios.
4. **Validação Final:** Teste de fluxo fim-a-fim (Abertura OS -> Checklist -> Financeiro/Omie).

---
## Detalhes Técnicos

- **Middleware:** `requireSupabaseAuth` em `src/integrations/supabase/auth-middleware.ts`.
- **Server Functions:** `src/features/*/services/*.functions.ts`.
- **Database:** Tabelas `ordens_servico`, `clientes`, `veiculos`, `app_secrets`, `omie_sync_config`.
