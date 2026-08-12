import React, { useEffect, useState } from 'react';
import { AppRole, canAccessRoute } from '@/core/access-matrix';
import { getCurrentUserRole } from '@/core/auth';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { toast } from 'sonner';

export function RequireRole({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    async function checkAccess() {
      try {
        const userRole = await getCurrentUserRole();
        
        if (!userRole) {
          console.warn("No role found for user, redirecting to login");
          setRole(null);
          setLoading(false);
          // Only navigate if we're not already on login (though RequireRole isn't usually on login)
          if (location.pathname !== '/login') {
            navigate({ to: '/login' });
          }
          return;
        }

        setRole(userRole);
        setLoading(false);

        if (!canAccessRoute(location.pathname, userRole)) {
          console.warn(`User role ${userRole} cannot access ${location.pathname}`);
          toast.error("Acesso negado para seu nível de permissão");
          navigate({ to: '/' });
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        setRole(null);
        setLoading(false);
        navigate({ to: '/login' });
      }
    }
    checkAccess();
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
