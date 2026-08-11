import { AppRole } from './access-matrix';
import { supabase } from '@/integrations/supabase/client';
import React from 'react';

export async function getCurrentUserRole(): Promise<AppRole | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', session.user.id)
    .single();

  return (data?.role as AppRole) || null;
}

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
    return React.createElement(React.Fragment, null, fallback);
  }
  return React.createElement(React.Fragment, null, children);
}
