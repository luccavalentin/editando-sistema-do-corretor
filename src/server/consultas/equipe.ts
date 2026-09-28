import 'server-only';

import { clienteServidor } from '@/lib/supabase/servidor';
import type { Papel, SituacaoMembro } from '@/lib/supabase/tipos-banco';

/** A equipe e os convites pendentes. */

export interface MembroDaEquipe {
  id: string;
  usuario_id: string;
  papel: Papel;
  situacao: SituacaoMembro;
  criado_em: string;
  nome: string;
  email: string;
  ultimo_acesso_em: string | null;
  /** `true` para quem está lendo a tela: ele não pode desativar a si mesmo. */
  souEu: boolean;
}

export interface ConvitePendente {
  id: string;
  email: string;
  papel: Papel;
  expira_em: string;
  criado_em: string;
  expirado: boolean;
}

export interface QuadroDaEquipe {
  membros: MembroDaEquipe[];
  convites: ConvitePendente[];
  ativos: number;
  limite: number;
}

export async function quadroDaEquipe(
  tenantId: string,
  usuarioAtual: string,
): Promise<QuadroDaEquipe> {
  const supabase = await clienteServidor();

  const [{ data: membros }, { data: convites }, { data: tenant }] = await Promise.all([
    supabase
      .from('membros')
      .select('id, usuario_id, papel, situacao, criado_em, perfis(nome, email, ultimo_acesso_em)')
      .eq('tenant_id', tenantId)
      .order('criado_em', { ascending: true }),
    supabase
      .from('convites')
      .select('id, email, papel, expira_em, criado_em')
      .eq('tenant_id', tenantId)
      .is('aceito_em', null)
      .is('revogado_em', null)
      .order('criado_em', { ascending: false }),
    supabase.from('tenants').select('limite_usuarios').eq('id', tenantId).maybeSingle(),
  ]);

  type MembroBruto = {
    id: string;
    usuario_id: string;
    papel: Papel;
    situacao: SituacaoMembro;
    criado_em: string;
    perfis: { nome: string; email: string; ultimo_acesso_em: string | null } | null;
  };

  const lista = ((membros ?? []) as unknown as MembroBruto[]).map((m) => ({
    id: m.id,
    usuario_id: m.usuario_id,
    papel: m.papel,
    situacao: m.situacao,
    criado_em: m.criado_em,
    nome: m.perfis?.nome ?? '—',
    email: m.perfis?.email ?? '—',
    ultimo_acesso_em: m.perfis?.ultimo_acesso_em ?? null,
    souEu: m.usuario_id === usuarioAtual,
  }));

  const agora = new Date();

  return {
    membros: lista,
    convites: (convites ?? []).map((c) => ({
      ...c,
      // O convite expirado continua na lista, marcado. Sumir com ele faria o
      // corretor achar que nunca convidou e mandar outro — e aí seriam dois.
      expirado: new Date(c.expira_em) < agora,
    })),
    ativos: lista.filter((m) => m.situacao === 'ativo').length,
    limite: tenant?.limite_usuarios ?? 0,
  };
}
