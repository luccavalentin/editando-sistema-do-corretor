export async function getPecasTesteServer(supabase: any) {
  const { data, error } = await supabase
    .from('pecas_teste')
    .select(`*, cliente:clientes(nome), os:ordens_servico(protocolo)`)
    .order('vencimento_em', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}
