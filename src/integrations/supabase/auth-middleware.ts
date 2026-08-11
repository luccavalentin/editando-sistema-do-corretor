import { createMiddleware } from '@tanstack/react-start';
import { supabaseAdmin } from './client.server';
import { createClient } from '@supabase/supabase-js';

export const requireSupabaseAuth = createMiddleware().server(async ({ next, request }) => {
  // O TanStack Start injeta o token de autenticação via middleware do cliente no start.ts
  // Para funções de servidor, precisamos pegar o token do header Authorization
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    throw new Response('Unauthorized', { status: 401 });
  }

  // Criar um cliente autenticado com o token do usuário para que o RLS funcione corretamente
  const supabase = createClient(
    process.env['VITE_SUPABASE_URL']!,
    process.env['VITE_SUPABASE_ANON_KEY']!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new Response('Unauthorized', { status: 401 });
  }

  return next({
    context: {
      supabase,
      supabaseAdmin,
      userId: user.id,
      claims: user,
    },
  });
});
