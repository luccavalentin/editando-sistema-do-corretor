'use server';

import { redirect } from 'next/navigation';

import { sessaoDoPortal, encerrarSessao } from '@/server/portal/sessao';
import { aceitarTermo, excluirMeusDados } from '@/server/portal/dados';
import { VERSAO_DO_TERMO } from '@/dominio/termo-do-portal';

export interface EstadoDoTermo {
  erro?: string;
}

export async function aceitarOTermo(
  _anterior: EstadoDoTermo,
  formulario: FormData,
): Promise<EstadoDoTermo> {
  const sessao = await sessaoDoPortal();
  if (!sessao) redirect('/portal');

  // O checkbox só é enviado quando marcado. Sem ele não houve consentimento —
  // e consentimento presumido não é consentimento.
  if (formulario.get('aceito') !== 'on') {
    return { erro: 'É preciso marcar a caixa para continuar.' };
  }

  const gravou = await aceitarTermo(sessao.pessoaId, VERSAO_DO_TERMO);
  if (!gravou) {
    return { erro: 'Não foi possível registrar agora. Tente de novo em instantes.' };
  }

  redirect('/portal/inicio');
}

export async function excluirOsMeusDados(): Promise<void> {
  const sessao = await sessaoDoPortal();
  if (!sessao) redirect('/portal');

  await excluirMeusDados(sessao.pessoaId);

  // A sessão precisa cair junto. Deixá-la de pé daria alguns minutos de acesso
  // a quem acabou de pedir para não ter mais acesso nenhum.
  await encerrarSessao();
  redirect('/portal?saida=dados-excluidos');
}
