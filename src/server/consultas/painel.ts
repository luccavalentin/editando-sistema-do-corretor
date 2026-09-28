import 'server-only';

import { clienteServidor } from '@/lib/supabase/servidor';

/**
 * Consultas do painel (seção 5).
 *
 * Toda agregação acontece no Postgres, pelas funções da migração 0008. O motivo é
 * escala: somar em JavaScript exigiria transferir a carteira inteira a cada
 * carregamento, e um corretor com 3.000 negócios derrubaria a tela.
 *
 * As funções são `security invoker`, então a RLS filtra por tenant dentro delas.
 * Passar o `tenant_id` de outra conta devolve vazio — verificado em
 * supabase/tests/02_funcoes_do_painel.sql.
 */

export type Periodo = 7 | 30 | 90;

export interface Indicadores {
  negociosAtivos: number;
  negociosGanhos: number;
  negociosPerdidos: number;
  valorEmNegociacao: number;
  valorFechado: number;
  ticketMedio: number;
  taxaConversao: number;
  visitasMarcadas: number;
  visitasRealizadas: number;
  followupsPendentes: number;
  followupsVencidos: number;
  tarefasVencidas: number;
  pessoasNovas: number;
  pessoasQuentes: number;
  negociosParados: number;
}

export interface EtapaDoFunil {
  etapaId: string;
  nome: string;
  ordem: number;
  cor: string | null;
  quantidade: number;
  valorTotal: number;
  segundosMedios: number | null;
  parados: number;
}

export interface Prioridade {
  tipo: string;
  pessoaId: string;
  pessoaNome: string;
  temperatura: 'quente' | 'morno' | 'frio';
  negocioId: string | null;
  negocioCodigo: string | null;
  negocioValor: number | null;
  motivo: string;
  risco: string;
  acao: string;
  paradoDesde: string;
  peso: number;
}

export interface CompromissoDoDia {
  id: string;
  titulo: string;
  tipo: string;
  situacao: string;
  inicio: string;
  fim: string;
  endereco: string | null;
  deslocamentoMin: number | null;
  confirmadoEm: string | null;
  pessoaNome: string | null;
}

/** Intervalo do período, em fuso de São Paulo. */
function intervalo(periodo: Periodo): { inicio: string; fim: string } {
  const fim = new Date();
  const inicio = new Date(fim);
  inicio.setDate(inicio.getDate() - periodo);
  return { inicio: inicio.toISOString(), fim: fim.toISOString() };
}

export async function carregarIndicadores(
  tenantId: string,
  periodo: Periodo,
): Promise<Indicadores> {
  const supabase = await clienteServidor();
  const { inicio, fim } = intervalo(periodo);

  const { data, error } = await supabase.rpc('painel_indicadores', {
    p_tenant_id: tenantId,
    p_inicio: inicio,
    p_fim: fim,
  });

  // Zeros em vez de exceção: o painel de uma conta nova precisa abrir, e a tela
  // decide mostrar o estado de primeiro acesso. Derrubar a página porque não há
  // dado ainda seria hostil com quem acabou de se cadastrar.
  const linha = (Array.isArray(data) ? data[0] : null) as Record<string, number> | null;

  if (error) {
    console.error('[painel] indicadores falharam', { tenantId, erro: error.message });
  }

  return {
    negociosAtivos: Number(linha?.negocios_ativos ?? 0),
    negociosGanhos: Number(linha?.negocios_ganhos ?? 0),
    negociosPerdidos: Number(linha?.negocios_perdidos ?? 0),
    valorEmNegociacao: Number(linha?.valor_em_negociacao ?? 0),
    valorFechado: Number(linha?.valor_fechado ?? 0),
    ticketMedio: Number(linha?.ticket_medio ?? 0),
    taxaConversao: Number(linha?.taxa_conversao ?? 0),
    visitasMarcadas: Number(linha?.visitas_marcadas ?? 0),
    visitasRealizadas: Number(linha?.visitas_realizadas ?? 0),
    followupsPendentes: Number(linha?.followups_pendentes ?? 0),
    followupsVencidos: Number(linha?.followups_vencidos ?? 0),
    tarefasVencidas: Number(linha?.tarefas_vencidas ?? 0),
    pessoasNovas: Number(linha?.pessoas_novas ?? 0),
    pessoasQuentes: Number(linha?.pessoas_quentes ?? 0),
    negociosParados: Number(linha?.negocios_parados ?? 0),
  };
}

export async function carregarFunil(tenantId: string): Promise<EtapaDoFunil[]> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase.rpc('painel_funil', { p_tenant_id: tenantId });

  if (error) {
    console.error('[painel] funil falhou', { tenantId, erro: error.message });
    return [];
  }

  return ((data ?? []) as Record<string, unknown>[]).map((l) => ({
    etapaId: String(l.etapa_id),
    nome: String(l.etapa_nome),
    ordem: Number(l.etapa_ordem),
    cor: (l.etapa_cor as string | null) ?? null,
    quantidade: Number(l.quantidade ?? 0),
    valorTotal: Number(l.valor_total ?? 0),
    segundosMedios: l.segundos_medios_na_etapa === null ? null : Number(l.segundos_medios_na_etapa),
    parados: Number(l.parados ?? 0),
  }));
}

export async function carregarPrioridades(
  tenantId: string,
  limite = 5,
): Promise<Prioridade[]> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase.rpc('painel_prioridades', {
    p_tenant_id: tenantId,
    p_limite: limite,
  });

  if (error) {
    console.error('[painel] prioridades falharam', { tenantId, erro: error.message });
    return [];
  }

  return ((data ?? []) as Record<string, unknown>[]).map((l) => ({
    tipo: String(l.tipo),
    pessoaId: String(l.pessoa_id),
    pessoaNome: String(l.pessoa_nome),
    temperatura: (l.temperatura as Prioridade['temperatura']) ?? 'frio',
    negocioId: (l.negocio_id as string | null) ?? null,
    negocioCodigo: (l.negocio_codigo as string | null) ?? null,
    negocioValor: l.negocio_valor === null ? null : Number(l.negocio_valor),
    motivo: String(l.motivo),
    risco: String(l.risco),
    acao: String(l.acao),
    paradoDesde: String(l.parado_desde),
    peso: Number(l.peso ?? 0),
  }));
}

/** Compromissos de hoje, do primeiro ao último minuto no fuso da conta. */
export async function carregarAgendaDeHoje(tenantId: string): Promise<CompromissoDoDia[]> {
  const supabase = await clienteServidor();

  const inicioDoDia = new Date();
  inicioDoDia.setHours(0, 0, 0, 0);
  const fimDoDia = new Date();
  fimDoDia.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from('compromissos')
    .select(
      'id, titulo, tipo, situacao, inicio, fim, endereco, deslocamento_min, confirmado_em, pessoas(nome)',
    )
    .eq('tenant_id', tenantId)
    .not('situacao', 'in', '("cancelado")')
    .gte('inicio', inicioDoDia.toISOString())
    .lte('inicio', fimDoDia.toISOString())
    .order('inicio', { ascending: true })
    .limit(20);

  if (error) {
    console.error('[painel] agenda falhou', { tenantId, erro: error.message });
    return [];
  }

  type Bruto = {
    id: string;
    titulo: string;
    tipo: string;
    situacao: string;
    inicio: string;
    fim: string;
    endereco: string | null;
    deslocamento_min: number | null;
    confirmado_em: string | null;
    pessoas: { nome: string } | { nome: string }[] | null;
  };

  return ((data ?? []) as unknown as Bruto[]).map((c) => ({
    id: c.id,
    titulo: c.titulo,
    tipo: c.tipo,
    situacao: c.situacao,
    inicio: c.inicio,
    fim: c.fim,
    endereco: c.endereco,
    deslocamentoMin: c.deslocamento_min,
    confirmadoEm: c.confirmado_em,
    // O join devolve objeto quando é um-para-um e array quando o PostgREST
    // interpreta como um-para-muitos. Normalizar aqui evita o `?.[0]?.nome`
    // espalhado por toda a interface.
    pessoaNome: Array.isArray(c.pessoas) ? (c.pessoas[0]?.nome ?? null) : (c.pessoas?.nome ?? null),
  }));
}

/**
 * A conta já tem qualquer coisa?
 *
 * Diferencia "primeiro acesso" de "filtro não achou nada" — a seção 22 exige
 * tratamento distinto, e tratar os dois igual faz a conta nova parecer quebrada.
 */
export async function contaTemDados(tenantId: string): Promise<boolean> {
  const supabase = await clienteServidor();
  const { count } = await supabase
    .from('pessoas')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .is('excluido_em', null);

  return (count ?? 0) > 0;
}
