import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const inviteUserFn = createServerFn({ method: "POST" })
  .validator((data: any) => z.object({
    email: z.string().email(),
    nome: z.string(),
    cargo: z.string(),
    matricula: z.string(),
    role: z.enum(['superadmin', 'admin_adm', 'mecanico', 'montador', 'vendedor', 'financeiro', 'lider']),
    fotoUrl: z.string().optional(),
  }).parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabaseAdmin, userId } = context;

    // Verificar se quem convida é superadmin
    const { data: userRole } = await context.supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (userRole?.role !== 'superadmin') {
      throw new Error("Apenas Superadministradores podem convidar novos usuários.");
    }

    // 1. Convidar via Supabase Auth Admin (Service Role)
    const { data: invite, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      data.email,
      {
        data: {
          full_name: data.nome,
          cargo: data.cargo,
          matricula: data.matricula,
          avatar_url: data.fotoUrl,
        }
      }
    );

    if (inviteError) throw inviteError;

    // 2. Atribuir Role inicial
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: invite.user.id,
        role: data.role
      });

    if (roleError) throw roleError;

    return { success: true, user: invite.user };
  });

export const listUsersFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = context;
    // Listar usuários do Auth via Admin SDK
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw error;

    // Buscar roles
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('*');

    return users.map(u => ({
      id: u.id,
      email: u.email,
      nome: u.user_metadata['full_name'],
      cargo: u.user_metadata['cargo'],
      matricula: u.user_metadata['matricula'],
      foto: u.user_metadata['avatar_url'],
      role: roles?.find(r => r.user_id === u.id)?.role,
      status: u.email_confirmed_at ? 'ativo' : 'convite pendente',
      ultimo_acesso: u.last_sign_in_at,
    }));
  });

export const transitionUserRoleFn = createServerFn({ method: "POST" })
  .validator((data: any) => z.object({
    targetUserId: z.string().uuid(),
    newRole: z.enum(['superadmin', 'admin_adm', 'mecanico', 'montador', 'vendedor', 'financeiro', 'lider']),
  }).parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { userId } = context;
    
    // Chamada ao RPC transicionar_role_usuario
    const { error } = await context.supabase.rpc('transicionar_role_usuario', {
      _user_id: data.targetUserId,
      _novo_role: data.newRole,
      _alterado_por: userId
    });

    if (error) throw error;
    return { success: true };
  });

export const toggleUserStatusFn = createServerFn({ method: "POST" })
  .validator((data: any) => z.object({
    targetUserId: z.string().uuid(),
    active: z.boolean(),
  }).parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabaseAdmin, userId } = context;

    // Verificar se quem altera é superadmin
    const { data: userRole } = await context.supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (userRole?.role !== 'superadmin') {
      throw new Error("Apenas Superadministradores podem alterar o status de usuários.");
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      data.targetUserId,
      { ban_duration: data.active ? 'none' : '876000h' }
    );

    if (error) throw error;
    return { success: true };
  });
