
-- Ativar pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Configuração de IA
CREATE TABLE public.ia_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_ativo text NOT NULL DEFAULT 'gemini' CHECK (provider_ativo IN ('gemini', 'openai', 'claude')),
    atualizado_em timestamptz DEFAULT now()
);

-- Grant e RLS para ia_config
GRANT SELECT ON public.ia_config TO authenticated;
GRANT ALL ON public.ia_config TO service_role;
ALTER TABLE public.ia_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can manage ia_config" ON public.ia_config
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'lider'));

CREATE POLICY "Everyone can read ia_config" ON public.ia_config
    FOR SELECT TO authenticated
    USING (true);

-- Base de Conhecimento
CREATE TABLE public.ia_base_conhecimento (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo text NOT NULL,
    conteudo text NOT NULL,
    tags text[] DEFAULT '{}',
    marca text CHECK (marca IN ('wabco', 'knorr_bremse', 'haldex', 'jaltest', 'star_mb', 'sdp3_scania', 'volvo_vcon2', 'geral')),
    categoria text CHECK (categoria IN ('abs_ebs', 'circuito_pneumatico', 'diagnostico_eletronico', 'valvulas', 'geral')),
    embedding vector(768), 
    origem text NOT NULL CHECK (origem IN ('manual', 'faq_gerado', 'humano')),
    documento_origem text,
    ordem_fragmento integer,
    criado_em timestamptz DEFAULT now()
);

-- Grant e RLS para ia_base_conhecimento
GRANT SELECT ON public.ia_base_conhecimento TO authenticated;
GRANT ALL ON public.ia_base_conhecimento TO service_role;
ALTER TABLE public.ia_base_conhecimento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Technicians can read knowledge base" ON public.ia_base_conhecimento
    FOR SELECT TO authenticated
    USING (true);

-- Conversas e Mensagens
CREATE TABLE public.ia_conversas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo text,
    usuario_id uuid REFERENCES auth.users(id) NOT NULL,
    criado_em timestamptz DEFAULT now()
);

CREATE TABLE public.ia_mensagens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversa_id uuid REFERENCES public.ia_conversas(id) ON DELETE CASCADE NOT NULL,
    autor text NOT NULL CHECK (autor IN ('usuario', 'ia')),
    conteudo text NOT NULL,
    anexos jsonb DEFAULT '[]',
    confianca_resposta float,
    escalado_para_humano boolean DEFAULT false,
    provider_usado text,
    criado_em timestamptz DEFAULT now()
);

-- Grant e RLS para conversas/mensagens
GRANT ALL ON public.ia_conversas TO authenticated;
GRANT ALL ON public.ia_mensagens TO authenticated;
GRANT ALL ON public.ia_conversas TO service_role;
GRANT ALL ON public.ia_mensagens TO service_role;

ALTER TABLE public.ia_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ia_mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own conversations" ON public.ia_conversas
    FOR ALL TO authenticated
    USING (auth.uid() = usuario_id);

CREATE POLICY "Users can manage messages in their conversations" ON public.ia_mensagens
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.ia_conversas
        WHERE id = ia_mensagens.conversa_id AND usuario_id = auth.uid()
    ));

-- FAQs
CREATE TABLE public.ia_faqs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pergunta text NOT NULL,
    resposta text NOT NULL,
    aprovado_por_humano uuid REFERENCES auth.users(id),
    criado_em timestamptz DEFAULT now()
);

-- Grant e RLS para ia_faqs
GRANT SELECT ON public.ia_faqs TO authenticated;
GRANT ALL ON public.ia_faqs TO service_role;
ALTER TABLE public.ia_faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read FAQs" ON public.ia_faqs
    FOR SELECT TO authenticated
    USING (true);

-- Seed ia_config
INSERT INTO public.ia_config (provider_ativo) VALUES ('gemini');
