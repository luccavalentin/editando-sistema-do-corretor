'use server';

import { revalidatePath } from 'next/cache';

import { clienteServidor } from '@/lib/supabase/servidor';
import { exigirPermissao, SemPermissao } from '@/server/sessao';
import { lerFormularioDeTarefa } from '@/dominio/tarefa';

export interface EstadoDeTarefa {
  erro?: string;
  campos?: Record<string, string>;
  /** A tela usa isto para limpar o formulário e anunciar o sucesso. */
  criada?: boolean;
}

export async function criarTarefa(
  _anterior: EstadoDeTarefa,
  formulario: FormData,
): Promise<EstadoDeTarefa> {
  let sessao;
  try {
    sessao = await exigirPermissao('agenda.editar');
  } catch (erro) {
    if (erro instanceof SemPermissao) {
      return { erro: 'Seu papel não permite criar tarefas.' };
    }
    throw erro;
  }

  const analise = lerFormularioDeTarefa(formulario);
  if (!analise.success) {
    const campos: Record<string, string> = {};
    for (const problema of analise.error.issues) {
      const campo = String(problema.path[0] ?? 'titulo');
      campos[campo] ??= problema.message;
    }
    return { erro: 'Confira os campos destacados.', campos };
  }

  const dados = analise.data;
  const tenantId = sessao.atual.tenant.id;
  const supabase = await clienteServidor();

  const { error } = await supabase.from('tarefas').insert({
    tenant_id: tenantId,
    titulo: dados.titulo,
    descricao: dados.descricao ?? null,
    prioridade: dados.prioridade,
    prazo: dados.prazo ?? null,
    pessoa_id: dados.pessoaId ?? null,
    negocio_id: dados.negocioId ?? null,
    // Sem responsável escolhido, a tarefa é de quem a criou. Tarefa sem dono
    // não aparece na lista de ninguém e morre.
    responsavel_id: dados.responsavelId ?? sessao.usuarioId,
    criado_por: sessao.usuarioId,
  });

  if (error) {
    if (error.hint === 'cruzamento_de_tenant') {
      return { erro: 'O cliente ou o negócio escolhido não é desta conta.' };
    }
    return { erro: 'Não foi possível criar a tarefa. Tente de novo em instantes.' };
  }

  revalidatePath('/tarefas');
  revalidatePath('/inicio');
  return { criada: true };
}

/**
 * Conclui ou reabre.
 *
 * A mesma ação nos dois sentidos porque concluir por engano é comum — o
 * corretor marca a linha errada numa lista de vinte — e desfazer precisa ser
 * tão barato quanto fazer.
 */
export async function alternarConclusao(
  tarefaId: string,
  concluir: boolean,
): Promise<{ erro?: string }> {
  let sessao;
  try {
    sessao = await exigirPermissao('agenda.editar');
  } catch (erro) {
    if (erro instanceof SemPermissao) return { erro: 'Seu papel não permite alterar tarefas.' };
    throw erro;
  }

  const supabase = await clienteServidor();

  // `concluida_em` e `concluida_por` andam juntos com a situação: a migração
  // 0003 tem uma restrição que recusa um sem o outro.
  const { error } = await supabase
    .from('tarefas')
    .update(
      concluir
        ? {
            situacao: 'feita',
            concluida_em: new Date().toISOString(),
            concluida_por: sessao.usuarioId,
          }
        : { situacao: 'aberta', concluida_em: null, concluida_por: null },
    )
    .eq('id', tarefaId)
    .eq('tenant_id', sessao.atual.tenant.id);

  if (error) return { erro: 'Não foi possível atualizar a tarefa.' };

  revalidatePath('/tarefas');
  revalidatePath('/inicio');
  return {};
}
