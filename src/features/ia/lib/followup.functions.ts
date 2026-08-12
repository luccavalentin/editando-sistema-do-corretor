import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getIAProvider } from "@/features/library/services/ia-provider";

export const generateFollowUpDraftsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Busca o provedor ativo
    const { data: config } = await supabase
      .from('ia_config')
      .select('provider_ativo')
      .single();
    
    const providerName = config?.provider_ativo || 'gemini';
    const provider = await getIAProvider(providerName);

    // 1. Busca clientes pendentes (ex: sem OS há mais de 30 dias ou marcado no follow-up manual)
    const { data: clientes } = await supabase
      .from('clientes')
      .select(`
        id, 
        nome, 
        veiculos (placa_cavalo, modelo_cavalo),
        ordens_servico (id, criado_em, status, valor_total)
      `)
      .limit(10); // Lote pequeno para exemplo

    if (!clientes) return { success: true, count: 0 };

    let generatedCount = 0;

    for (const cliente of clientes) {
      // Prepara contexto para a IA
      const historico = {
        nome: cliente.nome,
        veiculos: cliente.veiculos,
        ultimas_os: cliente.ordens_servico?.slice(0, 3)
      };

      const prompt = `
        Gere uma sugestão de mensagem de acompanhamento (follow-up) via WhatsApp para o cliente ${cliente.nome}.
        Contexto do cliente: ${JSON.stringify(historico)}.
        A mensagem deve ser profissional, amigável e focar em saber se os veículos estão operando bem ou se precisam de revisão.
        Responda APENAS com o texto da mensagem.
      `;

      try {
        const response = await provider.generateAnswer({ pergunta: prompt });
        
        // Grava rascunho
        await supabase
          .from('ia_followup_mensagens')
          .insert({
            cliente_id: cliente.id,
            sugestao_texto: response.texto,
            status: 'rascunho',
            canal: 'whatsapp'
          });
        
        generatedCount++;
      } catch (e) {
        console.error(`Erro ao gerar follow-up para ${cliente.nome}:`, e);
      }
    }

    return { success: true, count: generatedCount };
  });

export const approveFollowUpFn = createServerFn({ method: "POST" })
  .validator((data: any) => z.object({
    id: z.string().uuid(),
    textoEditado: z.string()
  }).parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    
    const { error } = await supabase
      .from('ia_followup_mensagens')
      .update({ 
        sugestao_texto: data.textoEditado,
        status: 'aprovada',
        aprovado_por: userId
      })
      .eq('id', data.id);
    
    if (error) throw error;
    return { success: true };
  });
