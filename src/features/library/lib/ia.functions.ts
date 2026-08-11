
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getIAConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from('ia_config')
      .select('*')
      .single();
    
    if (error) throw new Error(error.message);
    return data;
  });

export const updateIAConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: any) => z.object({
    provider_ativo: z.enum(['gemini', 'openai', 'claude'])
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from('ia_config')
      .update({ 
        provider_ativo: data.provider_ativo,
        atualizado_em: new Date().toISOString()
      })
      .eq('id', (await supabase.from('ia_config').select('id').single()).data?.id);

    if (error) throw new Error(error.message);
    return { success: true };
  });

export const getBaseConhecimento = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: any) => z.object({
    marca: z.string().optional(),
    categoria: z.string().optional(),
    query: z.string().optional()
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let query = supabase.from('ia_base_conhecimento').select('*');
    
    if (data.marca) query = query.eq('marca', data.marca);
    if (data.categoria) query = query.eq('categoria', data.categoria);
    if (data.query) query = query.ilike('titulo', `%${data.query}%`);

    const { data: results, error } = await query.order('criado_em', { ascending: false });
    if (error) throw new Error(error.message);
    return results;
  });

export const iaChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: any) => z.object({
    conversa_id: z.string().optional(),
    mensagem: z.string(),
    anexos: z.array(z.any()).optional()
  }).parse(data))
  .handler(async ({ data, context }) => {
    // A implementação completa virá no ia-chat.server.ts
    // Aqui apenas chamamos o helper interno
    const { chatHandler } = await import("./ia-chat.server");
    return chatHandler(data, context);
  });
