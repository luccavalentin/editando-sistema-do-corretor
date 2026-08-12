---
name: Auditoria Técnica Geral
description: Plano de correção e auditoria completa do sistema Tecnoar
type: preference
---
# Plano de Auditoria e Correção

## Problemas Identificados
1. **Segurança/Auth**: `management.functions.ts` usa o cliente do browser (`import { supabase } from "./supabase/client"`) em server functions, o que ignora o RLS configurado ou falha em fluxos autenticados. Algumas funções não usam o middleware `requireSupabaseAuth`.
2. **Offline-First**: `ChecklistPage.tsx` salva no IndexedDB mas a sincronização é manual/limitada ao finalizar. Não há um worker de background para sincronizar itens individuais assim que a rede volta sem intervenção do usuário.
3. **IA/Provider**: `ia-provider.ts` possui implementações de mock (console.log) em vez de chamadas reais via fetch para as APIs da Meta/Google/Anthropic.
4. **UX/Controle**: O botão "Convidar Usuário" em `UsersPage.tsx` não abre o formulário de convite.
5. **Erros**: Tratamento de erro em `ia-chat.server.ts` e `omie.functions.ts` pode ser mais robusto com retries reais.

## Próximos Passos
1. Corrigir `management.functions.ts` para usar `requireSupabaseAuth` e o cliente injetado.
2. Implementar chamadas reais no `ia-provider.ts` usando chaves de ambiente.
3. Completar o formulário de convite de usuários.
4. Ajustar legibilidade final em componentes críticos.
