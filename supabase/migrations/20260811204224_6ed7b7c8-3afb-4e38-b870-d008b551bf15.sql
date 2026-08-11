-- RBAC Schema & Tecnoar Base
CREATE TYPE public.app_role AS ENUM ('superadmin', 'admin_adm', 'mecanico', 'montador', 'vendedor', 'financeiro', 'lider');

CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security Definer Function to avoid recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    from public.user_roles
    where user_id = _user_id
      AND role = _role
  )
$$;

-- Logs e Auditoria Base
CREATE TABLE public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id),
    action text NOT NULL,
    table_name text,
    record_id uuid,
    payload jsonb,
    created_at timestamptz DEFAULT now()
);

GRANT INSERT, SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and Lider can see all logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin_adm') OR public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'lider'));

CREATE POLICY "Users can see their own logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
