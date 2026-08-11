import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createProcessoFn = createServerFn({ method: "POST" })
  .validator((data: any) => z.object({
    setor: z.enum(['administrativo', 'financeiro', 'vendas', 'oficina', 'estoque', 'geral']),
    titulo: z.string(),
    descricao: z.string().optional(),
    passos: z.array(z.object({
      ordem: z.number(),
      instrucao: z.string(),
      responsavel_role: z.string(),
      anexo_url: z.string().optional()
    }))
  }).parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    
    const { data: processo, error } = await supabase
      .from('processos')
      .insert({
        ...data,
        criado_por: userId
      })
      .select()
      .single();
      
    if (error) throw error;
    return processo;
  });

export const convertProcessoToTemplateFn = createServerFn({ method: "POST" })
  .validator((data: any) => z.object({ processoId: z.string().uuid() }).parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    
    const { data: processo } = await supabase
      .from('processos')
      .select('*')
      .eq('id', data.processoId)
      .single();
      
    if (!processo) throw new Error("Processo não encontrado");

    // Converte passos para o formato de itens do template de checklist
    const itens = (processo.passos as any[]).map(p => ({
      pergunta: p.instrucao,
      tipo: 'boolean',
      obrigatorio: true,
      role_responsavel: p.responsavel_role
    }));

    const { data: template, error } = await supabase
      .from('checklist_templates')
      .insert({
        nome: `Processo: ${processo.titulo}`,
        tipo: 'processo_setor',
        itens: itens
      })
      .select()
      .single();

    if (error) throw error;
    return template;
  });
