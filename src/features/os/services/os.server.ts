import { OSStatus } from "../types/os.types";

export async function getOSStatsServer(supabase: any) {
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
    noPatio: os.filter((o: any) => o.status !== 'concluida' && o.status !== 'cancelada').length,
    entraramHoje: os.filter((o: any) => o.criado_em.startsWith(today)).length,
    concluidasHoje: os.filter((o: any) => o.finalizado_em?.startsWith(today)).length,
    atrasadas: 0,
    pecasVencendo: pecas?.filter((p: any) => p.status === 'em_teste' && new Date(p.vencimento_em) < now).length || 0,
  };
}

export async function getOSListServer(supabase: any) {
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
}
