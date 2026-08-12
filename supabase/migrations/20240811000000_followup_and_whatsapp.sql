-- Checklist Templates e Checklists (adicionando tipos se necessário)
-- A tabela checklist_templates já deve existir, vamos garantir que ela suporte o tipo operacional_lider

-- Tabela de Configurações do Sistema
CREATE TABLE IF NOT EXISTS public.app_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text UNIQUE NOT NULL,
    value jsonb NOT NULL,
    updated_at timestamptz DEFAULT now(),
    updated_by uuid REFERENCES auth.users(id)
);

GRANT SELECT, INSERT, UPDATE ON public.app_config TO authenticated;
GRANT ALL ON public.app_config TO service_role;

-- Follow-up Manual
CREATE TABLE IF NOT EXISTS public.clientes_follow_up (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id uuid REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
    vendedor_id uuid REFERENCES auth.users(id),
    status text NOT NULL DEFAULT 'pendente', -- pendente, em_contato, agendado, concluido
    observacoes text,
    proximo_contato timestamptz,
    criado_em timestamptz DEFAULT now(),
    atualizado_em timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes_follow_up TO authenticated;
GRANT ALL ON public.clientes_follow_up TO service_role;

-- IA Follow-up Mensagens
CREATE TYPE public.followup_message_status AS ENUM ('rascunho', 'aprovada', 'rejeitada', 'enviada', 'respondida');

CREATE TABLE IF NOT EXISTS public.ia_followup_mensagens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id uuid REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
    sugestao_texto text NOT NULL,
    status public.followup_message_status DEFAULT 'rascunho',
    aprovado_por uuid REFERENCES auth.users(id),
    canal text DEFAULT 'whatsapp',
    criado_em timestamptz DEFAULT now(),
    enviado_em timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ia_followup_mensagens TO authenticated;
GRANT ALL ON public.ia_followup_mensagens TO service_role;

-- WhatsApp Estrutura
CREATE TABLE IF NOT EXISTS public.whatsapp_conversas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id uuid REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
    telefone text NOT NULL,
    status text NOT NULL DEFAULT 'ativa', -- ativa, encerrada, escalada_humano
    agente_atual text NOT NULL DEFAULT 'ia', -- ia, humano
    criado_em timestamptz DEFAULT now(),
    atualizado_em timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_conversas TO authenticated;
GRANT ALL ON public.whatsapp_conversas TO service_role;

CREATE TABLE IF NOT EXISTS public.whatsapp_mensagens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversa_id uuid REFERENCES public.whatsapp_conversas(id) ON DELETE CASCADE NOT NULL,
    autor text NOT NULL, -- ia, humano, cliente
    conteudo text NOT NULL,
    criado_em timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_mensagens TO authenticated;
GRANT ALL ON public.whatsapp_mensagens TO service_role;

-- Processos Administrativos e Operacionais
CREATE TYPE public.setor_empresa AS ENUM ('administrativo', 'financeiro', 'vendas', 'oficina', 'estoque', 'geral');

CREATE TABLE IF NOT EXISTS public.processos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    setor public.setor_empresa NOT NULL,
    titulo text NOT NULL,
    descricao text,
    passos jsonb NOT NULL, -- array of {ordem, instrucao, responsavel_role, anexo_url}
    ativo boolean DEFAULT true,
    criado_por uuid REFERENCES auth.users(id),
    atualizado_em timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.processos TO authenticated;
GRANT ALL ON public.processos TO service_role;

-- RLS
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes_follow_up ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ia_followup_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage config" ON public.app_config TO authenticated USING (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'lider'));
CREATE POLICY "Everyone can read config" ON public.app_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "Vendedores can manage follow-up" ON public.clientes_follow_up TO authenticated USING (public.has_role(auth.uid(), 'vendedor') OR public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Admins can manage follow-up" ON public.ia_followup_mensagens TO authenticated USING (public.has_role(auth.uid(), 'vendedor') OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "WhatsApp access" ON public.whatsapp_conversas TO authenticated USING (true);
CREATE POLICY "WhatsApp messages access" ON public.whatsapp_mensagens TO authenticated USING (true);

CREATE POLICY "Superadmin manage processos" ON public.processos TO authenticated USING (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'lider'));
CREATE POLICY "Everyone read processos" ON public.processos FOR SELECT TO authenticated USING (true);

