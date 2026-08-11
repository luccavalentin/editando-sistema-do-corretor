CREATE TABLE public.pecas_estoque_cache (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    omie_codigo_produto bigint UNIQUE NOT NULL,
    descricao text NOT NULL,
    saldo numeric DEFAULT 0,
    atualizado_em timestamptz DEFAULT now()
);

CREATE TABLE public.omie_sync_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entidade text NOT NULL,
    status text NOT NULL,
    mensagem text,
    payload jsonb,
    criado_em timestamptz DEFAULT now()
);

CREATE TYPE public.follow_up_status AS ENUM ('pendente', 'contatado', 'agendado', 'recusado');

CREATE TABLE public.clientes_follow_up (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id uuid REFERENCES public.clientes(id) ON DELETE CASCADE,
    ultima_os_em timestamptz,
    dias_inativo integer,
    status_follow_up public.follow_up_status DEFAULT 'pendente',
    criado_em timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pecas_estoque_cache TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.omie_sync_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes_follow_up TO authenticated;
GRANT ALL ON public.pecas_estoque_cache TO service_role;
GRANT ALL ON public.omie_sync_log TO service_role;
GRANT ALL ON public.clientes_follow_up TO service_role;

ALTER TABLE public.pecas_estoque_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.omie_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes_follow_up ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view Omie cache" ON public.pecas_estoque_cache FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can view Omie logs" ON public.omie_sync_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can view follow ups" ON public.clientes_follow_up FOR SELECT TO authenticated USING (true);
