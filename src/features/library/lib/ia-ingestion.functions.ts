
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getIAProvider, generateEmbedding } from "../services/ia-provider";

export const ingestContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: any) => z.object({
    titulo: z.string(),
    conteudo: z.string(),
    marca: z.string().optional(),
    categoria: z.string().optional(),
    tags: z.array(z.string()).optional(),
    origem: z.enum(['manual', 'faq_gerado', 'humano']).default('manual')
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: config } = await supabase.from('ia_config').select('provider_ativo').single();
    const provider = await getIAProvider(config?.provider_ativo || 'gemini');

    // 1. Fragmentação (~1000 chars por simplicidade)
    const fragments = data.conteudo.match(/[^.!?]+[.!?]+/g) || [data.conteudo];
    const chunked: string[] = [];
    let currentChunk = "";
    
    for (const sentence of fragments) {
      if ((currentChunk + sentence).length > 1000) {
        chunked.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }
    if (currentChunk) chunked.push(currentChunk.trim());

    // 2. Classificação e Ingestão
    for (let i = 0; i < chunked.length; i++) {
      const chunk = chunked[i];
      const classification = await provider.classifyContent(chunk);
      const embedding = await generateEmbedding(chunk);

      await supabase.from('ia_base_conhecimento').insert({
        titulo: `${data.titulo} (Part ${i + 1})`,
        conteudo: chunk,
        marca: data.marca || (classification.marca as any),
        categoria: data.categoria || (classification.categoria as any),

        tags: data.tags || [],
        embedding,
        origem: data.origem,
        documento_origem: data.titulo,
        ordem_fragmento: i
      });
    }

    return { success: true, fragments: chunked.length };
  });
