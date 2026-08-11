import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "./supabase/client";

export const getOSStats = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data: os, error } = await supabase
      .from("ordens_servico")
      .select("status, criado_em, finalizado_em");
    
    if (error) throw new Error(error.message);
    
    const today = new Date().toISOString().split('T')[0];
    
    return {
      noPatio: os.filter(o => o.status !== 'concluida' && o.status !== 'cancelada').length,
      entraramHoje: os.filter(o => o.criado_em.startsWith(today)).length,
      concluidasHoje: os.filter(o => o.finalizado_em?.startsWith(today)).length,
      atrasadas: 0,
      pecasVencendo: 0, 
    };
  });

export const getOSList = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabase
      .from("ordens_servico")
      .select(`
        *,
        cliente:clientes(nome),
        veiculo:veiculos(placa_cavalo, modelo_cavalo)
      `)
      .order('criado_em', { ascending: false });
      
    if (error) throw new Error(error.message);
    return data;
  });

export const updateOSStatus = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({
    os_id: z.string(),
    novo_status: z.string()
  }).parse(data))
  .handler(async ({ data }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Unauthorized");

    const { error } = await supabase.rpc('transicionar_status_os', {
      _os_id: data.os_id,
      _novo_status: data.novo_status,
      _usuario_id: session.user.id
    });

    if (error) throw new Error(error.message);
    return { success: true };
  });

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

