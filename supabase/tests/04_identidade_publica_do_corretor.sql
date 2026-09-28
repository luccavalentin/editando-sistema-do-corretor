-- ============================================================================
-- QA — IDENTIDADE PÚBLICA DO CORRETOR (migração 0012)
--
-- A 0010 provou que o visitante não alcança as colunas privadas do IMÓVEL.
-- Aqui a pergunta é sobre o CORRETOR: a vitrine `/c/<slug>` precisa mostrar
-- nome, CRECI e contato, e `tenants` guarda ao lado disso o CPF/CNPJ, os
-- limites do plano e a situação de pagamento.
--
-- Dois casos merecem atenção especial:
--
--   1. CONSENTIMENTO. `portfolio_ativo` nasce falso. Um corretor que criou a
--      conta e não lançou nada não pode ter o nome numa página indexável — e o
--      teste confere que os anúncios dele também não sobem sozinhos.
--
--   2. `situacao`. A POLÍTICA lê essa coluna para decidir quais linhas o
--      visitante alcança, mas o privilégio de leitura NÃO é concedido. É a
--      prova de que política e privilégio são checagens separadas: o visitante
--      nunca descobre que aquele corretor está inadimplente.
--
-- COMO RODAR
--   psql "$DATABASE_URL" -f supabase/tests/04_identidade_publica_do_corretor.sql
--
-- Termina com P0001 de propósito: imprime o relatório e desfaz tudo.
-- ============================================================================

do $$
declare
  v_t uuid; v_im uuid; v_n int; v_txt text;
  v_rel text := ''; v_ok int := 0; v_falhou int := 0;
begin
  insert into public.tenants (nome, slug, cpf_cnpj, creci)
  values ('Imobiliaria Vitrine', 'imob-vitrine', '11144477735', 'CRECI-SP 123456')
  returning id into v_t;

  insert into public.imoveis (tenant_id, titulo, situacao, valor, finalidade, cidade,
                              descricao_publica, publicado_no_portfolio, slug)
  values (v_t, 'Apto na Vila Mariana', 'disponivel', 780000, 'venda', 'Sao Paulo',
          'Apartamento reformado com varanda ampla, duas vagas e lazer completo no condominio.',
          true, 'apto-vila-mariana-abc123')
  returning id into v_im;

  -- ----------------------------------------------------- consentimento
  if (select visivel_no_portfolio from public.imoveis where id = v_im) is false then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    anuncio NAO vai ao ar sem a vitrine ligada'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] anuncio no ar sem consentimento do corretor'||E'\n';
  end if;

  execute 'set local role anon';
  select count(*) into v_n from public.portfolio_corretores where id = v_t;
  if v_n = 0 then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    corretor sem vitrine nao aparece para o visitante'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] corretor listado sem ter publicado'||E'\n';
  end if;
  execute 'reset role';

  -- Vitrine no ar sem slug é URL impossível; sem título, é resultado de busca
  -- sem nome. O banco recusa antes de a página existir quebrada.
  begin
    update public.tenants set portfolio_ativo = true where id = v_t;
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] ligou a vitrine sem titulo'||E'\n';
  exception when check_violation then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    ligar a vitrine exige slug e titulo'||E'\n';
  end;

  update public.tenants
  set portfolio_ativo = true, portfolio_titulo = 'Marina Duarte Imoveis',
      portfolio_whatsapp = '11987654321', portfolio_bio = 'Atendo a zona sul ha 12 anos.'
  where id = v_t;

  if (select visivel_no_portfolio from public.imoveis where id = v_im) then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    ligar a vitrine trouxe o anuncio ao ar'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] anuncio nao subiu com a vitrine'||E'\n';
  end if;

  -- ------------------------------------------------- visitante anônimo
  execute 'set local role anon';

  select portfolio_titulo into v_txt from public.portfolio_corretores where slug = 'imob-vitrine';
  if v_txt = 'Marina Duarte Imoveis' then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    visitante acha a vitrine pelo slug'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] vitrine nao encontrada pelo slug'||E'\n';
  end if;

  begin
    execute 'select cpf_cnpj from public.tenants limit 1';
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] visitante LEU o CPF/CNPJ do corretor'||E'\n';
  exception when insufficient_privilege then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    CPF/CNPJ do corretor negado por privilegio de coluna'||E'\n';
  end;

  -- O caso que prova a separação entre política e privilégio.
  begin
    execute 'select situacao from public.tenants limit 1';
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] visitante descobre se o corretor esta inadimplente'||E'\n';
  exception when insufficient_privilege then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    situacao de pagamento negada (a politica le, o visitante nao)'||E'\n';
  end;

  begin
    execute 'select limite_imoveis, limite_usuarios from public.tenants limit 1';
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] visitante LEU os limites do plano'||E'\n';
  exception when insufficient_privilege then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    limites do plano negados'||E'\n';
  end;

  begin
    execute 'select * from public.tenants limit 1';
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] "select *" em tenants funcionou'||E'\n';
  exception when insufficient_privilege then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    "select *" em tenants negado'||E'\n';
  end;

  select count(*) into v_n from public.portfolio_imoveis where tenant_id = v_t;
  if v_n = 1 then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    o anuncio da vitrine e visivel'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] anuncios visiveis: '||v_n||E'\n';
  end if;

  execute 'reset role';

  -- --------------------------------- desligar a vitrine leva os anúncios
  -- Sem esta propagação, "tirei do ar" significaria só que a página do
  -- corretor sumiu — os anúncios continuariam alcançáveis por URL direta, e
  -- por buscador, que já os indexou.
  update public.tenants set portfolio_ativo = false where id = v_t;

  if (select visivel_no_portfolio from public.imoveis where id = v_im) is false then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    desligar a vitrine tirou o anuncio do ar junto'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] anuncio sobreviveu ao desligamento da vitrine'||E'\n';
  end if;

  execute 'set local role anon';
  select count(*) into v_n from public.portfolio_imoveis where tenant_id = v_t;
  if v_n = 0 then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    URL direta do anuncio tambem deixa de achar'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] anuncio ainda alcancavel por URL direta'||E'\n';
  end if;
  execute 'reset role';

  raise exception E'\n===== QA — IDENTIDADE PUBLICA DO CORRETOR =====\n%aprovados: %   reprovados: %\n(revertido de proposito: o banco nao guardou nada)',
    v_rel, v_ok, v_falhou;
end $$;
