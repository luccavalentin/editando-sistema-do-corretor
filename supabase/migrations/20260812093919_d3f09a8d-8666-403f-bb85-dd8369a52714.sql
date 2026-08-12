-- Function to check multiple roles using security definer to avoid recursion
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles public.app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
  );
$$;

-- Drop existing policies if any (safely)
DROP POLICY IF EXISTS "Users can read their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;

-- Policy: User can read their own role OR admins/lider can read everything
CREATE POLICY "Users can read their own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid() 
    OR public.has_any_role(auth.uid(), ARRAY['superadmin', 'admin_adm', 'lider']::public.app_role[])
);
