import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { OSStatusSchema } from "../types/os.types";
import { getOSStatsServer, getOSListServer } from "./os.server";

export const getOSStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return getOSStatsServer(context.supabase);
  });

export const getOSList = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return getOSListServer(context.supabase);
  });

export const updateOSStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: any) => z.object({
    os_id: z.string(),
    novo_status: OSStatusSchema
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.rpc('transicionar_status_os', {
      _os_id: data.os_id,
      _novo_status: data.novo_status,
      _usuario_id: userId
    });
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const searchClienteLocal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: any) => z.object({ query: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: clientes, error } = await context.supabase
      .from("clientes")
      .select("*")
      .or(`documento.ilike.%${data.query}%,nome.ilike.%${data.query}%`)
      .limit(10);
    if (error) throw new Error(error.message);
    return clientes;
  });

export const getVeiculosByCliente = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: any) => z.object({ cliente_id: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: veiculos, error } = await context.supabase
      .from("veiculos")
      .select("*")
      .eq("cliente_id", data.cliente_id);
    if (error) throw new Error(error.message);
    return veiculos;
  });

export const openOS = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: any) => z.object({
    cliente_id: z.string(),
    veiculo_id: z.string(),
    box: z.string().optional(),
    motorista_cliente: z.string().optional(),
    km_entrada: z.number().optional(),
    fotos_entrada: z.array(z.string()).optional(),
    observacoes_gerais: z.string().optional(),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from("ordens_servico")
      .select("*", { count: "exact", head: true });
    const protocolo = `TNR-${year}-${String((count || 0) + 1).padStart(6, "0")}`;
    const { data: os, error } = await supabase
      .from("ordens_servico")
      .insert({ ...data, protocolo, responsavel_abertura_id: userId, status: "aberta" })
      .select().single();
    if (error) throw new Error(error.message);
    return os;
  });
