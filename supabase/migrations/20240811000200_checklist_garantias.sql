-- Enum para tipos de checklist
DO $$ BEGIN
    CREATE TYPE public.checklist_type AS ENUM (
        'diagnostico_defeitos', 
        'conferencia_final', 
        'estado_caminhao', 
        'operacional_lider', 
        'processo_setor'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tabela de templates de checklist
CREATE TABLE IF NOT EXISTS public.checklist_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo public.checklist_type NOT NULL,
    secao text NOT NULL,
    ordem integer NOT NULL,
    itens jsonb NOT NULL, -- Array de {id, label}
    criado_em timestamptz DEFAULT now()
);

GRANT SELECT ON public.checklist_templates TO authenticated;
GRANT ALL ON public.checklist_templates TO service_role;

-- Tabela de checklists realizados
CREATE TABLE IF NOT EXISTS public.checklists (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id uuid REFERENCES public.ordens_servico(id) ON DELETE CASCADE NOT NULL,
    tipo public.checklist_type NOT NULL,
    respostas jsonb NOT NULL DEFAULT '[]', -- Array de {item_id, status, observacao, evidencias}
    assinatura_url text,
    criado_por uuid REFERENCES auth.users(id),
    criado_em timestamptz DEFAULT now(),
    finalizado_em timestamptz,
    UNIQUE(os_id, tipo)
);

GRANT SELECT, INSERT, UPDATE ON public.checklists TO authenticated;
GRANT ALL ON public.checklists TO service_role;
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see checklists for their OS" ON public.checklists
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert/update checklists" ON public.checklists
    FOR ALL TO authenticated USING (true);

-- Tabela de garantias
CREATE TABLE IF NOT EXISTS public.checklist_garantias (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_id uuid REFERENCES public.checklists(id) ON DELETE CASCADE NOT NULL,
    item_descricao text NOT NULL,
    tipo text CHECK (tipo IN ('peca', 'servico')),
    meses_garantia integer DEFAULT 3,
    vencimento_em timestamptz NOT NULL,
    criado_em timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.checklist_garantias TO authenticated;
GRANT ALL ON public.checklist_garantias TO service_role;
ALTER TABLE public.checklist_garantias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read/write garantias" ON public.checklist_garantias
    FOR ALL TO authenticated USING (true);

-- Tabela de termos de responsabilidade
CREATE TABLE IF NOT EXISTS public.termos_responsabilidade (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id uuid REFERENCES public.ordens_servico(id) ON DELETE CASCADE NOT NULL,
    dano_identificado text NOT NULL,
    fotos text[], -- Array de URLs
    cliente_recusou_servico boolean DEFAULT false,
    assinatura_cliente_url text NOT NULL,
    criado_por uuid REFERENCES auth.users(id),
    criado_em timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.termos_responsabilidade TO authenticated;
GRANT ALL ON public.termos_responsabilidade TO service_role;
ALTER TABLE public.termos_responsabilidade ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read/write termos" ON public.termos_responsabilidade
    FOR ALL TO authenticated USING (true);

-- Inserir Template de Diagnóstico Real
INSERT INTO public.checklist_templates (tipo, secao, ordem, itens) VALUES 
('diagnostico_defeitos', 'Verificações preliminares', 1, '[
    {"id": "prelim_ar", "label": "Verificar se o ar está carregado"},
    {"id": "prelim_eixo", "label": "Abaixar o eixo"}
]'),
('diagnostico_defeitos', 'Seção CAVALO', 2, '[
    {"id": "c1", "label": "Verificar válvula APU e filtro APU"},
    {"id": "c2", "label": "Válvula circuito protetora (4 vias ou 6 vias)"},
    {"id": "c3", "label": "Válvula distribuidora"},
    {"id": "c4", "label": "Válvula relé"},
    {"id": "c5", "label": "Válvula freio de mão e reboque"},
    {"id": "c6", "label": "Válvula pedal"},
    {"id": "c7", "label": "Servo de embreagem (ar e óleo)"},
    {"id": "c8", "label": "Válvula de transferência ou reduzida do câmbio"},
    {"id": "c9", "label": "Válvula do freio motor"},
    {"id": "c10", "label": "Mangueiras e conexões gerais (com água e sabão)"}
]'),
('diagnostico_defeitos', 'Conferência Operacional', 3, '[
    {"id": "conf_calcar", "label": "Calçar o veículo e soltar o freio de mão"},
    {"id": "conf_pisar", "label": "Pisar no freio e verificar todas cuícas se estão acionando ou se há vazamentos"}
]'),
('diagnostico_defeitos', 'Seção CARRETA', 4, '[
    {"id": "car1", "label": "Verificar válvulas push pull"},
    {"id": "car2", "label": "Pisar no freio e verificar todas as cuícas"},
    {"id": "car3", "label": "Sistema do botton"},
    {"id": "car4", "label": "Mangueiras, flexíveis e conexões (com água e sabão)"}
]'),
('diagnostico_defeitos', 'Seção ERGUER O EIXO', 5, '[
    {"id": "eixo1", "label": "Verificar bolsas dos suspensores"},
    {"id": "eixo2", "label": "Verificar se há possíveis retornos de cuícas"}
]');
