export async function getChecklistTemplatesServer(supabase: any, tipo: string) {
  const { data: templates, error } = await supabase
    .from('checklist_templates')
    .select('*')
    .eq('tipo', tipo)
    .order('ordem', { ascending: true });
  if (error) throw new Error(error.message);
  return templates;
}
