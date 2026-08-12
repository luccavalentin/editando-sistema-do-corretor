# Auditoria Técnica e Plano de Execução - Pátio Inteligente Tecnoar

## 1. Problemas Identificados

### 1.1 Segurança e Autenticação
- **Vazamento de Dados (RLS)**: Algumas tabelas podem ter políticas de RLS frouxas ou inexistentes. Embora as server functions usem `requireSupabaseAuth`, consultas diretas via cliente browser precisam de proteção.
- **Invite User Flow**: O fluxo de convite de usuário em `UsersPage.tsx` precisa de validação de permissão de superadmin no lado do servidor, não apenas no cliente.
- **Session Persistence**: Verificação de `auth.uid()` em RPCs críticos (`transicionar_status_os`) está correta, mas deve ser replicada em todas as mutações sensíveis.

### 1.2 Estabilidade e UX
- **Tratamento de Erros**: Uso inconsistente de `toast` e `reportLovableError`. Algumas falhas em server functions não são reportadas corretamente para a telemetria.
- **Loading States**: Dashboards e listas precisam de `Suspense` ou skeletons mais refinados para evitar layout shift.
- **Responsividade Industrial**: A densidade de dados atual pode quebrar em telas menores de tablets usados na oficina.
- **Contrast Check**: Verificação final de contraste em botões e labels secundários.

### 1.3 Lógica de Negócio
- **Race Conditions**: Transições de status de OS precisam garantir que o estado anterior é válido para a transição solicitada.
- **Offline Sync**: O listener de `online` no Checklist precisa de tratamento de conflitos caso a mesma OS seja editada em dois dispositivos.
- **Omie Integration**: Logs de sincronização precisam ser mais verbosos para depuração de erros de API externa.

---

## 2. Plano de Execução

### Fase 1: Core & Segurança (Backend/Supabase)
- [ ] Revisar políticas RLS de todas as tabelas.
- [ ] Adicionar validação de permissão em todas as server functions críticas.
- [ ] Fortalecer RPC `transicionar_status_os` com validação de fluxo lógico.

### Fase 2: Robustez do Frontend
- [ ] Padronizar tratamento de erros com `reportLovableError` em catch blocks.
- [ ] Implementar Skeletons para carregamento de listas (Gestão, Checklist, Produção).
- [ ] Corrigir problemas de contraste e legibilidade detectados na auditoria visual.

### Fase 3: UX e Edge Cases
- [ ] Adicionar confirmações em ações destrutivas ou críticas.
- [ ] Melhorar feedback visual de sincronização offline.
- [ ] Ajustar responsividade de tabelas densas para visualização mobile/tablet.

---

## 3. Melhorias Imediatas (Próximos Passos)
1. Corrigir o tratamento de erro e loading no `RequireRole`.
2. Implementar logs mais detalhados na sincronização Omie.
3. Ajustar o contraste de textos `muted-foreground` no Dark Mode.
