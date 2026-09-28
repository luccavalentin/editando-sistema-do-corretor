import { z } from 'zod';

import { cpfCnpjValido, soNumeros } from '@/lib/privacidade/documentos';

/**
 * Dados da conta da imobiliária.
 *
 * O QUE ESTÁ AQUI E O QUE NÃO ESTÁ
 *
 * Só entram campos que o corretor pode mudar e que o sistema de fato USA. Os
 * limites do plano, a situação de pagamento e os contadores ficam de fora: não
 * são configuração, são consequência do contrato, e um formulário que os
 * mostrasse editáveis prometeria um controle que não existe.
 *
 * `mfa_obrigatorio` e `retencao_dias` também ficam de fora, e por um motivo
 * mais incômodo: eles existem no banco e NADA os aplica. Um interruptor de
 * "exigir segundo fator" que não exige nada é pior do que a ausência dele —
 * o corretor acha que protegeu a conta e não protegeu. A tela diz isso em vez
 * de fingir.
 */

/**
 * Fusos do Brasil.
 *
 * Lista curta de propósito: um seletor com os 400 fusos do mundo faz o corretor
 * de Cuiabá procurar o dele numa lista onde `America/Cuiaba` aparece entre
 * `America/Curacao` e `America/Danmarkshavn`.
 */
export const FUSOS_DO_BRASIL = {
  'America/Sao_Paulo': 'Brasília (GMT-3) — maior parte do país',
  'America/Manaus': 'Manaus (GMT-4) — AM, RR, RO, MT, MS',
  'America/Cuiaba': 'Cuiabá (GMT-4)',
  'America/Belem': 'Belém (GMT-3) — PA, AP',
  'America/Fortaleza': 'Fortaleza (GMT-3) — Nordeste',
  'America/Recife': 'Recife (GMT-3)',
  'America/Bahia': 'Salvador (GMT-3)',
  'America/Rio_Branco': 'Rio Branco (GMT-5) — AC',
  'America/Noronha': 'Fernando de Noronha (GMT-2)',
} as const;

export const esquemaDaConta = z.object({
  nome: z
    .string()
    .trim()
    .min(2, 'O nome da imobiliária é obrigatório.')
    .max(160, 'Nome muito longo.'),

  /**
   * CPF ou CNPJ, com dígito verificador conferido.
   *
   * Opcional porque um corretor autônomo pode começar a usar o sistema antes de
   * abrir CNPJ. Mas se informado, tem que ser válido: documento errado no
   * cadastro reaparece no contrato, e aí o erro custa caro.
   */
  cpfCnpj: z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : soNumeros(v)))
    .nullable()
    .optional()
    .refine((v) => v == null || cpfCnpjValido(v), {
      message: 'CPF ou CNPJ inválido. Confira os dígitos.',
    }),

  creci: z
    .string()
    .trim()
    .max(40, 'CRECI muito longo.')
    .transform((v) => (v === '' ? null : v.toUpperCase()))
    .nullable()
    .optional(),

  fusoHorario: z.enum(
    Object.keys(FUSOS_DO_BRASIL) as [keyof typeof FUSOS_DO_BRASIL, ...string[]],
  ),
});

export type DadosDaConta = z.infer<typeof esquemaDaConta>;

export function lerFormularioDaConta(formulario: FormData) {
  return esquemaDaConta.safeParse({
    nome: formulario.get('nome') ?? '',
    cpfCnpj: formulario.get('cpfCnpj') ?? '',
    creci: formulario.get('creci') ?? '',
    fusoHorario: formulario.get('fusoHorario') || 'America/Sao_Paulo',
  });
}
