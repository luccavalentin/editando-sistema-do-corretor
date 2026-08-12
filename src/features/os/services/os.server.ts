import { OSStatus } from "../types/os.types";

export async function getOSStatsServer(supabase: any) {
  try {
    const { data: os, error } = await supabase
      .from("ordens_servico")
      .select("status, criado_em, finalizado_em");
    
    if (error) {
      console.error("Error fetching OS stats:", error);
      return { noPatio: 0, entraramHoje: 0, concluidasHoje: 0, atrasadas: 0, pecasVencendo: 0 };
    }
  
  const { data: pecas } = await supabase
    .from("pecas_teste")
    .select("id, status, vencimento_em");
  
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  
  return {
    noPatio: os.filter((o: any) => o.status !== 'concluida' && o.status !== 'cancelada').length,
    entraramHoje: os.filter((o: any) => o.criado_em.startsWith(today)).length,
    concluidasHoje: os.filter((o: any) => o.finalizado_em?.startsWith(today)).length,
    atrasadas: 0,
    pecasVencendo: pecas?.filter((p: any) => p.status === 'em_teste' && new Date(p.vencimento_em) < now).length || 0,
    };
  } catch (err) {
    console.error("Critical error in getOSStatsServer:", err);
    return { noPatio: 0, entraramHoje: 0, concluidasHoje: 0, atrasadas: 0, pecasVencendo: 0 };
  }
}

export async function getOSListServer(supabase: any) {
  try {
    const { data, error } = await supabase
      .from("ordens_servico")
      .select(`
        *,
        cliente:clientes(nome),
        veiculo:veiculos(placa_cavalo, modelo_cavalo)
      `)
      .order('criado_em', { ascending: false });
      
    if (error) {
      console.error("Error fetching OS list:", error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Critical error in getOSListServer:", err);
    return [];
  }
}
export async function getReportsDataServer(supabase: any, filters: any) {
  let query = supabase.from("ordens_servico").select(`id, protocolo, status, valor_pecas, valor_servico, criado_em, cliente:clientes(nome)`);
  if (filters.tecnico_id) query = query.eq('tecnico_id', filters.tecnico_id);
  if (filters.cliente_id) query = query.eq('cliente_id', filters.cliente_id);
  const { data: os, error } = await query;
  if (error) throw new Error(error.message);
  return os;
}

export async function getRankingServer(supabase: any) {
  const { data: events, error } = await supabase.from("ranking_eventos").select(`usuario_id, pontos_aplicados, criado_em`);
  if (error) throw new Error(error.message);
  const agg: Record<string, any> = {};
  events?.forEach((e: any) => {
    if (!agg[e.usuario_id]) agg[e.usuario_id] = { points: 0 };
    agg[e.usuario_id].points += e.pontos_aplicados;
  });
  return Object.entries(agg).map(([id, v]) => ({ id, ...v as any })).sort((a, b) => b.points - a.points);
}
