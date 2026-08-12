import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getChecklistTemplatesServer } from "./checklist.server";

export const getChecklistTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: any) => z.object({ tipo: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    return getChecklistTemplatesServer(context.supabase, data.tipo);
  });

export const saveChecklist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: any) => z.object({
    os_id: z.string().nullable(),
    setor: z.string().nullable().optional(),
    data: z.string().nullable().optional(),
    tipo: z.string(),
    respostas: z.array(z.any()),
    assinatura_url: z.string().optional(),
    finalizado: z.boolean().default(false)
  }).parse(data))
  .handler(async ({ data, context }) => {
    const upsertData: any = {
      tipo: data.tipo,
      respostas: data.respostas,
      assinatura_url: data.assinatura_url,
      finalizado_em: data.finalizado ? new Date().toISOString() : null,
      criado_por: context.userId
    };
    if (data.os_id) upsertData.os_id = data.os_id;
    else {
      upsertData.setor = data.setor;
      upsertData.data = data.data || new Date().toISOString().split('T')[0];
    }
    const { data: result, error } = await context.supabase
      .from('checklists')
      .upsert(upsertData)
      .select().single();
    if (error) throw new Error(error.message);
    return result;
  });
