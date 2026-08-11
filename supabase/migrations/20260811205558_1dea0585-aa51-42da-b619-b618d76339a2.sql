CREATE TYPE peca_teste_status AS ENUM (
  'recebida', 'em_teste', 'testada_aprovada', 'testada_reprovada', 
  'aguardando_retirada', 'entregue', 'perdida'
);

CREATE TYPE agenda_status AS ENUM ('pendente', 'em_andamento', 'concluido');

CREATE TYPE agenda_especialidade AS ENUM (
  'eletrica', 'socorro', 'troca_cuicas_aparelho_diag', 
  'teste_valvulas', 'troca_valvulas', 'vazamentos_ar'
);

CREATE TABLE public.pecas_teste (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id uuid REFERENCES public.ordens_servico(id),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id),
  descricao_peca text NOT NULL,
  data_entrada timestamptz DEFAULT now(),
  prazo_horas integer DEFAULT 48,
  vencimento_em timestamptz,
  status peca_teste_status DEFAULT 'recebida',
  vendedor_id uuid NOT NULL REFERENCES auth.users(id),
  mecanico_id uuid REFERENCES auth.users(id),
  etiqueta_codigo text,
  etiqueta_removida_em timestamptz,
  criado_em timestamptz DEFAULT now()
);

CREATE TABLE public.notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id_destino uuid NOT NULL REFERENCES auth.users(id),
  tipo text NOT NULL,
  referencia_tabela text,
  referencia_id uuid,
  mensagem text NOT NULL,
  lida boolean DEFAULT false,
  criado_em timestamptz DEFAULT now()
);

CREATE TABLE public.agenda_servicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id uuid NOT NULL REFERENCES public.ordens_servico(id),
  especialidade agenda_especialidade NOT NULL,
  data_prevista timestamptz NOT NULL,
  mecanico_id uuid REFERENCES auth.users(id),
  status agenda_status DEFAULT 'pendente',
  criado_em timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pecas_teste TO authenticated;
GRANT ALL ON public.pecas_teste TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notificacoes TO authenticated;
GRANT ALL ON public.notificacoes TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agenda_servicos TO authenticated;
GRANT ALL ON public.agenda_servicos TO service_role;

ALTER TABLE public.pecas_teste ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_servicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pecas_teste" ON public.pecas_teste FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage pecas_teste" ON public.pecas_teste FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin_adm') OR public.has_role(auth.uid(), 'vendedor') OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Users can view their own notifications" ON public.notificacoes FOR SELECT TO authenticated USING (usuario_id_destino = auth.uid());
CREATE POLICY "System/Admins can create notifications" ON public.notificacoes FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can view agenda" ON public.agenda_servicos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins/Lider can manage agenda" ON public.agenda_servicos FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin_adm') OR public.has_role(auth.uid(), 'lider') OR public.has_role(auth.uid(), 'superadmin'));
