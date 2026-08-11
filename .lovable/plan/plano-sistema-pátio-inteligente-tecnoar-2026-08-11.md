# Plano - Sistema Pátio Inteligente Tecnoar

Sistema web para gestão interna da Tecnoar Freios (Iracemápolis-SP), focado em eficiência operacional e controle de pátio.

## Design System & Identidade
- **Cores Semânticas:** Navy (`#001830`), Laranja (`#f06000`), Cyan (`#00a8f0`).
- **Tipografia:** Space Grotesk (títulos) + Inter (corpo).
- **Estética:** Glassmorphism sutil, bordas arredondadas (`1rem`), modo claro/escuro.
- **Logo:** Uso estrito do emblema oficial (brasão navy com detalhes laranja/cyan).

## Estrutura Técnica (TanStack Start v1)
- **Frontend:** React 19, Tailwind CSS v4, shadcn/ui, Framer Motion, Recharts.
- **Backend/Infra:** Lovable Cloud (Supabase), TanStack Query para estado assíncrono.
- **Arquitetura de Pastas:**
  - `src/core/`: Segurança, logs e eventos.
  - `src/features/`: Módulos de domínio (checklist, produção, ranking, IA, Omie).
  - `src/shared/`: UI atômica e utilitários.
  - `src/routes/`: Roteamento baseado em arquivos.
- **Segurança (RBAC):** Sistema de permissões via `user_roles` e função `has_role` (Security Definer) para evitar recursão em RLS.

## Funcionalidades Principais (Navegação)
- **Principal:** Dashboard (Kanban de OS), Gestão, Checklist, Tarefas (Kanban Admin), Ranking.
- **Gestão:** Produção, Relatórios, Biblioteca de IA, Configurações.
- **Auth:** Login com emblema completo e persistência de sessão.

## Metodologia de Dados
- **Zero Mock:** Componentes integrados ao Supabase desde o início.
- **Empty States:** Tratamento real para tabelas vazias em vez de dados estáticos.
- **Server-side:** Integrações (Omie, IA, WhatsApp) isoladas via Server Functions.

## Próximos Passos
1. Configuração do Design System em `src/styles.css`.
2. Implementação do Schema de Banco de Dados (RBAC e tabelas base).
3. Estruturação da Layout Root com Sidebar e Header.
4. Criação das rotas e telas placeholder com integração Supabase.