import { z } from 'zod';

import { PAPEIS_ATRIBUIVEIS } from './permissoes';
import type { Papel } from '@/lib/supabase/tipos-banco';

/**
 * Vocabulário do convite de equipe.
 *
 * PURO DE PROPÓSITO: este módulo é importado por componente de CLIENTE, então
 * ele não pode tocar em `node:crypto`. A geração e a conferência do token vivem
 * em `@/server/convite-token`, que é `server-only`.
 *
 * NÃO HÁ ENVIO DE E-MAIL, E ISSO É DELIBERADO
 *
 * O sistema gera o link e o corretor o envia como quiser — quase sempre por
 * WhatsApp, que é como uma imobiliária pequena de fato se comunica. Montar
 * infraestrutura de e-mail transacional acrescentaria um provedor externo, um
 * domínio a verificar e uma classe inteira de falha ("caiu no spam") para
 * resolver um problema que o WhatsApp já resolve.
 *
 * O e-mail do convite continua importando: ele é conferido na hora de aceitar,
 * então o link só serve para quem ele foi feito.
 */

/** Sete dias. Curto o bastante para um convite esquecido não virar porta aberta. */
export const DIAS_DE_VALIDADE = 7;

export const esquemaConvite = z.object({
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido.').max(200),
  papel: z.enum(PAPEIS_ATRIBUIVEIS as unknown as [Papel, ...Papel[]]),
});

export function lerFormularioDeConvite(formulario: FormData) {
  return esquemaConvite.safeParse({
    email: formulario.get('email') ?? '',
    papel: formulario.get('papel') || 'corretor',
  });
}

/** Monta o link que o corretor vai enviar. */
export function linkDoConvite(urlBase: string, token: string): string {
  return `${urlBase.replace(/\/+$/, '')}/aceitar-convite?token=${token}`;
}
