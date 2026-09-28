'use server';

import { revalidatePath } from 'next/cache';

import { clienteServidor } from '@/lib/supabase/servidor';
import { exigirPermissao, SemPermissao } from '@/server/sessao';

/**
 * Ações da agenda.
 *
 * Confirmar e registrar presença são separados de propósito: confirmar é o que
 * o corretor faz na véspera, por telefone; registrar presença é o que ele faz
 * depois, na rua. Juntar os dois num só botão faria um deles acontecer na hora
 * errada.
 */

export async function confirmarCompromisso(
  compromissoId: string,
  confirmar: boolean,
): Promise<{ erro?: string }> {
  let sessao;
  try {
    sessao = await exigirPermissao('agenda.editar');
  } catch (erro) {
    if (erro instanceof SemPermissao) return { erro: 'Seu papel não permite alterar a agenda.' };
    throw erro;
  }

  const supabase = await clienteServidor();

  const { error } = await supabase
    .from('compromissos')
    .update(
      confirmar
        ? { situacao: 'confirmado', confirmado_em: new Date().toISOString() }
        : // Desconfirmar volta para "agendado", não para nulo com outra situação:
          // as duas colunas contam a mesma história e não podem divergir.
          { situacao: 'agendado', confirmado_em: null },
    )
    .eq('id', compromissoId)
    .eq('tenant_id', sessao.atual.tenant.id)
    // Só faz sentido em compromisso que ainda vai acontecer. Sem este filtro,
    // um clique numa lista antiga reabriria um compromisso já realizado.
    .in('situacao', ['agendado', 'confirmado']);

  if (error) return { erro: 'Não foi possível atualizar o compromisso.' };

  revalidatePath('/agenda');
  revalidatePath('/inicio');
  return {};
}

/**
 * Registra o que aconteceu de fato.
 *
 * `compareceu` é separado da situação porque responde outra pergunta: a
 * situação diz o que o sistema sabe do compromisso; `compareceu` diz se o
 * CLIENTE apareceu. Um compromisso realizado com o cliente ausente é
 * informação valiosa — é o que revela quem desmarca sempre.
 */
export async function registrarComparecimento(
  compromissoId: string,
  compareceu: boolean,
): Promise<{ erro?: string }> {
  let sessao;
  try {
    sessao = await exigirPermissao('agenda.editar');
  } catch (erro) {
    if (erro instanceof SemPermissao) return { erro: 'Seu papel não permite alterar a agenda.' };
    throw erro;
  }

  const supabase = await clienteServidor();

  const { error } = await supabase
    .from('compromissos')
    .update({ situacao: compareceu ? 'realizado' : 'faltou', compareceu })
    .eq('id', compromissoId)
    .eq('tenant_id', sessao.atual.tenant.id);

  if (error) return { erro: 'Não foi possível registrar.' };

  revalidatePath('/agenda');
  revalidatePath('/inicio');
  return {};
}
