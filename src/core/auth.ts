import { AppRole } from './access-matrix';
import { supabase } from '@/integrations/supabase/client';
import React from 'react';

export async function getCurrentUserRole(): Promise<AppRole | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', session.user.id)
    .single();

  if (error) {
    console.error("Error fetching user role from user_roles table:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      userId: session.user.id
    });
    return null;
  }

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
