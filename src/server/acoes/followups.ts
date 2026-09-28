'use server';

import { revalidatePath } from 'next/cache';

import { clienteServidor } from '@/lib/supabase/servidor';
import { exigirPermissao, SemPermissao } from '@/server/sessao';

export interface ResultadoDoFollowup {
  erro?: string;
}

/**
 * Registra o desfecho de um follow-up.
 *
 * TRÊS DESFECHOS, e cada um significa outra coisa para o próximo passo:
 *
 *   feito         falou com a pessoa e resolveu
 *   sem_resposta  tentou e ninguém atendeu — a tentativa CONTA
 *   cancelado     não precisa mais
 *
 * Juntar "sem resposta" com "feito" apagaria a informação mais útil que este
 * módulo produz: quem já foi procurado três vezes e continua mudo. Esse
 * cliente precisa de outra abordagem, não de uma quarta ligação igual.
 */
export async function registrarFollowup(parametros: {
  followupId: string;
  desfecho: 'feito' | 'sem_resposta' | 'cancelado';
  resultado?: string | undefined;
}): Promise<ResultadoDoFollowup> {
  let sessao;
  try {
    sessao = await exigirPermissao('crm.editar');
  } catch (erro) {
    if (erro instanceof SemPermissao) {
      return { erro: 'Seu papel não permite registrar follow-ups.' };
    }
    throw erro;
  }

  const tenantId = sessao.atual.tenant.id;
  const supabase = await clienteServidor();

  // A contagem de tentativas precisa do valor atual: um `update` cego perderia
  // o histórico de quantas vezes já se tentou.
  const { data: atual } = await supabase
    .from('followups')
    .select('tentativas')
    .eq('id', parametros.followupId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (!atual) return { erro: 'Follow-up não encontrado.' };

  const { error } = await supabase
    .from('followups')
    .update({
      situacao: parametros.desfecho,
      // Só conta tentativa quem de fato tentou. Cancelar não é tentativa.
      tentativas:
        parametros.desfecho === 'cancelado' ? atual.tentativas : atual.tentativas + 1,
      resultado: parametros.resultado ?? null,
      // A restrição `conclusao_coerente` da 0003 exige a data junto da situação
      // final; mandar uma sem a outra é recusado pelo banco.
      concluido_em: new Date().toISOString(),
    })
    .eq('id', parametros.followupId)
    .eq('tenant_id', tenantId);

  if (error) return { erro: 'Não foi possível registrar o follow-up.' };

  revalidatePath('/followups');
  revalidatePath('/inicio');
  return {};
}

/**
 * Adia para depois.
 *
 * Existe porque a alternativa é pior: sem adiar, o corretor marca como "feito"
 * um follow-up que não fez, só para tirar da lista de vencidos. Aí a lista para
 * de dizer a verdade, e ele para de confiar nela.
 */
export async function adiarFollowup(
  followupId: string,
  novoPrazo: string,
): Promise<ResultadoDoFollowup> {
  let sessao;
  try {
    sessao = await exigirPermissao('crm.editar');
  } catch (erro) {
    if (erro instanceof SemPermissao) return { erro: 'Seu papel não permite adiar follow-ups.' };
    throw erro;
  }

  const quando = new Date(novoPrazo);
  if (Number.isNaN(quando.getTime())) return { erro: 'Data inválida.' };

  const supabase = await clienteServidor();

  const { error } = await supabase
    .from('followups')
    .update({ prazo: quando.toISOString() })
    .eq('id', followupId)
    .eq('tenant_id', sessao.atual.tenant.id)
    .eq('situacao', 'pendente');

  if (error) return { erro: 'Não foi possível adiar.' };

  revalidatePath('/followups');
  return {};
}
