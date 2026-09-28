import 'server-only';

import { clienteServidor } from '@/lib/supabase/servidor';
import type { Canal, Prioridade, SituacaoFollowup } from '@/lib/supabase/tipos-banco';

/**
 * Consultas de follow-up.
 *
 * FOLLOW-UP NÃO É TAREFA, e a diferença é o motivo de existirem duas telas.
 *
 * Tarefa é do corretor: "buscar a matrícula no cartório". Follow-up é de uma
 * PESSOA: alguém está esperando resposta. Um follow-up vencido não é trabalho
 * atrasado — é um cliente sendo ignorado, e esse é o jeito mais rápido de
 * perder uma venda que já estava andando.
 *
 * Por isso a lista aqui é ordenada por atraso e agrupada por urgência, e por
 * isso ela mostra a mensagem sugerida junto: o atrito entre "ver que preciso
 * responder" e "responder" precisa ser o menor possível.
 */

export interface LinhaDeFollowup {
  id: string;
  motivo: string;
  canal_sugerido: Canal | null;
  mensagem_sugerida: string | null;
  prazo: string;
  prioridade: Prioridade;
  situacao: SituacaoFollowup;
  tentativas: number;
  resultado: string | null;
  automatico: boolean;
  criado_em: string;
  pessoa: { id: string; nome: string; celular: string | null } | null;
  negocio: { id: string; codigo: string; titulo: string | null } | null;
  responsavel: { id: string; nome: string } | null;
}

export interface QuadroDeFollowups {
  vencidos: LinhaDeFollowup[];
  hoje: LinhaDeFollowup[];
  proximos: LinhaDeFollowup[];
  semResposta: LinhaDeFollowup[];
  total: number;
}

const COLUNAS = `
  id, motivo, canal_sugerido, mensagem_sugerida, prazo, prioridade, situacao,
  tentativas, resultado, automatico, criado_em,
  pessoas!inner(id, nome, pessoa_telefones(numero, principal)),
  negocios(id, codigo, titulo),
  perfis!followups_responsavel_id_fkey(id, nome)
` as const;

type Bruta = Omit<LinhaDeFollowup, 'pessoa' | 'negocio' | 'responsavel'> & {
  pessoas: {
    id: string;
    nome: string;
    pessoa_telefones: { numero: string; principal: boolean }[] | null;
  } | null;
  negocios: { id: string; codigo: string; titulo: string | null } | null;
  perfis: { id: string; nome: string } | null;
};

function traduzir(b: Bruta): LinhaDeFollowup {
  const { pessoas, negocios, perfis, ...resto } = b;

  // O telefone mora em `pessoa_telefones`: uma pessoa tem vários e um é o
  // principal. Aqui interessa só o que serve para responder agora.
  const telefones = pessoas?.pessoa_telefones ?? [];
  const principal = telefones.find((t) => t.principal) ?? telefones[0];

  return {
    ...resto,
    pessoa: pessoas
      ? { id: pessoas.id, nome: pessoas.nome, celular: principal?.numero ?? null }
      : null,
    negocio: negocios,
    responsavel: perfis,
  };
}

export async function quadroDeFollowups(
  tenantId: string,
  filtro: { responsavelId?: string | undefined } = {},
): Promise<QuadroDeFollowups> {
  const supabase = await clienteServidor();

  let pendentes = supabase
    .from('followups')
    .select(COLUNAS)
    .eq('tenant_id', tenantId)
    .eq('situacao', 'pendente');

  if (filtro.responsavelId) pendentes = pendentes.eq('responsavel_id', filtro.responsavelId);

  const [{ data: emAberto }, { data: mudos }] = await Promise.all([
    pendentes.order('prazo', { ascending: true }).limit(300),
    // "Sem resposta" é categoria à parte: o corretor JÁ tentou, e a pessoa não
    // respondeu. Misturar com os pendentes esconderia quem já foi procurado
    // três vezes atrás de quem nunca foi procurado.
    supabase
      .from('followups')
      .select(COLUNAS)
      .eq('tenant_id', tenantId)
      .eq('situacao', 'sem_resposta')
      .order('prazo', { ascending: true })
      .limit(50),
  ]);

  const linhas = ((emAberto ?? []) as unknown as Bruta[]).map(traduzir);

  const agora = new Date();
  const fimDeHoje = new Date(agora);
  fimDeHoje.setHours(23, 59, 59, 999);

  const vencidos: LinhaDeFollowup[] = [];
  const hoje: LinhaDeFollowup[] = [];
  const proximos: LinhaDeFollowup[] = [];

  for (const followup of linhas) {
    const prazo = new Date(followup.prazo);
    if (prazo < agora) vencidos.push(followup);
    else if (prazo <= fimDeHoje) hoje.push(followup);
    else proximos.push(followup);
  }

  return {
    vencidos,
    hoje,
    proximos,
    semResposta: ((mudos ?? []) as unknown as Bruta[]).map(traduzir),
    total: linhas.length,
  };
}
