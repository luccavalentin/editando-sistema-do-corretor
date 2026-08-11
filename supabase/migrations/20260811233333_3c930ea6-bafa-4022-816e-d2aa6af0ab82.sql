CREATE TABLE public.mcp_servers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    url text NOT NULL,
    type text NOT NULL CHECK (type IN ('internal', 'external')),
    status text NOT NULL DEFAULT 'active',
    capabilities text[] DEFAULT '{}',
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mcp_servers TO authenticated;
GRANT ALL ON public.mcp_servers TO service_role;

ALTER TABLE public.mcp_servers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all MCP servers" 
ON public.mcp_servers FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Admins can manage MCP servers" 
ON public.mcp_servers FOR ALL 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin_adm') OR public.has_role(auth.uid(), 'superadmin'));
