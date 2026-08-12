# Plano de Implementação: Checklist Diário (5S - FOR-OFI-001)

Este plano descreve a implementação do novo tipo de checklist diário vinculado a setores, com marcação dual (Abertura/Fechamento) e suporte offline.

## Alterações de Banco de Dados (Supabase)

- **Tabela `checklists`**:
  - Tornar `os_id` opcional (NULLABLE).
  - Adicionar `setor` (text, nullable).
  - Adicionar `data` (date, nullable, default current_date).
- **Enum `checklist_type`**:
  - Adicionar o valor `'checklist_diario'`.
- **Tabela `checklist_templates`**:
  - Inserir o template oficial FOR-OFI-001 (5S) com a estrutura solicitada.

## Funcionalidades e UI

- **Módulo Checklist (`/checklist`)**:
  - Adicionar opção "Checklist Diário" na tela inicial.
  - Implementar fluxo de seleção de Setor.
  - Se já existir um checklist para o setor/data atual, carregar o registro existente; caso contrário, criar um novo.
- **Componente de Marcação Dual**:
  - Criar um novo componente de item de checklist (`ChecklistDiarioItem`) com botões "A" (Abertura) e "F" (Fechamento).
  - Estado visual distinto para cada marcação.
- **Conferência Final do Líder**:
  - Seção dedicada com itens específicos para abertura e fechamento.
- **Camada de Dados**:
  - Adaptar `saveChecklist` e `db.ts` (IndexedDB) para suportar o formato de resposta dual: `{item_id, ok_abertura, ok_fechamento, observacao}`.
  - Garantir persistência offline para marcações parciais ao longo do dia.

## Detalhes Técnicos

- O campo `respostas` no banco armazenará um JSONB contendo tanto os itens do 5S quanto os itens da conferência do líder.
- O rodapé exibirá informações fixas: "Código: FOR-OFI-001 | Revisão: 00".
- Assinatura do líder via Canvas.

