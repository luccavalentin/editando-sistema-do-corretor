import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppRole } from '@/core/access-matrix';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthContextType {
  role: AppRole | null;
  loading: boolean;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error("AuthContext: Error fetching user roles:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          userId
        });
        return null;
      }

      const roles = data || [];
      if (roles.length === 0) {
        console.warn("AuthContext: No roles found for user:", userId);
        return null;
      }

      // Priority order for roles
      const roleOrder: AppRole[] = ['superadmin', 'admin_adm', 'lider', 'vendedor', 'financeiro', 'mecanico', 'montador'];
      const sortedRoles = roles
        .map(r => r.role as AppRole)
        .sort((a, b) => roleOrder.indexOf(a) - roleOrder.indexOf(b));
      
      return sortedRoles[0] || null;
    } catch (err) {
      console.error("AuthContext: Critical error fetching role:", err);
      return null;
    }
  };

  const refreshRole = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const userRole = await fetchRole(session.user.id);
      setRole(userRole);
    } else {
      setRole(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted) {
        if (session) {
          const userRole = await fetchRole(session.user.id);
          setRole(userRole);
        }
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session) {
          const userRole = await fetchRole(session.user.id);
          setRole(userRole);
        }
      } else if (event === 'SIGNED_OUT') {
        setRole(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ role, loading, refreshRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
