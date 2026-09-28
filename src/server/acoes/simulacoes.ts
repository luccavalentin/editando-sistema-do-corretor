'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { clienteServidor } from '@/lib/supabase/servidor';
import { comCodigoDoGatilho } from '@/lib/supabase/insercao';
import { exigirPermissao, SemPermissao } from '@/server/sessao';
import { registrarAuditoria } from '@/server/auditoria';
import { lerFormularioDeSimulacao } from '@/dominio/simulacao';
import { documentoParaLog } from '@/lib/privacidade/documentos';
import { homefinEstaConfigurada } from '@/server/integracoes/homefin/cliente';
import {
  enviarSimulacao,
  reconciliarSimulacao,
  type BancoParaSimular,
} from '@/server/integracoes/homefin/simulacao';

export interface EstadoDeSimulacao {
  erro?: string;
  campos?: Record<string, string>;
}

/**
 * Bancos oferecidos quando a Homefin não responde à listagem de domínios.
 *
 * Ids confirmados na coleção oficial da API. Existir como fallback é o que
 * permite o corretor montar a simulação mesmo com a listagem instável — a
 * simulação em si continua exigindo a integração no ar.
 */
const BANCOS_CONHECIDOS: BancoParaSimular[] = [
  { idBanco: 45, codigoBanco: 237, nomeBanco: 'Bradesco' },
  { idBanco: 61, codigoBanco: 341, nomeBanco: 'Itaú' },
  { idBanco: 9, codigoBanco: 33, nomeBanco: 'Santander' },
];

/**
 * Cria a simulação NO NOSSO BANCO, sem enviar a lugar nenhum.
 *
 * A separação entre criar e enviar é deliberada. O corretor monta a simulação
 * com o cliente na frente, confere os números, mostra a estimativa — e só
 * então decide mandar aos bancos. Enviar junto com o salvar tiraria dele a
 * chance de revisar, e cada envio é uma consulta que fica registrada no nome do
 * cliente.
 */
export async function criarSimulacao(
  _anterior: EstadoDeSimulacao,
  formulario: FormData,
): Promise<EstadoDeSimulacao> {
  let sessao;
  try {
    sessao = await exigirPermissao('simulacao.criar');
  } catch (erro) {
    if (erro instanceof SemPermissao) {
      return { erro: 'Seu papel não permite criar simulações.' };
    }
    throw erro;
  }

  const analise = lerFormularioDeSimulacao(formulario);
  if (!analise.success) {
    const campos: Record<string, string> = {};
    for (const problema of analise.error.issues) {
      const campo = String(problema.path[0] ?? 'valorImovel');
      campos[campo] ??= problema.message;
    }
    return { erro: 'Confira os campos destacados.', campos };
  }

  const dados = analise.data;
  const tenantId = sessao.atual.tenant.id;
  const supabase = await clienteServidor();

  // O titular vem do CRM, não é redigitado. Sem CPF e data de nascimento o
  // banco não analisa ninguém — e é melhor dizer isso agora, apontando para o
  // cadastro, do que receber uma recusa genérica depois.
  const { data: pessoa } = await supabase
    .from('pessoas')
    .select('id, nome, cpf, data_nascimento, email')
    .eq('id', dados.pessoaId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (!pessoa) return { erro: 'Cliente não encontrado.' };

  if (!pessoa.cpf) {
    return {
      erro: 'O cliente está sem CPF no cadastro, e o banco não analisa crédito sem ele.',
      campos: { pessoaId: 'Complete o CPF no cadastro do cliente.' },
    };
  }

  if (!pessoa.data_nascimento) {
    return {
      erro: 'O cliente está sem data de nascimento, e o banco exige para a análise.',
      campos: { pessoaId: 'Complete a data de nascimento no cadastro do cliente.' },
    };
  }

  const valorFinanciamento = dados.valorImovel - dados.valorEntrada;

  const { data: criada, error } = await supabase
    .from('simulacoes')
    .insert(
      comCodigoDoGatilho<'simulacoes'>({
        tenant_id: tenantId,
        pessoa_id: dados.pessoaId,
        imovel_id: dados.imovelId ?? null,
        negocio_id: dados.negocioId ?? null,
        valor_imovel: dados.valorImovel,
        valor_entrada: dados.valorEntrada,
        valor_financiamento: valorFinanciamento,
        prazo_meses: dados.prazoMeses,
        renda_total: dados.rendaTotal,
        sistema_amortizacao: dados.sistemaAmortizacao,
        usa_fgts: dados.usaFgts,
        financiar_despesas: dados.financiarDespesas,
        tipo_imovel_homefin: dados.tipoImovelHomefin,
        uso_imovel_homefin: dados.usoImovelHomefin,
        situacao_imovel_homefin: dados.situacaoImovelHomefin,
        uf: dados.uf,
        // Cópia do que vai ao banco. Ver o cabeçalho da migração 0013.
        nome_titular: pessoa.nome,
        cpf_titular: pessoa.cpf,
        data_nascimento_titular: pessoa.data_nascimento,
        email_titular: pessoa.email,
        estado_civil_homefin: dados.estadoCivilHomefin ?? null,
        compoe_renda: dados.compoeRenda,
        nome_coparticipante: dados.nomeCoparticipante ?? null,
        cpf_coparticipante: dados.cpfCoparticipante ?? null,
        data_nascimento_coparticipante: dados.dataNascimentoCoparticipante ?? null,
        renda_coparticipante: dados.rendaCoparticipante ?? null,
        observacoes: dados.observacoes ?? null,
        responsavel_id: sessao.usuarioId,
        criado_por: sessao.usuarioId,
      }),
    )
    .select('id, codigo')
    .single();

  if (error || !criada) {
    if (error?.hint === 'cruzamento_de_tenant') {
      return { erro: 'O cliente ou o imóvel escolhido não é desta conta.' };
    }
    if (error?.code === '23514') {
      return { erro: 'Algum valor ficou fora do que o sistema aceita. Confira entrada e prazo.' };
    }
    return { erro: 'Não foi possível criar a simulação. Tente de novo em instantes.' };
  }

  // Um registro por banco escolhido, ainda em rascunho.
  const escolhidos = BANCOS_CONHECIDOS.filter((b) => dados.bancos.includes(b.idBanco));

  if (escolhidos.length > 0) {
    await supabase.from('simulacao_bancos').insert(
      escolhidos.map((banco) => ({
        tenant_id: tenantId,
        simulacao_id: criada.id,
        homefin_id_banco: banco.idBanco,
        codigo_banco: banco.codigoBanco,
        nome_banco: banco.nomeBanco,
      })),
    );
  }

  await registrarAuditoria({
    tenantId,
    autorId: sessao.usuarioId,
    acao: 'criar',
    entidade: 'simulacao',
    entidadeId: criada.id,
    // O CPF NUNCA vai inteiro para o log, nem no log de auditoria.
    depois: {
      codigo: criada.codigo,
      documento: documentoParaLog(pessoa.cpf),
      valor_financiamento: valorFinanciamento,
      bancos: escolhidos.map((b) => b.nomeBanco),
    },
  });

  revalidatePath('/simulacoes');
  redirect(`/simulacoes/${criada.id}`);
}

/**
 * Manda a simulação aos bancos.
 *
 * É o ponto em que o dado do cliente sai daqui. Auditado sempre, e com o CPF
 * mascarado no registro — o log diz QUE a consulta aconteceu, não repete o
 * documento.
 */
export async function enviarAosBancos(simulacaoId: string): Promise<{ erro?: string; aviso?: string }> {
  let sessao;
  try {
    // Enviar ao banco é consultar crédito em nome de alguém. Permissão
    // separada de criar, de propósito.
    sessao = await exigirPermissao('credito.consultar');
  } catch (erro) {
    if (erro instanceof SemPermissao) {
      return { erro: 'Seu papel não permite enviar simulações aos bancos.' };
    }
    throw erro;
  }

  if (!homefinEstaConfigurada()) {
    return {
      erro: 'A integração de financiamento não está configurada nesta instalação. ' +
        'A simulação continua salva e pode ser enviada depois.',
    };
  }

  const tenantId = sessao.atual.tenant.id;
  const supabase = await clienteServidor();

  const { data: simulacao } = await supabase
    .from('simulacoes')
    .select('*')
    .eq('id', simulacaoId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (!simulacao) return { erro: 'Simulação não encontrada.' };

  if (simulacao.homefin_id_oportunidade) {
    return { erro: 'Esta simulação já foi enviada. Atualize o andamento para ver o retorno.' };
  }

  const { data: bancos } = await supabase
    .from('simulacao_bancos')
    .select('id, homefin_id_banco, codigo_banco, nome_banco')
    .eq('simulacao_id', simulacaoId)
    .eq('tenant_id', tenantId);

  if (!bancos || bancos.length === 0) {
    return { erro: 'Nenhum banco foi escolhido nesta simulação.' };
  }

  await registrarAuditoria({
    tenantId,
    autorId: sessao.usuarioId,
    acao: 'consultar_credito',
    entidade: 'simulacao',
    entidadeId: simulacaoId,
    justificativa: 'Simulação de financiamento solicitada pelo cliente',
    metadados: {
      documento: documentoParaLog(simulacao.cpf_titular),
      bancos: bancos.map((b) => b.nome_banco),
    },
  });

  const resultado = await enviarSimulacao({
    simulacaoId,
    tenantId,
    valorImovel: Number(simulacao.valor_imovel),
    valorFinanciamento: Number(simulacao.valor_financiamento),
    prazoMeses: simulacao.prazo_meses,
    rendaTotal: Number(simulacao.renda_total),
    sistemaAmortizacao: simulacao.sistema_amortizacao,
    usaFgts: simulacao.usa_fgts,
    financiarDespesas: simulacao.financiar_despesas,
    tipoImovelHomefin: simulacao.tipo_imovel_homefin,
    usoImovelHomefin: simulacao.uso_imovel_homefin,
    situacaoImovelHomefin: simulacao.situacao_imovel_homefin,
    uf: simulacao.uf,
    nomeTitular: simulacao.nome_titular,
    cpfTitular: simulacao.cpf_titular,
    dataNascimentoTitular: simulacao.data_nascimento_titular,
    emailTitular: simulacao.email_titular,
    celularTitular: simulacao.celular_titular,
    estadoCivilHomefin: simulacao.estado_civil_homefin,
    compoeRenda: simulacao.compoe_renda,
    nomeCoparticipante: simulacao.nome_coparticipante,
    cpfCoparticipante: simulacao.cpf_coparticipante,
    dataNascimentoCoparticipante: simulacao.data_nascimento_coparticipante,
    rendaCoparticipante:
      simulacao.renda_coparticipante == null ? null : Number(simulacao.renda_coparticipante),
    bancos: bancos.map((b) => ({
      idBanco: b.homefin_id_banco,
      codigoBanco: b.codigo_banco,
      nomeBanco: b.nome_banco,
    })),
  });

  if (!resultado.sucesso && !resultado.idOportunidade) {
    return { erro: resultado.erro ?? 'Não foi possível enviar aos bancos.' };
  }

  await supabase
    .from('simulacoes')
    .update({
      homefin_id_oportunidade: resultado.idOportunidade ?? null,
      homefin_codigo_oportunidade: resultado.codigoOportunidade ?? null,
      enviado_em: new Date().toISOString(),
    })
    .eq('id', simulacaoId)
    .eq('tenant_id', tenantId);

  // Cada banco é atualizado à parte: um que falhou não apaga o que deu certo.
  for (const retorno of resultado.bancos) {
    const linha = bancos.find((b) => b.homefin_id_banco === retorno.idBanco);
    if (!linha) continue;

    await supabase
      .from('simulacao_bancos')
      .update({
        homefin_id_simulacao: retorno.idSimulacao,
        situacao: retorno.situacao,
        retorno_integracao: retorno.mensagem,
        enviado_em: new Date().toISOString(),
      })
      .eq('id', linha.id)
      .eq('tenant_id', tenantId);
  }

  revalidatePath(`/simulacoes/${simulacaoId}`);
  revalidatePath('/simulacoes');

  const comErro = resultado.bancos.filter((b) => b.situacao === 'erro_no_envio');
  if (comErro.length > 0 && comErro.length < resultado.bancos.length) {
    const nomes = comErro
      .map((b) => bancos.find((l) => l.homefin_id_banco === b.idBanco)?.nome_banco)
      .filter(Boolean)
      .join(', ');
    return { aviso: `Enviado, mas ${nomes} não aceitou a proposta. Os demais seguem em análise.` };
  }

  return {};
}

/**
 * Pergunta aos bancos como está.
 *
 * Não existe webhook no contrato da Homefin: a única forma de saber o desfecho
 * é perguntar. Esta ação é chamada pelo botão "atualizar" e por rotina
 * periódica.
 */
export async function atualizarAndamento(
  simulacaoId: string,
): Promise<{ erro?: string; mudou?: boolean }> {
  let sessao;
  try {
    sessao = await exigirPermissao('simulacao.ver');
  } catch (erro) {
    if (erro instanceof SemPermissao) return { erro: 'Seu papel não permite ver simulações.' };
    throw erro;
  }

  const tenantId = sessao.atual.tenant.id;
  const supabase = await clienteServidor();

  const { data: simulacao } = await supabase
    .from('simulacoes')
    .select('id, homefin_id_oportunidade')
    .eq('id', simulacaoId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (!simulacao) return { erro: 'Simulação não encontrada.' };
  if (!simulacao.homefin_id_oportunidade) {
    return { erro: 'Esta simulação ainda não foi enviada aos bancos.' };
  }

  const { bancos, erro } = await reconciliarSimulacao({
    tenantId,
    simulacaoId,
    idOportunidade: simulacao.homefin_id_oportunidade,
  });

  if (erro) return { erro };

  let mudou = false;

  for (const retorno of bancos) {
    if (!retorno.idSimulacao) continue;

    const { data: atualizada } = await supabase
      .from('simulacao_bancos')
      .update({
        situacao: retorno.situacao,
        valor_parcela: retorno.valorParcela,
        valor_financiamento_aprovado: retorno.valorFinanciamentoAprovado,
        prazo_aprovado: retorno.prazoAprovado,
        taxa_juros_ano: retorno.taxaJurosAno,
        valor_iof: retorno.valorIof,
        indexador: retorno.indexador,
        valor_financiamento_maximo: retorno.valorFinanciamentoMaximo,
        valor_parcela_maxima: retorno.valorParcelaMaxima,
        prazo_maximo: retorno.prazoMaximo,
        retorno_integracao: retorno.retornoIntegracao,
        codigo_situacao_banco: retorno.codigoSituacaoBanco,
        respondido_em: new Date().toISOString(),
      })
      .eq('simulacao_id', simulacaoId)
      .eq('homefin_id_simulacao', retorno.idSimulacao)
      .eq('tenant_id', tenantId)
      .select('id');

    if (atualizada && atualizada.length > 0) mudou = true;
  }

  await supabase
    .from('simulacoes')
    .update({ reconciliado_em: new Date().toISOString() })
    .eq('id', simulacaoId)
    .eq('tenant_id', tenantId);

  revalidatePath(`/simulacoes/${simulacaoId}`);
  return { mudou };
}

/** Marca com qual banco o cliente vai seguir. */
export async function escolherBanco(parametros: {
  simulacaoId: string;
  bancoId: string;
}): Promise<{ erro?: string }> {
  let sessao;
  try {
    sessao = await exigirPermissao('simulacao.criar');
  } catch (erro) {
    if (erro instanceof SemPermissao) return { erro: 'Seu papel não permite alterar simulações.' };
    throw erro;
  }

  const tenantId = sessao.atual.tenant.id;
  const supabase = await clienteServidor();

  // Tira o anterior ANTES de pôr o novo: existe índice único parcial de um
  // banco escolhido por simulação, e a ordem inversa esbarraria nele.
  await supabase
    .from('simulacao_bancos')
    .update({ escolhido: false })
    .eq('simulacao_id', parametros.simulacaoId)
    .eq('tenant_id', tenantId)
    .eq('escolhido', true);

  const { error } = await supabase
    .from('simulacao_bancos')
    .update({ escolhido: true })
    .eq('id', parametros.bancoId)
    .eq('tenant_id', tenantId);

  if (error) return { erro: 'Não foi possível marcar o banco escolhido.' };

  revalidatePath(`/simulacoes/${parametros.simulacaoId}`);
  return {};
}
