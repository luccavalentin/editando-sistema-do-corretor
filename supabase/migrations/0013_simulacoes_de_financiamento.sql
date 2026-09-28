-- ============================================================================
-- AGILLIZA — 0013 SIMULAÇÃO DE FINANCIAMENTO
--
-- COMO O MODELO DA HOMEFIN MAPEIA NO NOSSO
--
-- Lá, uma OPORTUNIDADE reúne N SIMULAÇÕES, uma por banco. Aqui:
--
--   simulacoes        ← a oportunidade. É o que o corretor chama de "simulação
--                       do cliente Fulano para o apartamento X".
--   simulacao_bancos  ← uma linha por banco consultado. É onde mora a resposta
--                       de cada instituição: parcela, taxa, prazo, aprovação.
--
-- Separar assim é o que permite mostrar a tabela comparativa que o corretor
-- precisa ("Bradesco 4.320, Itaú 4.180, Santander recusou") sem nenhuma
-- consulta cara na hora de desenhar a tela.
--
-- O QUE NUNCA É REDIGITADO
--
-- Renda, CPF e data de nascimento saem de `pessoas`; valor e características do
-- imóvel saem de `imoveis`. A simulação guarda uma CÓPIA do que foi enviado, e
-- não uma referência viva — se o corretor corrigir a renda do cliente amanhã, a
-- simulação de ontem continua mostrando com que número o banco decidiu. Sem
-- isso, "por que o banco aprovou 300 mil se a renda é 8 mil?" vira pergunta sem
-- resposta.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TIPOS
-- ----------------------------------------------------------------------------

-- Os cinco códigos do contrato da Homefin, traduzidos.
-- CUIDADO: 'A' aqui é APROVADO. Na oportunidade da Homefin, 'A' é "Ativa".
-- A mesma letra com dois sentidos é a armadilha mais fácil desta integração.
create type app.situacao_simulacao as enum (
  'rascunho',        -- montada aqui, ainda não enviada a ninguém
  'sem_integracao',  -- Homefin 'S'
  'erro_no_envio',   -- Homefin 'P' — a proposta não chegou ao banco
  'em_analise',      -- Homefin 'N'
  'aprovado',        -- Homefin 'A'
  'recusado'         -- Homefin 'R'
);

create type app.sistema_amortizacao as enum ('sac', 'price');

-- ----------------------------------------------------------------------------
-- SIMULAÇÃO
-- ----------------------------------------------------------------------------
create table public.simulacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,

  codigo text not null,

  -- Quem e para quê. A pessoa é obrigatória: simulação sem cliente não vira
  -- negócio e polui o histórico.
  pessoa_id uuid not null references public.pessoas (id) on delete restrict,
  imovel_id uuid references public.imoveis (id) on delete set null,
  negocio_id uuid references public.negocios (id) on delete set null,

  situacao app.situacao_simulacao not null default 'rascunho',

  -- ---------------------------------------------------------------- entradas
  -- Cópia do que foi enviado. Ver o cabeçalho.
  valor_imovel numeric(14, 2) not null check (valor_imovel > 0),
  valor_entrada numeric(14, 2) not null default 0 check (valor_entrada >= 0),
  valor_financiamento numeric(14, 2) not null check (valor_financiamento > 0),
  prazo_meses smallint not null check (prazo_meses between 12 and 480),
  renda_total numeric(14, 2) not null check (renda_total > 0),

  sistema_amortizacao app.sistema_amortizacao not null default 'sac',
  usa_fgts boolean not null default false,
  financiar_despesas boolean not null default false,

  -- Características do imóvel no momento do envio, nos códigos da Homefin.
  tipo_imovel_homefin char(2) not null default 'AP',
  uso_imovel_homefin char(1) not null default 'R',
  situacao_imovel_homefin char(1) not null default 'U',
  uf char(2) not null check (uf ~ '^[A-Z]{2}$'),

  -- Titular, como foi enviado.
  nome_titular text not null,
  cpf_titular text not null check (cpf_titular ~ '^[0-9]{11}$'),
  data_nascimento_titular date not null,
  email_titular text,
  celular_titular text,
  estado_civil_homefin text,

  -- Composição de renda: o segundo participante.
  compoe_renda boolean not null default false,
  nome_coparticipante text,
  cpf_coparticipante text check (cpf_coparticipante is null or cpf_coparticipante ~ '^[0-9]{11}$'),
  data_nascimento_coparticipante date,
  renda_coparticipante numeric(14, 2) check (renda_coparticipante is null or renda_coparticipante >= 0),

  -- ------------------------------------------------------- lado da Homefin
  homefin_id_oportunidade text,
  homefin_codigo_oportunidade text,

  -- ------------------------------------------------------------- resultado
  -- Preenchido pelo melhor banco, para a lista não precisar abrir os filhos.
  melhor_banco_id uuid,
  melhor_parcela numeric(14, 2),

  enviado_em timestamptz,
  respondido_em timestamptz,
  /** Última vez que o sistema perguntou à Homefin como estava. */
  reconciliado_em timestamptz,

  observacoes text,

  responsavel_id uuid references public.perfis (id) on delete set null,
  criado_por uuid references public.perfis (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz,

  unique (tenant_id, codigo),

  -- Financiar mais do que o imóvel vale não existe. O banco recusaria, mas
  -- deixar sair daqui gasta uma chamada e devolve um erro obscuro ao corretor.
  constraint financiamento_cabe_no_imovel
    check (valor_financiamento <= valor_imovel),

  constraint entrada_mais_financiamento_fecham
    check (abs((valor_entrada + valor_financiamento) - valor_imovel) < 0.02),

  -- Composição de renda exige saber com quem.
  constraint composicao_exige_coparticipante
    check (
      not compoe_renda
      or (nome_coparticipante is not null and cpf_coparticipante is not null)
    ),

  -- Titular e coparticipante não podem ser a mesma pessoa: a Homefin cria o
  -- titular sozinha ao abrir a oportunidade, e um segundo participante com o
  -- mesmo documento faz o Bradesco devolver `INT-006 ... falhou: undefined`.
  constraint coparticipante_diferente_do_titular
    check (cpf_coparticipante is null or cpf_coparticipante <> cpf_titular)
);

comment on table public.simulacoes is
  'Simulacao de financiamento. Guarda COPIA dos valores enviados, nao referencia viva: a simulacao de ontem precisa continuar mostrando com que numeros o banco decidiu.';

comment on column public.simulacoes.cpf_titular is
  'CPF como foi enviado ao banco. Dado sensivel: a interface exige a permissao sensivel.ver para revelar, e a revelacao e auditada.';

create index simulacoes_tenant_idx on public.simulacoes (tenant_id, criado_em desc)
  where excluido_em is null;
create index simulacoes_pessoa_idx on public.simulacoes (pessoa_id)
  where excluido_em is null;
create index simulacoes_imovel_idx on public.simulacoes (imovel_id)
  where imovel_id is not null and excluido_em is null;
create index simulacoes_situacao_idx on public.simulacoes (tenant_id, situacao)
  where excluido_em is null;
-- Para a rotina de reconciliação achar o que ainda está em análise.
create index simulacoes_a_reconciliar_idx on public.simulacoes (reconciliado_em)
  where situacao = 'em_analise' and excluido_em is null;

-- ----------------------------------------------------------------------------
-- RESPOSTA DE CADA BANCO
-- ----------------------------------------------------------------------------
create table public.simulacao_bancos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  simulacao_id uuid not null references public.simulacoes (id) on delete cascade,

  -- Identificação do banco como a Homefin a conhece.
  homefin_id_banco int not null,
  codigo_banco int,
  nome_banco text not null,

  homefin_id_simulacao text,
  situacao app.situacao_simulacao not null default 'rascunho',

  -- O que o banco devolveu.
  valor_parcela numeric(14, 2) check (valor_parcela is null or valor_parcela >= 0),
  valor_financiamento_aprovado numeric(14, 2),
  prazo_aprovado smallint,
  taxa_juros_ano numeric(6, 3),
  valor_iof numeric(14, 2),
  indexador text,
  valor_financiamento_maximo numeric(14, 2),
  valor_parcela_maxima numeric(14, 2),
  prazo_maximo smallint,

  -- Texto cru do banco. Guardado para diagnóstico, NUNCA mostrado sem passar
  -- pela humanização: mensagem de provedor costuma trazer nome de sistema
  -- interno, e às vezes dado do cliente.
  retorno_integracao text,
  codigo_situacao_banco text,

  escolhido boolean not null default false,

  enviado_em timestamptz,
  respondido_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  unique (simulacao_id, homefin_id_banco)
);

comment on table public.simulacao_bancos is
  'Uma linha por banco consultado. Mapeia a "simulacao" da Homefin, que la e por banco.';

create index simulacao_bancos_simulacao_idx on public.simulacao_bancos (simulacao_id);

-- A chave estrangeira do resumo só pode ser criada aqui, depois que a tabela
-- filha existe. Sem ela, `melhor_banco_id` poderia apontar para uma linha
-- apagada e a lista mostraria uma parcela de um banco que já não está lá.
alter table public.simulacoes
  add constraint simulacoes_melhor_banco_fkey
  foreign key (melhor_banco_id) references public.simulacao_bancos (id)
  on delete set null;

-- Um banco escolhido por simulação. Dois escolhidos fariam a comissão ser
-- calculada em cima do errado.
create unique index simulacao_bancos_escolhido_idx
  on public.simulacao_bancos (simulacao_id)
  where escolhido;

-- ----------------------------------------------------------------------------
-- REGISTRO DAS CHAMADAS
--
-- A lição que veio do sistema anterior: o log cresceu 1,2 GB porque guardava a
-- resposta inteira do `GET /oportunidade/{id}` a cada reconciliação. Aqui o
-- corpo completo só é guardado quando dá ERRO — no sucesso, um resumo basta,
-- porque o dado que importa já foi para as tabelas acima.
-- ----------------------------------------------------------------------------
create table public.integracao_chamadas (
  id bigserial primary key,
  tenant_id uuid references public.tenants (id) on delete cascade,

  provedor text not null default 'homefin',
  operacao text not null,
  metodo text not null,
  caminho text not null,

  sucesso boolean not null,
  status_http int,
  duracao_ms int,
  tentativas smallint not null default 1,

  -- Já mascarados na origem: nem CPF nem renda chegam aqui legíveis.
  requisicao jsonb,
  resposta jsonb,
  erro text,

  simulacao_id uuid references public.simulacoes (id) on delete set null,
  criado_em timestamptz not null default now()
);

comment on table public.integracao_chamadas is
  'Log das chamadas a provedor externo. Corpo completo SO em erro; no sucesso, resumo. E o que impede o log de virar 1,2 GB, como ocorreu no sistema anterior.';

create index integracao_chamadas_tenant_idx
  on public.integracao_chamadas (tenant_id, criado_em desc);
create index integracao_chamadas_simulacao_idx
  on public.integracao_chamadas (simulacao_id, criado_em desc)
  where simulacao_id is not null;
-- Para achar falhas rápido sem varrer o que deu certo.
create index integracao_chamadas_erros_idx
  on public.integracao_chamadas (criado_em desc)
  where not sucesso;

-- ----------------------------------------------------------------------------
-- CÓDIGO SEQUENCIAL POR TENANT
-- Mesmo mecanismo dos negócios e imóveis: contador atômico, nunca `count`.
-- ----------------------------------------------------------------------------
create or replace function app.gerar_codigo_simulacao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.codigo is not null and new.codigo <> '' then
    return new;
  end if;

  -- `app.proximo_contador` ja existe e e a MESMA funcao que numera negocios e
  -- imoveis. Reimplementar o contador aqui abriria a porta para duas regras
  -- divergirem, e e justamente onde o bug de "todo negocio virou NEG-00001"
  -- apareceu antes.
  new.codigo := 'SIM-' || lpad(
    app.proximo_contador(new.tenant_id, 'simulacao')::text, 4, '0'
  );
  return new;
end;
$$;

create trigger simulacoes_codigo
  before insert on public.simulacoes
  for each row execute function app.gerar_codigo_simulacao();

-- ----------------------------------------------------------------------------
-- COERÊNCIA DE TENANT
-- A RLS impede LER o alheio, não impede APONTAR para o alheio.
-- ----------------------------------------------------------------------------
create or replace function app.conferir_simulacao_coerente()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant uuid;
begin
  select p.tenant_id into v_tenant from public.pessoas p where p.id = new.pessoa_id;
  if v_tenant is null or v_tenant <> new.tenant_id then
    raise exception 'A pessoa pertence a outro tenant.' using hint = 'cruzamento_de_tenant';
  end if;

  if new.imovel_id is not null then
    select i.tenant_id into v_tenant from public.imoveis i where i.id = new.imovel_id;
    if v_tenant is null or v_tenant <> new.tenant_id then
      raise exception 'O imóvel pertence a outro tenant.' using hint = 'cruzamento_de_tenant';
    end if;
  end if;

  if new.negocio_id is not null then
    select n.tenant_id into v_tenant from public.negocios n where n.id = new.negocio_id;
    if v_tenant is null or v_tenant <> new.tenant_id then
      raise exception 'O negócio pertence a outro tenant.' using hint = 'cruzamento_de_tenant';
    end if;
  end if;

  return new;
end;
$$;

create trigger simulacoes_coerentes
  before insert or update of pessoa_id, imovel_id, negocio_id, tenant_id
  on public.simulacoes
  for each row execute function app.conferir_simulacao_coerente();

-- ----------------------------------------------------------------------------
-- RESUMO DO MELHOR BANCO
--
-- Mantido por gatilho para a LISTA de simulações não precisar abrir os filhos.
-- "Melhor" é a menor parcela entre os aprovados — que é o critério que o
-- comprador usa quando o corretor mostra a comparação.
-- ----------------------------------------------------------------------------
create or replace function app.resumir_melhor_banco()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_simulacao uuid := coalesce(new.simulacao_id, old.simulacao_id);
  v_melhor record;
begin
  select sb.id, sb.valor_parcela
    into v_melhor
  from public.simulacao_bancos sb
  where sb.simulacao_id = v_simulacao
    and sb.situacao = 'aprovado'
    and sb.valor_parcela is not null
  order by sb.valor_parcela asc
  limit 1;

  update public.simulacoes s
  set melhor_banco_id = v_melhor.id,
      melhor_parcela = v_melhor.valor_parcela
  where s.id = v_simulacao
    and (s.melhor_banco_id is distinct from v_melhor.id
         or s.melhor_parcela is distinct from v_melhor.valor_parcela);

  return null;
end;
$$;

create trigger simulacao_bancos_resumir
  after insert or delete or update of situacao, valor_parcela
  on public.simulacao_bancos
  for each row execute function app.resumir_melhor_banco();

-- ----------------------------------------------------------------------------
-- SITUAÇÃO CONSOLIDADA
--
-- A simulação tem N bancos com situações diferentes. O que o corretor vê na
-- lista é o melhor desfecho: um aprovado vale mais que três recusados, porque
-- basta um banco dizer sim para o negócio andar.
-- ----------------------------------------------------------------------------
create or replace function app.consolidar_situacao_da_simulacao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_simulacao uuid := coalesce(new.simulacao_id, old.simulacao_id);
  v_nova app.situacao_simulacao;
begin
  select case
    when bool_or(sb.situacao = 'aprovado')      then 'aprovado'
    when bool_or(sb.situacao = 'em_analise')    then 'em_analise'
    when bool_or(sb.situacao = 'recusado')      then 'recusado'
    when bool_or(sb.situacao = 'erro_no_envio') then 'erro_no_envio'
    when bool_or(sb.situacao = 'sem_integracao') then 'sem_integracao'
    else 'rascunho'
  end::app.situacao_simulacao
  into v_nova
  from public.simulacao_bancos sb
  where sb.simulacao_id = v_simulacao;

  update public.simulacoes s
  set situacao = coalesce(v_nova, 'rascunho'),
      respondido_em = case
        when coalesce(v_nova, 'rascunho') in ('aprovado', 'recusado')
             and s.respondido_em is null
        then now()
        else s.respondido_em
      end
  where s.id = v_simulacao
    and s.situacao is distinct from coalesce(v_nova, 'rascunho');

  return null;
end;
$$;

create trigger simulacao_bancos_consolidar
  after insert or delete or update of situacao
  on public.simulacao_bancos
  for each row execute function app.consolidar_situacao_da_simulacao();

-- `atualizado_em` automático, como nas demais tabelas.
create trigger simulacoes_atualizado_em
  before update on public.simulacoes
  for each row execute function app.tocar_atualizado_em();

create trigger simulacao_bancos_atualizado_em
  before update on public.simulacao_bancos
  for each row execute function app.tocar_atualizado_em();

-- ----------------------------------------------------------------------------
-- RLS
--
-- FORCE porque a tabela guarda CPF, data de nascimento e renda — o mesmo
-- critério de `pessoas` e `negocios`. Nem o dono da tabela lê sem passar pela
-- política.
-- ----------------------------------------------------------------------------
alter table public.simulacoes enable row level security;
alter table public.simulacoes force row level security;
alter table public.simulacao_bancos enable row level security;
alter table public.simulacao_bancos force row level security;
alter table public.integracao_chamadas enable row level security;

-- Uma politica por comando, como nas demais tabelas. `for all` parece mais
-- curto, mas apaga a distincao entre quem pode LER e quem pode ESCREVER — e e
-- exatamente essa distincao que separa o SDR do proprietario.
create policy simulacoes_ler on public.simulacoes
  for select to authenticated
  using (app.pode_ler_tenant(tenant_id) and excluido_em is null);

create policy simulacoes_inserir on public.simulacoes
  for insert to authenticated
  with check (app.pode_escrever(tenant_id));

create policy simulacoes_atualizar on public.simulacoes
  for update to authenticated
  using (app.pode_escrever(tenant_id))
  with check (app.pode_escrever(tenant_id));

create policy simulacao_bancos_ler on public.simulacao_bancos
  for select to authenticated
  using (app.pode_ler_tenant(tenant_id));

create policy simulacao_bancos_inserir on public.simulacao_bancos
  for insert to authenticated
  with check (app.pode_escrever(tenant_id));

create policy simulacao_bancos_atualizar on public.simulacao_bancos
  for update to authenticated
  using (app.pode_escrever(tenant_id))
  with check (app.pode_escrever(tenant_id));

-- Log de integração é SÓ LEITURA para quem administra a conta. Quem escreve é
-- a chave de serviço: um log que o usuário pode alterar não serve de log.
create policy integracao_chamadas_leitura on public.integracao_chamadas
  for select to authenticated
  using (
    tenant_id is not null
    and app.pode_ler_tenant(tenant_id)
    and app.papel_no_tenant(tenant_id) in ('proprietario', 'admin_equipe')
  );

comment on table public.simulacao_bancos is
  'Resposta de cada banco. Uma linha por instituicao consultada; a simulacao consolida o melhor desfecho.';
