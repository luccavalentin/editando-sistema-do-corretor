import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getPecasTesteServer } from "../services/production.server";
export const getPecasTeste = createServerFn({ method: "GET" })
    .middleware([requireSupabaseAuth])
    .handler(async ({ context }) => {
    return getPecasTesteServer(context.supabase);
});
export const updatePecaStatus = createServerFn({ method: "POST" })
    .middleware([requireSupabaseAuth])
    .validator((data) => z.object({
    id: z.string(),
    status: z.string(),
    removeEtiqueta: z.boolean().optional()
}).parse(data))
    .handler(async ({ data, context }) => {
    const updateData = { status: data.status };
    if (data.removeEtiqueta)
        updateData.etiqueta_removida_em = new Date().toISOString();
    const { data: result, error } = await context.supabase
        .from('pecas_teste')
        .update(updateData)
        .eq('id', data.id)
        .select().single();
    if (error)
        throw new Error(error.message);
    return result;
});
import { getAgendaServicosServer } from "../services/production.server";
export const getAgendaServicos = createServerFn({ method: "GET" })
    .middleware([requireSupabaseAuth])
    .handler(async ({ context }) => {
    return getAgendaServicosServer(context.supabase);
});
export const searchProdutos = createServerFn({ method: "GET" })
    .middleware([requireSupabaseAuth])
    .validator((data) => z.object({ query: z.string() }).parse(data))
    .handler(async ({ data, context }) => {
    const { supabase } = context;
    // 1. Busca no cache local
    const { data: locais } = await supabase
        .from('pecas_estoque_cache')
        .select('*')
        .or(`descricao.ilike.%${data.query}%,codigo_produto.ilike.%${data.query}%,omie_codigo_produto.ilike.%${data.query}%`)
        .limit(20);
    // 2. Busca em tempo real na Omie se a query for longa
    if (data.query.length >= 3) {
        try {
            const { searchProdutosOmie } = await import("../../omie/services/omie.functions");
            const omieResults = await searchProdutosOmie({ data: { query: data.query } });
            // Mapear para o formato local
            const mapped = omieResults.map(p => ({
                omie_codigo_produto: p.codigo_produto,
                descricao: p.descricao,
                codigo_produto: p.codigo_produto,
                saldo: 0,
                is_omie_temp: true
            }));
            return [...(locais || []), ...mapped];
        }
        catch (err) {
            console.error(err);
        }
    }
    return locais || [];
});
