-- Políticas de RLS para Clientes e Veículos
CREATE POLICY "Users can view all customers" ON public.clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage customers" ON public.clientes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin_adm') OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Users can view all vehicles" ON public.veiculos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage vehicles" ON public.veiculos FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin_adm') OR public.has_role(auth.uid(), 'superadmin'));

-- Políticas de RLS para Ordens de Serviço e Itens
CREATE POLICY "Users can view all OS" ON public.ordens_servico FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage OS" ON public.ordens_servico FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin_adm') OR 
    public.has_role(auth.uid(), 'superadmin') OR 
    public.has_role(auth.uid(), 'mecanico') OR 
    public.has_role(auth.uid(), 'montador')
);

CREATE POLICY "Users can view all OS items" ON public.os_itens_servico FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage OS service items" ON public.os_itens_servico FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can view all OS parts" ON public.os_itens_peca FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage OS parts" ON public.os_itens_peca FOR ALL TO authenticated USING (true);

-- Revogar execução pública da função SECURITY DEFINER
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
