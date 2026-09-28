import 'server-only';

import { clienteServidor } from '@/lib/supabase/servidor';
import type { Prioridade, SituacaoTarefa } from '@/lib/supabase/tipos-banco';

/**
 * Consultas de tarefa.
 *
 * A LISTA É ORDENADA PELO QUE ATRASA, e não pela data de criação. O corretor
 * abre esta tela para saber o que fazer agora — uma lista cronológica o obriga
 * a varrer tudo para achar o que venceu, que é o trabalho que a tela deveria
 * estar poupando.
 */

export interface LinhaDeTarefa {
  id: string;
  titulo: string;
  descricao: string | null;
  prioridade: Prioridade;
  situacao: SituacaoTarefa;
  prazo: string | null;
  concluida_em: string | null;
  criado_em: string;
  pessoa: { id: string; nome: string } | null;
  negocio: { id: string; codigo: string; titulo: string | null } | null;
  responsavel: { id: string; nome: string } | null;
}

export interface QuadroDeTarefas {
  /** Prazo já passou. É o que o corretor precisa ver primeiro. */
  vencidas: LinhaDeTarefa[];
  hoje: LinhaDeTarefa[];
  proximas: LinhaDeTarefa[];
  /** Sem prazo: existe, mas não cobra. */
  semPrazo: LinhaDeTarefa[];
  concluidasRecentes: LinhaDeTarefa[];
  total: number;
}

const COLUNAS = `
  id, titulo, descricao, prioridade, situacao, prazo, concluida_em, criado_em,
  pessoas(id, nome),
  negocios(id, codigo, titulo),
  perfis!tarefas_responsavel_id_fkey(id, nome)
` as const;

type Bruta = Omit<LinhaDeTarefa, 'pessoa' | 'negocio' | 'responsavel'> & {
  pessoas: { id: string; nome: string } | null;
  negocios: { id: string; codigo: string; titulo: string | null } | null;
  perfis: { id: string; nome: string } | null;
};

function traduzir(bruta: Bruta): LinhaDeTarefa {
  const { pessoas, negocios, perfis, ...resto } = bruta;
  return { ...resto, pessoa: pessoas, negocio: negocios, responsavel: perfis };
}

export async function quadroDeTarefas(
  tenantId: string,
  filtro: { responsavelId?: string | undefined; prioridade?: Prioridade | undefined } = {},
): Promise<QuadroDeTarefas> {
  const supabase = await clienteServidor();

  let abertas = supabase
    .from('tarefas')
    .select(COLUNAS)
    .eq('tenant_id', tenantId)
    .eq('situacao', 'aberta');

  if (filtro.responsavelId) abertas = abertas.eq('responsavel_id', filtro.responsavelId);
  if (filtro.prioridade) abertas = abertas.eq('prioridade', filtro.prioridade);

  const [{ data: emAberto }, { data: feitas }] = await Promise.all([
    // `nullsFirst: false` importa: tarefa sem prazo não pode encabeçar a lista
    // de quem está procurando o que venceu.
    abertas.order('prazo', { ascending: true, nullsFirst: false }).limit(300),
    supabase
      .from('tarefas')
      .select(COLUNAS)
      .eq('tenant_id', tenantId)
      .eq('situacao', 'feita')
      .order('concluida_em', { ascending: false })
      .limit(10),
  ]);

  const linhas = ((emAberto ?? []) as unknown as Bruta[]).map(traduzir);

  // O corte é o FIM do dia, não o instante atual: uma tarefa para as 18h não
  // está atrasada às 9h da manhã.
  const agora = new Date();
  const fimDeHoje = new Date(agora);
  fimDeHoje.setHours(23, 59, 59, 999);

  const vencidas: LinhaDeTarefa[] = [];
  const hoje: LinhaDeTarefa[] = [];
  const proximas: LinhaDeTarefa[] = [];
  const semPrazo: LinhaDeTarefa[] = [];

  for (const tarefa of linhas) {
    if (!tarefa.prazo) {
      semPrazo.push(tarefa);
      continue;
    }
    const prazo = new Date(tarefa.prazo);
    if (prazo < agora) vencidas.push(tarefa);
    else if (prazo <= fimDeHoje) hoje.push(tarefa);
    else proximas.push(tarefa);
  }

  return {
    vencidas,
    hoje,
    proximas,
    semPrazo,
    concluidasRecentes: ((feitas ?? []) as unknown as Bruta[]).map(traduzir),
    total: linhas.length,
  };
}
