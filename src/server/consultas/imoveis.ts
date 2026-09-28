import 'server-only';

import { clienteServidor } from '@/lib/supabase/servidor';
import { soNumeros } from '@/lib/privacidade/documentos';
import type {
  FinalidadeImovel,
  LinhaImovel,
  SituacaoImovel,
  TipoImovel,
} from '@/lib/supabase/tipos-banco';

/**
 * Consultas de imóvel.
 *
 * Toda consulta aqui passa pela RLS com a identidade do próprio corretor. O
 * `tenant_id` explícito não é o que garante o isolamento — a política do banco
 * é — mas deixa a intenção visível e faz o índice composto ser usado.
 */

const POR_PAGINA = 24;

/** Colunas que a lista precisa. `select *` traria observações internas à toa. */
const COLUNAS_DA_LISTA = `
  id, codigo, titulo, tipo, finalidade, situacao, uso,
  bairro, cidade, uf, valor, valor_aluguel, valor_condominio,
  area_util, quartos, suites, banheiros, vagas,
  publicado_no_portfolio, visivel_no_portfolio, slug,
  visualizacoes, contatos_gerados, favoritos, pedidos_visita,
  exclusividade, atualizado_em, criado_em
` as const;

export interface FiltroDeImoveis {
  busca?: string | undefined;
  situacao?: SituacaoImovel | undefined;
  finalidade?: FinalidadeImovel | undefined;
  tipo?: TipoImovel | undefined;
  cidade?: string | undefined;
  valorMin?: number | undefined;
  valorMax?: number | undefined;
  quartosMin?: number | undefined;
  apenasPublicados?: boolean | undefined;
  ordem?: 'recentes' | 'valor_asc' | 'valor_desc' | 'mais_vistos' | undefined;
  pagina?: number | undefined;
}

export interface LinhaDaListaDeImoveis {
  id: string;
  codigo: string;
  titulo: string;
  tipo: string;
  finalidade: string;
  situacao: string;
  uso: string;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  valor: string | number | null;
  valor_aluguel: string | number | null;
  valor_condominio: string | number | null;
  area_util: string | number | null;
  quartos: number | null;
  suites: number | null;
  banheiros: number | null;
  vagas: number | null;
  publicado_no_portfolio: boolean;
  visivel_no_portfolio: boolean;
  slug: string | null;
  visualizacoes: number;
  contatos_gerados: number;
  favoritos: number;
  pedidos_visita: number;
  exclusividade: boolean;
  atualizado_em: string;
  criado_em: string;
  /** Preenchida depois, a partir de `imovel_midias`. */
  capa: { chave: string; legenda: string | null } | null;
}

export interface ResultadoDaLista {
  itens: LinhaDaListaDeImoveis[];
  total: number;
  pagina: number;
  porPagina: number;
}

export async function listarImoveis(
  tenantId: string,
  filtro: FiltroDeImoveis = {},
): Promise<ResultadoDaLista> {
  const supabase = await clienteServidor();
  const pagina = Math.max(1, filtro.pagina ?? 1);
  const de = (pagina - 1) * POR_PAGINA;

  let consulta = supabase
    .from('imoveis')
    .select(COLUNAS_DA_LISTA, { count: 'exact' })
    .eq('tenant_id', tenantId)
    .is('excluido_em', null);

  const busca = filtro.busca?.trim();
  if (busca) {
    // Três formas de procurar o mesmo imóvel, porque o corretor lembra de uma
    // coisa diferente a cada vez: o código que ele anotou, o bairro que o
    // cliente pediu, ou um pedaço do título.
    const codigo = busca.toUpperCase();
    const comoNumero = soNumeros(busca);
    const alternativas = [
      `titulo.ilike.%${busca}%`,
      `bairro.ilike.%${busca}%`,
      `cidade.ilike.%${busca}%`,
      `codigo.ilike.%${codigo}%`,
    ];
    // "1042" pode ser o número do imóvel na rua.
    if (comoNumero.length >= 2) alternativas.push(`numero.eq.${comoNumero}`);
    consulta = consulta.or(alternativas.join(','));
  }

  if (filtro.situacao) consulta = consulta.eq('situacao', filtro.situacao);
  if (filtro.finalidade) consulta = consulta.eq('finalidade', filtro.finalidade);
  if (filtro.tipo) consulta = consulta.eq('tipo', filtro.tipo);
  if (filtro.cidade) consulta = consulta.ilike('cidade', filtro.cidade);
  if (filtro.apenasPublicados) consulta = consulta.eq('publicado_no_portfolio', true);
  if (filtro.quartosMin != null) consulta = consulta.gte('quartos', filtro.quartosMin);

  // O filtro de preço olha venda OU aluguel: um imóvel só de aluguel tem
  // `valor` nulo, e filtrar só por `valor` o faria sumir da busca por faixa.
  if (filtro.valorMin != null) {
    consulta = consulta.or(`valor.gte.${filtro.valorMin},valor_aluguel.gte.${filtro.valorMin}`);
  }
  if (filtro.valorMax != null) {
    consulta = consulta.or(`valor.lte.${filtro.valorMax},valor_aluguel.lte.${filtro.valorMax}`);
  }

  switch (filtro.ordem) {
    case 'valor_asc':
      consulta = consulta.order('valor', { ascending: true, nullsFirst: false });
      break;
    case 'valor_desc':
      consulta = consulta.order('valor', { ascending: false, nullsFirst: false });
      break;
    case 'mais_vistos':
      consulta = consulta.order('visualizacoes', { ascending: false });
      break;
    default:
      consulta = consulta.order('atualizado_em', { ascending: false });
  }

  const { data, count, error } = await consulta.range(de, de + POR_PAGINA - 1);

  if (error) {
    throw new Error(`Falha ao listar imóveis: ${error.message}`);
  }

  const itens = (data ?? []) as unknown as LinhaDaListaDeImoveis[];

  // As capas vêm numa consulta só. Uma por imóvel dentro do laço seria N+1: 24
  // idas ao banco para desenhar uma página.
  if (itens.length > 0) {
    const { data: capas } = await supabase
      .from('imovel_midias')
      .select('imovel_id, chave, legenda')
      .eq('tenant_id', tenantId)
      .eq('capa', true)
      .in(
        'imovel_id',
        itens.map((i) => i.id),
      );

    const porImovel = new Map(
      (capas ?? []).map((c) => [c.imovel_id, { chave: c.chave, legenda: c.legenda }]),
    );
    for (const item of itens) item.capa = porImovel.get(item.id) ?? null;
  }

  return { itens, total: count ?? 0, pagina, porPagina: POR_PAGINA };
}

export interface FotoDoImovel {
  id: string;
  chave: string;
  legenda: string | null;
  ordem: number;
  capa: boolean;
  tipo_conteudo: string | null;
  bytes: number | null;
}

export interface FichaDeImovel {
  /**
   * A linha do banco, com o tipo gerado.
   *
   * `Record<string, unknown>` foi tentado aqui e é pior: ele obriga um cast em
   * cada leitura na tela, e cast é exatamente o que desliga a conferência que
   * faria o compilador apontar a coluna renomeada por uma migração.
   */
  imovel: LinhaImovel;
  fotos: FotoDoImovel[];
  proprietario: { id: string; nome: string; telefone: string | null } | null;
  responsavel: { id: string; nome: string } | null;
  /** Negócios abertos ligados a este imóvel. */
  negocios: {
    id: string;
    codigo: string | null;
    titulo: string | null;
    situacao: string;
    valor_proposta: string | number | null;
    pessoa: { id: string; nome: string } | null;
  }[];
}

/**
 * Ficha completa do imóvel.
 *
 * Devolve `null` quando o imóvel não existe OU não é do tenant — a RLS não
 * distingue os dois casos, e é melhor assim: responder "existe, mas não é seu"
 * confirmaria para um curioso que aquele identificador existe em algum lugar.
 */
export async function obterImovel(
  tenantId: string,
  imovelId: string,
): Promise<FichaDeImovel | null> {
  const supabase = await clienteServidor();

  const { data: imovel } = await supabase
    .from('imoveis')
    .select('*')
    .eq('id', imovelId)
    .eq('tenant_id', tenantId)
    .is('excluido_em', null)
    .maybeSingle();

  if (!imovel) return null;

  const [{ data: fotos }, { data: negocios }] = await Promise.all([
    supabase
      .from('imovel_midias')
      .select('id, chave, legenda, ordem, capa, tipo_conteudo, bytes')
      .eq('imovel_id', imovelId)
      .eq('tenant_id', tenantId)
      .order('capa', { ascending: false })
      .order('ordem', { ascending: true }),
    supabase
      .from('negocios')
      .select('id, codigo, titulo, situacao, valor_proposta, pessoas(id, nome)')
      .eq('imovel_id', imovelId)
      .eq('tenant_id', tenantId)
      .order('criado_em', { ascending: false })
      .limit(20),
  ]);

  let proprietario: FichaDeImovel['proprietario'] = null;
  if (imovel.proprietario_id) {
    // O telefone mora em `pessoa_telefones`, não em `pessoas`: uma pessoa tem
    // vários números e um deles é o principal. Aqui interessa só esse.
    const { data } = await supabase
      .from('pessoas')
      .select('id, nome, pessoa_telefones(numero, principal)')
      .eq('id', imovel.proprietario_id)
      .maybeSingle();

    if (data) {
      const telefones = (data.pessoa_telefones ?? []) as {
        numero: string;
        principal: boolean;
      }[];
      const principal = telefones.find((t) => t.principal) ?? telefones[0];
      proprietario = { id: data.id, nome: data.nome, telefone: principal?.numero ?? null };
    }
  }

  let responsavel: FichaDeImovel['responsavel'] = null;
  if (imovel.responsavel_id) {
    const { data } = await supabase
      .from('perfis')
      .select('id, nome')
      .eq('id', imovel.responsavel_id)
      .maybeSingle();
    responsavel = data ?? null;
  }

  type NegocioComPessoa = {
    id: string;
    codigo: string | null;
    titulo: string | null;
    situacao: string;
    valor_proposta: string | number | null;
    pessoas: { id: string; nome: string } | null;
  };

  return {
    imovel,
    fotos: (fotos ?? []) as FotoDoImovel[],
    proprietario,
    responsavel,
    negocios: ((negocios ?? []) as unknown as NegocioComPessoa[]).map((n) => ({
      id: n.id,
      codigo: n.codigo,
      titulo: n.titulo,
      situacao: n.situacao,
      valor_proposta: n.valor_proposta,
      pessoa: n.pessoas,
    })),
  };
}

export interface ResumoDeImoveis {
  total: number;
  disponiveis: number;
  publicados: number;
  visualizacoes: number;
}

/** Números do topo da lista. Conta no banco, não em memória. */
export async function resumirImoveis(tenantId: string): Promise<ResumoDeImoveis> {
  const supabase = await clienteServidor();

  const base = () =>
    supabase
      .from('imoveis')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .is('excluido_em', null);

  const [total, disponiveis, publicados, visualizacoes] = await Promise.all([
    base(),
    base().eq('situacao', 'disponivel'),
    base().eq('publicado_no_portfolio', true),
    supabase
      .from('imoveis')
      .select('visualizacoes')
      .eq('tenant_id', tenantId)
      .is('excluido_em', null),
  ]);

  const somaVisualizacoes = (visualizacoes.data ?? []).reduce(
    (soma, linha) => soma + (linha.visualizacoes ?? 0),
    0,
  );

  return {
    total: total.count ?? 0,
    disponiveis: disponiveis.count ?? 0,
    publicados: publicados.count ?? 0,
    visualizacoes: somaVisualizacoes,
  };
}

/** Cidades já usadas, para o filtro oferecer o que existe em vez de campo livre. */
export async function cidadesComImovel(tenantId: string): Promise<string[]> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from('imoveis')
    .select('cidade')
    .eq('tenant_id', tenantId)
    .is('excluido_em', null)
    .not('cidade', 'is', null);

  const unicas = new Set((data ?? []).map((l) => l.cidade).filter((c): c is string => Boolean(c)));
  return [...unicas].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
