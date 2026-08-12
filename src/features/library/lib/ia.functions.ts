import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getIAConfigServer, getBaseConhecimentoServer } from "../services/ia.server";

export const getIAConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return getIAConfigServer(context.supabase);
  });

export const updateIAConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: any) => z.object({
    provider_ativo: z.enum(['gemini', 'openai', 'claude'])
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from('ia_config').update({ 
      provider_ativo: data.provider_ativo,
      atualizado_em: new Date().toISOString()
    }).eq('id', (await supabase.from('ia_config').select('id').single()).data?.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const getBaseConhecimento = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: any) => z.object({
    marca: z.string().optional(),
    categoria: z.string().optional(),
    query: z.string().optional()
  }).optional().parse(data || {}))
  .handler(async ({ data, context }) => {
    return getBaseConhecimentoServer(context.supabase, data);
  });

export const iaChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: any) => z.object({
    conversa_id: z.string().optional(),
    mensagem: z.string(),
    anexos: z.array(z.any()).optional(),
    is_suggestion: z.boolean().optional()
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { chatHandler } = await import("./ia-chat.server");
    return chatHandler(data, context);
  });
