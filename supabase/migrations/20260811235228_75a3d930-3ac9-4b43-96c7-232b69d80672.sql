-- Tabela de histórico de alteração de papéis
CREATE TABLE IF NOT EXISTS public.user_roles_historico (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_anterior public.app_role,
    role_novo public.app_role NOT NULL,
    alterado_por uuid NOT NULL REFERENCES auth.users(id),
    criado_em timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.user_roles_historico ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT ON public.user_roles_historico TO authenticated;
GRANT ALL ON public.user_roles_historico TO service_role;

-- Políticas
CREATE POLICY "Superadmins podem ver todo histórico"
ON public.user_roles_historico
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'));

-- RPC para transicionar role
CREATE OR REPLACE FUNCTION public.transicionar_role_usuario(
    _user_id uuid,
    _novo_role public.app_role,
    _alterado_por uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _role_atual public.app_role;
BEGIN
    -- Validação de identidade (Prompt 3)
    IF _alterado_por IS DISTINCT FROM auth.uid() THEN 
        RAISE EXCEPTION 'Usuário não autorizado para esta ação';
    END IF;

    -- Ninguém edita o próprio role
    IF _user_id = _alterado_por THEN
        RAISE EXCEPTION 'Não é permitido alterar seu próprio cargo';
    END IF;

    -- Apenas superadmin pode alterar roles
    IF NOT public.has_role(_alterado_por, 'superadmin') THEN
        RAISE EXCEPTION 'Apenas Superadministradores podem alterar permissões';
    END IF;

    -- Obter role atual
    SELECT role INTO _role_atual FROM public.user_roles WHERE user_id = _user_id LIMIT 1;

    -- Atualizar ou inserir papel
    -- Nota: A tabela user_roles tem unique(user_id, role)? 
    -- Se for um papel por usuário, o unique deveria ser apenas user_id.
    -- Vamos assumir que deletamos o antigo e inserimos o novo se houver conflito de user_id.
    DELETE FROM public.user_roles WHERE user_id = _user_id;
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _novo_role);

    -- Gravar histórico
    INSERT INTO public.user_roles_historico (user_id, role_anterior, role_novo, alterado_por)
    VALUES (_user_id, _role_atual, _novo_role, _alterado_por);
END;
$$;
