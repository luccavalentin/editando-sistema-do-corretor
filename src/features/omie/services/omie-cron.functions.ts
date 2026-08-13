
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { syncClientesOmie, syncEstoqueOmie } from "./omie.functions";

export const runAutoSync = createServerFn({ method: "POST" })
  .validator((data: any) => z.void().optional().parse(data))
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    
    // Busca configuração ativa
    const { data: config } = await supabaseAdmin
      .from('omie_sync_config')
      .select('*')
      .eq('active', true)
      .single();

    if (!config) return { message: "Sync inativo" };

    const now = new Date();
    const intervalMs = config.sync_interval_minutes * 60 * 1000;

    // Verifica clientes
    const lastClientes = config.last_sync_clientes ? new Date(config.last_sync_clientes) : new Date(0);
    if (now.getTime() - lastClientes.getTime() > intervalMs) {
      console.log("[CRON] Sincronizando clientes Omie...");
      try {
        // Precisamos mockar o context para as funções internas se elas usarem context.supabase
        // Mas como são server functions, chamamos elas com o que elas precisam
        await syncClientesOmie({ data: undefined });
        await supabaseAdmin.from('omie_sync_config')
          .update({ last_sync_clientes: now.toISOString() })
          .eq('id', config.id);
      } catch (e) {
        console.error("[CRON] Erro sync clientes:", e);
      }
    }

    // Verifica estoque
    const lastEstoque = config.last_sync_estoque ? new Date(config.last_sync_estoque) : new Date(0);
    if (now.getTime() - lastEstoque.getTime() > intervalMs) {
      console.log("[CRON] Sincronizando estoque Omie...");
      try {
        await syncEstoqueOmie({ data: undefined });
        await supabaseAdmin.from('omie_sync_config')
          .update({ last_sync_estoque: now.toISOString() })
          .eq('id', config.id);
      } catch (e) {
        console.error("[CRON] Erro sync estoque:", e);
      }
    }

    return { success: true };
  });
