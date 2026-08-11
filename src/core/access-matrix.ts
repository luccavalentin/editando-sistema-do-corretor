
export type AppRole = 'superadmin' | 'admin_adm' | 'mecanico' | 'montador' | 'vendedor' | 'financeiro' | 'lider';

export interface RouteAccess {
  roles: AppRole[];
  partial?: boolean;
}

export const ACCESS_MATRIX: Record<string, RouteAccess> = {
  '/': { roles: ['superadmin', 'admin_adm', 'mecanico', 'montador', 'vendedor', 'financeiro', 'lider'] },
  '/management': { roles: ['superadmin', 'admin_adm', 'vendedor'], partial: true },
  '/checklist': { roles: ['superadmin', 'admin_adm', 'mecanico', 'montador', 'lider'] },
  '/tasks': { roles: ['superadmin', 'admin_adm', 'mecanico', 'montador', 'vendedor', 'financeiro', 'lider'] },
  '/ranking': { roles: ['superadmin', 'admin_adm', 'mecanico', 'montador', 'vendedor', 'financeiro', 'lider'] },
  '/production': { roles: ['superadmin', 'admin_adm', 'mecanico', 'montador', 'vendedor', 'lider'] },
  '/reports': { roles: ['superadmin', 'admin_adm', 'financeiro', 'lider'] },
  '/ia': { roles: ['superadmin', 'admin_adm', 'mecanico', 'montador', 'lider'] },
  '/settings': { roles: ['superadmin', 'admin_adm', 'lider'] },
};

export function canAccessRoute(route: string, userRole: AppRole | null): boolean {
  if (!userRole) return false;
  const access = ACCESS_MATRIX[route];
  if (!access) return true; // Rotas não mapeadas são públicas para autenticados por padrão ou tratadas separadamente
  return access.roles.includes(userRole);
}

export function isSuperAdmin(userRole: AppRole | null): boolean {
  return userRole === 'superadmin';
}
