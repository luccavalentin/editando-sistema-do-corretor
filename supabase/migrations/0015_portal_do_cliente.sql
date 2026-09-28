-- ============================================================================
-- AGILLIZA — 0015 O PORTAL DO CLIENTE
--
-- A terceira ponta do sistema. As outras duas são o corretor (com sessão
-- Supabase) e o visitante da vitrine (papel `anon`). Esta é o COMPRADOR
-- acompanhando o próprio processo.
--
-- POR QUE CPF E DATA DE NASCIMENTO, E NÃO SENHA
--
-- Foi decisão de produto, e é a certa: o comprador de imóvel entra no portal
-- três ou quatro vezes na vida. Exigir que ele crie uma conta, escolha senha e
-- confirme e-mail derruba a adesão a quase zero — ele simplesmente liga para o
-- corretor perguntando como está, que é justamente o telefonema que o portal
-- existe para evitar.
--
-- MAS ISSO É AUTENTICAÇÃO FRACA, E A MIGRAÇÃO TRATA DISSO
--
-- CPF não é segredo no Brasil: circula em cadastro de farmácia e nota fiscal.
-- Data de nascimento também não. Quem tiver os dois de alguém entra. O que
-- protege de verdade aqui não é a força do segredo, é o LIMITE DE TENTATIVA:
-- sem ele, um laço com dez mil datas de nascimento acha a de qualquer CPF em
-- segundos.
--
-- Então:
--   - toda tentativa é registrada, certa ou errada;
--   - cinco erros no mesmo CPF em dez minutos travam aquele CPF por meia hora;
--   - vinte tentativas do mesmo IP em dez minutos travam o IP;
--   - o que o cliente alcança é um RECORTE — nunca a tabela.
--
-- E O QUE ELE VÊ É MENOS DO QUE EXISTE
--
-- As funções abaixo devolvem colunas escolhidas a dedo. A observação interna do
-- corretor sobre o imóvel, a comissão, a temperatura do lead, o motivo de perda
-- de um negócio — nada disso sai. O cliente vê o próprio processo, não a visão
-- que o corretor tem dele.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. REGISTRO DE TENTATIVAS
--
-- Serve a dois donos: o limite de tentativa (função abaixo) e a auditoria — o
-- corretor precisa poder responder "quem acessou os dados do meu cliente?".
-- ----------------------------------------------------------------------------
create table public.portal_acessos (
  id bigserial primary key,

  -- A pessoa só é conhecida quando a tentativa ACERTA. Numa tentativa errada,
  -- não há a quem atribuir — e é exatamente essa a que interessa vigiar.
  pessoa_id uuid references public.pessoas (id) on delete set null,
  tenant_id uuid references public.tenants (id) on delete cascade,

  -- Hash do CPF tentado, nunca o CPF. O limite precisa agrupar por documento,
  -- e guardar o número em claro criaria uma segunda tabela de CPFs — incluindo
  -- os de quem NÃO é cliente, digitados por engano ou por quem estava sondando.
  cpf_hash text not null,

  sucesso boolean not null,
  motivo text,

  ip inet,
  agente_usuario text,

  criado_em timestamptz not null default now()
);

comment on table public.portal_acessos is
  'Tentativas de entrada no portal do cliente. Guarda HASH do CPF, nunca o numero: senao o log vira uma segunda base de CPFs, incluindo os de quem nem e cliente.';

comment on column public.portal_acessos.cpf_hash is
  'sha256 do CPF. Serve so para agrupar tentativas no limite de taxa — nao ha como voltar ao numero a partir dele em consulta comum.';

-- Índices desenhados para as duas consultas do limite de taxa, e só.
create index portal_acessos_por_cpf_idx
  on public.portal_acessos (cpf_hash, criado_em desc)
  where not sucesso;

create index portal_acessos_por_ip_idx
  on public.portal_acessos (ip, criado_em desc)
  where not sucesso and ip is not null;

create index portal_acessos_por_pessoa_idx
  on public.portal_acessos (pessoa_id, criado_em desc)
  where pessoa_id is not null;

alter table public.portal_acessos enable row level security;
revoke all on public.portal_acessos from anon, authenticated;

-- O corretor vê os acessos aos dados dos PRÓPRIOS clientes. Só leitura: quem
-- escreve é a função de autenticação, com privilégio de definidor.
create policy portal_acessos_do_tenant on public.portal_acessos
  for select to authenticated
  using (tenant_id is not null and app.pode_ler_tenant(tenant_id));

grant select on public.portal_acessos to authenticated;

-- ----------------------------------------------------------------------------
-- 2. AUTENTICAÇÃO
--
-- `security definer` porque precisa ler `pessoas` sem sessão nenhuma. NÃO é
-- concedida ao papel `anon`: se fosse, qualquer um chamaria a função direto
-- pela API pública e o limite de taxa seria a única barreira. Quem executa é o
-- servidor da aplicação, com a chave de serviço.
-- ----------------------------------------------------------------------------
create type app.resultado_do_portal as (
  autorizado boolean,
  motivo text,
  pessoa_id uuid,
  tenant_id uuid,
  nome text,
  segundos_de_espera int
);

create or replace function app.autenticar_no_portal(
  p_cpf text,
  p_nascimento date,
  p_ip inet default null,
  p_agente text default null
)
returns app.resultado_do_portal
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '[^0-9]', '', 'g');
  v_hash text;
  v_erros_cpf int;
  v_erros_ip int;
  v_pessoa record;
  v_saida app.resultado_do_portal;
begin
  v_saida.autorizado := false;
  v_saida.segundos_de_espera := 0;

  if length(v_cpf) <> 11 or p_nascimento is null then
    v_saida.motivo := 'dados_incompletos';
    return v_saida;
  end if;

  v_hash := encode(extensions.digest(v_cpf, 'sha256'), 'hex');

  -- -------------------------------------------------------------- limite
  -- Cinco erros no mesmo CPF em dez minutos. Um cliente que errou a própria
  -- data de nascimento cinco vezes vai ligar para o corretor; um laço tentando
  -- datas para de funcionar.
  select count(*) into v_erros_cpf
  from public.portal_acessos
  where cpf_hash = v_hash
    and not sucesso
    and criado_em > now() - interval '10 minutes';

  if v_erros_cpf >= 5 then
    insert into public.portal_acessos (cpf_hash, sucesso, motivo, ip, agente_usuario)
    values (v_hash, false, 'bloqueado_por_cpf', p_ip, p_agente);

    v_saida.motivo := 'bloqueado';
    v_saida.segundos_de_espera := 1800;
    return v_saida;
  end if;

  -- Vinte tentativas do mesmo IP. Pega quem varre CPFs diferentes, que o
  -- limite por documento sozinho não veria.
  if p_ip is not null then
    select count(*) into v_erros_ip
    from public.portal_acessos
    where ip = p_ip
      and not sucesso
      and criado_em > now() - interval '10 minutes';

    if v_erros_ip >= 20 then
      insert into public.portal_acessos (cpf_hash, sucesso, motivo, ip, agente_usuario)
      values (v_hash, false, 'bloqueado_por_ip', p_ip, p_agente);

      v_saida.motivo := 'bloqueado';
      v_saida.segundos_de_espera := 1800;
      return v_saida;
    end if;
  end if;

  -- ------------------------------------------------------------ conferência
  select p.id, p.tenant_id, p.nome, p.portal_liberado, t.situacao as situacao_tenant
    into v_pessoa
  from public.pessoas p
  join public.tenants t on t.id = p.tenant_id
  where p.cpf = v_cpf
    and p.data_nascimento = p_nascimento
    and p.excluido_em is null
    and t.excluido_em is null;

  if v_pessoa.id is null then
    insert into public.portal_acessos (cpf_hash, sucesso, motivo, ip, agente_usuario)
    values (v_hash, false, 'nao_confere', p_ip, p_agente);

    -- Motivo genérico DE PROPÓSITO. Distinguir "CPF não existe" de "data
    -- errada" transformaria o portal num verificador de CPF: quem quisesse
    -- saber se alguém é cliente daquele corretor descobriria com uma tentativa.
    v_saida.motivo := 'nao_confere';
    return v_saida;
  end if;

  if not v_pessoa.portal_liberado then
    insert into public.portal_acessos (pessoa_id, tenant_id, cpf_hash, sucesso, motivo, ip, agente_usuario)
    values (v_pessoa.id, v_pessoa.tenant_id, v_hash, false, 'portal_nao_liberado', p_ip, p_agente);

    -- Aqui a mensagem PODE ser específica: quem chegou até aqui já provou
    -- conhecer o CPF e a data. Dizer "peça ao seu corretor" é o caminho útil.
    v_saida.motivo := 'nao_liberado';
    return v_saida;
  end if;

  if v_pessoa.situacao_tenant = 'cancelado' then
    v_saida.motivo := 'conta_encerrada';
    return v_saida;
  end if;

  insert into public.portal_acessos (pessoa_id, tenant_id, cpf_hash, sucesso, ip, agente_usuario)
  values (v_pessoa.id, v_pessoa.tenant_id, v_hash, true, p_ip, p_agente);

  update public.pessoas set portal_ultimo_acesso_em = now() where id = v_pessoa.id;

  v_saida.autorizado := true;
  v_saida.motivo := 'ok';
  v_saida.pessoa_id := v_pessoa.id;
  v_saida.tenant_id := v_pessoa.tenant_id;
  v_saida.nome := v_pessoa.nome;
  return v_saida;
end;
$$;

comment on function app.autenticar_no_portal is
  'Confere CPF e data de nascimento com limite de tentativa. NAO concedida a anon: quem executa e o servidor da aplicacao.';

-- ----------------------------------------------------------------------------
-- 3. O QUE O CLIENTE VÊ
--
-- Cada função recebe o `pessoa_id` que o servidor resolveu a partir do cookie
-- assinado, e devolve SÓ o que pertence àquela pessoa. A lista de colunas é a
-- fronteira — e ela está aqui, no banco, não espalhada por consultas na
-- aplicação onde um `select *` acidental abriria tudo.
-- ----------------------------------------------------------------------------

create or replace function public.portal_meu_resumo(p_pessoa_id uuid)
returns table (
  nome text,
  corretor_nome text,
  corretor_whatsapp text,
  corretor_email text,
  corretor_creci text,
  imoveis_de_interesse bigint,
  simulacoes bigint,
  simulacao_aprovada boolean
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    p.nome,
    -- O nome que o CLIENTE vê é o da vitrine quando existe: é assim que o
    -- corretor se apresenta ao mercado.
    coalesce(t.portfolio_titulo, t.nome),
    t.portfolio_whatsapp,
    t.portfolio_email,
    t.creci,
    (select count(*) from public.imovel_interesses i
      where i.pessoa_id = p.id and i.tipo in ('favorito', 'pedido_visita')),
    (select count(*) from public.simulacoes s
      where s.pessoa_id = p.id and s.excluido_em is null),
    exists (select 1 from public.simulacoes s
      where s.pessoa_id = p.id and s.situacao = 'aprovado' and s.excluido_em is null)
  from public.pessoas p
  join public.tenants t on t.id = p.tenant_id
  where p.id = p_pessoa_id
    and p.portal_liberado
    and p.excluido_em is null;
$$;

create or replace function public.portal_meus_imoveis(p_pessoa_id uuid)
returns table (
  id uuid,
  codigo text,
  titulo text,
  tipo text,
  finalidade text,
  situacao text,
  bairro text,
  cidade text,
  uf text,
  valor numeric,
  valor_aluguel numeric,
  valor_condominio numeric,
  quartos smallint,
  banheiros smallint,
  vagas smallint,
  area_util numeric,
  descricao_publica text,
  slug text,
  foto_chave text,
  interesse text,
  interesse_em timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select distinct on (im.id)
    im.id, im.codigo, im.titulo, im.tipo::text, im.finalidade::text, im.situacao::text,
    im.bairro, im.cidade, im.uf,
    im.valor, im.valor_aluguel, im.valor_condominio,
    im.quartos, im.banheiros, im.vagas, im.area_util,
    im.descricao_publica, im.slug,
    (select m.chave from public.imovel_midias m
      where m.imovel_id = im.id order by m.capa desc, m.ordem limit 1),
    i.tipo::text,
    i.criado_em
  from public.imovel_interesses i
  join public.imoveis im on im.id = i.imovel_id
  join public.pessoas p on p.id = i.pessoa_id
  where i.pessoa_id = p_pessoa_id
    and p.portal_liberado
    and im.excluido_em is null
  -- `observacoes_internas`, `comissao_percentual`, `exclusividade`,
  -- `proprietario_id` e o endereço exato ficam DE FORA. O cliente vê o imóvel,
  -- não o que o corretor anotou sobre a negociação dele.
  order by im.id, i.criado_em desc;
$$;

create or replace function public.portal_minhas_simulacoes(p_pessoa_id uuid)
returns table (
  id uuid,
  codigo text,
  situacao text,
  valor_imovel numeric,
  valor_entrada numeric,
  valor_financiamento numeric,
  prazo_meses smallint,
  melhor_parcela numeric,
  criado_em timestamptz,
  respondido_em timestamptz,
  imovel_titulo text,
  bancos jsonb
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    s.id, s.codigo, s.situacao::text,
    s.valor_imovel, s.valor_entrada, s.valor_financiamento, s.prazo_meses,
    s.melhor_parcela, s.criado_em, s.respondido_em,
    im.titulo,
    (
      select coalesce(jsonb_agg(jsonb_build_object(
        'banco', sb.nome_banco,
        'situacao', sb.situacao,
        'parcela', sb.valor_parcela,
        'taxa', sb.taxa_juros_ano,
        'prazo', sb.prazo_aprovado,
        'escolhido', sb.escolhido
      ) order by sb.valor_parcela nulls last), '[]'::jsonb)
      from public.simulacao_bancos sb
      where sb.simulacao_id = s.id
      -- `retorno_integracao` e `codigo_situacao_banco` ficam de fora: são texto
      -- cru do banco, escrito para o operador, e às vezes trazem nome de
      -- sistema interno. O cliente lê a situação traduzida.
    )
  from public.simulacoes s
  join public.pessoas p on p.id = s.pessoa_id
  left join public.imoveis im on im.id = s.imovel_id
  where s.pessoa_id = p_pessoa_id
    and p.portal_liberado
    and s.excluido_em is null
  order by s.criado_em desc;
$$;

-- ----------------------------------------------------------------------------
-- 4. PRIVILÉGIO
--
-- Nenhuma destas funções é concedida a `anon` nem a `authenticated`. Quem as
-- executa é o servidor da aplicação, com a chave de serviço, DEPOIS de resolver
-- a identidade do cliente a partir de um cookie que ele mesmo assinou.
--
-- Conceder a `anon` seria entregar o portal inteiro: bastaria chamar
-- `portal_meus_imoveis` com um uuid qualquer.
-- ----------------------------------------------------------------------------
revoke all on function app.autenticar_no_portal(text, date, inet, text) from public, anon, authenticated;
revoke all on function public.portal_meu_resumo(uuid) from public, anon, authenticated;
revoke all on function public.portal_meus_imoveis(uuid) from public, anon, authenticated;
revoke all on function public.portal_minhas_simulacoes(uuid) from public, anon, authenticated;

grant execute on function app.autenticar_no_portal(text, date, inet, text) to service_role;
grant execute on function public.portal_meu_resumo(uuid) to service_role;
grant execute on function public.portal_meus_imoveis(uuid) to service_role;
grant execute on function public.portal_minhas_simulacoes(uuid) to service_role;
