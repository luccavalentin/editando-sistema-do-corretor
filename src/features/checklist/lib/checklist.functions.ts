import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { iaChat } from "@/features/library/lib/ia.functions";


export const getChecklistTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ tipo: z.string() }).parse(data))
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
  .inputValidator((data) => z.object({
    os_id: z.string(),
    tipo: z.string(),
    respostas: z.array(z.any()),
    assinatura_url: z.string().optional(),
    finalizado: z.boolean().default(false)
  }).parse(data))
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

    // Se houver item NÃO OK no diagnóstico, solicitar sugestão da IA em segundo plano
    if (data.tipo === 'diagnostico_defeitos') {
      const itensNaoOk = (data.respostas as any[]).filter(r => r.status === 'nao_ok');
      if (itensNaoOk.length > 0) {
        // Chamada "fire-and-forget" para sugestão
        const prompt = `Itens com defeito: ${itensNaoOk.map(i => i.item).join(', ')}. Observações: ${itensNaoOk.map(i => i.observacao).join('; ')}`;
        iaChat({ mensagem: prompt, is_suggestion: true } as any).catch(console.error);
      }
    }

    // Se finalizado, transicionar status da OS via RPC

    if (data.finalizado) {
      let novoStatus = 'checklist_diagnostico';
      
      if (data.tipo === 'diagnostico_defeitos') {
        const temNaoOk = data.respostas.some((r: any) => r.status === 'nao_ok');
        novoStatus = temNaoOk ? 'aguardando_peca' : 'em_execucao';
      } else if (data.tipo === 'estado_caminhao') {
        novoStatus = 'aguardando_retirada';
      } else if (data.tipo === 'conferencia_final') {
        novoStatus = 'aguardando_retirada';
        // Lógica de Ranking: Checklist Final sem retrabalho
        const temRetrabalho = data.respostas.some((r: any) => r.status === 'nao_ok');
        if (!temRetrabalho) {
          const { data: os } = await context.supabase
            .from('ordens_servico')
            .select('tecnico_id')
            .eq('id', data.os_id)
            .single();
          
          if (os?.tecnico_id) {
            await context.supabase.rpc('apply_ranking_points', {
              _usuario_id: os.tecnico_id,
              _tipo_evento: 'checklist_sem_retrabalho',
              _os_id: data.os_id
            });
          }
        }
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
