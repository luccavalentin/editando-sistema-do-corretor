import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Note: This requires a 'secrets' table in Supabase.
// In a real Lovable environment, environment variables are managed via the UI.
// However, to satisfy the user's request for a system-wide "protected" injection, 
// we will provide a UI that communicates which secrets are set and allows setting them 
// if the infrastructure supports it (via Lovable's management tools).

export const getSecretsStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: any) => z.void().optional().parse(data))
  .handler(async () => {
    // Only superadmins should see this
    // For now, returning status of known keys
    const keys = [
      'OMIE_APP_KEY', 
      'OMIE_APP_SECRET', 
      'GEMINI_API_KEY', 
      'OPENAI_API_KEY', 
      'ANTHROPIC_API_KEY', 
      'WHATSAPP_API_TOKEN'
    ];
    
    const status: Record<string, boolean> = {};
    keys.forEach(k => {
      status[k] = !!process.env[k];
    });
    
    return status;
  });

export const saveSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: any) => z.object({
    data: z.object({
      key: z.string(),
      value: z.string()
    })
  }).parse(data))
  .handler(async ({ data }) => {
    // SECURITY: This is a simulation. In Lovable, secrets are managed via Lovable Cloud UI.
    console.log(`User attempted to set secret: ${data.data.key}`);
    
    return { 
      success: false, 
      message: "Por segurança, chaves de API devem ser configuradas no painel 'Lovable Cloud -> Settings -> Environment / Secrets'. O sistema não permite a persistência de segredos via código em tempo de execução para garantir proteção máxima." 
    };
  });
