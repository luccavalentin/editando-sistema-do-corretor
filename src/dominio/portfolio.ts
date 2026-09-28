import { z } from 'zod';

import { normalizarCelular } from '@/lib/privacidade/documentos';

/**
 * Regras da vitrine pública do corretor.
 *
 * Fica em `dominio`, e não junto da Server Action, por duas razões. A primeira
 * é a de sempre: o mesmo esquema precisa valer no formulário e no servidor.
 *
 * A segunda o Next impõe: num arquivo `'use server'`, TODO export precisa ser
 * função assíncrona — ele trata cada um como uma Server Action exposta por
 * HTTP. Exportar um esquema Zod de lá quebra o build com uma mensagem que
 * aponta para a linha do `.refine`, não para a causa.
 */

/**
 * O endereço da vitrine.
 *
 * Reservado é o que colidiria com uma rota do próprio sistema ou daria a um
 * corretor um endereço que parece oficial. `admin` e `api` quebrariam o
 * roteamento; `agilliza` e `suporte` seriam se passar pela plataforma.
 */
const SLUGS_RESERVADOS = new Set([
  'admin', 'api', 'app', 'www', 'entrar', 'sair', 'portal', 'c',
  'agilliza', 'suporte', 'ajuda', 'contato', 'sobre', 'blog',
  'imoveis', 'clientes', 'negocios', 'inicio', 'configuracoes',
  'null', 'undefined', 'teste',
]);

export const esquemaDaVitrine = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'O endereço precisa de pelo menos 3 caracteres.')
    .max(40, 'Endereço muito longo.')
    .regex(
      /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
      'Use apenas letras, números e hífen, começando e terminando com letra ou número.',
    )
    .refine((v) => !SLUGS_RESERVADOS.has(v), 'Esse endereço é reservado. Escolha outro.')
    .refine((v) => !v.includes('--'), 'Não use dois hífens seguidos.'),

  titulo: z
    .string()
    .trim()
    .min(3, 'Escreva o nome que aparece no topo da vitrine.')
    .max(120, 'Título muito longo.'),

  bio: z
    .string()
    .trim()
    .max(2000, 'A apresentação ficou longa demais.')
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional(),

  whatsapp: z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : normalizarCelular(v)))
    .nullable()
    .optional()
    .refine((v) => v == null || (v.length >= 10 && v.length <= 13), {
      message: 'Informe o WhatsApp com DDD.',
    }),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional()
    .refine((v) => v == null || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), {
      message: 'E-mail inválido.',
    }),

  ativo: z
    .union([z.literal('on'), z.literal('true'), z.literal(''), z.null(), z.undefined()])
    .transform((v) => v === 'on' || v === 'true'),
});

export type DadosDaVitrine = z.infer<typeof esquemaDaVitrine>;

export function lerFormularioDaVitrine(formulario: FormData) {
  return esquemaDaVitrine.safeParse({
    slug: formulario.get('slug') ?? '',
    titulo: formulario.get('titulo') ?? '',
    bio: formulario.get('bio') ?? '',
    whatsapp: formulario.get('whatsapp') ?? '',
    email: formulario.get('email') ?? '',
    ativo: formulario.get('ativo'),
  });
}
