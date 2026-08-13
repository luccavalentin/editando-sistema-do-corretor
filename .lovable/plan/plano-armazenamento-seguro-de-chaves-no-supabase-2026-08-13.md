# Plano: Armazenamento Seguro de Chaves no Supabase

O usuário deseja que as chaves de API (Omie, IA, etc.) sejam inseridas diretamente no sistema e armazenadas no banco de dados Supabase, em vez de depender exclusivamente das variáveis de ambiente da Lovable. As server functions devem então ler essas chaves do banco de dados quando necessário.

## Alterações de Infraestrutura (Supabase)

1.  **Criação da tabela `app_secrets`**:
    *   `id`: UUID (Primary Key)
    *   `key`: TEXT (Unique) - Ex: 'OMIE_APP_KEY'
    *   `value`: TEXT - Valor criptografado ou em texto simples (será protegido por RLS)
    *   `updated_at`: TIMESTAMP
2.  **Segurança RLS**:
    *   Habilitar RLS na tabela `app_secrets`.
    *   Apenas `superadmin` pode inserir/atualizar (ou via `service_role`).
    *   A leitura será feita apenas por funções server-side (`SECURITY DEFINER`) para evitar exposição no client.

## Implementação Técnica

### 1. Camada de Dados (Server-side)
*   Criar `src/features/settings/services/secrets.server.ts` (ou atualizar) para incluir lógica de leitura do Supabase.
*   Implementar `getSecretValue(key: string)` que busca primeiro em `process.env` (como fallback ou override) e depois na tabela `app_secrets`.

### 2. Funções de Servidor (Server Functions)
*   Atualizar `src/features/settings/services/secrets.functions.ts`:
    *   `saveSecret`: Alterar para persistir na tabela `app_secrets` usando `supabaseAdmin`.
    *   `getSecretsStatus`: Verificar presença tanto no `env` quanto no banco de dados.

### 3. Integração Omie e IA
*   Atualizar `src/features/omie/services/omie.functions.ts` e serviços de IA para usar a nova lógica de busca de chaves que consulta o banco de dados.

### 4. Interface (UI)
*   Manter a aba "SEGREDOS & CHAVES" em `/settings`, mas atualizar o feedback para confirmar que os dados foram salvos no banco de dados.

## Detalhes de Segurança
*   As chaves nunca serão enviadas para o client.
*   O formulário de inserção limpa o campo após o envio.
*   A leitura no banco de dados será feita via `supabaseAdmin` dentro do handler da `createServerFn`, garantindo que o client não tenha acesso direto aos tokens.
