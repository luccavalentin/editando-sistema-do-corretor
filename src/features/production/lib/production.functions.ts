import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getPecasTeste = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.any().optional().parse(data))
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from('pecas_teste')
      .select(`
        *,
        cliente:clientes(nome),
        os:ordens_servico(protocolo)
      `)
      .order('vencimento_em', { ascending: true });

    if (error) throw new Error(error.message);
    return data;
  });

export const updatePecaStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    id: z.string(),
    status: z.string(),
    removeEtiqueta: z.boolean().optional()
  }).parse(data))
  .handler(async ({ data, context }) => {
    const updateData: any = { status: data.status };
    if (data.removeEtiqueta) {
      updateData.etiqueta_removida_em = new Date().toISOString();
    }

    const { data: result, error } = await context.supabase
      .from('pecas_teste')
      .update(updateData)
      .eq('id', data.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return result;
  });

export const getAgendaServicos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.any().optional().parse(data))
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from('agenda_servicos')
      .select(`
        *,
        os:ordens_servico(protocolo, cliente_id, veiculo_id, clientes(nome), veiculos(placa_cavalo))
      `)
      .order('data_prevista', { ascending: true });

    if (error) throw new Error(error.message);
    return data;
  });

export const getNotificacoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.any().optional().parse(data))
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from('notificacoes')
      .select('*')
      .eq('usuario_id_destino', context.userId)
      .eq('lida', false)
      .order('criado_em', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  });

export const markNotificacaoLida = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('id', data.id);

    if (error) throw new Error(error.message);
    return { success: true };
  });
