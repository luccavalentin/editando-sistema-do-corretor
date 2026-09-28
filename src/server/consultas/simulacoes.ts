import 'server-only';

import { clienteServidor } from '@/lib/supabase/servidor';
import type { LinhaSimulacao, LinhaSimulacaoBanco, SituacaoSimulacao } from '@/lib/supabase/tipos-banco';

/**
 * Consultas de simulação.
 *
 * A lista NÃO traz CPF nem renda: o corretor não precisa deles para escolher
 * qual simulação abrir, e trazer dado sensível em toda listagem é o jeito mais
 * fácil de ele acabar numa captura de tela, num log de erro ou num cache.
 */

const POR_PAGINA = 20;

export interface LinhaDaLista {
  id: string;
  codigo: string;
  situacao: SituacaoSimulacao;
  valor_imovel: number;
  valor_financiamento: number;
  prazo_meses: number;
  melhor_parcela: number | null;
  enviado_em: string | null;
  respondido_em: string | null;
  criado_em: string;
  pessoa: { id: string; nome: string } | null;
  imovel: { id: string; codigo: string; titulo: string } | null;
  /** Quantos bancos foram consultados. */
  total_bancos: number;
}

export interface ResultadoDaLista {
  itens: LinhaDaLista[];
  total: number;
  pagina: number;
  porPagina: number;
}

export async function listarSimulacoes(
  tenantId: string,
  filtro: {
    busca?: string | undefined;
    situacao?: SituacaoSimulacao | undefined;
    pessoaId?: string | undefined;
    imovelId?: string | undefined;
    pagina?: number | undefined;
  } = {},
): Promise<ResultadoDaLista> {
  const supabase = await clienteServidor();
  const pagina = Math.max(1, filtro.pagina ?? 1);
  const de = (pagina - 1) * POR_PAGINA;

  let consulta = supabase
    .from('simulacoes')
    .select(
      `id, codigo, situacao, valor_imovel, valor_financiamento, prazo_meses,
       melhor_parcela, enviado_em, respondido_em, criado_em,
       pessoas!inner(id, nome),
       imoveis(id, codigo, titulo)`,
      { count: 'exact' },
    )
    .eq('tenant_id', tenantId)
    .is('excluido_em', null);

  if (filtro.situacao) consulta = consulta.eq('situacao', filtro.situacao);
  if (filtro.pessoaId) consulta = consulta.eq('pessoa_id', filtro.pessoaId);
  if (filtro.imovelId) consulta = consulta.eq('imovel_id', filtro.imovelId);

  const busca = filtro.busca?.trim();
  if (busca) {
    // Pelo código da simulação ou pelo nome do cliente — que é como o corretor
    // se lembra dela: "a simulação da Mariana".
    consulta = consulta.or(
      `codigo.ilike.%${busca.toUpperCase()}%,nome_titular.ilike.%${busca}%`,
    );
  }

  const { data, count, error } = await consulta
    .order('criado_em', { ascending: false })
    .range(de, de + POR_PAGINA - 1);

  if (error) throw new Error(`Falha ao listar simulações: ${error.message}`);

  type LinhaBruta = Omit<LinhaDaLista, 'pessoa' | 'imovel' | 'total_bancos'> & {
    pessoas: { id: string; nome: string } | null;
    imoveis: { id: string; codigo: string; titulo: string } | null;
  };

  const brutas = (data ?? []) as unknown as LinhaBruta[];

  // A contagem de bancos vem numa consulta só. Uma por linha seria N+1 numa
  // página que já faz duas idas ao banco.
  const contagem = new Map<string, number>();
  if (brutas.length > 0) {
    const { data: bancos } = await supabase
      .from('simulacao_bancos')
      .select('simulacao_id')
      .eq('tenant_id', tenantId)
      .in(
        'simulacao_id',
        brutas.map((b) => b.id),
      );

    for (const linha of bancos ?? []) {
      contagem.set(linha.simulacao_id, (contagem.get(linha.simulacao_id) ?? 0) + 1);
    }
  }

  return {
    itens: brutas.map((b) => ({
      id: b.id,
      codigo: b.codigo,
      situacao: b.situacao,
      valor_imovel: Number(b.valor_imovel),
      valor_financiamento: Number(b.valor_financiamento),
      prazo_meses: b.prazo_meses,
      melhor_parcela: b.melhor_parcela == null ? null : Number(b.melhor_parcela),
      enviado_em: b.enviado_em,
      respondido_em: b.respondido_em,
      criado_em: b.criado_em,
      pessoa: b.pessoas,
      imovel: b.imoveis,
      total_bancos: contagem.get(b.id) ?? 0,
    })),
    total: count ?? 0,
    pagina,
    porPagina: POR_PAGINA,
  };
}

export interface FichaDeSimulacao {
  simulacao: LinhaSimulacao;
  bancos: LinhaSimulacaoBanco[];
  pessoa: { id: string; nome: string; email: string | null } | null;
  imovel: { id: string; codigo: string; titulo: string; cidade: string | null } | null;
}

export async function obterSimulacao(
  tenantId: string,
  simulacaoId: string,
): Promise<FichaDeSimulacao | null> {
  const supabase = await clienteServidor();

  const { data: simulacao } = await supabase
    .from('simulacoes')
    .select('*')
    .eq('id', simulacaoId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (!simulacao) return null;

  const [{ data: bancos }, { data: pessoa }] = await Promise.all([
    supabase
      .from('simulacao_bancos')
      .select('*')
      .eq('simulacao_id', simulacaoId)
      .eq('tenant_id', tenantId)
      // Aprovado primeiro, e dentro dele a menor parcela: é a ordem em que o
      // corretor apresenta as opções ao cliente.
      .order('situacao', { ascending: true })
      .order('valor_parcela', { ascending: true, nullsFirst: false }),
    supabase
      .from('pessoas')
      .select('id, nome, email')
      .eq('id', simulacao.pessoa_id)
      .maybeSingle(),
  ]);

  let imovel: FichaDeSimulacao['imovel'] = null;
  if (simulacao.imovel_id) {
    const { data } = await supabase
      .from('imoveis')
      .select('id, codigo, titulo, cidade')
      .eq('id', simulacao.imovel_id)
      .maybeSingle();
    imovel = data ?? null;
  }

  return {
    simulacao,
    bancos: (bancos ?? []) as LinhaSimulacaoBanco[],
    pessoa: pessoa ?? null,
    imovel,
  };
}

export interface ResumoDeSimulacoes {
  total: number;
  emAnalise: number;
  aprovadas: number;
  recusadas: number;
}

export async function resumirSimulacoes(tenantId: string): Promise<ResumoDeSimulacoes> {
  const supabase = await clienteServidor();

  const base = () =>
    supabase
      .from('simulacoes')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .is('excluido_em', null);

  const [total, emAnalise, aprovadas, recusadas] = await Promise.all([
    base(),
    base().eq('situacao', 'em_analise'),
    base().eq('situacao', 'aprovado'),
    base().eq('situacao', 'recusado'),
  ]);

  return {
    total: total.count ?? 0,
    emAnalise: emAnalise.count ?? 0,
    aprovadas: aprovadas.count ?? 0,
    recusadas: recusadas.count ?? 0,
  };
}
