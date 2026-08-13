
CREATE TABLE IF NOT EXISTS public.omie_sync_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_interval_minutes integer DEFAULT 60,
    last_sync_clientes timestamp with time zone,
    last_sync_estoque timestamp with time zone,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

GRANT ALL ON public.omie_sync_config TO authenticated;
GRANT ALL ON public.omie_sync_config TO service_role;

INSERT INTO public.omie_sync_config (sync_interval_minutes, active)
SELECT 60, true
WHERE NOT EXISTS (SELECT 1 FROM public.omie_sync_config);
