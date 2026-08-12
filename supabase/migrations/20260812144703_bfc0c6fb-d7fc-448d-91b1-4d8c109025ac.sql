CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles public.app_role[])
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
      and role = ANY(_roles)
  )
$$;

DROP POLICY IF EXISTS "Users can read their own role" ON public.user_roles;

CREATE POLICY "Users can read their own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR 
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) IN ('superadmin', 'admin_adm', 'lider')
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
