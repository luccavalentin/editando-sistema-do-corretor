-- ============================================================================
-- QA — PORTAL DO CLIENTE (migrações 0015, 0016 e 0017)
--
-- A terceira ponta do sistema, e a de autenticação mais fraca: CPF e data de
-- nascimento, sem senha. Isso foi decisão de produto, e é a certa — um
-- comprador de imóvel abre este portal três ou quatro vezes na vida, e exigir
-- cadastro derruba a adesão a quase zero.
--
-- Mas CPF não é segredo no Brasil, e data de nascimento também não. O que
-- protege aqui NÃO é a força do segredo: é o limite de tentativa. Sem ele, um
-- laço com dez mil datas acha a de qualquer CPF em segundos. Por isso o teste
-- mais importante deste arquivo é o de força bruta.
--
-- O segundo grupo é sobre RECORTE: o cliente vê o próprio processo, não a visão
-- que o corretor tem dele. A observação interna sobre o imóvel, a comissão, o
-- endereço exato e o texto cru que o banco devolveu ficam de fora — e o teste
-- prova que essas colunas nem EXISTEM no retorno das funções, em vez de
-- confiar que ninguém vai selecioná-las.
--
-- COMO RODAR
--   psql "$DATABASE_URL" -f supabase/tests/06_portal_do_cliente.sql
--
-- Termina com P0001 de propósito: imprime o relatório e desfaz tudo.
-- ============================================================================

do $$
declare
  v_t uuid; v_tB uuid; v_p uuid; v_pB uuid; v_im uuid; v_sim uuid;
  v_r record; v_n int; v_json jsonb; v_gravou boolean; v_aceitou boolean;
  v_rel text := ''; v_ok int := 0; v_falhou int := 0;
begin
  insert into public.tenants (nome, creci, portfolio_titulo)
  values ('Imob Portal', 'CRECI-SP 99999', 'Marina Imoveis') returning id into v_t;
  insert into public.tenants (nome) values ('Imob Rival') returning id into v_tB;

  insert into public.pessoas (tenant_id, nome, cpf, data_nascimento)
  values (v_t, 'Mariana Duarte', '11144477735', '1988-04-12') returning id into v_p;
  insert into public.pessoas (tenant_id, nome, cpf, data_nascimento)
  values (v_tB, 'Cliente do Rival', '52998224725', '1990-01-01') returning id into v_pB;

  insert into public.imoveis (tenant_id, titulo, situacao, valor, finalidade, cidade, bairro,
                              observacoes_internas, comissao_percentual, exclusividade,
                              exclusividade_ate, logradouro, numero, descricao_publica)
  values (v_t, 'Apto Vila Mariana', 'disponivel', 780000, 'venda', 'Sao Paulo', 'Vila Mariana',
          'PROPRIETARIA ACEITA 740 MIL A VISTA', 6.5, true, '2027-01-01',
          'Rua Joaquim Tavora', '1042', 'Apartamento reformado com varanda ampla e duas vagas.')
  returning id into v_im;

  insert into public.imovel_interesses (tenant_id, imovel_id, pessoa_id, tipo)
  values (v_t, v_im, v_p, 'favorito');

  insert into public.simulacoes (tenant_id, pessoa_id, imovel_id, valor_imovel, valor_entrada,
    valor_financiamento, prazo_meses, renda_total, uf, nome_titular, cpf_titular,
    data_nascimento_titular)
  values (v_t, v_p, v_im, 780000, 234000, 546000, 360, 18400, 'SP',
          'Mariana Duarte', '11144477735', '1988-04-12')
  returning id into v_sim;

  insert into public.simulacao_bancos (tenant_id, simulacao_id, homefin_id_banco, nome_banco,
    situacao, valor_parcela, taxa_juros_ano, retorno_integracao, codigo_situacao_banco)
  values (v_t, v_sim, 45, 'Bradesco', 'aprovado', 4320.55, 10.49,
          'INT-006 pipeline_credito.avaliacao_v2 falhou: undefined', 'XYZ-99');

  -- ====================================== 1. o corretor controla o acesso
  select * into v_r from public.autenticar_no_portal('11144477735', '1988-04-12');
  if not v_r.autorizado and v_r.motivo = 'nao_liberado' then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    portal fechado ate o corretor liberar'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] entrou sem o portal estar liberado'||E'\n';
  end if;

  update public.pessoas set portal_liberado = true where id = v_p;

  select * into v_r from public.autenticar_no_portal('111.444.777-35', '1988-04-12',
                                                     '203.0.113.9'::inet, 'teste');
  if v_r.autorizado and v_r.pessoa_id = v_p and v_r.nome = 'Mariana Duarte' then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    entra com CPF mascarado e data certa'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] nao entrou: '||coalesce(v_r.motivo,'?')||E'\n';
  end if;

  if (select portal_ultimo_acesso_em from public.pessoas where id = v_p) is not null then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    ultimo acesso registrado na pessoa'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] ultimo acesso nao gravou'||E'\n';
  end if;

  -- O log agrupa tentativas por documento. Guardar o CPF em claro faria dele
  -- uma SEGUNDA base de CPFs — incluindo os de quem nem é cliente, digitados
  -- por engano ou por quem estava sondando.
  select count(*) into v_n from public.portal_acessos where cpf_hash like '%11144477735%';
  if v_n = 0 then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    o log guarda hash, nunca o CPF em claro'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] CPF em claro no log de acesso'||E'\n';
  end if;

  -- =========================== 2. o que protege: o limite de tentativa
  select * into v_r from public.autenticar_no_portal('11144477735', '1990-01-01',
                                                     '203.0.113.9'::inet);
  if not v_r.autorizado and v_r.motivo = 'nao_confere' then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    data errada nao entra'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] entrou com data errada'||E'\n';
  end if;

  -- CPF inexistente devolve o MESMO motivo que data errada. Distinguir os dois
  -- transformaria o portal num verificador de CPF: descobrir se fulano é
  -- cliente daquele corretor custaria uma tentativa.
  select * into v_r from public.autenticar_no_portal('39053344705', '1988-04-12',
                                                     '203.0.113.9'::inet);
  if v_r.motivo = 'nao_confere' then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    CPF inexistente da o MESMO motivo que data errada'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] motivo distinto revela se o CPF e cliente'||E'\n';
  end if;

  -- Já houve 2 erros com este CPF; mais 3 fecham os 5.
  for v_n in 1..3 loop
    select * into v_r from public.autenticar_no_portal('11144477735', '1970-01-01',
                                                       '198.51.100.7'::inet);
  end loop;

  -- A asserção que mais importa: depois de cinco erros, nem a data CERTA entra.
  select * into v_r from public.autenticar_no_portal('11144477735', '1988-04-12',
                                                     '198.51.100.7'::inet);
  if not v_r.autorizado and v_r.motivo = 'bloqueado' and v_r.segundos_de_espera = 1800 then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    5 erros travam o CPF, mesmo com a data CERTA depois'||E'\n';
  else
    v_falhou := v_falhou+1;
    v_rel := v_rel||'[FALHA] forca bruta nao foi travada: '||coalesce(v_r.motivo,'?')||E'\n';
  end if;

  -- ============================================= 3. o recorte do cliente
  select count(*) into v_n from public.portal_meus_imoveis(v_p);
  if v_n = 1 then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    ve o imovel que favoritou'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] viu '||v_n||' imoveis'||E'\n';
  end if;

  -- As colunas proibidas nem EXISTEM no retorno. Isto é mais forte do que
  -- confiar que nenhuma consulta vai selecioná-las.
  begin
    execute 'select observacoes_internas from public.portal_meus_imoveis($1)' using v_p;
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] observacoes_internas saiu no portal'||E'\n';
  exception when undefined_column then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    observacoes_internas nao existe no portal'||E'\n';
  end;

  begin
    execute 'select comissao_percentual from public.portal_meus_imoveis($1)' using v_p;
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] comissao saiu no portal'||E'\n';
  exception when undefined_column then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    comissao do corretor nao existe no portal'||E'\n';
  end;

  begin
    execute 'select logradouro from public.portal_meus_imoveis($1)' using v_p;
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] endereco exato saiu no portal'||E'\n';
  exception when undefined_column then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    endereco exato nao existe no portal'||E'\n';
  end;

  -- O texto cru do banco é escrito para o operador, e às vezes traz nome de
  -- sistema interno. O cliente lê a situação traduzida.
  select bancos into v_json from public.portal_minhas_simulacoes(v_p);
  if v_json::text not like '%INT-006%' and v_json::text not like '%pipeline_credito%' then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    texto cru do banco nao vaza para o cliente'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] retorno cru do banco apareceu no portal'||E'\n';
  end if;

  if v_json::text like '%Bradesco%' and v_json::text like '%4320.55%' then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    o cliente ve banco, parcela e situacao'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] a comparacao de bancos nao chegou'||E'\n';
  end if;

  -- ====================================================== 4. isolamento
  select count(*) into v_n from public.portal_meus_imoveis(v_pB);
  if v_n = 0 then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    cliente de outro corretor nao ve nada daqui'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] vazou entre clientes de corretores diferentes'||E'\n';
  end if;

  -- ============================================ 5. consentimento (0017)
  if (select lgpd_aceito from public.portal_meu_resumo(v_p)) is false then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    primeiro acesso ainda nao consentiu'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] consentimento presumido'||E'\n';
  end if;

  -- DUAS instrucoes, e nao uma expressao so. `portal_meu_resumo` e `stable`:
  -- ela enxerga o instantaneo do INICIO da instrucao. Juntar a gravacao e a
  -- leitura num unico `if` faz a leitura acontecer antes de a escrita existir,
  -- e o teste reprova um codigo correto — foi o que aconteceu na primeira
  -- versao deste arquivo.
  v_gravou := public.portal_aceitar_termo(v_p, '2026-09-25');
  select lgpd_aceito into v_aceitou from public.portal_meu_resumo(v_p);

  if v_gravou and v_aceitou then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    aceite registrado com data e versao'||E'\n';
  else
    v_falhou := v_falhou+1;
    v_rel := v_rel||'[FALHA] aceite nao gravou (funcao: '||v_gravou||', resumo: '||v_aceitou||')'||E'\n';
  end if;

  -- ======================================= 6. revogacao e exclusao
  update public.pessoas set portal_liberado = false where id = v_p;
  select count(*) into v_n from public.portal_meus_imoveis(v_p);
  if v_n = 0 then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    revogar o portal corta os dados, nao so a entrada'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] dados seguem acessiveis apos revogar'||E'\n';
  end if;

  update public.pessoas set portal_liberado = true where id = v_p;
  perform public.portal_excluir_meus_dados(v_p);

  -- A exclusão apaga o que é DO PORTAL. O cadastro na imobiliária permanece: o
  -- corretor tem obrigação legal de manter registro da negociação, e a tela diz
  -- isso ao titular antes de confirmar.
  if (select count(*) from public.portal_acessos where pessoa_id = v_p) = 0
     and (select portal_liberado from public.pessoas where id = v_p) is false
     and (select portal_lgpd_aceito_em from public.pessoas where id = v_p) is null then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    exclusao apaga o rastro do portal'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] rastro do portal sobreviveu a exclusao'||E'\n';
  end if;

  if (select count(*) from public.pessoas where id = v_p) = 1
     and (select count(*) from public.simulacoes where pessoa_id = v_p) = 1 then
    v_ok := v_ok+1;
    v_rel := v_rel||'[ok]    o cadastro na imobiliaria PERMANECE (obrigacao legal)'||E'\n';
  else
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] apagou o cadastro, que devia permanecer'||E'\n';
  end if;

  -- ============================= 7. nada disso e alcancavel pelo anonimo
  execute 'set local role anon';

  begin
    execute 'select * from public.portal_meu_resumo($1)' using v_p;
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] ANONIMO chamou a funcao do portal'||E'\n';
  exception when insufficient_privilege then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    anonimo nao executa as funcoes do portal'||E'\n';
  end;

  begin
    execute 'select * from public.autenticar_no_portal($1, $2)' using '11144477735', '1988-04-12';
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] ANONIMO chamou a autenticacao direto'||E'\n';
  exception when insufficient_privilege then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    anonimo nao executa a autenticacao do portal'||E'\n';
  end;

  begin
    perform count(*) from public.portal_acessos;
    v_falhou := v_falhou+1; v_rel := v_rel||'[FALHA] anonimo leu o log de acessos'||E'\n';
  exception when insufficient_privilege then
    v_ok := v_ok+1; v_rel := v_rel||'[ok]    anonimo nao alcanca o log de acessos'||E'\n';
  end;

  execute 'reset role';

  raise exception E'\n===== QA — PORTAL DO CLIENTE =====\n%aprovados: %   reprovados: %\n(revertido de proposito: o banco nao guardou nada)',
    v_rel, v_ok, v_falhou;
end $$;
