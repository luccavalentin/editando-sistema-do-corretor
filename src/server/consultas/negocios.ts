import 'server-only';

import { clienteServidor } from '@/lib/supabase/servidor';
import type { LinhaNegocio, SituacaoNegocio, Temperatura } from '@/lib/supabase/tipos-banco';

export interface NegocioNoFunil {
  id: string;
  codigo: string;
  titulo: string | null;
  valor: number | null;
  situacao: SituacaoNegocio;
  etapaId: string;
  etapaDesde: string;
  ultimaAtividadeEm: string;
  pessoaId: string;
  pessoaNome: string;
  temperatura: Temperatura;
  responsavelNome: string | null;
  /** Aberto e sem mudar de etapa há mais de 7 dias. */
  parado: boolean;
}

export interface ColunaDoFunil {
  etapaId: string;
  nome: string;
  ordem: number;
  cor: string | null;
  /** Etapa terminal: quando preenchida, mover para cá encerra o negócio. */
  encerraComo: SituacaoNegocio | null;
  negocios: NegocioNoFunil[];
  valorTotal: number;
}

const DIAS_PARA_PARADO = 7;

/**
 * Funil completo em colunas (seção 5, bloco 4).
 *
 * Traz TODAS as etapas, inclusive as vazias e as terminais: uma coluna que some
 * do kanban esconde justamente a informação que interessa — ninguém em
 * "proposta" é um fato, não uma ausência de dado.
 *
 * Carrega os negócios abertos de uma vez e distribui em memória. A alternativa,
 * uma consulta por coluna, seriam 11 idas ao banco por carregamento de tela.
 */
export async function carregarFunil(tenantId: string): Promise<ColunaDoFunil[]> {
  const supabase = await clienteServidor();

  const [{ data: etapas }, { data: negocios }] = await Promise.all([
    supabase
      .from('etapas')
      .select('id, nome, ordem, cor, encerra_como')
      .eq('tenant_id', tenantId)
      .order('ordem'),

    supabase
      .from('negocios')
      .select(
        `id, codigo, titulo, valor, situacao, etapa_id, etapa_desde, ultima_atividade_em,
         pessoa_id, pessoas:pessoa_id (nome, temperatura), perfis:responsavel_id (nome)`,
      )
      .eq('tenant_id', tenantId)
      .eq('situacao', 'aberto')
      .is('excluido_em', null)
      .order('ultima_atividade_em', { ascending: false })
      // Teto de segurança: um kanban com 2.000 cartões trava o navegador antes
      // de o corretor conseguir arrastar qualquer coisa. Acima disso a tela
      // avisa e oferece a visão de lista com filtro.
      .limit(500),
  ]);

  type Bruto = Pick<
    LinhaNegocio,
    'id' | 'codigo' | 'titulo' | 'valor' | 'situacao' | 'etapa_id' | 'etapa_desde' | 'ultima_atividade_em' | 'pessoa_id'
  > & {
    pessoas: { nome: string; temperatura: Temperatura } | { nome: string; temperatura: Temperatura }[] | null;
    perfis: { nome: string } | { nome: string }[] | null;
  };

  const limiteParado = new Date();
  limiteParado.setDate(limiteParado.getDate() - DIAS_PARA_PARADO);

  const porEtapa = new Map<string, NegocioNoFunil[]>();

  for (const n of (negocios ?? []) as unknown as Bruto[]) {
    const pessoa = Array.isArray(n.pessoas) ? n.pessoas[0] : n.pessoas;
    const responsavel = Array.isArray(n.perfis) ? n.perfis[0] : n.perfis;

    const item: NegocioNoFunil = {
      id: n.id,
      codigo: n.codigo,
      titulo: n.titulo,
      valor: n.valor,
      situacao: n.situacao,
      etapaId: n.etapa_id,
      etapaDesde: n.etapa_desde,
      ultimaAtividadeEm: n.ultima_atividade_em,
      pessoaId: n.pessoa_id,
      pessoaNome: pessoa?.nome ?? 'Cliente',
      temperatura: pessoa?.temperatura ?? 'frio',
      responsavelNome: responsavel?.nome ?? null,
      parado: new Date(n.etapa_desde) < limiteParado,
    };

    const lista = porEtapa.get(n.etapa_id);
    if (lista) lista.push(item);
    else porEtapa.set(n.etapa_id, [item]);
  }

  return (etapas ?? []).map((e) => {
    const lista = porEtapa.get(e.id) ?? [];
    return {
      etapaId: e.id,
      nome: e.nome,
      ordem: e.ordem,
      cor: e.cor,
      encerraComo: e.encerra_como,
      negocios: lista,
      valorTotal: lista.reduce((soma, n) => soma + (n.valor ?? 0), 0),
    };
  });
}

export interface DetalheDoNegocio {
  negocio: LinhaNegocio;
  pessoaNome: string;
  pessoaTemperatura: Temperatura;
  etapaNome: string;
  etapaCor: string | null;
  responsavelNome: string | null;
  etapas: {
    id: string;
    nome: string;
    ordem: number;
    cor: string | null;
    encerraComo: SituacaoNegocio | null;
  }[];
  historico: {
    id: number;
    criadoEm: string;
    etapaDeNome: string | null;
    etapaParaNome: string;
    segundos: number | null;
    autorNome: string | null;
  }[];
}

export async function carregarNegocio(
  tenantId: string,
  negocioId: string,
): Promise<DetalheDoNegocio | null> {
  const supabase = await clienteServidor();

  const { data: negocio } = await supabase
    .from('negocios')
    .select(
      `*, pessoas:pessoa_id (nome, temperatura), etapas:etapa_id (nome, cor),
       perfis:responsavel_id (nome)`,
    )
    .eq('id', negocioId)
    .eq('tenant_id', tenantId)
    .is('excluido_em', null)
    .maybeSingle();

  if (!negocio) return null;

  const [{ data: etapas }, { data: historico }] = await Promise.all([
    supabase
      .from('etapas')
      .select('id, nome, ordem, cor, encerra_como')
      .eq('tenant_id', tenantId)
      .order('ordem'),
    supabase
      .from('negocio_etapa_historico')
      .select('id, criado_em, segundos_na_etapa_anterior, etapa_de, etapa_para, perfis:autor_id (nome)')
      .eq('negocio_id', negocioId)
      .eq('tenant_id', tenantId)
      .order('criado_em', { ascending: false })
      .limit(50),
  ]);

  // Mapa de nomes para traduzir os ids do histórico sem uma consulta por linha.
  const nomeDaEtapa = new Map((etapas ?? []).map((e) => [e.id, e.nome]));

  const comRelacoes = negocio as LinhaNegocio & {
    pessoas: { nome: string; temperatura: Temperatura } | { nome: string; temperatura: Temperatura }[] | null;
    etapas: { nome: string; cor: string | null } | { nome: string; cor: string | null }[] | null;
    perfis: { nome: string } | { nome: string }[] | null;
  };

  const pessoa = Array.isArray(comRelacoes.pessoas) ? comRelacoes.pessoas[0] : comRelacoes.pessoas;
  const etapa = Array.isArray(comRelacoes.etapas) ? comRelacoes.etapas[0] : comRelacoes.etapas;
  const responsavel = Array.isArray(comRelacoes.perfis) ? comRelacoes.perfis[0] : comRelacoes.perfis;

  type HistoricoBruto = {
    id: number;
    criado_em: string;
    segundos_na_etapa_anterior: number | null;
    etapa_de: string | null;
    etapa_para: string;
    perfis: { nome: string } | { nome: string }[] | null;
  };

  return {
    negocio: comRelacoes,
    pessoaNome: pessoa?.nome ?? 'Cliente',
    pessoaTemperatura: pessoa?.temperatura ?? 'frio',
    etapaNome: etapa?.nome ?? '—',
    etapaCor: etapa?.cor ?? null,
    responsavelNome: responsavel?.nome ?? null,
    etapas: (etapas ?? []).map((e) => ({
      id: e.id,
      nome: e.nome,
      ordem: e.ordem,
      cor: e.cor,
      encerraComo: e.encerra_como,
    })),
    historico: ((historico ?? []) as unknown as HistoricoBruto[]).map((h) => {
      const autor = Array.isArray(h.perfis) ? h.perfis[0] : h.perfis;
      return {
        id: h.id,
        criadoEm: h.criado_em,
        etapaDeNome: h.etapa_de ? (nomeDaEtapa.get(h.etapa_de) ?? null) : null,
        etapaParaNome: nomeDaEtapa.get(h.etapa_para) ?? '—',
        segundos: h.segundos_na_etapa_anterior,
        autorNome: autor?.nome ?? null,
      };
    }),
  };
}

/** Clientes para o seletor do formulário de negócio novo. */
export async function listarClientesParaSelecao(
  tenantId: string,
): Promise<{ id: string; nome: string }[]> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from('pessoas')
    .select('id, nome')
    .eq('tenant_id', tenantId)
    .is('excluido_em', null)
    .order('nome')
    .limit(500);
  return data ?? [];
}

/** Etapas não terminais, para escolher onde o negócio começa. */
export async function listarEtapasIniciais(
  tenantId: string,
): Promise<{ id: string; nome: string; ordem: number }[]> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from('etapas')
    .select('id, nome, ordem')
    .eq('tenant_id', tenantId)
    .is('encerra_como', null)
    .order('ordem');
  return data ?? [];
}
