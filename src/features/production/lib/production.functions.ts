import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getPecasTesteServer } from "../services/production.server";

export const getPecasTeste = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return getPecasTesteServer(context.supabase);
  });

export const updatePecaStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: any) => z.object({
    id: z.string(),
    status: z.string(),
    removeEtiqueta: z.boolean().optional()
  }).parse(data))
  .handler(async ({ data, context }) => {
    const updateData: any = { status: data.status };
    if (data.removeEtiqueta) updateData.etiqueta_removida_em = new Date().toISOString();
    const { data: result, error } = await context.supabase
      .from('pecas_teste')
      .update(updateData)
      .eq('id', data.id)
      .select().single();
    if (error) throw new Error(error.message);
    return result;
  });
import { getAgendaServicosServer } from "../services/production.server";

export const getAgendaServicos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return getAgendaServicosServer(context.supabase);
  });
