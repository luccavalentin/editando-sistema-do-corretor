import { AppRole } from './access-matrix';
import { supabase } from '@/integrations/supabase/client';
import React from 'react';

/**
 * Hook para buscar o papel do usuário atual.
 */
export async function getCurrentUserRole(): Promise<AppRole | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', session.user.id)
    .single();

  return data?.role as AppRole || null;
}

/**
 * Componente de proteção de UI granular.
 */
export function Authorize({ 
  roles, 
  children, 
  fallback = null,
  userRole 
}: { 
  roles: AppRole[], 
  children: React.ReactNode, 
  fallback?: React.ReactNode,
  userRole: AppRole | null
}) {
  if (!userRole || !roles.includes(userRole)) {
    return <React.Fragment>{fallback}</React.Fragment>;
  }
  return <React.Fragment>{children}</React.Fragment>;
}
