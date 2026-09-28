import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { clienteServidor } from '@/lib/supabase/servidor';
import type { LinhaMembro, LinhaPerfil, LinhaTenant, Papel } from '@/lib/supabase/tipos-banco';
import { acoesDoPapel, podeFazer, type Acao, type PermissoesExtra } from '@/dominio/permissoes';

/** Cookie que guarda qual tenant o usuário escolheu, quando tem mais de um. */
const COOKIE_TENANT = 'agilliza_tenant';

export interface VinculoDoUsuario {
  tenant: Pick<LinhaTenant, 'id' | 'nome' | 'slug' | 'situacao' | 'fuso_horario'>;
  papel: Papel;
  permissoesExtra: PermissoesExtra;
}

export interface Sessao {
  usuarioId: string;
  perfil: LinhaPerfil;
  /** Todos os tenants em que o usuário é membro ativo. */
  vinculos: VinculoDoUsuario[];
  /** O tenant em que ele está operando agora. */
  atual: VinculoDoUsuario;
  acoes: Set<Acao>;
  pode: (acao: Acao) => boolean;
  adminPlataforma: boolean;
}

/**
 * Carrega a sessão do corretor: quem é, em qual conta está e o que pode fazer.
 *
 * Toda consulta aqui passa pela RLS com a identidade do próprio usuário — o que
 * significa que esta função não consegue devolver um vínculo que o banco não
 * autorizaria. Não é conveniência, é a segunda tranca: mesmo que alguém forje o
 * cookie de tenant, a consulta de `membros` só devolve o que é dele.
 *
 * @returns `null` quando não há usuário autenticado.
 */
export async function sessaoAtual(): Promise<Sessao | null> {
  const supabase = await clienteServidor();

  // `getUser` valida o token no servidor do Supabase. `getSession` apenas lê o
  // cookie, que o navegador pode ter alterado — usar getSession para decidir
  // autorização é o erro clássico dessa biblioteca.
  const { data: dadosUsuario, error: erroUsuario } = await supabase.auth.getUser();
  if (erroUsuario || !dadosUsuario.user) return null;

  const usuarioId = dadosUsuario.user.id;

  const [{ data: perfil }, { data: membros }] = await Promise.all([
    supabase.from('perfis').select('*').eq('id', usuarioId).single(),
    supabase
      .from('membros')
      .select('tenant_id, papel, permissoes_extra, tenants(id, nome, slug, situacao, fuso_horario)')
      .eq('usuario_id', usuarioId)
      .eq('situacao', 'ativo'),
  ]);

  if (!perfil) return null;

  type MembroComTenant = Pick<LinhaMembro, 'tenant_id' | 'papel' | 'permissoes_extra'> & {
    tenants: VinculoDoUsuario['tenant'] | null;
  };

  const vinculos: VinculoDoUsuario[] = ((membros ?? []) as unknown as MembroComTenant[])
    .filter((m): m is MembroComTenant & { tenants: VinculoDoUsuario['tenant'] } => m.tenants != null)
    // Conta cancelada não entra: o usuário veria uma operação que não existe
    // mais e tentaria trabalhar nela.
    .filter((m) => m.tenants.situacao !== 'cancelado')
    .map((m) => ({
      tenant: m.tenants,
      papel: m.papel,
      permissoesExtra: (m.permissoes_extra ?? {}) as PermissoesExtra,
    }));

  if (vinculos.length === 0) return null;

  // O cookie é uma PREFERÊNCIA, não uma autorização: ele só escolhe entre os
  // vínculos que a RLS já devolveu. Um cookie apontando para outro tenant
  // simplesmente não encontra nada e cai no primeiro vínculo real.
  const escolhido = (await cookies()).get(COOKIE_TENANT)?.value;
  const atual = vinculos.find((v) => v.tenant.id === escolhido) ?? vinculos[0]!;

  const acoes = acoesDoPapel(atual.papel, atual.permissoesExtra);

  return {
    usuarioId,
    perfil,
    vinculos,
    atual,
    acoes,
    pode: (acao: Acao) => podeFazer(atual.papel, acao, atual.permissoesExtra),
    adminPlataforma: perfil.admin_plataforma,
  };
}

/**
 * Sessão obrigatória. Redireciona para a entrada quando não há usuário.
 *
 * @param destinoAposEntrar Para onde voltar depois do login, preservando o que o
 * corretor estava tentando abrir — ele clicou num link de cliente e caiu no
 * login; depois de entrar tem que chegar no cliente, não no início.
 */
export async function exigirSessao(destinoAposEntrar?: string): Promise<Sessao> {
  const sessao = await sessaoAtual();
  if (sessao) return sessao;

  const parametro = destinoAposEntrar
    ? `?destino=${encodeURIComponent(destinoAposEntrar)}`
    : '';
  redirect(`/entrar${parametro}`);
}

/** Erro de autorização, para a Server Action devolver mensagem tratável. */
export class SemPermissao extends Error {
  constructor(
    readonly acao: Acao,
    readonly papel: Papel,
  ) {
    super(`O papel ${papel} não tem permissão para ${acao}.`);
    this.name = 'SemPermissao';
  }
}

/**
 * Exige sessão E permissão.
 *
 * Lança `SemPermissao` em vez de redirecionar: numa Server Action, redirecionar
 * esconde o motivo da recusa, e a seção 22 exige que o estado "sem permissão"
 * explique o que aconteceu e o que fazer.
 */
export async function exigirPermissao(acao: Acao): Promise<Sessao> {
  const sessao = await exigirSessao();
  if (!sessao.pode(acao)) {
    throw new SemPermissao(acao, sessao.atual.papel);
  }
  return sessao;
}

/** Troca o tenant ativo, validando que o usuário é membro dele. */
export async function trocarTenant(tenantId: string): Promise<void> {
  const sessao = await exigirSessao();
  const permitido = sessao.vinculos.some((v) => v.tenant.id === tenantId);

  if (!permitido) {
    // Não é 404 nem erro genérico: é tentativa de acessar conta alheia, e
    // precisa ficar evidente no log.
    throw new Error(`Usuário ${sessao.usuarioId} não é membro do tenant ${tenantId}.`);
  }

  (await cookies()).set(COOKIE_TENANT, tenantId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
}
