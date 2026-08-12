import React, { useEffect, useState } from 'react';
import { AppRole, canAccessRoute } from '@/core/access-matrix';
import { getCurrentUserRole } from '@/core/auth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { toast } from 'sonner';

export function RequireRole({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;

    async function checkAccess() {
      if (location.pathname === '/login') {
        setLoading(false);
        return;
      }

      try {
        // Ensure Supabase Auth is fully ready
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;

        if (!session) {
          console.warn("No active session, redirecting to login");
          if (isMounted) {
            setRole(null);
            setLoading(false);
            navigate({ to: '/login' });
          }
          return;
        }

        // Fetch role directly to be sure
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id);

        const roles = roleData || [];

        if (roleError || roles.length === 0) {
          console.error("Auth: User has no role assigned or RLS blocked read:", {
            error: roleError,
            userId: session.user.id,
            rolesFound: roles.length
          });
          
          if (isMounted) {
            toast.error("Permissões não encontradas. Contate o administrador.");
            setRole(null);
            setLoading(false);
            setTimeout(() => {
              if (isMounted) navigate({ to: '/login' });
            }, 2000);
          }
          return;
        }

        // Use the most powerful role if multiple exist
        const roleOrder: AppRole[] = ['superadmin', 'admin_adm', 'lider', 'vendedor', 'financeiro', 'mecanico', 'montador'];
        const userRole = roles
          .map(r => r.role as AppRole)
          .sort((a, b) => roleOrder.indexOf(a) - roleOrder.indexOf(b))[0];

        if (isMounted) {
          setRole(userRole || null);
          setLoading(false);

          if (userRole && !canAccessRoute(location.pathname, userRole)) {
            console.warn(`Access denied for ${userRole} at ${location.pathname}`);
            toast.error("Acesso negado para seu nível de permissão");
            navigate({ to: '/' });
          }
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        if (isMounted) {
          setRole(null);
          setLoading(false);
          navigate({ to: '/login' });
        }
      }
    }

    checkAccess();

    return () => {
      isMounted = false;
    };
  }, [location.pathname, navigate]);

  if (loading) {
    return React.createElement('div', { className: 'flex h-screen w-full items-center justify-center bg-background' },
      React.createElement('div', { className: 'flex flex-col items-center gap-4' },
        React.createElement('div', { className: 'h-10 w-10 animate-spin rounded-full border-4 border-navy/10 border-t-orange shadow-lg shadow-orange/20' }),
        React.createElement('span', { className: 'text-[10px] font-black text-navy uppercase tracking-[0.3em] opacity-40 animate-pulse' }, 'Validando Acesso')
      )
    );
  }

  return React.createElement(React.Fragment, null, children);
}
