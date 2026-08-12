import React, { useEffect, useState } from 'react';
import { AppRole, canAccessRoute } from '@/core/access-matrix';
import { getCurrentUserRole } from '@/core/auth';
import { useNavigate, useLocation } from '@tanstack/react-router';

/**
 * Wrapper de rota para controle de acesso centralizado.
 * Resolve a checagem antes de renderizar para evitar flash de conteúdo.
 */
export function RequireRole({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    async function checkAccess() {
      const userRole = await getCurrentUserRole();
      setRole(userRole);
      setLoading(false);

      if (!userRole) {
        navigate({ to: '/login' });
        return;
      }

      if (!canAccessRoute(location.pathname, userRole)) {
        navigate({ to: '/' });
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
