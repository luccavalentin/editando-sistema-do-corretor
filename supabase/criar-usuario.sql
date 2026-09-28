-- ============================================================================
-- AGILLIZA — CRIAR UM USUÁRIO À MÃO
--
-- POR QUE ISTO EXISTE
--
-- O sistema ainda não envia e-mail. Sem envio, o convite de equipe não chega a
-- ninguém e o "esqueci a senha" não funciona — então a única forma de colocar
-- alguém para dentro é esta. Quando o envio existir, este arquivo vira o plano
-- B para o primeiro usuário de uma instalação nova, que é um problema que todo
-- sistema com convite tem: não há quem convide o primeiro.
--
-- A ARMADILHA QUE CUSTOU UMA DEPURAÇÃO INTEIRA
--
-- Criar a linha em `auth.users` com e-mail e senha NÃO BASTA. Faltando as duas
-- coisas abaixo, o login é recusado com "E-mail ou senha incorretos" — uma
-- mensagem que manda você investigar exatamente o lugar errado, porque a senha
-- está certa:
--
--   1. A linha em `auth.identities`. Sem ela o GoTrue não reconhece que aquele
--      usuário tem provedor "email", e nem chega a conferir a senha.
--
--   2. As colunas de token com STRING VAZIA, não NULL. `confirmation_token`,
--      `recovery_token`, `email_change` e `email_change_token_new` são lidas
--      pelo GoTrue como texto simples; um NULL quebra a leitura antes da
--      conferência de senha, e o erro sai como credencial inválida.
--
-- Dá para confirmar que a senha está certa independentemente do login:
--
--   select extensions.crypt('a-senha', encrypted_password) = encrypted_password
--   from auth.users where email = '...';
--
-- Se isso devolver `true` e o login continuar recusando, o problema é um dos
-- dois pontos acima — nunca a senha.
--
-- COMO USAR
--   1. Troque e-mail, senha e nome abaixo.
--   2. Escolha o que a pessoa será: admin de plataforma, dono de conta, ou ambos.
--   3. Rode no SQL Editor ou por psql.
-- ============================================================================

do $$
declare
  -- >>> TROQUE AQUI <<<
  v_email  text := 'pessoa@exemplo.com.br';
  v_senha  text := 'troque-esta-senha';
  v_nome   text := 'Nome da Pessoa';

  -- O que esta pessoa será:
  v_admin_plataforma boolean := false;  -- acessa o console em :3100
  v_cria_conta       boolean := true;   -- vira proprietário de uma conta nova
  v_nome_da_conta    text    := 'Imobiliária Exemplo';

  v_u uuid := gen_random_uuid();
  v_t uuid;
begin
  if exists (select 1 from auth.users where email = v_email) then
    raise exception 'Já existe usuário com o e-mail %. Nada foi feito.', v_email;
  end if;

  insert into auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    -- String vazia, NÃO NULL: ver o cabeçalho.
    confirmation_token, recovery_token, email_change, email_change_token_new,
    email_change_token_current, phone_change, phone_change_token,
    reauthentication_token,
    created_at, updated_at
  )
  values (
    v_u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', v_email,
    extensions.crypt(v_senha, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('nome', v_nome),
    '', '', '', '', '', '', '', '',
    now(), now()
  );

  -- Sem esta linha o GoTrue não reconhece o provedor. `email` é coluna
  -- GERADA a partir de identity_data — não tente inseri-la.
  insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
  values (
    v_u::text, v_u,
    jsonb_build_object('sub', v_u::text, 'email', v_email, 'email_verified', true),
    'email', now(), now()
  );

  -- O perfil nasce por gatilho; aqui só se ajusta o que ele não tem como saber.
  update public.perfis set nome = v_nome, admin_plataforma = v_admin_plataforma where id = v_u;

  if v_cria_conta then
    insert into public.tenants (nome, situacao) values (v_nome_da_conta, 'ativo')
    returning id into v_t;

    insert into public.membros (tenant_id, usuario_id, papel)
    values (v_t, v_u, 'proprietario');
  end if;

  raise notice 'Usuário % criado (%). Conta: %', v_email, v_u, coalesce(v_nome_da_conta, '—');
end $$;

-- Conferência: os quatro pontos que fazem o login funcionar.
select u.email,
       (u.encrypted_password is not null)                   as tem_senha,
       (u.email_confirmed_at is not null)                   as email_confirmado,
       (select count(*) from auth.identities i
         where i.user_id = u.id)                            as identidades,
       (u.confirmation_token = '' and u.recovery_token = ''
        and u.email_change = ''
        and u.email_change_token_new = '')                  as tokens_vazios_nao_nulos,
       p.admin_plataforma,
       (select count(*) from public.membros m
         where m.usuario_id = u.id)                         as contas
from auth.users u
join public.perfis p on p.id = u.id
order by u.created_at desc
limit 5;
