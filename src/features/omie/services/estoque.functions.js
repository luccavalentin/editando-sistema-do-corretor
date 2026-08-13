import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
export const getProdutoSaldoOmie = createServerFn({ method: "POST" })
    .middleware([requireSupabaseAuth])
    .validator((data) => z.object({ codigo_produto: z.number() }).parse(data))
    .handler(async ({ data }) => {
    try {
        // Importação dinâmica para evitar ciclos se houver
        const { callOmie } = await import("@/features/omie/services/omie.functions");
        const result = await callOmie("/estoque/resumo/", "ListarResumoEstoque", {
            nCodProd: data.codigo_produto
        });
        return result.resumoEstoque?.[0]?.nSaldo || 0;
    }
    catch (error) {
        console.error("[OMIE] Erro ao buscar saldo:", error);
        return 0;
    }
});
