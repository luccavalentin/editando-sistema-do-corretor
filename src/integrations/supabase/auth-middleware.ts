import { createMiddleware } from '@tanstack/react-start';
import { supabaseAdmin } from './client.server';
import { supabase } from './client';

export const requireSupabaseAuth = createMiddleware().server(async ({ next }) => {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    throw new Response('Unauthorized', { status: 401 });
  }

  return next({
    context: {
      supabase,
      supabaseAdmin,
      userId: session.user.id,
      claims: session.user,
    },
  });
});
