export async function getPecasTesteServer(supabase) {
    const { data, error } = await supabase
        .from('pecas_teste')
        .select(`*, cliente:clientes(nome), os:ordens_servico(protocolo)`)
        .order('vencimento_em', { ascending: true });
    if (error)
        throw new Error(error.message);
    return data;
}
export async function getAgendaServicosServer(supabase) {
    const { data, error } = await supabase
        .from('agenda_servicos')
        .select(`*, os:ordens_servico(protocolo, cliente_id, veiculo_id, clientes(nome), veiculos(placa_cavalo))`)
        .order('data_prevista', { ascending: true });
    if (error)
        throw new Error(error.message);
    return data;
}
