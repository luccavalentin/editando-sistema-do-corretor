import 'server-only';

import { clienteSupabase } from './sessao';

/**
 * Consultas do console.
 *
 * TODAS passam pela RLS com a identidade do próprio administrador. É
 * `app.pode_ler_tenant()` que concede a leitura entre contas a quem tem
 * `admin_plataforma` — o código não contorna nada.
 *
 * A alternativa tentadora seria a chave de serviço, "porque é o admin mesmo".
 * Ela seria pior por dois motivos: o banco deixaria de ser a autoridade, e o
 * privilégio revogado num administrador continuaria valendo até alguém lembrar
 * de mexer neste código.
 */

export interface ContaNaLista {
  id: string;
  nome: string;
  slug: string | null;
  situacao: string;
  criado_em: string;
  portfolio_ativo: boolean;
  limite_usuarios: number;
  limite_imoveis: number;
  membros: number;
  pessoas: number;
  imoveis: number;
  simulacoes: number;
  /** Última escrita em qualquer tabela da conta. Diz se ela está viva. */
  ultima_atividade: string | null;
}

export interface VisaoGeralDaPlataforma {
  contas: number;
  contasAtivas: number;
  contasEmTeste: number;
  contasInadimplentes: number;
  contasSuspensas: number;
  usuarios: number;
  pessoas: number;
  imoveis: number;
  imoveisPublicados: number;
  simulacoes: number;
  simulacoesEmAnalise: number;
  errosDeIntegracao: number;
}

export async function visaoGeral(): Promise<VisaoGeralDaPlataforma> {
  const supabase = await clienteSupabase();

  // Cada consulta escrita por extenso, e não por um helper genérico. O helper
  // parecia mais limpo, mas apagava o tipo da tabela: `.eq('situacao', ...)`
  // deixava de ser conferido contra as colunas reais, e um filtro errado
  // passaria batido até alguém notar o número torto no painel.
  const contarTenants = () =>
    supabase.from('tenants').select('id', { count: 'exact', head: true }).is('excluido_em', null);

  const [
    contas,
    ativas,
    teste,
    inadimplentes,
    suspensas,
    usuarios,
    pessoas,
    imoveis,
    publicados,
    simulacoes,
    emAnalise,
    erros,
  ] = await Promise.all([
    contarTenants(),
    contarTenants().eq('situacao', 'ativo'),
    contarTenants().eq('situacao', 'teste'),
    contarTenants().eq('situacao', 'inadimplente'),
    contarTenants().eq('situacao', 'suspenso'),
    supabase.from('perfis').select('id', { count: 'exact', head: true }),
    supabase
      .from('pessoas')
      .select('id', { count: 'exact', head: true })
      .is('excluido_em', null),
    supabase
      .from('imoveis')
      .select('id', { count: 'exact', head: true })
      .is('excluido_em', null),
    supabase
      .from('imoveis')
      .select('id', { count: 'exact', head: true })
      .eq('visivel_no_portfolio', true),
    supabase
      .from('simulacoes')
      .select('id', { count: 'exact', head: true })
      .is('excluido_em', null),
    supabase
      .from('simulacoes')
      .select('id', { count: 'exact', head: true })
      .eq('situacao', 'em_analise')
      .is('excluido_em', null),
    supabase
      .from('integracao_chamadas')
      .select('id', { count: 'exact', head: true })
      .eq('sucesso', false)
      // 24 horas: erro de ontem já foi tratado ou já não importa.
      .gte('criado_em', new Date(Date.now() - 86400000).toISOString()),
  ]);

  return {
    contas: contas.count ?? 0,
    contasAtivas: ativas.count ?? 0,
    contasEmTeste: teste.count ?? 0,
    contasInadimplentes: inadimplentes.count ?? 0,
    contasSuspensas: suspensas.count ?? 0,
    usuarios: usuarios.count ?? 0,
    pessoas: pessoas.count ?? 0,
    imoveis: imoveis.count ?? 0,
    imoveisPublicados: publicados.count ?? 0,
    simulacoes: simulacoes.count ?? 0,
    simulacoesEmAnalise: emAnalise.count ?? 0,
    errosDeIntegracao: erros.count ?? 0,
  };
}

export async function listarContas(filtro: {
  busca?: string | undefined;
  situacao?: string | undefined;
} = {}): Promise<ContaNaLista[]> {
  const supabase = await clienteSupabase();

  let consulta = supabase
    .from('tenants')
    .select('id, nome, slug, situacao, criado_em, portfolio_ativo, limite_usuarios, limite_imoveis')
    .is('excluido_em', null);

  if (filtro.busca) consulta = consulta.ilike('nome', `%${filtro.busca}%`);
  if (filtro.situacao) {
    consulta = consulta.eq(
      'situacao',
      filtro.situacao as 'teste' | 'ativo' | 'inadimplente' | 'suspenso' | 'cancelado',
    );
  }

  const { data: contas } = await consulta.order('criado_em', { ascending: false }).limit(200);
  if (!contas || contas.length === 0) return [];

  const ids = contas.map((c) => c.id);

  // Quatro consultas agregadas, não quatro por conta. Com 200 contas, o laço
  // ingênuo daria 800 idas ao banco para desenhar uma tabela.
  const [membros, pessoas, imoveis, simulacoes] = await Promise.all([
    supabase.from('membros').select('tenant_id').in('tenant_id', ids),
    supabase.from('pessoas').select('tenant_id').in('tenant_id', ids).is('excluido_em', null),
    supabase.from('imoveis').select('tenant_id').in('tenant_id', ids).is('excluido_em', null),
    supabase
      .from('simulacoes')
      .select('tenant_id, criado_em')
      .in('tenant_id', ids)
      .is('excluido_em', null),
  ]);

  const somar = (linhas: { tenant_id: string }[] | null) => {
    const mapa = new Map<string, number>();
    for (const linha of linhas ?? []) {
      mapa.set(linha.tenant_id, (mapa.get(linha.tenant_id) ?? 0) + 1);
    }
    return mapa;
  };

  const porMembros = somar(membros.data);
  const porPessoas = somar(pessoas.data);
  const porImoveis = somar(imoveis.data);
  const porSimulacoes = somar(simulacoes.data);

  const ultimaAtividade = new Map<string, string>();
  for (const linha of simulacoes.data ?? []) {
    const atual = ultimaAtividade.get(linha.tenant_id);
    if (!atual || linha.criado_em > atual) ultimaAtividade.set(linha.tenant_id, linha.criado_em);
  }

  return contas.map((conta) => ({
    ...conta,
    membros: porMembros.get(conta.id) ?? 0,
    pessoas: porPessoas.get(conta.id) ?? 0,
    imoveis: porImoveis.get(conta.id) ?? 0,
    simulacoes: porSimulacoes.get(conta.id) ?? 0,
    ultima_atividade: ultimaAtividade.get(conta.id) ?? null,
  }));
}

export interface FichaDaConta {
  conta: {
    id: string;
    nome: string;
    slug: string | null;
    situacao: string;
    creci: string | null;
    criado_em: string;
    limite_usuarios: number;
    limite_imoveis: number;
    limite_armazenamento_mb: number;
    retencao_dias: number;
    mfa_obrigatorio: boolean;
    portfolio_ativo: boolean;
    fuso_horario: string;
  };
  equipe: {
    usuario_id: string;
    papel: string;
    situacao: string;
    nome: string;
    email: string;
    ultimo_acesso_em: string | null;
  }[];
  uso: {
    pessoas: number;
    imoveis: number;
    imoveisPublicados: number;
    negocios: number;
    simulacoes: number;
  };
}

export async function obterConta(contaId: string): Promise<FichaDaConta | null> {
  const supabase = await clienteSupabase();

  const { data: conta } = await supabase
    .from('tenants')
    .select(
      'id, nome, slug, situacao, creci, criado_em, limite_usuarios, limite_imoveis, limite_armazenamento_mb, retencao_dias, mfa_obrigatorio, portfolio_ativo, fuso_horario',
    )
    .eq('id', contaId)
    .maybeSingle();

  if (!conta) return null;

  const [{ data: membros }, pessoas, imoveis, publicados, negocios, simulacoes] = await Promise.all([
    supabase
      .from('membros')
      .select('usuario_id, papel, situacao, perfis(nome, email, ultimo_acesso_em)')
      .eq('tenant_id', contaId),
    supabase
      .from('pessoas')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', contaId)
      .is('excluido_em', null),
    supabase
      .from('imoveis')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', contaId)
      .is('excluido_em', null),
    supabase
      .from('imoveis')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', contaId)
      .eq('visivel_no_portfolio', true),
    supabase
      .from('negocios')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', contaId)
      .is('excluido_em', null),
    supabase
      .from('simulacoes')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', contaId)
      .is('excluido_em', null),
  ]);

  type MembroComPerfil = {
    usuario_id: string;
    papel: string;
    situacao: string;
    perfis: { nome: string; email: string; ultimo_acesso_em: string | null } | null;
  };

  return {
    conta,
    equipe: ((membros ?? []) as unknown as MembroComPerfil[]).map((m) => ({
      usuario_id: m.usuario_id,
      papel: m.papel,
      situacao: m.situacao,
      nome: m.perfis?.nome ?? '—',
      email: m.perfis?.email ?? '—',
      ultimo_acesso_em: m.perfis?.ultimo_acesso_em ?? null,
    })),
    uso: {
      pessoas: pessoas.count ?? 0,
      imoveis: imoveis.count ?? 0,
      imoveisPublicados: publicados.count ?? 0,
      negocios: negocios.count ?? 0,
      simulacoes: simulacoes.count ?? 0,
    },
  };
}

export interface LinhaDeAuditoria {
  id: string;
  acao: string;
  entidade: string;
  entidade_id: string | null;
  resultado: string;
  autor_email: string | null;
  autor_papel: string | null;
  justificativa: string | null;
  ip: string | null;
  criado_em: string;
  tenant_id: string | null;
  tenant_nome: string | null;
}

export async function listarAuditoria(filtro: {
  acao?: string | undefined;
  tenantId?: string | undefined;
  limite?: number | undefined;
} = {}): Promise<LinhaDeAuditoria[]> {
  const supabase = await clienteSupabase();

  let consulta = supabase
    .from('auditoria')
    .select(
      'id, acao, entidade, entidade_id, resultado, autor_email, autor_papel, justificativa, ip, criado_em, tenant_id, tenants(nome)',
    );

  if (filtro.acao) consulta = consulta.eq('acao', filtro.acao);
  if (filtro.tenantId) consulta = consulta.eq('tenant_id', filtro.tenantId);

  const { data } = await consulta
    .order('criado_em', { ascending: false })
    .limit(filtro.limite ?? 100);

  type Bruta = Omit<LinhaDeAuditoria, 'tenant_nome'> & { tenants: { nome: string } | null };

  return ((data ?? []) as unknown as Bruta[]).map((linha) => ({
    ...linha,
    tenant_nome: linha.tenants?.nome ?? null,
  }));
}
