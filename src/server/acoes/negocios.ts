'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { clienteServidor } from '@/lib/supabase/servidor';
import { comCodigoDoGatilho } from '@/lib/supabase/insercao';
import { exigirPermissao, SemPermissao } from '@/server/sessao';
import { registrarAuditoria } from '@/server/auditoria';
import type { SituacaoNegocio } from '@/lib/supabase/tipos-banco';

/** "780.000,00" e "R$ 780000" viram 780000. */
function paraNumero(bruto: FormDataEntryValue | null): number | null {
  const texto = String(bruto ?? '').trim();
  if (texto === '') return null;
  const n = Number(texto.replace(/[R$\s.]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : Number.NaN;
}

export interface EstadoDeNegocio {
  erro?: string;
  campos?: Record<string, string>;
}

const esquemaNovoNegocio = z.object({
  pessoaId: z.string().uuid('Escolha um cliente.'),
  etapaId: z.string().uuid('Escolha a etapa inicial.'),
  titulo: z
    .string()
    .trim()
    .max(200)
    .transform((v) => (v === '' ? null : v))
    .nullable(),
  valor: z
    .number()
    .nullable()
    .refine((v) => v === null || Number.isFinite(v), 'Informe um valor válido.'),
  previsaoFechamento: z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : v))
    .nullable(),
});

export async function criarNegocio(
  _anterior: EstadoDeNegocio,
  formulario: FormData,
): Promise<EstadoDeNegocio> {
  let sessao;
  try {
    sessao = await exigirPermissao('crm.criar');
  } catch (erro) {
    if (erro instanceof SemPermissao) return { erro: 'Seu papel não permite criar negócios.' };
    throw erro;
  }

  const analise = esquemaNovoNegocio.safeParse({
    pessoaId: formulario.get('pessoaId') ?? '',
    etapaId: formulario.get('etapaId') ?? '',
    titulo: formulario.get('titulo') ?? '',
    valor: paraNumero(formulario.get('valor')),
    previsaoFechamento: formulario.get('previsaoFechamento') ?? '',
  });

  if (!analise.success) {
    const campos: Record<string, string> = {};
    for (const p of analise.error.issues) campos[String(p.path[0] ?? '')] ??= p.message;
    return { erro: 'Confira os campos destacados.', campos };
  }

  const dados = analise.data;
  const tenantId = sessao.atual.tenant.id;
  const supabase = await clienteServidor();

  // `codigo` fica de fora: o gatilho do banco o gera com um contador por tenant.
  // Gerar aqui abriria corrida entre dois cadastros simultâneos.
  const { data: criado, error } = await supabase
    .from('negocios')
    .insert(
      comCodigoDoGatilho<'negocios'>({
        tenant_id: tenantId,
        pessoa_id: dados.pessoaId,
        etapa_id: dados.etapaId,
        titulo: dados.titulo,
        valor: dados.valor,
        previsao_fechamento: dados.previsaoFechamento,
        responsavel_id: sessao.usuarioId,
        criado_por: sessao.usuarioId,
      }),
    )
    .select('id, codigo')
    .single();

  if (error) {
    // O gatilho de coerência de tenant devolve este `hint` quando alguém tenta
    // apontar para uma pessoa ou etapa de outra conta.
    if (error.hint === 'cruzamento_de_tenant' || error.message.includes('outro tenant')) {
      return { erro: 'Cliente ou etapa não pertence a esta conta.' };
    }
    console.error('[negocios] falha ao criar', { tenantId, erro: error.message });
    return { erro: 'Não deu para criar o negócio agora. Tente de novo.' };
  }

  // A pessoa passa a ter atividade: o painel usa isto para não classificá-la
  // como parada logo depois de um negócio novo.
  await supabase
    .from('pessoas')
    .update({ ultima_interacao_em: new Date().toISOString() })
    .eq('id', dados.pessoaId)
    .eq('tenant_id', tenantId);

  await registrarAuditoria({
    acao: 'criar',
    entidade: 'negocio',
    entidadeId: criado.id,
    tenantId,
    autorId: sessao.usuarioId,
    autorEmail: sessao.perfil.email,
    autorPapel: sessao.atual.papel,
    depois: { codigo: criado.codigo, valor: dados.valor, pessoa_id: dados.pessoaId },
  });

  revalidatePath('/negocios');
  revalidatePath('/inicio');
  revalidatePath(`/clientes/${dados.pessoaId}`);
  redirect(`/negocios/${criado.id}`);
}

/**
 * Move o negócio de etapa.
 *
 * A aplicação NÃO grava o histórico nem o relógio da etapa: quem faz isso são os
 * gatilhos da migração 0003. Duplicar aqui criaria duas fontes de verdade para o
 * tempo de permanência, e a primeira divergência apareceria no funil do painel
 * sem ninguém entender por quê.
 *
 * O que a aplicação faz é o que o banco não sabe: se a etapa de destino é
 * terminal, encerrar o negócio como ganho ou perdido.
 */
export async function moverEtapa(
  negocioId: string,
  etapaDestinoId: string,
  motivoPerda?: string,
): Promise<{ erro?: string }> {
  let sessao;
  try {
    sessao = await exigirPermissao('crm.editar');
  } catch (erro) {
    if (erro instanceof SemPermissao) return { erro: 'Seu papel não permite mover negócios.' };
    throw erro;
  }

  const tenantId = sessao.atual.tenant.id;
  const supabase = await clienteServidor();

  const [{ data: negocio }, { data: etapa }] = await Promise.all([
    supabase
      .from('negocios')
      .select('id, codigo, etapa_id, situacao, pessoa_id')
      .eq('id', negocioId)
      .eq('tenant_id', tenantId)
      .is('excluido_em', null)
      .maybeSingle(),
    supabase
      .from('etapas')
      .select('id, nome, encerra_como')
      .eq('id', etapaDestinoId)
      .eq('tenant_id', tenantId)
      .maybeSingle(),
  ]);

  if (!negocio) return { erro: 'Negócio não encontrado.' };
  if (!etapa) return { erro: 'Etapa não encontrada nesta conta.' };
  if (negocio.etapa_id === etapaDestinoId) return {};

  const encerra = etapa.encerra_como;
  const agora = new Date().toISOString();

  // A restrição `perda_exige_motivo` do banco recusaria sem motivo. Explicar
  // aqui é melhor do que devolver o erro cru do Postgres — e o motivo é o dado
  // que alimenta "onde mais se perde" no funil.
  if (encerra === 'perdido' && (!motivoPerda || motivoPerda.trim().length < 3)) {
    return {
      erro:
        'Para marcar como perdido, diga o motivo. É esse dado que mostra onde a carteira ' +
        'está vazando no funil.',
    };
  }

  // Tipado de verdade, e não `Record<string, unknown>`: com `unknown` o valor
  // que vai para a auditoria deixa de ser serializável para o compilador, e o
  // erro aparece longe daqui.
  const atualizacao: {
    etapa_id: string;
    situacao?: SituacaoNegocio;
    fechado_em?: string | null;
    motivo_perda?: string | null;
  } = { etapa_id: etapaDestinoId };

  if (encerra === 'ganho' || encerra === 'perdido') {
    atualizacao.situacao = encerra;
    atualizacao.fechado_em = agora;
    if (encerra === 'perdido') atualizacao.motivo_perda = motivoPerda!.trim();
  } else if (negocio.situacao !== 'aberto') {
    // Reabriu: voltou de uma etapa terminal para o meio do funil.
    atualizacao.situacao = 'aberto';
    atualizacao.fechado_em = null;
    atualizacao.motivo_perda = null;
  }

  const { error } = await supabase
    .from('negocios')
    .update(atualizacao)
    .eq('id', negocioId)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('[negocios] falha ao mover etapa', { negocioId, erro: error.message });
    return { erro: 'Não deu para mover o negócio agora.' };
  }

  await supabase
    .from('pessoas')
    .update({ ultima_interacao_em: agora })
    .eq('id', negocio.pessoa_id)
    .eq('tenant_id', tenantId);

  await registrarAuditoria({
    acao: encerra ? `encerrar_${encerra}` : 'mover_etapa',
    entidade: 'negocio',
    entidadeId: negocioId,
    tenantId,
    autorId: sessao.usuarioId,
    autorEmail: sessao.perfil.email,
    autorPapel: sessao.atual.papel,
    antes: { etapa_id: negocio.etapa_id, situacao: negocio.situacao },
    depois: { etapa_id: etapaDestinoId, situacao: atualizacao.situacao ?? negocio.situacao },
    metadados: { etapa_nome: etapa.nome, codigo: negocio.codigo },
  });

  revalidatePath('/negocios');
  revalidatePath(`/negocios/${negocioId}`);
  revalidatePath('/inicio');
  revalidatePath(`/clientes/${negocio.pessoa_id}`);
  return {};
}
