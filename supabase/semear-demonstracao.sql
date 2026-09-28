-- ============================================================================
-- AGILLIZA — DADOS DE DEMONSTRAÇÃO
--
-- Monta uma imobiliária inteira em volta de um usuário que JÁ EXISTE, para o
-- sistema poder ser visto funcionando. Sem isto, todas as telas abrem no estado
-- de primeiro acesso — e um sistema vazio não mostra o que ele faz.
--
-- COMO RODAR
--
--   1. Crie o usuário no painel do Supabase: Authentication > Users > Add user.
--   2. Troque o e-mail na linha `v_email` abaixo.
--   3. Rode este arquivo no SQL Editor, ou:
--        psql "$DATABASE_URL" -f supabase/semear-demonstracao.sql
--
-- COMO APAGAR DEPOIS
--
--   delete from public.tenants where nome = 'Duarte Imóveis (demonstração)';
--
-- Tudo é apagado junto, em cascata. O usuário do Authentication permanece — ele
-- é seu, não da demonstração.
--
-- O QUE OS DADOS FORAM DESENHADOS PARA MOSTRAR
--
-- Não é uma lista bonita de linhas: cada bloco existe para uma tela provar o
-- que ela faz.
--
--   - A agenda tem um CHOQUE DE HORÁRIO e uma visita com deslocamento
--     insuficiente. São os dois avisos que distinguem a tela de uma grade
--     comum, e com uma agenda tranquila eles nunca apareceriam.
--   - Há tarefas e follow-ups VENCIDOS. A ordenação por atraso é a decisão
--     central dessas telas, e ela só se mostra com atraso na base.
--   - Um negócio está parado há 20 dias, para a automação ter o que encontrar.
--   - A simulação tem três bancos com respostas DIFERENTES — um aprovado, um
--     recusado, um em análise — que é o caso em que a tabela comparativa vale.
--   - Um cliente faz aniversário hoje.
--
-- Os CPFs são os de teste que já aparecem na suíte: dígitos válidos, pessoas
-- inexistentes.
-- ============================================================================

do $$
declare
  -- >>> TROQUE AQUI <<<
  v_email text := 'voce@exemplo.com.br';

  v_usuario uuid;
  v_t uuid;
  v_etapa_contato uuid; v_etapa_visita uuid; v_etapa_proposta uuid;
  v_mariana uuid; v_carlos uuid; v_joana uuid; v_pedro uuid; v_lucia uuid;
  v_apto uuid; v_casa uuid; v_cobertura uuid; v_terreno uuid;
  v_neg_mariana uuid; v_neg_carlos uuid; v_neg_parado uuid;
  v_sim uuid;
  v_hoje date := current_date;
begin
  select id into v_usuario from auth.users where email = v_email;

  if v_usuario is null then
    raise exception
      'Nenhum usuário com o e-mail %. Crie-o em Authentication > Users e troque a linha `v_email` no topo deste arquivo.',
      v_email;
  end if;

  -- ------------------------------------------------------------------ conta
  insert into public.tenants (
    nome, creci, cpf_cnpj, situacao,
    slug, portfolio_ativo, portfolio_titulo, portfolio_bio,
    portfolio_whatsapp, portfolio_email
  )
  values (
    'Duarte Imóveis (demonstração)', 'CRECI-SP 123456', '11222333000181', 'ativo',
    'duarte-imoveis-demo', true, 'Duarte Imóveis',
    'Atendemos a zona sul de São Paulo há 12 anos, com foco em apartamentos para famílias. Acompanhamos do primeiro contato à entrega das chaves.',
    '11987654321', 'contato@duarteimoveis.com.br'
  )
  returning id into v_t;

  insert into public.membros (tenant_id, usuario_id, papel)
  values (v_t, v_usuario, 'proprietario');

  -- As etapas nascem por gatilho; aqui só se descobre os ids.
  select id into v_etapa_contato from public.etapas where tenant_id = v_t order by ordem limit 1;
  select id into v_etapa_visita from public.etapas where tenant_id = v_t order by ordem offset 2 limit 1;
  select id into v_etapa_proposta from public.etapas where tenant_id = v_t order by ordem offset 3 limit 1;

  -- --------------------------------------------------------------- clientes
  insert into public.pessoas (tenant_id, nome, cpf, data_nascimento, email, temperatura, responsavel_id, portal_liberado, portal_lgpd_aceito_em)
  values (v_t, 'Mariana Duarte Ribeiro', '11144477735', '1988-04-12', 'mariana.demo@exemplo.com', 'quente', v_usuario, true, now())
  returning id into v_mariana;

  insert into public.pessoas (tenant_id, nome, cpf, data_nascimento, email, temperatura, responsavel_id)
  values (v_t, 'Carlos Eduardo Menezes', '52998224725', '1979-11-03', 'carlos.demo@exemplo.com', 'quente', v_usuario)
  returning id into v_carlos;

  insert into public.pessoas (tenant_id, nome, cpf, data_nascimento, email, temperatura, responsavel_id)
  values (v_t, 'Joana Pires de Almeida', '39053344705', '1992-07-21', 'joana.demo@exemplo.com', 'morno', v_usuario)
  returning id into v_joana;

  -- Aniversário HOJE, para a automação de aniversário ter o que encontrar.
  insert into public.pessoas (tenant_id, nome, cpf, data_nascimento, temperatura, responsavel_id)
  values (v_t, 'Pedro Henrique Salles', '12345678909',
          make_date(1985, extract(month from v_hoje)::int, extract(day from v_hoje)::int),
          'morno', v_usuario)
  returning id into v_pedro;

  insert into public.pessoas (tenant_id, nome, temperatura, responsavel_id)
  values (v_t, 'Lúcia Fernandes', 'frio', v_usuario)
  returning id into v_lucia;

  insert into public.pessoas (tenant_id, nome, temperatura, responsavel_id)
  values (v_t, 'Roberto Antunes', 'frio', v_usuario),
         (v_t, 'Fernanda Lima Costa', 'morno', v_usuario),
         (v_t, 'Marcos Vinícius Rocha', 'quente', v_usuario);

  -- Telefones: o follow-up usa o principal para montar o link do WhatsApp.
  insert into public.pessoa_telefones (tenant_id, pessoa_id, numero, principal)
  values (v_t, v_mariana, '11987650001', true),
         (v_t, v_carlos, '11987650002', true),
         (v_t, v_joana, '11987650003', true),
         (v_t, v_pedro, '11987650004', true);

  -- ---------------------------------------------------------------- imóveis
  insert into public.imoveis (
    tenant_id, titulo, tipo, finalidade, situacao, uso, conservacao,
    cep, logradouro, numero, bairro, cidade, uf, mostrar_endereco_no_portfolio,
    valor, valor_condominio, valor_iptu, area_util, quartos, suites, banheiros, vagas,
    comodidades, descricao_publica, observacoes_internas, comissao_percentual,
    publicado_no_portfolio, slug, responsavel_id, criado_por
  )
  values (
    v_t, 'Apartamento 3 dormitórios na Vila Mariana', 'apartamento', 'venda', 'disponivel',
    'residencial', 'usado',
    '04015011', 'Rua Joaquim Távora', '1042', 'Vila Mariana', 'São Paulo', 'SP', false,
    780000, 890, 3200, 96, 3, 1, 2, 2,
    array['Piscina', 'Churrasqueira', 'Portaria 24h', 'Elevador', 'Vaga coberta'],
    'Apartamento reformado em 2024, com varanda gourmet, armários planejados e duas vagas cobertas. A 400 metros do metrô Ana Rosa, em prédio com portaria 24 horas e lazer completo.',
    'PROPRIETÁRIA ACEITA 740 MIL À VISTA. Chave na portaria, falar com o Seu Nilton.',
    6.0, true, 'apartamento-3-dorm-vila-mariana-a1b2c3', v_usuario, v_usuario
  )
  returning id into v_apto;

  insert into public.imoveis (
    tenant_id, titulo, tipo, finalidade, situacao, uso, conservacao,
    bairro, cidade, uf, valor, area_util, area_total, quartos, suites, banheiros, vagas,
    comodidades, descricao_publica, publicado_no_portfolio, slug, responsavel_id, criado_por
  )
  values (
    v_t, 'Casa térrea com quintal na Saúde', 'casa', 'venda', 'disponivel',
    'residencial', 'usado', 'Saúde', 'São Paulo', 'SP',
    1250000, 180, 250, 3, 1, 3, 3,
    array['Churrasqueira', 'Jardim', 'Área de serviço'],
    'Casa térrea em rua tranquila, com quintal amplo e churrasqueira. Três dormitórios, sendo uma suíte, e garagem para três carros.',
    true, 'casa-terrea-quintal-saude-d4e5f6', v_usuario, v_usuario
  )
  returning id into v_casa;

  insert into public.imoveis (
    tenant_id, titulo, tipo, finalidade, situacao, uso, conservacao,
    bairro, cidade, uf, valor, valor_condominio, area_util, quartos, suites, banheiros, vagas,
    descricao_publica, publicado_no_portfolio, slug, exclusividade, exclusividade_ate,
    responsavel_id, criado_por
  )
  values (
    v_t, 'Cobertura duplex no Ibirapuera', 'cobertura', 'venda', 'reservado',
    'residencial', 'usado', 'Moema', 'São Paulo', 'SP',
    2900000, 2400, 210, 4, 2, 4, 3,
    'Cobertura duplex com terraço, piscina privativa e vista para o parque. Quatro suítes e três vagas.',
    true, 'cobertura-duplex-ibirapuera-g7h8i9', true, v_hoje + 90,
    v_usuario, v_usuario
  )
  returning id into v_cobertura;

  insert into public.imoveis (
    tenant_id, titulo, tipo, finalidade, situacao, uso, conservacao,
    bairro, cidade, uf, valor, area_total, responsavel_id, criado_por
  )
  values (v_t, 'Terreno 500m² em Cotia', 'terreno', 'venda', 'rascunho',
          'residencial', 'usado', 'Granja Viana', 'Cotia', 'SP', 420000, 500, v_usuario, v_usuario)
  returning id into v_terreno;

  insert into public.imoveis (
    tenant_id, titulo, tipo, finalidade, situacao, uso, conservacao,
    bairro, cidade, uf, valor_aluguel, valor_condominio, area_util, quartos, banheiros, vagas,
    descricao_publica, publicado_no_portfolio, slug, responsavel_id, criado_por
  )
  values (
    v_t, 'Studio mobiliado na Consolação', 'kitnet', 'aluguel', 'disponivel',
    'residencial', 'usado', 'Consolação', 'São Paulo', 'SP',
    3200, 750, 32, 1, 1, 0,
    'Studio mobiliado e pronto para morar, a dois quarteirões da Avenida Paulista. Inclui internet e portaria eletrônica.',
    true, 'studio-mobiliado-consolacao-j1k2l3', v_usuario, v_usuario
  );

  -- ------------------------------------------------------ interesse do cliente
  -- O portal do cliente mostra o que a pessoa marcou.
  insert into public.imovel_interesses (tenant_id, imovel_id, pessoa_id, tipo)
  values (v_t, v_apto, v_mariana, 'favorito'),
         (v_t, v_casa, v_mariana, 'pedido_visita'),
         (v_t, v_cobertura, v_carlos, 'favorito');

  -- --------------------------------------------------------------- negócios
  insert into public.negocios (tenant_id, pessoa_id, imovel_id, etapa_id, titulo, valor, responsavel_id, criado_por)
  values (v_t, v_mariana, v_apto, v_etapa_proposta, 'Apartamento Vila Mariana — Mariana', 780000, v_usuario, v_usuario)
  returning id into v_neg_mariana;

  insert into public.negocios (tenant_id, pessoa_id, imovel_id, etapa_id, titulo, valor, responsavel_id, criado_por)
  values (v_t, v_carlos, v_cobertura, v_etapa_visita, 'Cobertura Ibirapuera — Carlos', 2900000, v_usuario, v_usuario)
  returning id into v_neg_carlos;

  -- PARADO há 20 dias, para a automação `negocio_parado` ter o que encontrar.
  -- A data vai no INSERT porque o gatilho `tocar_atualizado_em` desfaria um
  -- UPDATE no mesmo comando.
  insert into public.negocios (tenant_id, pessoa_id, imovel_id, etapa_id, titulo, valor, responsavel_id, criado_por, atualizado_em)
  values (v_t, v_joana, v_casa, v_etapa_contato, 'Casa na Saúde — Joana', 1250000, v_usuario, v_usuario, now() - interval '20 days')
  returning id into v_neg_parado;

  insert into public.negocios (tenant_id, pessoa_id, etapa_id, titulo, valor, responsavel_id, criado_por)
  values (v_t, v_pedro, v_etapa_contato, 'Procura apartamento até 600 mil', 600000, v_usuario, v_usuario),
         (v_t, v_lucia, v_etapa_contato, 'Interesse em terreno', 420000, v_usuario, v_usuario);

  -- ----------------------------------------------------------------- agenda
  -- DUAS visitas que se CHOCAM: é o aviso que distingue esta agenda de uma
  -- grade comum, e com uma agenda tranquila ele nunca apareceria.
  insert into public.compromissos (
    tenant_id, titulo, tipo, situacao, pessoa_id, negocio_id, responsavel_id,
    inicio, fim, endereco, deslocamento_min, criado_por
  )
  values (
    v_t, 'Visita — Apartamento Vila Mariana', 'visita', 'confirmado',
    v_mariana, v_neg_mariana, v_usuario,
    v_hoje + time '14:00', v_hoje + time '15:00',
    'Rua Joaquim Távora, 1042 — Vila Mariana', 20, v_usuario
  ),
  (
    v_t, 'Visita — Cobertura Ibirapuera', 'visita', 'agendado',
    v_carlos, v_neg_carlos, v_usuario,
    v_hoje + time '14:30', v_hoje + time '15:30',
    'Alameda dos Arapanés, 200 — Moema', 25, v_usuario
  );

  -- Visita com DESLOCAMENTO INSUFICIENTE: 15 minutos entre o fim da anterior e
  -- o início desta, mas o trajeto leva 40.
  insert into public.compromissos (
    tenant_id, titulo, tipo, situacao, pessoa_id, responsavel_id,
    inicio, fim, endereco, deslocamento_min, criado_por
  )
  values (
    v_t, 'Avaliação — Casa na Saúde', 'avaliacao', 'agendado',
    v_joana, v_usuario,
    v_hoje + time '15:45', v_hoje + time '16:45',
    'Rua Bom Pastor, 880 — Ipiranga', 40, v_usuario
  );

  -- Visita de ontem, já realizada: alimenta a automação `visita_sem_retorno`.
  insert into public.compromissos (
    tenant_id, titulo, tipo, situacao, pessoa_id, responsavel_id,
    inicio, fim, compareceu, criado_por
  )
  values (
    v_t, 'Visita — Studio Consolação', 'visita', 'realizado',
    v_pedro, v_usuario,
    (v_hoje - 1) + time '10:00', (v_hoje - 1) + time '11:00', true, v_usuario
  );

  insert into public.compromissos (
    tenant_id, titulo, tipo, situacao, pessoa_id, responsavel_id, inicio, fim, criado_por
  )
  values (
    v_t, 'Reunião com o proprietário', 'reuniao', 'agendado',
    v_lucia, v_usuario, (v_hoje + 2) + time '09:00', (v_hoje + 2) + time '10:00', v_usuario
  );

  -- ---------------------------------------------------------------- tarefas
  -- VENCIDAS: a ordenação por atraso é a decisão central da tela, e ela só se
  -- mostra com atraso na base.
  insert into public.tarefas (tenant_id, titulo, descricao, prioridade, prazo, pessoa_id, negocio_id, responsavel_id, criado_por)
  values
    (v_t, 'Buscar a matrícula no 3º cartório', 'A proprietária disse que o número está no IPTU.',
     'alta', now() - interval '3 days', v_mariana, v_neg_mariana, v_usuario, v_usuario),
    (v_t, 'Confirmar vaga de garagem com o síndico', null,
     'media', now() - interval '1 day', v_carlos, v_neg_carlos, v_usuario, v_usuario),
    (v_t, 'Levar a proposta assinada para a Mariana', null,
     'critica', now() + interval '4 hours', v_mariana, v_neg_mariana, v_usuario, v_usuario),
    (v_t, 'Fotografar a cobertura com o drone', 'Combinar com o Rafael, sexta de manhã.',
     'media', now() + interval '3 days', null, null, v_usuario, v_usuario),
    (v_t, 'Atualizar os valores de condomínio da carteira', null,
     'baixa', null, null, null, v_usuario, v_usuario);

  insert into public.tarefas (tenant_id, titulo, prioridade, situacao, concluida_em, concluida_por, responsavel_id, criado_por)
  values (v_t, 'Renovar o contrato de exclusividade da cobertura', 'alta', 'feita',
          now() - interval '2 days', v_usuario, v_usuario, v_usuario);

  -- -------------------------------------------------------------- follow-ups
  insert into public.followups (
    tenant_id, pessoa_id, negocio_id, motivo, canal_sugerido, mensagem_sugerida,
    prazo, responsavel_id, prioridade, criado_por
  )
  values
    (v_t, v_carlos, v_neg_carlos, 'Prometi retorno sobre a contraproposta da cobertura',
     'whatsapp', 'Oi, Carlos! Falei com o proprietário sobre a contraproposta. Podemos conversar hoje?',
     now() - interval '2 days', v_usuario, 'alta', v_usuario),
    (v_t, v_joana, v_neg_parado, 'Sem contato desde a primeira conversa',
     'telefone', null, now() - interval '5 days', v_usuario, 'media', v_usuario),
    (v_t, v_pedro, null, 'Retorno depois da visita ao studio',
     'whatsapp', 'Oi, Pedro! O que achou do studio? Tenho mais duas opções parecidas na região.',
     now() + interval '2 hours', v_usuario, 'alta', v_usuario);

  -- Já tentado três vezes e sem resposta: o caso que a tela destaca como
  -- "precisa de outra abordagem".
  insert into public.followups (
    tenant_id, pessoa_id, motivo, canal_sugerido, prazo, responsavel_id,
    prioridade, situacao, tentativas, resultado, criado_por
  )
  values (v_t, v_lucia, 'Confirmar se ainda tem interesse no terreno', 'telefone',
          now() - interval '1 day', v_usuario, 'baixa', 'sem_resposta', 3,
          'Caixa postal nas três tentativas', v_usuario);

  -- ------------------------------------------------------------- simulação
  insert into public.simulacoes (
    tenant_id, pessoa_id, imovel_id, negocio_id,
    valor_imovel, valor_entrada, valor_financiamento, prazo_meses, renda_total,
    sistema_amortizacao, uf, nome_titular, cpf_titular, data_nascimento_titular,
    email_titular, estado_civil_homefin, situacao, enviado_em, respondido_em,
    responsavel_id, criado_por
  )
  values (
    v_t, v_mariana, v_apto, v_neg_mariana,
    780000, 234000, 546000, 360, 18400,
    'sac', 'SP', 'Mariana Duarte Ribeiro', '11144477735', '1988-04-12',
    'mariana.demo@exemplo.com', 'CA', 'aprovado',
    now() - interval '2 days', now() - interval '1 day',
    v_usuario, v_usuario
  )
  returning id into v_sim;

  -- TRÊS bancos com respostas DIFERENTES: é o caso em que a tabela comparativa
  -- vale alguma coisa. Com três "em análise", a tela não mostraria nada.
  insert into public.simulacao_bancos (
    tenant_id, simulacao_id, homefin_id_banco, codigo_banco, nome_banco, homefin_id_simulacao,
    situacao, valor_parcela, valor_financiamento_aprovado, prazo_aprovado, taxa_juros_ano,
    escolhido, enviado_em, respondido_em
  )
  values
    (v_t, v_sim, 45, 237, 'Bradesco', 'demo-1', 'aprovado', 4320.55, 546000, 360, 10.49,
     true, now() - interval '2 days', now() - interval '1 day'),
    (v_t, v_sim, 61, 341, 'Itaú', 'demo-2', 'aprovado', 4418.90, 520000, 360, 10.99,
     false, now() - interval '2 days', now() - interval '1 day'),
    (v_t, v_sim, 9, 33, 'Santander', 'demo-3', 'recusado', null, null, null, null,
     false, now() - interval '2 days', now() - interval '1 day');

  -- Uma segunda simulação, ainda em análise.
  insert into public.simulacoes (
    tenant_id, pessoa_id, imovel_id,
    valor_imovel, valor_entrada, valor_financiamento, prazo_meses, renda_total,
    sistema_amortizacao, uf, nome_titular, cpf_titular, data_nascimento_titular,
    situacao, enviado_em, responsavel_id, criado_por
  )
  values (
    v_t, v_carlos, v_cobertura,
    2900000, 1160000, 1740000, 420, 52000,
    'price', 'SP', 'Carlos Eduardo Menezes', '52998224725', '1979-11-03',
    'em_analise', now() - interval '6 hours', v_usuario, v_usuario
  );

  -- ------------------------------------------------------------ automações
  -- Desligadas, como nascem. Ligar é escolha de quem for ver a demonstração.
  insert into public.automacoes (tenant_id, regra, ativa, parametros)
  values (v_t, 'negocio_parado', false, '{"dias": 7}'::jsonb),
         (v_t, 'visita_sem_retorno', false, '{"horas": 24}'::jsonb);

  raise notice '';
  raise notice '  Demonstração pronta.';
  raise notice '';
  raise notice '  Conta ....... Duarte Imóveis (demonstração)';
  raise notice '  Entre com ... %', v_email;
  raise notice '  Vitrine ..... /c/duarte-imoveis-demo';
  raise notice '  Portal ...... /portal — CPF 111.444.777-35, nascimento 12/04/1988';
  raise notice '';
  raise notice '  Para apagar tudo:';
  raise notice '    delete from public.tenants where nome = ''Duarte Imóveis (demonstração)'';';
  raise notice '';
end $$;
