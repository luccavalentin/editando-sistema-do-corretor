import 'server-only';

import { clienteServidor } from '@/lib/supabase/servidor';
import { soNumeros } from '@/lib/privacidade/documentos';
import type { LinhaPessoa, Temperatura } from '@/lib/supabase/tipos-banco';

export interface FiltrosDeClientes {
  busca?: string;
  temperatura?: Temperatura;
  responsavelId?: string;
  /** Sem interação há mais de 7 dias. */
  parados?: boolean;
  pagina?: number;
}

export interface ClienteNaLista {
  id: string;
  nome: string;
  cpfMascarado: string | null;
  email: string | null;
  cidade: string | null;
  uf: string | null;
  temperatura: Temperatura;
  telefonePrincipal: string | null;
  portalLiberado: boolean;
  ultimaInteracaoEm: string | null;
  negociosAbertos: number;
  responsavelNome: string | null;
}

export interface PaginaDeClientes {
  itens: ClienteNaLista[];
  total: number;
  pagina: number;
  porPagina: number;
  /** `true` quando a conta ainda não tem nenhum cliente, e não apenas o filtro. */
  contaVazia: boolean;
}

const POR_PAGINA = 25;

/** Máscara de exibição, calculada no servidor: o CPF completo nunca vai para a lista. */
function mascarar(cpf: string | null): string | null {
  if (!cpf || cpf.length !== 11) return null;
  return `${cpf.slice(0, 3)}.***.**${cpf.slice(8, 9)}-${cpf.slice(9)}`;
}

/**
 * Lista de clientes com busca e filtros (seção 6.2).
 *
 * A busca entende três formatos porque o corretor procura de três jeitos: pelo
 * nome que lembra, pelo telefone que está no WhatsApp aberto ao lado, ou pelo
 * CPF que o cliente acabou de ditar. Obrigá-lo a escolher o campo certo antes de
 * digitar é fricção pura.
 */
export async function listarClientes(
  tenantId: string,
  filtros: FiltrosDeClientes = {},
): Promise<PaginaDeClientes> {
  const supabase = await clienteServidor();
  const pagina = Math.max(1, filtros.pagina ?? 1);
  const de = (pagina - 1) * POR_PAGINA;

  let consulta = supabase
    .from('pessoas')
    .select(
      `id, nome, cpf, email, cidade, uf, temperatura, portal_liberado, ultima_interacao_em,
       perfis:responsavel_id (nome),
       pessoa_telefones (numero, principal)`,
      { count: 'exact' },
    )
    .eq('tenant_id', tenantId)
    .is('excluido_em', null);

  const busca = filtros.busca?.trim();
  if (busca) {
    const digitos = soNumeros(busca);

    if (digitos.length === 11 && busca.replace(/[\s.\-()]/g, '').length === 11) {
      // Onze dígitos é ambíguo no Brasil: pode ser CPF ou celular com DDD.
      // Procurar nos dois evita o "não encontrado" que faz o corretor cadastrar
      // a pessoa de novo — justamente a duplicidade que o produto combate.
      const { data: porTelefone } = await supabase
        .from('pessoa_telefones')
        .select('pessoa_id')
        .eq('tenant_id', tenantId)
        .eq('numero', digitos);

      const ids = (porTelefone ?? []).map((t) => t.pessoa_id);
      consulta =
        ids.length > 0
          ? consulta.or(`cpf.eq.${digitos},id.in.(${ids.join(',')})`)
          : consulta.eq('cpf', digitos);
    } else if (digitos.length >= 10 && digitos.length <= 11) {
      const { data: porTelefone } = await supabase
        .from('pessoa_telefones')
        .select('pessoa_id')
        .eq('tenant_id', tenantId)
        .eq('numero', digitos);

      const ids = (porTelefone ?? []).map((t) => t.pessoa_id);
      // `in.()` com lista vazia é erro de sintaxe no PostgREST; um uuid
      // impossível devolve zero linhas sem quebrar a consulta.
      consulta = consulta.in('id', ids.length > 0 ? ids : ['00000000-0000-0000-0000-000000000000']);
    } else {
      // `%` no começo e no fim: o índice trigram da migração 0003 é justamente
      // para que isso não vire varredura completa.
      const termo = busca.replace(/[%_,]/g, '');
      consulta = consulta.or(`nome.ilike.%${termo}%,email.ilike.%${termo}%`);
    }
  }

  if (filtros.temperatura) consulta = consulta.eq('temperatura', filtros.temperatura);
  if (filtros.responsavelId) consulta = consulta.eq('responsavel_id', filtros.responsavelId);

  if (filtros.parados) {
    const limite = new Date();
    limite.setDate(limite.getDate() - 7);
    consulta = consulta.or(
      `ultima_interacao_em.lt.${limite.toISOString()},ultima_interacao_em.is.null`,
    );
  }

  const { data, count, error } = await consulta
    .order('ultima_interacao_em', { ascending: false, nullsFirst: false })
    .range(de, de + POR_PAGINA - 1);

  if (error) {
    console.error('[clientes] falha ao listar', { tenantId, erro: error.message });
    return { itens: [], total: 0, pagina, porPagina: POR_PAGINA, contaVazia: false };
  }

  type Bruto = Pick<
    LinhaPessoa,
    'id' | 'nome' | 'cpf' | 'email' | 'cidade' | 'uf' | 'temperatura' | 'portal_liberado' | 'ultima_interacao_em'
  > & {
    perfis: { nome: string } | { nome: string }[] | null;
    pessoa_telefones: { numero: string; principal: boolean }[] | null;
  };

  const ids = ((data ?? []) as unknown as Bruto[]).map((p) => p.id);

  // Contagem de negócios abertos em UMA consulta para a página inteira, em vez
  // de uma por linha. Com 25 linhas seriam 25 idas ao banco só para preencher
  // uma coluna.
  const contagem = new Map<string, number>();
  if (ids.length > 0) {
    const { data: negocios } = await supabase
      .from('negocios')
      .select('pessoa_id')
      .eq('tenant_id', tenantId)
      .eq('situacao', 'aberto')
      .is('excluido_em', null)
      .in('pessoa_id', ids);

    for (const n of negocios ?? []) {
      contagem.set(n.pessoa_id, (contagem.get(n.pessoa_id) ?? 0) + 1);
    }
  }

  const itens: ClienteNaLista[] = ((data ?? []) as unknown as Bruto[]).map((p) => {
    const telefones = p.pessoa_telefones ?? [];
    const principal = telefones.find((t) => t.principal) ?? telefones[0];

    return {
      id: p.id,
      nome: p.nome,
      cpfMascarado: mascarar(p.cpf),
      email: p.email,
      cidade: p.cidade,
      uf: p.uf,
      temperatura: p.temperatura,
      telefonePrincipal: principal?.numero ?? null,
      portalLiberado: p.portal_liberado,
      ultimaInteracaoEm: p.ultima_interacao_em,
      negociosAbertos: contagem.get(p.id) ?? 0,
      responsavelNome: Array.isArray(p.perfis) ? (p.perfis[0]?.nome ?? null) : (p.perfis?.nome ?? null),
    };
  });

  // Distingue "o filtro não achou" de "a conta está vazia" — a seção 22 exige
  // mensagens diferentes, e tratar os dois igual faz a conta nova parecer
  // quebrada.
  let contaVazia = false;
  if (itens.length === 0 && (busca || filtros.temperatura || filtros.parados)) {
    const { count: totalGeral } = await supabase
      .from('pessoas')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .is('excluido_em', null);
    contaVazia = (totalGeral ?? 0) === 0;
  } else if (itens.length === 0) {
    contaVazia = true;
  }

  return { itens, total: count ?? 0, pagina, porPagina: POR_PAGINA, contaVazia };
}

export interface FichaDoCliente {
  pessoa: LinhaPessoa;
  telefones: { id: string; numero: string; rotulo: string | null; whatsapp: boolean; principal: boolean }[];
  responsavelNome: string | null;
  negocios: {
    id: string;
    codigo: string;
    titulo: string | null;
    valor: number | null;
    situacao: string;
    etapaNome: string;
    etapaCor: string | null;
    etapaDesde: string;
  }[];
  followups: {
    id: string;
    motivo: string;
    prazo: string;
    situacao: string;
    prioridade: string;
    mensagemSugerida: string | null;
    revisadoEm: string | null;
  }[];
  tarefas: { id: string; titulo: string; prazo: string | null; situacao: string }[];
  compromissos: {
    id: string;
    titulo: string;
    tipo: string;
    situacao: string;
    inicio: string;
    endereco: string | null;
  }[];
  historico: {
    id: number;
    criadoEm: string;
    etapaDe: string | null;
    etapaPara: string;
    segundos: number | null;
    autorNome: string | null;
  }[];
}

/**
 * Ficha 360 (seção 6.3).
 *
 * Uma consulta por bloco, todas em paralelo. Tentar trazer tudo num único
 * `select` aninhado produziria um produto cartesiano entre negócios, tarefas e
 * compromissos — o mesmo negócio repetido uma vez por tarefa.
 */
export async function carregarFicha(
  tenantId: string,
  pessoaId: string,
): Promise<FichaDoCliente | null> {
  const supabase = await clienteServidor();

  const { data: pessoa, error } = await supabase
    .from('pessoas')
    .select('*, perfis:responsavel_id (nome)')
    .eq('id', pessoaId)
    .eq('tenant_id', tenantId)
    .is('excluido_em', null)
    .maybeSingle();

  // `null` cobre tanto "não existe" quanto "existe em outro tenant": a RLS já
  // filtrou, e a página responde 404 nos dois casos. Diferenciar vazaria a
  // informação de que o id existe em algum lugar.
  if (error || !pessoa) return null;

  const [telefones, negocios, followups, tarefas, compromissos] = await Promise.all([
    supabase
      .from('pessoa_telefones')
      .select('id, numero, rotulo, whatsapp, principal')
      .eq('pessoa_id', pessoaId)
      .order('principal', { ascending: false }),

    supabase
      .from('negocios')
      .select('id, codigo, titulo, valor, situacao, etapa_desde, etapas:etapa_id (nome, cor)')
      .eq('pessoa_id', pessoaId)
      .eq('tenant_id', tenantId)
      .is('excluido_em', null)
      .order('ultima_atividade_em', { ascending: false }),

    supabase
      .from('followups')
      .select('id, motivo, prazo, situacao, prioridade, mensagem_sugerida, revisado_em')
      .eq('pessoa_id', pessoaId)
      .eq('tenant_id', tenantId)
      .order('prazo', { ascending: true })
      .limit(20),

    supabase
      .from('tarefas')
      .select('id, titulo, prazo, situacao')
      .eq('pessoa_id', pessoaId)
      .eq('tenant_id', tenantId)
      .order('prazo', { ascending: true, nullsFirst: false })
      .limit(20),

    supabase
      .from('compromissos')
      .select('id, titulo, tipo, situacao, inicio, endereco')
      .eq('pessoa_id', pessoaId)
      .eq('tenant_id', tenantId)
      .order('inicio', { ascending: false })
      .limit(20),
  ]);

  type NegocioBruto = {
    id: string;
    codigo: string;
    titulo: string | null;
    valor: number | null;
    situacao: string;
    etapa_desde: string;
    etapas: { nome: string; cor: string | null } | { nome: string; cor: string | null }[] | null;
  };

  const pessoaComPerfil = pessoa as LinhaPessoa & {
    perfis: { nome: string } | { nome: string }[] | null;
  };

  const negociosBrutos = (negocios.data ?? []) as unknown as NegocioBruto[];

  // O histórico depende dos negócios, então não cabe no `Promise.all` acima: os
  // ids só existem depois daquela consulta. É a linha do tempo da seção 6.3 —
  // cada movimento de etapa com autor, data e tempo de permanência.
  const idsDeNegocios = negociosBrutos.map((n) => n.id);
  type HistoricoBruto = {
    id: number;
    criado_em: string;
    segundos_na_etapa_anterior: number | null;
    etapa_de: string | null;
    etapa_para: string;
    perfis: { nome: string } | { nome: string }[] | null;
  };

  let historico: FichaDoCliente['historico'] = [];
  if (idsDeNegocios.length > 0) {
    const { data: linhas } = await supabase
      .from('negocio_etapa_historico')
      .select(
        'id, criado_em, segundos_na_etapa_anterior, etapa_de, etapa_para, perfis:autor_id (nome)',
      )
      .eq('tenant_id', tenantId)
      .in('negocio_id', idsDeNegocios)
      .order('criado_em', { ascending: false })
      .limit(40);

    historico = ((linhas ?? []) as unknown as HistoricoBruto[]).map((h) => ({
      id: h.id,
      criadoEm: h.criado_em,
      etapaDe: h.etapa_de,
      etapaPara: h.etapa_para,
      segundos: h.segundos_na_etapa_anterior,
      autorNome: Array.isArray(h.perfis) ? (h.perfis[0]?.nome ?? null) : (h.perfis?.nome ?? null),
    }));
  }

  return {
    pessoa: pessoaComPerfil,
    telefones: telefones.data ?? [],
    responsavelNome: Array.isArray(pessoaComPerfil.perfis)
      ? (pessoaComPerfil.perfis[0]?.nome ?? null)
      : (pessoaComPerfil.perfis?.nome ?? null),
    negocios: negociosBrutos.map((n) => {
      const etapa = Array.isArray(n.etapas) ? n.etapas[0] : n.etapas;
      return {
        id: n.id,
        codigo: n.codigo,
        titulo: n.titulo,
        valor: n.valor,
        situacao: n.situacao,
        etapaNome: etapa?.nome ?? '—',
        etapaCor: etapa?.cor ?? null,
        etapaDesde: n.etapa_desde,
      };
    }),
    followups: (followups.data ?? []).map((f) => ({
      id: f.id,
      motivo: f.motivo,
      prazo: f.prazo,
      situacao: f.situacao,
      prioridade: f.prioridade,
      mensagemSugerida: f.mensagem_sugerida,
      revisadoEm: f.revisado_em,
    })),
    tarefas: tarefas.data ?? [],
    compromissos: compromissos.data ?? [],
    historico,
  };
}
