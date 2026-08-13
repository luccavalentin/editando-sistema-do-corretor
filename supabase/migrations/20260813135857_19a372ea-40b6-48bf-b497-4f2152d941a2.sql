-- Criação da tabela de segredos
CREATE TABLE public.app_secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_secrets TO authenticated;
GRANT ALL ON public.app_secrets TO service_role;

-- Habilitar RLS
ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;

-- Apenas superadmin pode gerenciar segredos
CREATE POLICY "Superadmins can manage secrets" 
ON public.app_secrets 
FOR ALL 
TO authenticated 
USING (public.has_role(auth.uid(), 'superadmin'));

-- Função para ler segredo via servidor (SECURITY DEFINER para ignorar RLS e ser usada apenas em Server Functions)
CREATE OR REPLACE FUNCTION public.get_app_secret(_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _value TEXT;
BEGIN
    SELECT value INTO _value FROM public.app_secrets WHERE key = _key;
    RETURN _value;
END;
$$;
