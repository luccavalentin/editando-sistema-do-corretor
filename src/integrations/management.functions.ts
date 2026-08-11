import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "./supabase/client";

// Busca cliente local por documento ou nome
export const searchClienteLocal = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ query: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const { data: clientes, error } = await supabase
      .from("clientes")
      .select("*")
      .or(`documento.ilike.%${data.query}%,nome.ilike.%${data.query}%`)
      .limit(10);
      
    if (error) throw new Error(error.message);
    return clientes;
  });

// Busca veículos de um cliente
export const getVeiculosByCliente = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ cliente_id: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const { data: veiculos, error } = await supabase
      .from("veiculos")
      .select("*")
      .eq("cliente_id", data.cliente_id);
      
    if (error) throw new Error(error.message);
    return veiculos;
  });

// Gera protocolo TNR-AAAA-NNNNNN
const generateProtocolo = async () => {
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("ordens_servico")
    .select("*", { count: "exact", head: true });
    
  const nextNum = (count || 0) + 1;
  return `TNR-${year}-${String(nextNum).padStart(6, "0")}`;
};

// Abre nova Ordem de Serviço
export const openOS = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({
    cliente_id: z.string(),
    veiculo_id: z.string(),
    box: z.string().optional(),
    motorista_cliente: z.string().optional(),
    km_entrada: z.number().optional(),
    fotos_entrada: z.array(z.string()).optional(),
    observacoes_gerais: z.string().optional(),
  }).parse(data))
  .handler(async ({ data }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Unauthorized");

    const protocolo = await generateProtocolo();

    const { data: os, error } = await supabase
      .from("ordens_servico")
      .insert({
        ...data,
        protocolo,
        responsavel_abertura_id: session.user.id,
        status: "aberta"
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return os;
  });
