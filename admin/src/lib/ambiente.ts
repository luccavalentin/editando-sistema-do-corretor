import { z } from 'zod';

/**
 * Variáveis de ambiente da plataforma administrativa.
 *
 * Deliberadamente MENOR que a do sistema do corretor. Esta aplicação não envia
 * arquivo, não fala com a Homefin, não serve página pública — então não tem
 * chave de armazenamento, nem credencial de provedor, nem segredo de portal.
 *
 * O que ela não tem não pode vazar daqui.
 */

function exigir(nome: string, valor: string | undefined, comoObter: string): string {
  if (!valor || valor.trim() === '') {
    throw new Error(
      `Variável de ambiente ausente: ${nome}\n` +
        `Como obter: ${comoObter}\n` +
        'Defina em admin/.env.local (desenvolvimento) ou no ambiente do contêiner.',
    );
  }
  return valor;
}

const esquema = z.object({
  supabaseUrl: z.string().url(),
  supabaseChavePublica: z.string().min(20),
});

export const publico = esquema.parse({
  supabaseUrl: exigir(
    'NEXT_PUBLIC_SUPABASE_URL',
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    'Supabase > Project Settings > API > Project URL',
  ),
  supabaseChavePublica: exigir(
    'NEXT_PUBLIC_SUPABASE_CHAVE_PUBLICA',
    process.env.NEXT_PUBLIC_SUPABASE_CHAVE_PUBLICA,
    'Supabase > Project Settings > API > publishable key',
  ),
});

export const emProducao = process.env.NODE_ENV === 'production';
