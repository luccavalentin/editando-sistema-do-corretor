import 'server-only';

import { clienteServidor } from '@/lib/supabase/servidor';
import type { Papel } from '@/lib/supabase/tipos-banco';

/**
 * O que aconteceu na conta.
 *
 * A PERGUNTA QUE ESTA TELA RESPONDE
 *
 * "Quem acessou os dados do meu cliente?" — e ela ficou mais importante depois
 * que o console da plataforma passou a existir: um administrador da Agilliza
 * enxerga todas as contas. O corretor precisa poder conferir isso sem pedir
 * para ninguém, senão a promessa de que o acesso é auditado não vale nada.
 *
 * Por isso a tela separa o acesso ADMINISTRATIVO do resto, em vez de misturá-lo
 * numa lista cronológica onde ele se perderia entre cinquenta "criar cliente".
 */

/**
 * Ações que merecem destaque, e por quê.
 *
 * A lista é curta de propósito. Marcar tudo como sensível é o mesmo que não
 * marcar nada: o corretor para de olhar.
 */
export const ACOES_SENSIVEIS = new Set([
  'consultar_credito',
  'revelar_sensivel',
  'exportar',
  'excluir',
  'alterar_papel',
  'desativar',
  'convidar',
  'publicar',
  'despublicar',
]);

export interface EventoDeAuditoria {
  id: number;
  acao: string;
  entidade: string;
  entidade_id: string | null;
  resultado: string;
  autor_email: string | null;
  autor_papel: Papel | null;
  justificativa: string | null;
  ip: string | null;
  criado_em: string;
  /** `true` quando o autor NÃO é membro desta conta — ou seja, a plataforma. */
  deForaDaEquipe: boolean;
}

export interface AcessoDeCliente {
  id: number;
  pessoa_id: string | null;
  pessoa_nome: string | null;
  sucesso: boolean;
  motivo: string | null;
  ip: string | null;
  criado_em: string;
}

export interface QuadroDeSeguranca {
  /** Acessos de quem não é da equipe. O que mais importa nesta tela. */
  acessoAdministrativo: EventoDeAuditoria[];
  /** Consulta de crédito, revelação de dado sensível, exportação. */
  sensiveis: EventoDeAuditoria[];
  /** Tudo o mais, em ordem. */
  recentes: EventoDeAuditoria[];
  /** Entradas de clientes no portal, inclusive as que falharam. */
  portal: AcessoDeCliente[];
  /** Tentativas de entrada no portal que falharam nas últimas 24h. */
  tentativasFalhas: number;
}

const COLUNAS = `
  id, acao, entidade, entidade_id, resultado, autor_email, autor_papel,
  justificativa, ip, criado_em
` as const;

export async function quadroDeSeguranca(tenantId: string): Promise<QuadroDeSeguranca> {
  const supabase = await clienteServidor();

  // Os e-mails de quem é da equipe. É a lista contra a qual se descobre o que
  // veio de FORA — o console da plataforma, por exemplo, escreve auditoria
  // nesta conta com o e-mail de um administrador que não é membro dela.
  const { data: membros } = await supabase
    .from('membros')
    .select('perfis(email)')
    .eq('tenant_id', tenantId);

  const daEquipe = new Set(
    ((membros ?? []) as unknown as { perfis: { email: string } | null }[])
      .map((m) => m.perfis?.email)
      .filter((e): e is string => Boolean(e)),
  );

  const ontem = new Date(Date.now() - 86400000).toISOString();

  const [{ data: eventos }, { data: acessos }, { count: falhas }] = await Promise.all([
    supabase
      .from('auditoria')
      .select(COLUNAS)
      .eq('tenant_id', tenantId)
      .order('criado_em', { ascending: false })
      .limit(300),
    supabase
      .from('portal_acessos')
      .select('id, pessoa_id, sucesso, motivo, ip, criado_em, pessoas(nome)')
      .eq('tenant_id', tenantId)
      .order('criado_em', { ascending: false })
      .limit(50),
    supabase
      .from('portal_acessos')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('sucesso', false)
      .gte('criado_em', ontem),
  ]);

  type EventoBruto = Omit<EventoDeAuditoria, 'deForaDaEquipe'>;

  const todos = ((eventos ?? []) as unknown as EventoBruto[]).map((e) => ({
    ...e,
    // Autor sem e-mail é o SISTEMA (job, gatilho, webhook) — não é acesso de
    // fora. Tratá-lo como tal encheria a seção mais grave de ruído.
    deForaDaEquipe: Boolean(e.autor_email) && !daEquipe.has(e.autor_email!),
  }));

  type AcessoBruto = Omit<AcessoDeCliente, 'pessoa_nome'> & {
    pessoas: { nome: string } | null;
  };

  return {
    acessoAdministrativo: todos.filter((e) => e.deForaDaEquipe),
    sensiveis: todos.filter((e) => !e.deForaDaEquipe && ACOES_SENSIVEIS.has(e.acao)),
    recentes: todos.filter((e) => !e.deForaDaEquipe && !ACOES_SENSIVEIS.has(e.acao)).slice(0, 100),
    portal: ((acessos ?? []) as unknown as AcessoBruto[]).map((a) => {
      const { pessoas, ...resto } = a;
      return { ...resto, pessoa_nome: pessoas?.nome ?? null };
    }),
    tentativasFalhas: falhas ?? 0,
  };
}
