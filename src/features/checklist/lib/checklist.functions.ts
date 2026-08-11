import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth.middleware";

export const getChecklistTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .input(z.object({ tipo: z.string() }))
  .handler(async ({ data, context }) => {
    const { data: templates, error } = await context.supabase
      .from('checklist_templates')
      .select('*')
      .eq('tipo', data.tipo)
      .order('ordem', { ascending: true });

    if (error) throw new Error(error.message);
    return templates;
  });

export const saveChecklist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .input(z.object({
    os_id: z.string(),
    tipo: z.string(),
    respostas: z.array(z.any()),
    assinatura_url: z.string().optional(),
    finalizado: z.boolean().default(false)
  }))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase
      .from('checklists')
      .upsert({
        os_id: data.os_id,
        tipo: data.tipo as any,
        respostas: data.respostas,
        assinatura_url: data.assinatura_url,
        finalizado_em: data.finalizado ? new Date().toISOString() : null,
        criado_por: context.userId
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Se finalizado, transicionar status da OS via RPC
    if (data.finalizado) {
      let novoStatus = 'checklist_diagnostico';
      
      if (data.tipo === 'diagnostico_defeitos') {
        const temNaoOk = data.respostas.some((r: any) => r.status === 'nao_ok');
        novoStatus = temNaoOk ? 'aguardando_peca' : 'em_execucao';
      } else if (data.tipo === 'estado_caminhao') {
        novoStatus = 'aguardando_retirada';
      }
      
      const { error: rpcError } = await context.supabase.rpc('transicionar_status_os', {
        _os_id: data.os_id,
        _novo_status: novoStatus,
        _usuario_id: context.userId
      });
      
      if (rpcError) console.error("Erro ao transicionar OS:", rpcError);
    }

    return result;
  });
