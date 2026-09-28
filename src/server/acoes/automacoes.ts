'use server';

import { revalidatePath } from 'next/cache';

import { clienteServidor } from '@/lib/supabase/servidor';
import { exigirPermissao, SemPermissao } from '@/server/sessao';
import { registrarAuditoria } from '@/server/auditoria';
import { REGRAS, type RegraDeAutomacao } from '@/dominio/automacao';

export interface ResultadoDaExecucao {
  erro?: string;
  /** Quanto cada regra criou nesta execução. */
  criados?: { regra: string; criados: number; limitado: boolean }[];
}

/**
 * Liga ou desliga uma regra.
 *
 * O registro em auditoria não é zelo excessivo: uma automação cria follow-ups
 * no nome de alguém, e "quem ligou isso?" é uma pergunta que aparece quando a
 * equipe cresce.
 */
export async function alternarRegra(
  regra: RegraDeAutomacao,
  ativar: boolean,
): Promise<{ erro?: string }> {
  let sessao;
  try {
    sessao = await exigirPermissao('configuracoes.editar');
  } catch (erro) {
    if (erro instanceof SemPermissao) {
      return { erro: 'Seu papel não permite alterar automações.' };
    }
    throw erro;
  }

  const tenantId = sessao.atual.tenant.id;
  const supabase = await clienteServidor();

  // `upsert` porque a linha pode não existir: as regras não são semeadas na
  // criação da conta — elas nascem quando alguém mexe pela primeira vez.
  const { error } = await supabase.from('automacoes').upsert(
    {
      tenant_id: tenantId,
      regra,
      ativa: ativar,
    },
    { onConflict: 'tenant_id,regra' },
  );

  if (error) return { erro: 'Não foi possível alterar a automação.' };

  await registrarAuditoria({
    tenantId,
    autorId: sessao.usuarioId,
    acao: ativar ? 'ativar_automacao' : 'desativar_automacao',
    entidade: 'automacao',
    depois: { regra, ativa: ativar },
  });

  revalidatePath('/automacoes');
  return {};
}

export async function ajustarParametro(
  regra: RegraDeAutomacao,
  valor: number,
): Promise<{ erro?: string }> {
  let sessao;
  try {
    sessao = await exigirPermissao('configuracoes.editar');
  } catch (erro) {
    if (erro instanceof SemPermissao) return { erro: 'Seu papel não permite alterar automações.' };
    throw erro;
  }

  const definicao = REGRAS[regra];
  if (!definicao.parametro) return { erro: 'Esta regra não tem ajuste.' };

  // Os limites vivem no domínio e são conferidos AQUI também: o valor chega de
  // um `select` que o navegador pode ter alterado.
  const { chave, min, max } = definicao.parametro;
  if (!Number.isInteger(valor) || valor < min || valor > max) {
    return { erro: `Valor fora do permitido (${min} a ${max}).` };
  }

  const supabase = await clienteServidor();

  const { error } = await supabase.from('automacoes').upsert(
    {
      tenant_id: sessao.atual.tenant.id,
      regra,
      parametros: { [chave]: valor },
    },
    { onConflict: 'tenant_id,regra' },
  );

  if (error) return { erro: 'Não foi possível salvar o ajuste.' };

  revalidatePath('/automacoes');
  return {};
}

/**
 * Roda as regras agora.
 *
 * EXISTE PORQUE NADA AGENDA ISTO AINDA. A migração 0018 deliberadamente não
 * criou um agendamento: ligar um processo que escreve dados sozinho é decisão
 * de quem opera a instalação, não de quem escreveu a migração.
 *
 * Enquanto o agendamento não existe, este botão é o que faz as automações
 * valerem alguma coisa — e tem a vantagem de o corretor VER o que cada regra
 * criou, em vez de descobrir follow-ups aparecendo sozinhos.
 */
export async function executarAgora(): Promise<ResultadoDaExecucao> {
  let sessao;
  try {
    sessao = await exigirPermissao('configuracoes.editar');
  } catch (erro) {
    if (erro instanceof SemPermissao) return { erro: 'Seu papel não permite rodar automações.' };
    throw erro;
  }

  const tenantId = sessao.atual.tenant.id;
  const supabase = await clienteServidor();

  const { data, error } = await supabase.rpc('executar_automacoes', {
    p_tenant_id: tenantId,
  });

  if (error) {
    return { erro: 'Não foi possível rodar as automações agora. Tente de novo em instantes.' };
  }

  const criados = data ?? [];

  await registrarAuditoria({
    tenantId,
    autorId: sessao.usuarioId,
    acao: 'executar_automacoes',
    entidade: 'automacao',
    metadados: { resultado: criados },
  });

  revalidatePath('/automacoes');
  revalidatePath('/followups');
  revalidatePath('/inicio');

  return { criados };
}
