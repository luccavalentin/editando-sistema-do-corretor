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
