import 'server-only';

import { clienteServico } from '@/lib/supabase/servidor';

/**
 * Os dados que o cliente vê no portal.
 *
 * TODA CONSULTA AQUI PASSA POR UMA FUNÇÃO DO BANCO, e isso é deliberado.
 *
 * O portal usa a chave de serviço, que ignora a RLS — não há alternativa: o
 * cliente não tem sessão Supabase. Isso significa que, se as consultas fossem
 * escritas aqui em SQL solto, o isolamento inteiro dependeria de cada `where`
 * estar certo, para sempre, em todo lugar. Um `select *` esquecido exporia a
 * observação interna do corretor; um filtro faltando exporia o cliente do
 * concorrente.
 *
 * Com as funções `security definer` da migração 0015, a fronteira fica em UM
 * lugar, escrita em SQL, testável com SQL — e o `supabase/tests/06` prova que
 * `observacoes_internas`, `comissao_percentual` e o endereço exato nem existem
 * no que elas devolvem.
 *
 * Este arquivo, portanto, não decide nada sobre segurança. Ele traduz.
 */

/** O motivo do `clienteServico`, repetido em toda chamada por exigência dele. */
const MOTIVO = 'portal do cliente: autentica por CPF e nao tem sessao Supabase';

export interface ResumoDoPortal {
  nome: string;
  corretorNome: string;
  corretorWhatsapp: string | null;
  corretorEmail: string | null;
  corretorCreci: string | null;
  imoveisDeInteresse: number;
  simulacoes: number;
  simulacaoAprovada: boolean;
  /** Falso no primeiro acesso: o portal barra até o titular aceitar o termo. */
  lgpdAceito: boolean;
}

export interface ImovelDoCliente {
  id: string;
  codigo: string;
  titulo: string;
  tipo: string;
  finalidade: string;
  situacao: string;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  valor: number | null;
  valorAluguel: number | null;
  valorCondominio: number | null;
  quartos: number | null;
  banheiros: number | null;
  vagas: number | null;
  areaUtil: number | null;
  descricaoPublica: string | null;
  slug: string | null;
  fotoChave: string | null;
  interesse: string;
  interesseEm: string;
}

export interface BancoNaSimulacao {
  banco: string;
  situacao: string;
  parcela: number | null;
  taxa: number | null;
  prazo: number | null;
  escolhido: boolean;
}

export interface SimulacaoDoCliente {
  id: string;
  codigo: string;
  situacao: string;
  valorImovel: number;
  valorEntrada: number;
  valorFinanciamento: number;
  prazoMeses: number;
  melhorParcela: number | null;
  criadoEm: string;
  respondidoEm: string | null;
  imovelTitulo: string | null;
  bancos: BancoNaSimulacao[];
}

export async function obterResumo(pessoaId: string): Promise<ResumoDoPortal | null> {
  const supabase = clienteServico(MOTIVO);

  const { data } = await supabase.rpc('portal_meu_resumo', { p_pessoa_id: pessoaId });
  const linha = Array.isArray(data) ? data[0] : null;
  if (!linha) return null;

  return {
    nome: linha.nome,
    corretorNome: linha.corretor_nome,
    corretorWhatsapp: linha.corretor_whatsapp,
    corretorEmail: linha.corretor_email,
    corretorCreci: linha.corretor_creci,
    imoveisDeInteresse: Number(linha.imoveis_de_interesse ?? 0),
    simulacoes: Number(linha.simulacoes ?? 0),
    simulacaoAprovada: Boolean(linha.simulacao_aprovada),
    lgpdAceito: Boolean(linha.lgpd_aceito),
  };
}

export async function listarImoveis(pessoaId: string): Promise<ImovelDoCliente[]> {
  const supabase = clienteServico(MOTIVO);
  const { data } = await supabase.rpc('portal_meus_imoveis', { p_pessoa_id: pessoaId });

  return (data ?? []).map((i) => ({
    id: i.id,
    codigo: i.codigo,
    titulo: i.titulo,
    tipo: i.tipo,
    finalidade: i.finalidade,
    situacao: i.situacao,
    bairro: i.bairro,
    cidade: i.cidade,
    uf: i.uf,
    valor: i.valor == null ? null : Number(i.valor),
    valorAluguel: i.valor_aluguel == null ? null : Number(i.valor_aluguel),
    valorCondominio: i.valor_condominio == null ? null : Number(i.valor_condominio),
    quartos: i.quartos,
    banheiros: i.banheiros,
    vagas: i.vagas,
    areaUtil: i.area_util == null ? null : Number(i.area_util),
    descricaoPublica: i.descricao_publica,
    slug: i.slug,
    fotoChave: i.foto_chave,
    interesse: i.interesse,
    interesseEm: i.interesse_em,
  }));
}

export async function listarSimulacoes(pessoaId: string): Promise<SimulacaoDoCliente[]> {
  const supabase = clienteServico(MOTIVO);
  const { data } = await supabase.rpc('portal_minhas_simulacoes', { p_pessoa_id: pessoaId });

  return (data ?? []).map((s) => ({
    id: s.id,
    codigo: s.codigo,
    situacao: s.situacao,
    valorImovel: Number(s.valor_imovel),
    valorEntrada: Number(s.valor_entrada),
    valorFinanciamento: Number(s.valor_financiamento),
    prazoMeses: s.prazo_meses,
    melhorParcela: s.melhor_parcela == null ? null : Number(s.melhor_parcela),
    criadoEm: s.criado_em,
    respondidoEm: s.respondido_em,
    imovelTitulo: s.imovel_titulo,
    bancos: (Array.isArray(s.bancos) ? s.bancos : []) as unknown as BancoNaSimulacao[],
  }));
}

/**
 * Registra o aceite do termo.
 *
 * A VERSÃO é guardada junto com a data, e isso não é burocracia: um termo
 * alterado depois exige novo aceite, e sem saber qual versão cada pessoa
 * aceitou não há como identificar quem precisa aceitar de novo.
 */
export async function aceitarTermo(pessoaId: string, versao: string): Promise<boolean> {
  const supabase = clienteServico(MOTIVO);
  const { data } = await supabase.rpc('portal_aceitar_termo', {
    p_pessoa_id: pessoaId,
    p_versao: versao,
  });
  return Boolean(data);
}

/**
 * Apaga o rastro do PORTAL a pedido do titular.
 *
 * Não apaga o cadastro na imobiliária, e a tela diz isso antes de confirmar: o
 * corretor tem obrigação legal e contratual de manter registro de uma
 * negociação, e a LGPD reconhece essa base. Prometer exclusão total e entregar
 * exclusão parcial seria pior do que explicar a diferença.
 */
export async function excluirMeusDados(pessoaId: string): Promise<boolean> {
  const supabase = clienteServico(MOTIVO);
  const { data } = await supabase.rpc('portal_excluir_meus_dados', { p_pessoa_id: pessoaId });
  return Boolean(data);
}
