import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AVAILABLE_SECRETS } from "./secrets.server";

export const getSecretsStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: any) => z.void().optional().parse(data))
  .handler(async () => {
    const status: Record<string, boolean> = {};
    
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    
    for (const secret of AVAILABLE_SECRETS) {
      // Verifica no ENV
      if (process.env[secret.key]) {
        status[secret.key] = true;
        continue;
      }
      
      // Verifica no Banco
      const { data } = await supabaseAdmin
        .from('app_secrets')
        .select('key')
        .eq('key', secret.key)
        .single();
        
      status[secret.key] = !!data;
    }
    
    return status;
  });

export const saveSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: any) => {
    // TanStack Start v1 wraps data in a 'data' property if it's an object,
    // but some environments might pass it differently.
    // We handle both { data: { key, value } } and { key, value }
    const input = data?.data || data;
    return z.object({
      key: z.string(),
      value: z.string()
    }).parse(input);
  })
  .handler(async ({ data }) => {
    const { key, value } = data;
    
    try {
      console.log('Iniciando persistência da chave:', key);
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
      
      const { error } = await supabaseAdmin
        .from('app_secrets')
        .upsert({ 
          key, 
          value, 
          updated_at: new Date().toISOString() 
        }, { onConflict: 'key' });
        
      if (error) {
        console.error('Erro retornado pelo Supabase:', error);
        throw error;
      }
      
      console.log('Chave persistida com sucesso:', key);
      
      return { 
        success: true, 
        message: "Chave salva com sucesso no banco de dados Supabase." 
      };
    } catch (err: any) {
      console.error('Erro ao salvar segredo:', err);
      return {
        success: false,
        message: `Erro ao salvar no banco: ${err.message}`
      };
    }
  });