import React, { useEffect } from 'react';
import { canAccessRoute } from '@/core/access-matrix';
import { useAuth } from '@/core/AuthProvider';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { toast } from 'sonner';

export function RequireRole({ children }: { children: React.ReactNode }) {
  const { role, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    if (location.pathname === '/login') {
      return;
    }

    if (!role) {
      console.warn("RequireRole: No role found, redirecting to login");
      navigate({ to: '/login' });
      return;
    }

    if (!canAccessRoute(location.pathname, role)) {
      console.warn(`RequireRole: Access denied for ${role} at ${location.pathname}`);
      toast.error("Acesso negado para seu nível de permissão");
      navigate({ to: '/' });
    }
  }, [role, loading, location.pathname, navigate]);

  if (loading) {
    return React.createElement('div', { className: 'flex h-screen w-full items-center justify-center bg-background' },
      React.createElement('div', { className: 'flex flex-col items-center gap-4' },
        React.createElement('div', { className: 'h-10 w-10 animate-spin rounded-full border-4 border-navy/10 border-t-orange shadow-lg shadow-orange/20' }),
        React.createElement('span', { className: 'text-[10px] font-black text-navy uppercase tracking-[0.3em] opacity-40 animate-pulse' }, 'Validando Acesso')
      )
    );
  }

  // If not loading and no role, the useEffect will handle navigation to login
  if (!role && location.pathname !== '/login') {
    return null;
  }

  return React.createElement(React.Fragment, null, children);
}
