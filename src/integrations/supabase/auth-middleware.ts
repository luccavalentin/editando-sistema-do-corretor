import { supabase } from './client';

export const requireSupabaseAuth = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) {
    throw new Error('Unauthorized');
  }
  return session;
};
