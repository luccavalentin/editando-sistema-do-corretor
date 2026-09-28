import 'server-only';

import { clienteServidor } from '@/lib/supabase/servidor';
import type { Indicadores, Periodo } from './painel';

/**
 * Relatório de desempenho.
 *
 * O QUE ELE FAZ QUE O PAINEL INICIAL NÃO FAZ
 *
 * A tela inicial responde "o que precisa de mim agora". Esta responde "como eu
 * fui, e mudou o quê" — e a segunda pergunta só tem resposta com COMPARAÇÃO.
 *
 * "42 negócios" não diz nada. "42, contra 31 no mês anterior" diz tudo: a
 * primeira é um número, a segunda é uma notícia. Por isso toda métrica daqui
 * vem com o mesmo intervalo imediatamente anterior ao lado, e nenhuma aparece
 * sozinha.
 *
 * O período anterior é do MESMO TAMANHO, encostado no atual: 30 dias contra os
 * 30 anteriores. Comparar 30 dias com "o mês passado do calendário" pareceria
 * mais natural e seria pior — fevereiro contra janeiro compara 28 dias com 31, e
 * a queda de 10% que aparece é do calendário, não do corretor.
 */

export interface Comparacao {
  atual: number;
  anterior: number;
  /** Variação em pontos percentuais. `null` quando o anterior era zero. */
  variacao: number | null;
}

export interface RelatorioDeDesempenho {
  periodo: Periodo;
  inicio: string;
  fim: string;
  inicioAnterior: string;

  negociosGanhos: Comparacao;
  negociosPerdidos: Comparacao;
  valorFechado: Comparacao;
  ticketMedio: Comparacao;
  taxaConversao: Comparacao;
  visitasMarcadas: Comparacao;
  visitasRealizadas: Comparacao;
  pessoasNovas: Comparacao;

  /** Sem comparação: são fotos do agora, não do período. */
  negociosAtivos: number;
  valorEmNegociacao: number;
  negociosParados: number;
  followupsVencidos: number;
  tarefasVencidas: number;
}

/**
 * Compara dois números.
 *
 * Quando o anterior é ZERO, a variação é `null` — e não "infinito" nem "100%".
 * Sair de 0 para 3 não é crescimento de nenhum percentual: é a primeira vez. A
 * tela escreve "primeira vez" em vez de um número que não significa nada.
 */
export function comparar(atual: number, anterior: number): Comparacao {
  if (anterior === 0) {
    return { atual, anterior, variacao: null };
  }
  return {
    atual,
    anterior,
    variacao: Math.round(((atual - anterior) / anterior) * 1000) / 10,
  };
}

/** Os dois intervalos: o pedido, e o de mesmo tamanho imediatamente antes. */
function intervalos(periodo: Periodo): {
  inicio: Date;
  fim: Date;
  inicioAnterior: Date;
  fimAnterior: Date;
} {
  const fim = new Date();

  const inicio = new Date(fim);
  inicio.setDate(inicio.getDate() - periodo);

  const fimAnterior = new Date(inicio);
  const inicioAnterior = new Date(inicio);
  inicioAnterior.setDate(inicioAnterior.getDate() - periodo);

  return { inicio, fim, inicioAnterior, fimAnterior };
}

async function indicadoresDoIntervalo(
  tenantId: string,
  inicio: Date,
  fim: Date,
): Promise<Record<string, number>> {
  const supabase = await clienteServidor();

  const { data } = await supabase.rpc('painel_indicadores', {
    p_tenant_id: tenantId,
    p_inicio: inicio.toISOString(),
    p_fim: fim.toISOString(),
  });

  const linha = (Array.isArray(data) ? data[0] : null) as Record<string, number> | null;

  // Zeros em vez de exceção: uma conta nova precisa abrir o relatório e ver
  // "ainda não há dados", não uma página de erro.
  return linha ?? {};
}

export async function relatorioDeDesempenho(
  tenantId: string,
  periodo: Periodo,
): Promise<RelatorioDeDesempenho> {
  const { inicio, fim, inicioAnterior, fimAnterior } = intervalos(periodo);

  // As duas chamadas vão juntas. Em sequência, o relatório demoraria o dobro
  // para desenhar, e é uma tela que o corretor abre para bater o olho.
  const [atual, anterior] = await Promise.all([
    indicadoresDoIntervalo(tenantId, inicio, fim),
    indicadoresDoIntervalo(tenantId, inicioAnterior, fimAnterior),
  ]);

  const n = (fonte: Record<string, number>, chave: string) => Number(fonte[chave] ?? 0);

  return {
    periodo,
    inicio: inicio.toISOString(),
    fim: fim.toISOString(),
    inicioAnterior: inicioAnterior.toISOString(),

    negociosGanhos: comparar(n(atual, 'negocios_ganhos'), n(anterior, 'negocios_ganhos')),
    negociosPerdidos: comparar(n(atual, 'negocios_perdidos'), n(anterior, 'negocios_perdidos')),
    valorFechado: comparar(n(atual, 'valor_fechado'), n(anterior, 'valor_fechado')),
    ticketMedio: comparar(n(atual, 'ticket_medio'), n(anterior, 'ticket_medio')),
    taxaConversao: comparar(n(atual, 'taxa_conversao'), n(anterior, 'taxa_conversao')),
    visitasMarcadas: comparar(n(atual, 'visitas_marcadas'), n(anterior, 'visitas_marcadas')),
    visitasRealizadas: comparar(n(atual, 'visitas_realizadas'), n(anterior, 'visitas_realizadas')),
    pessoasNovas: comparar(n(atual, 'pessoas_novas'), n(anterior, 'pessoas_novas')),

    // Estes NÃO são comparados: são fotos do agora. Comparar "negócios parados
    // hoje" com "negócios parados há 30 dias" misturaria duas fotos de momentos
    // diferentes e não diria nada sobre o período.
    negociosAtivos: n(atual, 'negocios_ativos'),
    valorEmNegociacao: n(atual, 'valor_em_negociacao'),
    negociosParados: n(atual, 'negocios_parados'),
    followupsVencidos: n(atual, 'followups_vencidos'),
    tarefasVencidas: n(atual, 'tarefas_vencidas'),
  };
}

export type { Indicadores };
