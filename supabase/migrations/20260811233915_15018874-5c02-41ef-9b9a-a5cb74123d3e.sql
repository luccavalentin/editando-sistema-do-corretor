
-- Ranking Config Table
CREATE TABLE public.ranking_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_evento TEXT UNIQUE NOT NULL,
    pontos INTEGER NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ranking_config TO authenticated;
GRANT ALL ON public.ranking_config TO service_role;

ALTER TABLE public.ranking_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins and Lider can manage ranking_config"
ON public.ranking_config
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'lider'));

CREATE POLICY "Everyone authenticated can select ranking_config"
ON public.ranking_config
FOR SELECT
TO authenticated
USING (true);

-- Ranking Eventos Table
CREATE TABLE public.ranking_eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES auth.users(id),
    tipo_evento TEXT NOT NULL REFERENCES public.ranking_config(tipo_evento),
    pontos_aplicados INTEGER NOT NULL,
    os_id UUID REFERENCES public.ordens_servico(id),
    criado_por UUID DEFAULT auth.uid(),
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

GRANT SELECT, INSERT ON public.ranking_eventos TO authenticated;
GRANT ALL ON public.ranking_eventos TO service_role;

ALTER TABLE public.ranking_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all ranking events"
ON public.ranking_eventos
FOR SELECT
TO authenticated
USING (true);

-- Seed Ranking Config
INSERT INTO public.ranking_config (tipo_evento, pontos) VALUES
('checklist_sem_retrabalho', 50),
('retorno_servico', -100),
('os_concluida_no_prazo', 30)
ON CONFLICT (tipo_evento) DO UPDATE SET pontos = EXCLUDED.pontos;

-- Function to apply ranking points (Security Definer)
CREATE OR REPLACE FUNCTION public.apply_ranking_points(_usuario_id UUID, _tipo_evento TEXT, _os_id UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _pontos INTEGER;
BEGIN
    SELECT pontos INTO _pontos FROM ranking_config WHERE tipo_evento = _tipo_evento;
    
    IF _pontos IS NOT NULL THEN
        INSERT INTO ranking_eventos (usuario_id, tipo_evento, pontos_aplicados, os_id)
        VALUES (_usuario_id, _tipo_evento, _pontos, _os_id);
    END IF;
END;
$$;

-- Update transition RPC with logic
CREATE OR REPLACE FUNCTION public.transicionar_status_os(_os_id UUID, _novo_status TEXT, _usuario_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _status_anterior TEXT;
    _tecnico_id UUID;
    _limite_amarelo INTEGER;
    _criado_em TIMESTAMPTZ;
    _horas_decorridas INTEGER;
BEGIN
    -- 1. Validação de segurança obrigatória
    IF _usuario_id IS DISTINCT FROM auth.uid() THEN 
        RAISE EXCEPTION 'Usuário não autorizado para esta transição'; 
    END IF;

    -- 2. Buscar dados atuais
    SELECT status, tecnico_id, criado_em INTO _status_anterior, _tecnico_id, _criado_em
    FROM public.ordens_servico 
    WHERE id = _os_id;

    -- 3. Lógica de Retorno de Serviço (Retrabalho)
    IF (_novo_status = 'aguardando_peca' AND _status_anterior IN ('em_execucao', 'checklist_final')) OR
       (_status_anterior = 'concluida' AND _novo_status != 'concluida') THEN
        PERFORM public.apply_ranking_points(_tecnico_id, 'retorno_servico', _os_id);
    END IF;

    -- 4. Lógica de Conclusão no Prazo
    IF _novo_status = 'concluida' THEN
        SELECT limite_horas_amarelo INTO _limite_amarelo FROM public.sla_fases WHERE status = 'concluida';
        _horas_decorridas := EXTRACT(EPOCH FROM (NOW() - _criado_em)) / 3600;
        
        IF _limite_amarelo IS NOT NULL AND _horas_decorridas <= _limite_amarelo THEN
            PERFORM public.apply_ranking_points(_tecnico_id, 'os_concluida_no_prazo', _os_id);
        END IF;
        
        UPDATE public.ordens_servico SET finalizado_em = NOW() WHERE id = _os_id;
    END IF;

    -- 5. Registrar Histórico
    INSERT INTO public.os_historico_status (os_id, status_anterior, status_novo, usuario_id)
    VALUES (_os_id, _status_anterior, _novo_status, _usuario_id);

    -- 6. Atualizar OS
    UPDATE public.ordens_servico 
    SET status = _novo_status, 
        atualizado_em = NOW()
    WHERE id = _os_id;
END;
$$;
