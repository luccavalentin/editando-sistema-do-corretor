import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { searchProdutosOmie } from "@/features/omie/services/omie.functions";

export const getProdutoSaldoOmie = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: any) => z.object({ codigo_produto: z.number() }).parse(data))
  .handler(async ({ data }): Promise<number> => {
    try {
      // Importação dinâmica para evitar ciclos se houver
      const { callOmie } = await import("@/features/omie/services/omie.functions");
      const result = await (callOmie as any)("/estoque/resumo/", "ListarResumoEstoque", {
        nCodProd: data.codigo_produto
      });
      return result.resumoEstoque?.[0]?.nSaldo || 0;
    } catch (error) {
      console.error("[OMIE] Erro ao buscar saldo:", error);
      return 0;
    }
  });
