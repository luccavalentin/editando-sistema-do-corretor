'use server';

import { randomUUID } from 'node:crypto';

import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';

import { clienteServidor } from '@/lib/supabase/servidor';
import { comCodigoDoGatilho } from '@/lib/supabase/insercao';
import { exigirPermissao, SemPermissao } from '@/server/sessao';
import { registrarAuditoria } from '@/server/auditoria';
import { gerarSlug, lerFormularioDeImovel } from '@/dominio/imovel';
import { etiquetaDaVitrine } from '@/server/consultas/portfolio';
import {
  ehTipoDeImagem,
  MAXIMO_DE_FOTOS_POR_IMOVEL,
  recusarArquivo,
  TAMANHO_MAXIMO_FOTO,
  TIPOS_DE_IMAGEM,
} from '@/dominio/midia';
import {
  armazenamentoDisponivel,
  autorizarEnvio,
  chaveDeFotoDeImovel,
  chaveEhDoTenant,
  conferirImagemEnviada,
  FalhaDeArmazenamento,
  remover,
} from '@/lib/armazenamento/s3';

const VIOLACAO_DE_UNICIDADE = '23505';
const VIOLACAO_DE_CHECK = '23514';

export interface EstadoDeImovel {
  erro?: string;
  campos?: Record<string, string>;
}

/** Traduz erro do banco para algo acionável, sem vazar o texto do Postgres. */
function traduzirErroDoBanco(codigo: string | undefined, detalhe: string | undefined): string {
  if (codigo === VIOLACAO_DE_CHECK) {
    // O nome da restrição é a única parte do erro do Postgres que é segura e
    // útil de traduzir: ela diz qual regra foi quebrada.
    if (detalhe?.includes('publicacao_exige_conteudo')) {
      return 'Para publicar, o anúncio precisa de descrição, preço e cidade.';
    }
    if (detalhe?.includes('valor_coerente_com_finalidade')) {
      return 'Informe o valor compatível com a finalidade do imóvel.';
    }
    if (detalhe?.includes('suites_cabem_nos_quartos')) {
      return 'Não há como ter mais suítes do que quartos.';
    }
    if (detalhe?.includes('exclusividade_com_prazo')) {
      return 'Exclusividade precisa de data de término.';
    }
    return 'Algum campo ficou fora do que o sistema aceita. Confira os valores.';
  }
  return 'Não foi possível salvar o imóvel. Tente de novo em instantes.';
}

// ---------------------------------------------------------------------------
// CADASTRO E EDIÇÃO
// ---------------------------------------------------------------------------

export async function cadastrarImovel(
  _anterior: EstadoDeImovel,
  formulario: FormData,
): Promise<EstadoDeImovel> {
  let sessao;
  try {
    sessao = await exigirPermissao('imoveis.criar');
  } catch (erro) {
    if (erro instanceof SemPermissao) {
      return { erro: 'Seu papel não permite cadastrar imóveis. Peça acesso ao proprietário.' };
    }
    throw erro;
  }

  const analise = lerFormularioDeImovel(formulario);
  if (!analise.success) {
    const campos: Record<string, string> = {};
    for (const problema of analise.error.issues) {
      const campo = String(problema.path[0] ?? 'titulo');
      campos[campo] ??= problema.message;
    }
    return { erro: 'Confira os campos destacados.', campos };
  }

  const dados = analise.data;

  // Publicar é permissão separada de cadastrar: um estagiário pode preencher a
  // ficha, mas quem coloca o anúncio no ar — com preço e endereço visíveis para
  // o mundo — precisa de autorização explícita.
  if (dados.publicadoNoPortfolio && !sessao.pode('imoveis.publicar')) {
    return {
      erro: 'Seu papel permite cadastrar, mas não publicar no portfólio. O imóvel pode ser salvo como rascunho.',
      campos: { publicadoNoPortfolio: 'Sem permissão para publicar.' },
    };
  }

  const tenantId = sessao.atual.tenant.id;
  const supabase = await clienteServidor();

  const { data: criado, error } = await supabase
    .from('imoveis')
    // `codigo` fica de fora: o gatilho do banco o gera com um contador por
    // tenant. Gerar aqui abriria corrida entre dois cadastros simultâneos.
    .insert(
      comCodigoDoGatilho<'imoveis'>({
      tenant_id: tenantId,
      titulo: dados.titulo,
      tipo: dados.tipo,
      finalidade: dados.finalidade,
      situacao: dados.situacao,
      uso: dados.uso,
      conservacao: dados.conservacao,
      proprietario_id: dados.proprietarioId ?? null,
      cep: dados.cep ?? null,
      logradouro: dados.logradouro ?? null,
      numero: dados.numero ?? null,
      complemento: dados.complemento ?? null,
      bairro: dados.bairro ?? null,
      cidade: dados.cidade ?? null,
      uf: dados.uf ?? null,
      mostrar_endereco_no_portfolio: dados.mostrarEnderecoNoPortfolio,
      valor: dados.valor ?? null,
      valor_aluguel: dados.valorAluguel ?? null,
      valor_condominio: dados.valorCondominio ?? null,
      valor_iptu: dados.valorIptu ?? null,
      aceita_financiamento: dados.aceitaFinanciamento,
      aceita_fgts: dados.aceitaFgts,
      aceita_permuta: dados.aceitaPermuta,
      area_util: dados.areaUtil ?? null,
      area_total: dados.areaTotal ?? null,
      quartos: dados.quartos ?? null,
      suites: dados.suites ?? null,
      banheiros: dados.banheiros ?? null,
      vagas: dados.vagas ?? null,
      andar: dados.andar ?? null,
      ano_construcao: dados.anoConstrucao ?? null,
      mobiliado: dados.mobiliado,
      aceita_pet: dados.aceitaPet,
      comodidades: dados.comodidades,
      comissao_percentual: dados.comissaoPercentual ?? null,
      exclusividade: dados.exclusividade,
      exclusividade_ate: dados.exclusividadeAte ?? null,
      descricao_publica: dados.descricaoPublica ?? null,
      observacoes_internas: dados.observacoesInternas ?? null,
      publicado_no_portfolio: dados.publicadoNoPortfolio,
      slug: gerarSlug(dados.titulo, dados.cidade ?? null, randomUUID().slice(0, 6)),
      responsavel_id: dados.responsavelId ?? sessao.usuarioId,
      criado_por: sessao.usuarioId,
      }),
    )
    .select('id, codigo')
    .single();

  if (error || !criado) {
    if (error?.code === VIOLACAO_DE_UNICIDADE) {
      // Colisão de slug: o sufixo aleatório repetiu. Uma nova tentativa sorteia
      // outro. Não vale a pena laço aqui — a chance é remota e o corretor só
      // precisa clicar de novo.
      return { erro: 'Ocorreu uma colisão ao gerar o endereço do anúncio. Salve de novo.' };
    }
    return { erro: traduzirErroDoBanco(error?.code, error?.message) };
  }

  await registrarAuditoria({
    tenantId,
    autorId: sessao.usuarioId,
    acao: 'criar',
    entidade: 'imovel',
    entidadeId: criado.id,
    depois: { codigo: criado.codigo, publicado: dados.publicadoNoPortfolio },
  });

  // A vitrine pública é cacheada por cinco minutos. Sem derrubar a etiqueta, o
  // corretor publicaria o anúncio, abriria o próprio site para conferir e não
  // o veria — e concluiria que o sistema não publicou.
  revalidateTag(etiquetaDaVitrine(tenantId));
  revalidatePath('/imoveis');
  redirect(`/imoveis/${criado.id}`);
}

export async function atualizarImovel(
  imovelId: string,
  _anterior: EstadoDeImovel,
  formulario: FormData,
): Promise<EstadoDeImovel> {
  let sessao;
  try {
    sessao = await exigirPermissao('imoveis.editar');
  } catch (erro) {
    if (erro instanceof SemPermissao) {
      return { erro: 'Seu papel não permite editar imóveis.' };
    }
    throw erro;
  }

  const analise = lerFormularioDeImovel(formulario);
  if (!analise.success) {
    const campos: Record<string, string> = {};
    for (const problema of analise.error.issues) {
      const campo = String(problema.path[0] ?? 'titulo');
      campos[campo] ??= problema.message;
    }
    return { erro: 'Confira os campos destacados.', campos };
  }

  const dados = analise.data;
  if (dados.publicadoNoPortfolio && !sessao.pode('imoveis.publicar')) {
    return {
      erro: 'Seu papel não permite publicar no portfólio.',
      campos: { publicadoNoPortfolio: 'Sem permissão para publicar.' },
    };
  }

  const supabase = await clienteServidor();

  // A RLS já limita ao tenant do usuário; o `eq` explícito documenta a intenção
  // e protege caso alguém afrouxe a política um dia.
  const { error } = await supabase
    .from('imoveis')
    .update({
      titulo: dados.titulo,
      tipo: dados.tipo,
      finalidade: dados.finalidade,
      situacao: dados.situacao,
      uso: dados.uso,
      conservacao: dados.conservacao,
      proprietario_id: dados.proprietarioId ?? null,
      cep: dados.cep ?? null,
      logradouro: dados.logradouro ?? null,
      numero: dados.numero ?? null,
      complemento: dados.complemento ?? null,
      bairro: dados.bairro ?? null,
      cidade: dados.cidade ?? null,
      uf: dados.uf ?? null,
      mostrar_endereco_no_portfolio: dados.mostrarEnderecoNoPortfolio,
      valor: dados.valor ?? null,
      valor_aluguel: dados.valorAluguel ?? null,
      valor_condominio: dados.valorCondominio ?? null,
      valor_iptu: dados.valorIptu ?? null,
      aceita_financiamento: dados.aceitaFinanciamento,
      aceita_fgts: dados.aceitaFgts,
      aceita_permuta: dados.aceitaPermuta,
      area_util: dados.areaUtil ?? null,
      area_total: dados.areaTotal ?? null,
      quartos: dados.quartos ?? null,
      suites: dados.suites ?? null,
      banheiros: dados.banheiros ?? null,
      vagas: dados.vagas ?? null,
      andar: dados.andar ?? null,
      ano_construcao: dados.anoConstrucao ?? null,
      mobiliado: dados.mobiliado,
      aceita_pet: dados.aceitaPet,
      comodidades: dados.comodidades,
      comissao_percentual: dados.comissaoPercentual ?? null,
      exclusividade: dados.exclusividade,
      exclusividade_ate: dados.exclusividadeAte ?? null,
      descricao_publica: dados.descricaoPublica ?? null,
      observacoes_internas: dados.observacoesInternas ?? null,
      publicado_no_portfolio: dados.publicadoNoPortfolio,
      responsavel_id: dados.responsavelId ?? null,
    })
    .eq('id', imovelId)
    .eq('tenant_id', sessao.atual.tenant.id);

  if (error) {
    return { erro: traduzirErroDoBanco(error.code, error.message) };
  }

  await registrarAuditoria({
    tenantId: sessao.atual.tenant.id,
    autorId: sessao.usuarioId,
    acao: 'editar',
    entidade: 'imovel',
    entidadeId: imovelId,
    depois: { publicado: dados.publicadoNoPortfolio, situacao: dados.situacao },
  });

  revalidateTag(etiquetaDaVitrine(sessao.atual.tenant.id));
  revalidatePath(`/imoveis/${imovelId}`);
  revalidatePath('/imoveis');
  return {};
}

/**
 * Tira o imóvel do ar sem apagar o histórico.
 *
 * Exclusão é lógica porque o imóvel aparece em negócio fechado, comissão e
 * auditoria. Apagar de verdade deixaria buraco em relatório de anos anteriores.
 */
export async function arquivarImovel(imovelId: string): Promise<{ erro?: string }> {
  let sessao;
  try {
    sessao = await exigirPermissao('imoveis.excluir');
  } catch (erro) {
    if (erro instanceof SemPermissao) return { erro: 'Seu papel não permite excluir imóveis.' };
    throw erro;
  }

  const supabase = await clienteServidor();
  const { error } = await supabase
    .from('imoveis')
    .update({ excluido_em: new Date().toISOString(), publicado_no_portfolio: false })
    .eq('id', imovelId)
    .eq('tenant_id', sessao.atual.tenant.id);

  if (error) return { erro: 'Não foi possível arquivar o imóvel.' };

  await registrarAuditoria({
    tenantId: sessao.atual.tenant.id,
    autorId: sessao.usuarioId,
    acao: 'excluir',
    entidade: 'imovel',
    entidadeId: imovelId,
  });

  revalidateTag(etiquetaDaVitrine(sessao.atual.tenant.id));
  revalidatePath('/imoveis');
  redirect('/imoveis');
}

// ---------------------------------------------------------------------------
// FOTOS — o envio acontece em duas etapas, e a ordem importa
// ---------------------------------------------------------------------------

export interface AutorizacaoDeEnvio {
  erro?: string;
  autorizacao?: {
    url: string;
    chave: string;
    tipoConteudo: string;
    expiraEm: string;
  };
}

/**
 * ETAPA 1 — autoriza o navegador a enviar UM arquivo.
 *
 * Confere permissão, confere o imóvel, confere o limite de fotos, e só então
 * assina. A chave do objeto é derivada aqui: o cliente manda o nome e o tipo do
 * arquivo, nunca o caminho de destino. Se mandasse, `../` seria a forma mais
 * barata de escrever na pasta de outro corretor.
 */
export async function autorizarEnvioDeFoto(parametros: {
  imovelId: string;
  tipoConteudo: string;
  tamanho: number;
}): Promise<AutorizacaoDeEnvio> {
  let sessao;
  try {
    sessao = await exigirPermissao('imoveis.editar');
  } catch (erro) {
    if (erro instanceof SemPermissao) return { erro: 'Seu papel não permite enviar fotos.' };
    throw erro;
  }

  if (!armazenamentoDisponivel()) {
    return {
      erro: 'O armazenamento de fotos ainda não está configurado nesta instalação.',
    };
  }

  const recusa = recusarArquivo({
    tipoDeclarado: parametros.tipoConteudo,
    tamanho: parametros.tamanho,
    limite: TAMANHO_MAXIMO_FOTO,
  });
  if (recusa) return { erro: recusa };

  if (!ehTipoDeImagem(parametros.tipoConteudo)) {
    return { erro: 'Formato não aceito.' };
  }

  const tenantId = sessao.atual.tenant.id;
  const supabase = await clienteServidor();

  // A RLS devolveria vazio para imóvel de outro tenant; conferir aqui é o que
  // transforma isso numa mensagem em vez de num erro genérico depois.
  const { data: imovel } = await supabase
    .from('imoveis')
    .select('id')
    .eq('id', parametros.imovelId)
    .eq('tenant_id', tenantId)
    .is('excluido_em', null)
    .maybeSingle();

  if (!imovel) return { erro: 'Imóvel não encontrado.' };

  const { count } = await supabase
    .from('imovel_midias')
    .select('id', { count: 'exact', head: true })
    .eq('imovel_id', parametros.imovelId);

  if ((count ?? 0) >= MAXIMO_DE_FOTOS_POR_IMOVEL) {
    return {
      erro: `Este imóvel já tem ${MAXIMO_DE_FOTOS_POR_IMOVEL} fotos, que é o máximo. Remova alguma antes de enviar outra.`,
    };
  }

  const chave = chaveDeFotoDeImovel({
    tenantId,
    imovelId: parametros.imovelId,
    extensao: TIPOS_DE_IMAGEM[parametros.tipoConteudo].extensao,
  });

  try {
    const autorizacao = autorizarEnvio({ chave, tipoConteudo: parametros.tipoConteudo });
    return {
      autorizacao: {
        url: autorizacao.url,
        chave: autorizacao.chave,
        tipoConteudo: parametros.tipoConteudo,
        expiraEm: autorizacao.expiraEm,
      },
    };
  } catch (erro) {
    if (erro instanceof FalhaDeArmazenamento) return { erro: erro.message };
    throw erro;
  }
}

/**
 * ETAPA 2 — confere o que chegou e só então grava no banco.
 *
 * Esta é a etapa que não pode ser pulada. Quem assina a URL não vê os bytes, e
 * o `Content-Type` é declaração do cliente. Aqui o servidor olha o arquivo de
 * verdade: existe, tem tamanho plausível, e os primeiros bytes são mesmo de uma
 * imagem. Reprovou, o objeto é apagado e nada entra no banco.
 *
 * A ordem — conferir, depois gravar — é o que garante que toda linha de
 * `imovel_midias` aponta para uma foto que existe. O contrário deixaria o
 * anúncio com imagem quebrada, que o corretor descobre na frente do cliente.
 */
export async function confirmarFotoEnviada(parametros: {
  imovelId: string;
  chave: string;
  legenda?: string;
}): Promise<{ erro?: string; midiaId?: string }> {
  let sessao;
  try {
    sessao = await exigirPermissao('imoveis.editar');
  } catch (erro) {
    if (erro instanceof SemPermissao) return { erro: 'Seu papel não permite enviar fotos.' };
    throw erro;
  }

  const tenantId = sessao.atual.tenant.id;

  // A chave volta do cliente. Ela foi gerada aqui na etapa 1, mas nada impede
  // alguém de chamar esta ação direto com outra — daí a conferência.
  if (!chaveEhDoTenant(parametros.chave, tenantId)) {
    await registrarAuditoria({
      tenantId,
      autorId: sessao.usuarioId,
      acao: 'recusar_midia',
      entidade: 'imovel_midia',
      metadados: { chave: parametros.chave },
    });
    return { erro: 'Envio inválido.' };
  }

  if (!parametros.chave.includes(`/imoveis/${parametros.imovelId}/`)) {
    return { erro: 'Envio inválido.' };
  }

  const supabase = await clienteServidor();

  const { data: imovel } = await supabase
    .from('imoveis')
    .select('id')
    .eq('id', parametros.imovelId)
    .eq('tenant_id', tenantId)
    .is('excluido_em', null)
    .maybeSingle();

  if (!imovel) return { erro: 'Imóvel não encontrado.' };

  let conferencia;
  try {
    conferencia = await conferirImagemEnviada({
      chave: parametros.chave,
      tamanhoMaximo: TAMANHO_MAXIMO_FOTO,
    });
  } catch (erro) {
    if (erro instanceof FalhaDeArmazenamento) return { erro: erro.message };
    throw erro;
  }

  if (!conferencia.aprovado) {
    return { erro: conferencia.motivo ?? 'O arquivo enviado não foi aceito.' };
  }

  // Primeira foto vira capa sozinha. Sem isso o anúncio nasce sem imagem
  // principal e a lista fica com um buraco cinza.
  const { count } = await supabase
    .from('imovel_midias')
    .select('id', { count: 'exact', head: true })
    .eq('imovel_id', parametros.imovelId);

  const jaTem = count ?? 0;

  const { data: midia, error } = await supabase
    .from('imovel_midias')
    .insert({
      tenant_id: tenantId,
      imovel_id: parametros.imovelId,
      tipo: 'foto',
      chave: parametros.chave,
      legenda: parametros.legenda?.slice(0, 120) ?? null,
      ordem: jaTem,
      capa: jaTem === 0,
      bytes: conferencia.tamanho,
      tipo_conteudo: conferencia.tipoReal,
      criado_por: sessao.usuarioId,
    })
    .select('id')
    .single();

  if (error || !midia) {
    // A linha não entrou: o objeto vira lixo se ficar. Removê-lo aqui mantém a
    // regra de que armazenamento e banco contam a mesma história.
    await remover(parametros.chave).catch(() => {});
    return { erro: 'Não foi possível registrar a foto.' };
  }

  revalidateTag(etiquetaDaVitrine(tenantId));
  revalidatePath(`/imoveis/${parametros.imovelId}`);
  return { midiaId: midia.id };
}

export async function removerFoto(parametros: {
  imovelId: string;
  midiaId: string;
}): Promise<{ erro?: string }> {
  let sessao;
  try {
    sessao = await exigirPermissao('imoveis.editar');
  } catch (erro) {
    if (erro instanceof SemPermissao) return { erro: 'Seu papel não permite remover fotos.' };
    throw erro;
  }

  const tenantId = sessao.atual.tenant.id;
  const supabase = await clienteServidor();

  const { data: midia } = await supabase
    .from('imovel_midias')
    .select('id, chave, capa')
    .eq('id', parametros.midiaId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (!midia) return { erro: 'Foto não encontrada.' };

  const { error } = await supabase
    .from('imovel_midias')
    .delete()
    .eq('id', parametros.midiaId)
    .eq('tenant_id', tenantId);

  if (error) return { erro: 'Não foi possível remover a foto.' };

  // O banco primeiro, o armazenamento depois. Se a ordem fosse inversa e o
  // banco falhasse, o anúncio ficaria apontando para um arquivo que já não
  // existe — imagem quebrada na tela do cliente. Na ordem certa, o pior caso é
  // um arquivo órfão, que não incomoda ninguém.
  await remover(midia.chave).catch(() => {});

  // A capa saiu: a próxima foto assume, senão o anúncio fica sem imagem
  // principal e a lista mostra um espaço vazio.
  if (midia.capa) {
    const { data: proxima } = await supabase
      .from('imovel_midias')
      .select('id')
      .eq('imovel_id', parametros.imovelId)
      .eq('tenant_id', tenantId)
      .order('ordem', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (proxima) {
      await supabase.from('imovel_midias').update({ capa: true }).eq('id', proxima.id);
    }
  }

  revalidateTag(etiquetaDaVitrine(tenantId));
  revalidatePath(`/imoveis/${parametros.imovelId}`);
  return {};
}

export async function definirCapa(parametros: {
  imovelId: string;
  midiaId: string;
}): Promise<{ erro?: string }> {
  let sessao;
  try {
    sessao = await exigirPermissao('imoveis.editar');
  } catch (erro) {
    if (erro instanceof SemPermissao) return { erro: 'Seu papel não permite editar fotos.' };
    throw erro;
  }

  const tenantId = sessao.atual.tenant.id;
  const supabase = await clienteServidor();

  // Tirar a capa antiga ANTES de pôr a nova: existe índice único parcial
  // garantindo uma capa por imóvel, e a ordem inversa esbarraria nele.
  await supabase
    .from('imovel_midias')
    .update({ capa: false })
    .eq('imovel_id', parametros.imovelId)
    .eq('tenant_id', tenantId)
    .eq('capa', true);

  const { error } = await supabase
    .from('imovel_midias')
    .update({ capa: true })
    .eq('id', parametros.midiaId)
    .eq('tenant_id', tenantId);

  if (error) return { erro: 'Não foi possível definir a capa.' };

  revalidateTag(etiquetaDaVitrine(tenantId));
  revalidatePath(`/imoveis/${parametros.imovelId}`);
  return {};
}
