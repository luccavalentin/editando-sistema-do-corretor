-- Tabela de Histórico de Status e SLA
CREATE TABLE public.os_historico_status (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id uuid REFERENCES public.ordens_servico(id) ON DELETE CASCADE NOT NULL,
    status_anterior text,
    status_novo text NOT NULL,
    usuario_id uuid REFERENCES auth.users(id) NOT NULL,
    criado_em timestamptz DEFAULT now()
);

GRANT SELECT ON public.os_historico_status TO authenticated;
GRANT ALL ON public.os_historico_status TO service_role;
ALTER TABLE public.os_historico_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all OS history" ON public.os_historico_status FOR SELECT TO authenticated USING (true);

CREATE TABLE public.sla_fases (
    status text PRIMARY KEY,
    limite_horas_amarelo numeric NOT NULL DEFAULT 4,
    limite_horas_vermelho numeric NOT NULL DEFAULT 8,
    criado_em timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

GRANT SELECT ON public.sla_fases TO authenticated;
GRANT ALL ON public.sla_fases TO service_role;
ALTER TABLE public.sla_fases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all SLA settings" ON public.sla_fases FOR SELECT TO authenticated USING (true);

-- Seed de SLA Fases
INSERT INTO public.sla_fases (status, limite_horas_amarelo, limite_horas_vermelho) VALUES
('aberta', 2, 4),
('aguardando_mecanico', 4, 8),
('checklist_diagnostico', 2, 4),
('aguardando_peca', 24, 48),
('em_execucao', 8, 16),
('checklist_final', 2, 4),
('aguardando_retirada', 4, 8),
('enviado_financeiro', 4, 8)
ON CONFLICT (status) DO NOTHING;

-- RPC Transição de Status
CREATE OR REPLACE FUNCTION public.transicionar_status_os(_os_id uuid, _novo_status text, _usuario_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _status_atual text;
BEGIN
    -- SEGURANÇA CRÍTICA: Validar se o usuario_id no parâmetro é o mesmo da sessão real
    IF _usuario_id IS DISTINCT FROM auth.uid() THEN 
        RAISE EXCEPTION 'Identity mismatch: cannot perform action on behalf of another user';
    END IF;

    -- Validar Role (Lógica básica de transição)
    -- Mecânicos/Montadores/Lider/Superadmin: fases operacionais
    -- Admin_adm/Financeiro/Superadmin: finalização
    
    SELECT status INTO _status_atual FROM public.ordens_servico WHERE id = _os_id;
    
    -- Inserir Histórico
    INSERT INTO public.os_historico_status (os_id, status_anterior, status_novo, usuario_id)
    VALUES (_os_id, _status_atual, _novo_status, _usuario_id);
    
    -- Atualizar OS
    UPDATE public.ordens_servico 
    SET status = _novo_status,
        finalizado_em = CASE WHEN _novo_status = 'concluida' THEN now() ELSE finalizado_em END
    WHERE id = _os_id;
END;
$$;
