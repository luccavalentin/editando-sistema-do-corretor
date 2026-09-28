-- ============================================================================
-- QA — IMÓVEIS E FRONTEIRA DO PORTFÓLIO PÚBLICO (migrações 0009 e 0010)
--
-- O portfólio público é a única parte do sistema que um desconhecido alcança.
-- Este arquivo assume a identidade `anon` — o papel que a chave publicável
-- carrega, e que está no navegador de qualquer visitante — e tenta ler o que
-- não deveria.
--
-- O caso central: `observacoes_internas` guarda coisas como "proprietária
-- aceita 740 mil se for à vista". Se isso vazar, o comprador chega sabendo o
-- piso do vendedor e o corretor perde a negociação por causa do sistema.
--
-- A fronteira MUDOU na 0010 e este arquivo acompanhou. Antes a proteção era
-- uma view `security definer`; hoje é PRIVILÉGIO DE COLUNA mais política de
-- RLS. A diferença aparece nos testes: não basta a coluna faltar na view — o
-- visitante que descobre o id do imóvel e monta a consulta à mão contra a
-- TABELA precisa esbarrar em `insufficient_privilege`. É esse o teste que
-- vale, porque é esse o ataque.
--
-- COMO RODAR
--   psql "$DATABASE_URL" -f supabase/tests/03_portfolio_publico.sql
--
-- Termina com P0001 de propósito: imprime o relatório e desfaz tudo.
-- ============================================================================

do $$
declare
  v_tA uuid; v_tB uuid; v_dono uuid; v_im uuid; v_im2 uuid; v_im3 uuid;
  v_n int; v_txt text; v_rel text := ''; v_ok int := 0; v_falhou int := 0;
begin
  insert into public.tenants (nome) values ('Imob Portfolio') returning id into v_tA;
  insert into public.tenants (nome, situacao) values ('Imob Suspensa', 'suspenso') returning id into v_tB;

  insert into public.pessoas (tenant_id, nome, cpf) values (v_tA, 'Dona Marta', '11144477735')
  returning id into v_dono;

  -- Anúncio publicado, endereço NÃO autorizado pelo anunciante.
  insert into public.imoveis (
    tenant_id, titulo, tipo, finalidade, situacao, proprietario_id,
    logradouro, numero, bairro, cidade, uf, latitude, longitude,
    valor, descricao_publica, observacoes_internas, comissao_percentual,
    publicado_no_portfolio, mostrar_endereco_no_portfolio, quartos, suites
  ) values (
    v_tA, 'Apto 3 dorm Vila Mariana', 'apartamento', 'venda', 'disponivel', v_dono,
    'Rua Joaquim Tavora', '1042', 'Vila Mariana', 'Sao Paulo', 'SP', -23.58, -46.63,
    780000,
    'Apartamento reformado com varanda ampla, duas vagas e lazer completo no condominio.',
    'PROPRIETARIA ACEITA 740 MIL SE FOR A VISTA', 5.0, true,
    false, 3, 1
  ) returning id into v_im;

  -- Rascunho: não pode aparecer para ninguém de fora.
  insert into public.imoveis (tenant_id, titulo, situacao, valor, finalidade)
  values (v_tA, 'Casa em negociacao sigilosa', 'rascunho', 1200000, 'venda')
  returning id into v_im2;

  -- Publicado COM endereço autorizado: prova o outro lado da coluna gerada.
  insert into public.imoveis (
    tenant_id, titulo, situacao, valor, finalidade, cidade, bairro,
    logradouro, numero, descricao_publica,
    publicado_no_portfolio, mostrar_endereco_no_portfolio
  ) values (
    v_tA, 'Casa com endereco liberado', 'disponivel', 920000, 'venda', 'Santos', 'Gonzaga',
    'Avenida Ana Costa', '500',
    'Casa de tres dormitorios a duas quadras da praia, com quintal e churrasqueira.',
    true, true
  ) returning id into v_im3;

  insert into public.imovel_midias (tenant_id, imovel_id, chave, capa, ordem)
  values (v_tA, v_im, 'tenants/x/imoveis/y/foto1.jpg', true, 0);

  -- ---------------------------------------------------------------- regras
  if (select codigo from public.imoveis where id = v_im) = 'IM-0001' then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    codigo do imovel gerado: IM-0001'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] codigo errado'||E'\n';
  end if;

  if (select publicado_em from public.imoveis where id = v_im) is not null then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    data de publicacao marcada pelo gatilho'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] publicado_em ficou nulo'||E'\n';
  end if;

  -- Anúncio sem descrição não converte e ainda ocupa vaga no plano.
  begin
    insert into public.imoveis (tenant_id, titulo, situacao, valor, finalidade, cidade,
                                descricao_publica, publicado_no_portfolio)
    values (v_tA, 'Sem descricao', 'disponivel', 500000, 'venda', 'Sao Paulo', 'curta', true);
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] publicou anuncio sem descricao'||E'\n';
  exception when check_violation then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    publicar exige descricao e preco'||E'\n';
  end;

  insert into public.imovel_interesses (tenant_id, imovel_id, pessoa_id, tipo)
  values (v_tA, v_im, v_dono, 'favorito');
  insert into public.imovel_interesses (tenant_id, imovel_id, tipo) values (v_tA, v_im, 'visualizacao');
  insert into public.imovel_interesses (tenant_id, imovel_id, tipo) values (v_tA, v_im, 'pedido_visita');

  if (select favoritos from public.imoveis where id = v_im) = 1
     and (select visualizacoes from public.imoveis where id = v_im) = 1
     and (select pedidos_visita from public.imoveis where id = v_im) = 1 then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    metricas atualizadas pelo gatilho'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] metricas nao bateram'||E'\n';
  end if;

  begin
    insert into public.imovel_interesses (tenant_id, imovel_id, pessoa_id, tipo)
    values (v_tA, v_im, v_dono, 'favorito');
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] favoritou duas vezes'||E'\n';
  exception when unique_violation then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    favorito nao se repete'||E'\n';
  end;

  -- ------------------------------------------------- colunas geradas (0010)
  if (select visivel_no_portfolio from public.imoveis where id = v_im) then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    gatilho marcou o anuncio como visivel'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] visivel_no_portfolio ficou falso'||E'\n';
  end if;

  if (select visivel_no_portfolio from public.imoveis where id = v_im2) is false then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    rascunho nunca fica visivel'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] rascunho marcado como visivel'||E'\n';
  end if;

  select endereco_publico into v_txt from public.imoveis where id = v_im;
  if v_txt is null then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    endereco_publico nulo quando nao autorizado'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] endereco vazou na coluna gerada: '||v_txt||E'\n';
  end if;

  if (select latitude_publica from public.imoveis where id = v_im) is null then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    coordenada escondida junto com o endereco'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] latitude vazou (da para achar a casa no mapa)'||E'\n';
  end if;

  select endereco_publico into v_txt from public.imoveis where id = v_im3;
  if v_txt = 'Avenida Ana Costa 500' then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    endereco_publico preenchido quando autorizado'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] endereco autorizado veio "'||coalesce(v_txt,'nulo')||'"'||E'\n';
  end if;

  -- ===================== a partir daqui somos um VISITANTE ANÔNIMO =========
  execute 'set local role anon';

  -- O ataque que importa: montar a consulta à mão contra a TABELA, pedindo
  -- nominalmente a coluna proibida. Só privilégio de coluna barra isso.
  begin
    execute 'select observacoes_internas from public.imoveis limit 1';
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] anonimo LEU observacoes_internas da TABELA'||E'\n';
  exception when insufficient_privilege then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    observacoes_internas negada por privilegio de coluna'||E'\n';
  end;

  begin
    execute 'select comissao_percentual from public.imoveis limit 1';
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] anonimo LEU comissao_percentual'||E'\n';
  exception when insufficient_privilege then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    comissao_percentual negada por privilegio de coluna'||E'\n';
  end;

  begin
    execute 'select logradouro, numero from public.imoveis limit 1';
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] anonimo LEU logradouro cru'||E'\n';
  exception when insufficient_privilege then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    logradouro e numero crus negados'||E'\n';
  end;

  begin
    execute 'select latitude, longitude from public.imoveis limit 1';
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] anonimo LEU as coordenadas cruas'||E'\n';
  exception when insufficient_privilege then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    coordenadas cruas negadas'||E'\n';
  end;

  begin
    execute 'select proprietario_id from public.imoveis limit 1';
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] anonimo LEU proprietario_id'||E'\n';
  exception when insufficient_privilege then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    proprietario_id negado'||E'\n';
  end;

  begin
    execute 'select visualizacoes, favoritos from public.imoveis limit 1';
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] anonimo LEU metricas do corretor'||E'\n';
  exception when insufficient_privilege then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    metricas do corretor negadas'||E'\n';
  end;

  -- `select *` expande para TODAS as colunas, inclusive as proibidas.
  begin
    execute 'select * from public.imoveis limit 1';
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] "select *" funcionou para o anonimo'||E'\n';
  exception when insufficient_privilege then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    "select *" negado (arrasta as colunas proibidas)'||E'\n';
  end;

  -- Tabelas que o visitante não tem nada que alcançar.
  begin
    perform count(*) from public.pessoas;
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] anonimo LEU pessoas'||E'\n';
  exception when insufficient_privilege then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    anonimo nao alcanca pessoas'||E'\n';
  end;

  begin
    perform count(*) from public.negocios;
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] anonimo LEU negocios'||E'\n';
  exception when insufficient_privilege then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    anonimo nao alcanca negocios'||E'\n';
  end;

  begin
    perform count(*) from public.tenants;
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] anonimo LEU tenants'||E'\n';
  exception when insufficient_privilege then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    anonimo nao alcanca tenants'||E'\n';
  end;

  -- ---------------------------------------------- o que ele PODE de fato
  select count(*) into v_n from public.imoveis where tenant_id = v_tA;
  if v_n = 2 then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    anonimo ve os 2 publicados; o rascunho nao vazou'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] anonimo viu '||v_n||' anuncios'||E'\n';
  end if;

  select count(*) into v_n from public.portfolio_imoveis where tenant_id = v_tA;
  if v_n = 2 then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    view security_invoker devolve os mesmos 2'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] view devolveu '||v_n||E'\n';
  end if;

  select endereco_publico into v_txt from public.portfolio_imoveis where id = v_im;
  if v_txt is null then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    endereco escondido na view para quem nao autorizou'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] endereco exposto na view'||E'\n';
  end if;

  -- A view não deve sequer nomear as colunas proibidas.
  begin
    execute 'select observacoes_internas from public.portfolio_imoveis limit 1';
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] observacoes_internas existe na view'||E'\n';
  exception when undefined_column then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    observacoes_internas nao existe na view publica'||E'\n';
  end;

  select count(*) into v_n from public.portfolio_midias where imovel_id = v_im;
  if v_n = 1 then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    foto do anuncio publicado visivel pela view'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] fotos visiveis: '||v_n||E'\n';
  end if;

  -- Ler é uma coisa; escrever é outra. O portfólio é somente leitura.
  begin
    insert into public.imovel_interesses (tenant_id, imovel_id, tipo) values (v_tA, v_im, 'contato');
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] anonimo gravou interesse'||E'\n';
  exception when insufficient_privilege then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    anonimo nao grava interesse'||E'\n';
  end;

  begin
    execute 'update public.imoveis set valor = 1 where id = '||quote_literal(v_im)||'::uuid';
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] anonimo ALTEROU o preco do anuncio'||E'\n';
  exception when insufficient_privilege then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    anonimo nao altera o anuncio'||E'\n';
  end;

  execute 'reset role';

  -- ------------------------------------------- conta suspensa sai do ar
  insert into public.imoveis (tenant_id, titulo, situacao, valor, finalidade, cidade,
                              descricao_publica, publicado_no_portfolio)
  values (v_tB, 'Anuncio de conta suspensa', 'disponivel', 600000, 'venda', 'Santos',
          'Apartamento de dois dormitorios proximo a praia, com vaga coberta e lazer.', true);

  execute 'set local role anon';
  select count(*) into v_n from public.portfolio_imoveis where tenant_id = v_tB;
  if v_n = 0 then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    anuncio nasce fora do ar em conta ja suspensa'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] anuncio de conta suspensa visivel'||E'\n';
  end if;
  execute 'reset role';

  -- Suspender DEPOIS: o gatilho de propagação tem que alcançar o que já existe.
  update public.tenants set situacao = 'suspenso' where id = v_tA;

  select count(*) into v_n from public.imoveis where tenant_id = v_tA and visivel_no_portfolio;
  if v_n = 0 then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    suspender a conta tira os anuncios do ar na hora'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] '||v_n||' anuncios continuam visiveis'||E'\n';
  end if;

  execute 'set local role anon';
  select count(*) into v_n from public.portfolio_imoveis where tenant_id = v_tA;
  if v_n = 0 then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    anonimo nao ve mais nada da conta suspensa'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] anonimo ainda ve '||v_n||E'\n';
  end if;
  execute 'reset role';

  -- Inadimplente continua no ar: o produto cobra, não pune o cliente do corretor.
  update public.tenants set situacao = 'inadimplente' where id = v_tA;
  select count(*) into v_n from public.imoveis where tenant_id = v_tA and visivel_no_portfolio;
  if v_n = 2 then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    inadimplente continua no ar (cobranca nao e censura)'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] inadimplente ficou com '||v_n||' anuncios no ar'||E'\n';
  end if;

  raise exception E'\n===== QA — IMOVEIS E PORTFOLIO PUBLICO =====\n%aprovados: %   reprovados: %\n(revertido de proposito: o banco nao guardou nada)',
    v_rel, v_ok, v_falhou;
end $$;
