import { z } from "zod";

export const SecretSchema = z.object({
  key: z.string(),
  value: z.string(),
  description: z.string().optional()
});

export type Secret = z.infer<typeof SecretSchema>;

export const AVAILABLE_SECRETS = [
  { key: 'OMIE_APP_KEY', label: 'Omie App Key', category: 'ERP' },
  { key: 'OMIE_APP_SECRET', label: 'Omie App Secret', category: 'ERP' },
  { key: 'GEMINI_API_KEY', label: 'Gemini API Key', category: 'IA' },
  { key: 'OPENAI_API_KEY', label: 'OpenAI API Key', category: 'IA' },
  { key: 'ANTHROPIC_API_KEY', label: 'Anthropic API Key', category: 'IA' },
  { key: 'WHATSAPP_API_TOKEN', label: 'WhatsApp API Token', category: 'WhatsApp' },
] as const;

/**
 * Busca um segredo priorizando variável de ambiente e depois o banco de dados.
 */
export async function getSecretValue(key: string): Promise<string | undefined> {
  // 1. Tenta ler do environment (Lovable Secrets)
  const envValue = process.env[key];
  if (envValue) return envValue;

  // 2. Tenta ler do Supabase via admin client (servidor)
  try {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data, error } = await supabaseAdmin
      .rpc('get_app_secret', { _key: key });

    if (!error && data) {
      return data as string;
    }
  } catch (err) {
    console.error(`Erro ao buscar segredo ${key} no banco:`, err);
  }

  return undefined;
}
