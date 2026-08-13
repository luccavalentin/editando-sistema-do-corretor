import { createMiddleware } from '@tanstack/react-start';
import { supabaseAdmin } from './client.server';
import { createClient } from '@supabase/supabase-js';

export const requireSupabaseAuth = createMiddleware().server(async ({ next, request }) => {
  // O TanStack Start injeta o token de autenticação via middleware do cliente no start.ts
  // Para funções de servidor, precisamos pegar o token do header Authorization
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return new Response('Unauthorized - Missing Token', { 
      status: 401,
      headers: { 'WWW-Authenticate': 'Bearer' }
    });
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
    return new Response('Unauthorized - Invalid Session', { 
      status: 401,
      headers: { 'WWW-Authenticate': 'Bearer' }
    });
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
