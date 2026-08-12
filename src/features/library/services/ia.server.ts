export async function getIAConfigServer(supabase: any) {
  const { data, error } = await supabase.from('ia_config').select('*').single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getBaseConhecimentoServer(supabase: any, filters: any) {
  let query = supabase.from('ia_base_conhecimento').select('*');
  if (filters.marca) query = query.eq('marca', filters.marca);
  if (filters.categoria) query = query.eq('categoria', filters.categoria);
  if (filters.query) query = query.ilike('titulo', `%${filters.query}%`);
  const { data: results, error } = await query.order('criado_em', { ascending: false });
  if (error) throw new Error(error.message);
  return results;
}
