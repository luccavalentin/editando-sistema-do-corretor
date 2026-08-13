# Plano de Implementação: Próximos Passos CRM & Estoque (Omie)

Este plano foca em tornar a busca de clientes e produtos proativa, consultando a Omie em tempo real e persistindo registros automaticamente no banco de dados local.

## 1. Persistência Automática de Clientes (Omie -> Local)
- Alterar `searchClienteLocal` em `src/features/os/services/os.functions.ts` para que, ao selecionar um cliente que veio da busca Omie (marcado como `is_omie_temp`), o sistema dispare uma função de persistência.
- Criar `upsertClienteFromOmie` em `os.functions.ts` para salvar os dados da Omie na tabela `clientes` do Supabase.

## 2. Refinamento da Busca de Produtos (Estoque)
- Atualizar a aba "Consulta Estoque" em `src/features/production/routes/ProductionPage.tsx` para usar o hook `useServerFn` chamando `searchProdutos` (já existente no backend).
- Implementar a mesma lógica de "Busca Proativa": se não encontrar localmente no cache, busca na Omie e exibe com o badge "OMIE".
- Permitir que a seleção de um produto da Omie alimente a abertura de OS ou requisições de peças.

## 3. UI/UX: Feedback de Sincronização
- Adicionar indicadores visuais (badges) em `src/routes/management.tsx` e `ProductionPage.tsx` para distinguir o que é dado local e o que é dado externo (Omie) em tempo real.
- Implementar o carregamento (Skeleton/Spinner) durante as chamadas proativas à API da Omie para evitar a sensação de travamento.

## Detalhes Técnicos
- **Server Functions:** `searchClienteLocal` (os.functions.ts) e `searchProdutos` (production.functions.ts).
- **Integração:** As funções de servidor agora farão o "merge" e retornarão o ID local após o upsert, garantindo que a Ordem de Serviço (OS) sempre aponte para uma chave estrangeira válida no banco.
- **Cache:** O `pecas_estoque_cache` será atualizado sob demanda durante a busca, não apenas na sync global.
