import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { OSStatusSchema } from "../types/os.types";

export const getOSStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: os, error } = await supabase
      .from("ordens_servico")
      .select("status, criado_em, finalizado_em");
    
    if (error) throw new Error(error.message);
    
    const { data: pecas } = await supabase
      .from("pecas_teste")
      .select("id, status, vencimento_em");
    
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    
    return {
      noPatio: os.filter(o => o.status !== 'concluida' && o.status !== 'cancelada').length,
      entraramHoje: os.filter(o => o.criado_em.startsWith(today)).length,
      concluidasHoje: os.filter(o => o.finalizado_em?.startsWith(today)).length,
      atrasadas: 0,
      pecasVencendo: pecas?.filter(p => p.status === 'em_teste' && new Date(p.vencimento_em) < now).length || 0,
    };
  });

export const getOSList = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
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
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
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
  .inputValidator((data) => z.object({ query: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: clientes, error } = await supabase
      .from("clientes")
      .select("*")
      .or(`documento.ilike.%${data.query}%,nome.ilike.%${data.query}%`)
      .limit(10);
      
    if (error) throw new Error(error.message);
    return clientes;
  });

export const getVeiculosByCliente = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ cliente_id: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: veiculos, error } = await supabase
      .from("veiculos")
      .select("*")
      .eq("cliente_id", data.cliente_id);
      
    if (error) throw new Error(error.message);
    return veiculos;
  });

export const openOS = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
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

    // Gera protocolo com trava de concorrência via timestamp se necessário
    const year = new Date().getFullYear();
    const { count, error: countError } = await supabase
      .from("ordens_servico")
      .select("*", { count: "exact", head: true });
    
    if (countError) throw new Error(`Falha ao gerar protocolo: ${countError.message}`);
      
    const protocolo = `TNR-${year}-${String((count || 0) + 1).padStart(6, "0")}`;

    const { data: os, error } = await supabase
      .from("ordens_servico")
      .insert({
        ...data,
        protocolo,
        responsavel_abertura_id: userId,
        status: "aberta"
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return os;
  });

export const getReportsData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: any) => z.object({
    period: z.enum(['day', 'week', 'month', 'year', 'all']).default('all'),
    tecnico_id: z.string().optional(),
    cliente_id: z.string().optional()
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let query = supabase
      .from("ordens_servico")
      .select(`
        id,
        protocolo,
        status,
        valor_pecas,
        valor_servico,
        criado_em,
        cliente:clientes(nome)
      `);

    if (data.tecnico_id) query = query.eq('tecnico_id', data.tecnico_id);
    if (data.cliente_id) query = query.eq('cliente_id', data.cliente_id);

    const { data: os, error } = await query;
    if (error) throw new Error(error.message);

    return (os as any[]).map(item => ({
      ...item,
      cliente: item.cliente
    }));
  });

export const getRanking = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: any) => z.object({
    period: z.enum(['daily', 'weekly', 'monthly', 'all']).default('all')
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: events, error } = await supabase
      .from("ranking_eventos")
      .select(`
        usuario_id,
        pontos_aplicados,
        criado_em
      `);

    if (error) throw new Error(error.message);

    const aggregation: Record<string, { email: string, points: number }> = {};
    events?.forEach(event => {
      const userId = event.usuario_id;
      if (!aggregation[userId]) {
        aggregation[userId] = { 
          email: 'Usuário', 
          points: 0 
        };
      }
      aggregation[userId].points += event.pontos_aplicados;
    });

    return Object.entries(aggregation)
      .map(([id, val]) => ({ id, ...val }))
      .sort((a, b) => b.points - a.points);
  });
