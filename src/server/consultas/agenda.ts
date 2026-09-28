import 'server-only';

import { clienteServidor } from '@/lib/supabase/servidor';
import {
  acharIntervalosApertados,
  acharSobreposicoes,
  porConfirmar,
  type IntervaloApertado,
  type JanelaDeCompromisso,
} from '@/dominio/compromisso';
import type { SituacaoCompromisso, TipoCompromisso } from '@/lib/supabase/tipos-banco';

/**
 * Consultas da agenda.
 *
 * A análise de conflito e de deslocamento acontece no DOMÍNIO, não aqui, e não
 * no banco. O banco tem o índice GIST para o dia em que a busca por conflito
 * precisar cruzar meses; para a agenda de um dia — dezenas de itens — trazer as
 * linhas e comparar em memória é mais simples e testável sem banco nenhum.
 */

export interface CompromissoDaAgenda {
  id: string;
  titulo: string;
  tipo: TipoCompromisso;
  situacao: SituacaoCompromisso;
  inicio: string;
  fim: string;
  endereco: string | null;
  deslocamento_min: number | null;
  confirmado_em: string | null;
  compareceu: boolean | null;
  observacoes: string | null;
  pessoa: { id: string; nome: string } | null;
  negocio: { id: string; codigo: string } | null;
  responsavel: { id: string; nome: string } | null;
}

export interface DiaDaAgenda {
  data: string;
  compromissos: CompromissoDaAgenda[];
  /** Ids que se sobrepõem a outro compromisso. */
  emConflito: Set<string>;
  /** Ids sem tempo de deslocamento suficiente. */
  apertados: Map<string, IntervaloApertado>;
  /** Ids de visita próxima ainda não confirmada. */
  porConfirmar: Set<string>;
}

const COLUNAS = `
  id, titulo, tipo, situacao, inicio, fim, endereco, deslocamento_min,
  confirmado_em, compareceu, observacoes,
  pessoas(id, nome),
  negocios(id, codigo),
  perfis!compromissos_responsavel_id_fkey(id, nome)
` as const;

type Bruta = Omit<CompromissoDaAgenda, 'pessoa' | 'negocio' | 'responsavel'> & {
  pessoas: { id: string; nome: string } | null;
  negocios: { id: string; codigo: string } | null;
  perfis: { id: string; nome: string } | null;
};

function traduzir(b: Bruta): CompromissoDaAgenda {
  const { pessoas, negocios, perfis, ...resto } = b;
  return { ...resto, pessoa: pessoas, negocio: negocios, responsavel: perfis };
}

function janelaDe(c: CompromissoDaAgenda): JanelaDeCompromisso {
  return {
    id: c.id,
    inicio: c.inicio,
    fim: c.fim,
    tipo: c.tipo,
    situacao: c.situacao,
    deslocamentoMin: c.deslocamento_min,
  };
}

/**
 * Um dia da agenda, com os avisos já calculados.
 *
 * `de` e `ate` chegam como ISO para a página decidir o fuso — o corretor pode
 * estar num tenant com fuso diferente do servidor, e montar a janela do dia no
 * servidor esconderia esse erro até alguém em Manaus reclamar.
 */
export async function agendaDoPeriodo(
  tenantId: string,
  de: Date,
  ate: Date,
  filtro: { responsavelId?: string | undefined } = {},
): Promise<DiaDaAgenda> {
  const supabase = await clienteServidor();

  let consulta = supabase
    .from('compromissos')
    .select(COLUNAS)
    .eq('tenant_id', tenantId)
    .gte('inicio', de.toISOString())
    .lt('inicio', ate.toISOString());

  if (filtro.responsavelId) consulta = consulta.eq('responsavel_id', filtro.responsavelId);

  const { data } = await consulta.order('inicio', { ascending: true }).limit(200);

  const compromissos = ((data ?? []) as unknown as Bruta[]).map(traduzir);
  const janelas = compromissos.map(janelaDe);

  return {
    data: de.toISOString(),
    compromissos,
    emConflito: new Set(acharSobreposicoes(janelas).map((c) => c.id)),
    apertados: new Map(acharIntervalosApertados(janelas).map((a) => [a.id, a])),
    porConfirmar: new Set(porConfirmar(janelas)),
  };
}

export interface ResumoDaSemana {
  /** Um número por dia, para a faixa de navegação mostrar onde há trabalho. */
  porDia: { data: string; total: number; temConflito: boolean }[];
}

export async function resumoDaSemana(
  tenantId: string,
  de: Date,
  ate: Date,
): Promise<ResumoDaSemana> {
  const supabase = await clienteServidor();

  const { data } = await supabase
    .from('compromissos')
    .select('id, inicio, fim, tipo, situacao, deslocamento_min')
    .eq('tenant_id', tenantId)
    .gte('inicio', de.toISOString())
    .lt('inicio', ate.toISOString())
    .order('inicio', { ascending: true })
    .limit(500);

  const linhas = (data ?? []) as {
    id: string;
    inicio: string;
    fim: string;
    tipo: string;
    situacao: string;
    deslocamento_min: number | null;
  }[];

  const porDia = new Map<string, { total: number; janelas: JanelaDeCompromisso[] }>();

  for (const linha of linhas) {
    const chave = linha.inicio.slice(0, 10);
    const atual = porDia.get(chave) ?? { total: 0, janelas: [] };
    atual.total += 1;
    atual.janelas.push({
      id: linha.id,
      inicio: linha.inicio,
      fim: linha.fim,
      tipo: linha.tipo,
      situacao: linha.situacao,
      deslocamentoMin: linha.deslocamento_min,
    });
    porDia.set(chave, atual);
  }

  return {
    porDia: [...porDia.entries()].map(([data, { total, janelas }]) => ({
      data,
      total,
      temConflito: acharSobreposicoes(janelas).length > 0,
    })),
  };
}
