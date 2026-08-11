-- Schema para Gestão de Clientes, Veículos e OS
CREATE TABLE public.clientes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    omie_codigo_cliente text UNIQUE,
    nome text NOT NULL,
    documento text, -- CNPJ/CPF
    inscricao_estadual text,
    inscricao_municipal text,
    telefone text,
    email text,
    endereco_rua text,
    endereco_bairro text,
    endereco_cidade text,
    endereco_uf text,
    endereco_cep text,
    contato_nome text,
    ativo boolean DEFAULT true,
    ultima_interacao_em timestamptz DEFAULT now(),
    criado_em timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.veiculos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id uuid REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
    placa_cavalo text NOT NULL,
    placa_carreta text,
    modelo_cavalo text,
    modelo_carreta text,
    km_atual numeric,
    criado_em timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.veiculos TO authenticated;
GRANT ALL ON public.veiculos TO service_role;
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.ordens_servico (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    numero serial UNIQUE,
    protocolo text UNIQUE NOT NULL, -- TNR-AAAA-NNNNNN
    cliente_id uuid REFERENCES public.clientes(id) NOT NULL,
    veiculo_id uuid REFERENCES public.veiculos(id) NOT NULL,
    status text DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_andamento', 'aguardando_pecas', 'finalizada', 'cancelada')),
    box text,
    motorista_cliente text,
    km_entrada numeric,
    fotos_entrada text[],
    foto_os_original_url text,
    tecnico_id uuid REFERENCES auth.users(id),
    responsavel_abertura_id uuid REFERENCES auth.users(id) NOT NULL,
    valor_pecas numeric DEFAULT 0,
    valor_servico numeric DEFAULT 0,
    observacoes_gerais text,
    omie_codigo_os text,
    criado_em timestamptz DEFAULT now(),
    finalizado_em timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ordens_servico TO authenticated;
GRANT ALL ON public.ordens_servico TO service_role;
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.os_itens_servico (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id uuid REFERENCES public.ordens_servico(id) ON DELETE CASCADE NOT NULL,
    descricao text NOT NULL,
    quantidade numeric NOT NULL DEFAULT 1,
    valor_unitario numeric NOT NULL DEFAULT 0,
    valor_total numeric GENERATED ALWAYS AS (quantidade * valor_unitario) STORED
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.os_itens_servico TO authenticated;
GRANT ALL ON public.os_itens_servico TO service_role;
ALTER TABLE public.os_itens_servico ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.os_itens_peca (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id uuid REFERENCES public.ordens_servico(id) ON DELETE CASCADE NOT NULL,
    omie_codigo_produto text,
    descricao text NOT NULL,
    unidade text DEFAULT 'un',
    quantidade numeric NOT NULL DEFAULT 1,
    valor_unitario numeric NOT NULL DEFAULT 0,
    valor_total numeric GENERATED ALWAYS AS (quantidade * valor_unitario) STORED
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.os_itens_peca TO authenticated;
GRANT ALL ON public.os_itens_peca TO service_role;
ALTER TABLE public.os_itens_peca ENABLE ROW LEVEL SECURITY;
