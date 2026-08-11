-- Revogar execução pública da nova RPC
REVOKE EXECUTE ON FUNCTION public.transicionar_status_os(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transicionar_status_os(uuid, text, uuid) TO authenticated, service_role;

-- Política para SLA Fases
CREATE POLICY "Admins can manage SLA settings" ON public.sla_fases FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin_adm') OR public.has_role(auth.uid(), 'superadmin'));
