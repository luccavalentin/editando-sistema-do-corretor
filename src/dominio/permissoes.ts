/**
 * Matriz de permissões por papel (seção 14 do documento do produto).
 *
 * É lógica pura, sem banco e sem rede, para poder ser testada exaustivamente —
 * e ela É testada exaustivamente, porque é aqui que mora a diferença entre uma
 * secretária ver a agenda e uma secretária ver a comissão do corretor.
 *
 * DUAS CAMADAS, e as duas são obrigatórias. Esta camada decide o que a interface
 * mostra e o que a Server Action aceita. A Row Level Security decide o que o
 * banco entrega. Se as duas discordarem, o banco ganha — é assim que se cumpre
 * "nunca confiar apenas na interface para esconder dados" (seção 17).
 *
 * Esta camada existe apesar da RLS porque erro de permissão precisa virar
 * mensagem ("seu papel é Assistente") e não lista vazia sem explicação.
 */

import type { Papel } from '@/lib/supabase/tipos-banco';

/**
 * Ações controladas. O nome é `modulo.acao` para que a interface possa perguntar
 * por módulo inteiro ao montar o menu.
 */
export type Acao =
  // CRM
  | 'crm.ver'
  | 'crm.criar'
  | 'crm.editar'
  | 'crm.excluir'
  | 'crm.exportar'
  // Dado sensível: CPF completo, renda, documento
  | 'sensivel.ver'
  // Imóveis
  | 'imoveis.ver'
  | 'imoveis.criar'
  | 'imoveis.editar'
  | 'imoveis.excluir'
  | 'imoveis.publicar'
  // Simulação e crédito
  | 'simulacao.ver'
  | 'simulacao.criar'
  | 'credito.consultar'
  // Atendimento
  | 'mensagens.ver'
  | 'mensagens.enviar'
  // Agenda e tarefas
  | 'agenda.ver'
  | 'agenda.editar'
  // Financeiro
  | 'financeiro.ver'
  // Equipe e conta
  | 'equipe.ver'
  | 'equipe.administrar'
  | 'configuracoes.editar'
  | 'integracoes.administrar'
  | 'auditoria.ver';

const TODAS: readonly Acao[] = [
  'crm.ver',
  'crm.criar',
  'crm.editar',
  'crm.excluir',
  'crm.exportar',
  'sensivel.ver',
  'imoveis.ver',
  'imoveis.criar',
  'imoveis.editar',
  'imoveis.excluir',
  'imoveis.publicar',
  'simulacao.ver',
  'simulacao.criar',
  'credito.consultar',
  'mensagens.ver',
  'mensagens.enviar',
  'agenda.ver',
  'agenda.editar',
  'financeiro.ver',
  'equipe.ver',
  'equipe.administrar',
  'configuracoes.editar',
  'integracoes.administrar',
  'auditoria.ver',
] as const;

/**
 * O que cada papel pode fazer.
 *
 * Cada omissão abaixo é deliberada, não esquecimento — os comentários dizem por
 * quê, porque numa revisão futura a pergunta vai ser exatamente essa.
 */
const MATRIZ: Record<Papel, readonly Acao[]> = {
  // Dono da conta: tudo. É quem paga e quem responde legalmente pelos dados.
  proprietario: TODAS,

  // Administra a operação, menos o que é do dono: não mexe em cobrança.
  admin_equipe: TODAS.filter((a) => a !== 'financeiro.ver'),

  // O corretor opera a venda de ponta a ponta na carteira dele.
  corretor: [
    'crm.ver',
    'crm.criar',
    'crm.editar',
    'crm.exportar',
    'sensivel.ver',
    'imoveis.ver',
    'imoveis.criar',
    'imoveis.editar',
    'imoveis.publicar',
    'simulacao.ver',
    'simulacao.criar',
    'credito.consultar',
    'mensagens.ver',
    'mensagens.enviar',
    'agenda.ver',
    'agenda.editar',
    'equipe.ver',
  ],

  // Apoia o corretor. Não consulta crédito (consulta deixa registro no CPF do
  // cliente e exige finalidade declarada — ver seção 11) e não exclui nada.
  assistente: [
    'crm.ver',
    'crm.criar',
    'crm.editar',
    'imoveis.ver',
    'imoveis.editar',
    'simulacao.ver',
    'mensagens.ver',
    'mensagens.enviar',
    'agenda.ver',
    'agenda.editar',
    'equipe.ver',
  ],

  // Agenda e atendimento. Não vê CPF completo nem renda: não precisa para
  // marcar visita, e o princípio do menor privilégio vale para dado pessoal.
  secretaria: [
    'crm.ver',
    'crm.criar',
    'imoveis.ver',
    'mensagens.ver',
    'mensagens.enviar',
    'agenda.ver',
    'agenda.editar',
    'equipe.ver',
  ],

  // Prospecção e primeiro contato. Cria contato e conversa; não entra em
  // simulação nem em imóvel.
  sdr: ['crm.ver', 'crm.criar', 'crm.editar', 'mensagens.ver', 'mensagens.enviar', 'agenda.ver'],

  // Cobrança e comissão. Vê o financeiro e a auditoria do que é financeiro;
  // NÃO abre a ficha do cliente, porque não precisa dela para faturar.
  // `auditoria.ver` saiu daqui. A política do banco (`auditoria_ler`) só
  // permite a leitura a quem ADMINISTRA a conta, e o financeiro não administra.
  // Enquanto o sistema dizia que sim, ele chegava à tela de segurança, o
  // banco devolvia zero linhas, e a conclusão razoável era "o sistema quebrou".
  //
  // Alinhar o sistema ao banco é o caminho certo aqui, e não o contrário: o
  // registro de auditoria mostra quem revelou o CPF de qual cliente, e isso não
  // é assunto de quem cuida de comissão. `tests/unit/permissoes.test.ts` trava
  // esse acordo.
  financeiro: ['financeiro.ver', 'crm.ver', 'imoveis.ver'],

  // Só leitura, e sem dado sensível. Serve para sócio, contador externo e
  // auditoria de terceiro.
  visualizacao: ['crm.ver', 'imoveis.ver', 'simulacao.ver', 'agenda.ver'],
};

/** Permissões pontuais negociadas, gravadas em `membros.permissoes_extra`. */
export type PermissoesExtra = Partial<Record<Acao, boolean>>;

/**
 * Decide se o papel, com os ajustes do membro, autoriza a ação.
 *
 * `permissoesExtra` sobrepõe a matriz nos dois sentidos: pode conceder a um
 * assistente o direito de consultar crédito, e pode retirar de um corretor o
 * direito de exportar a carteira. É a exceção comercial que sempre aparece, e
 * sem ela o cliente pede "um papel novo" a cada negociação.
 */
export function podeFazer(
  papel: Papel,
  acao: Acao,
  permissoesExtra?: PermissoesExtra | null,
): boolean {
  // O ajuste pontual vem primeiro, inclusive para negar.
  const ajuste = permissoesExtra?.[acao];
  if (typeof ajuste === 'boolean') return ajuste;

  return MATRIZ[papel].includes(acao);
}

/** Todas as ações efetivas do papel, já com os ajustes aplicados. */
export function acoesDoPapel(papel: Papel, permissoesExtra?: PermissoesExtra | null): Set<Acao> {
  const efetivas = new Set<Acao>();
  for (const acao of TODAS) {
    if (podeFazer(papel, acao, permissoesExtra)) efetivas.add(acao);
  }
  return efetivas;
}

/** `true` se o papel administra a conta. */
export function administraConta(papel: Papel): boolean {
  return papel === 'proprietario' || papel === 'admin_equipe';
}

/** Rótulo em português para a interface. */
export const ROTULO_PAPEL: Record<Papel, string> = {
  proprietario: 'Proprietário',
  admin_equipe: 'Administrador',
  corretor: 'Corretor',
  assistente: 'Assistente',
  secretaria: 'Secretária',
  sdr: 'SDR',
  financeiro: 'Financeiro',
  visualizacao: 'Visualização',
};

/** Lista imutável de todas as ações, para teste e para telas de permissão. */
export const ACOES: readonly Acao[] = TODAS;

/**
 * Papéis que alguém pode ATRIBUIR ao convidar ou ao mudar o papel de um membro.
 *
 * `proprietario` fica de fora, e não por descuido: a conta tem um dono, e
 * transferir a propriedade é outra operação — com outras consequências, como
 * quem responde pela cobrança e pelos dados perante a LGPD. Deixá-la no mesmo
 * menu de "mudar papel" faria uma transferência de titularidade acontecer com
 * dois cliques, por engano.
 */
export const PAPEIS_ATRIBUIVEIS: readonly Papel[] = [
  'admin_equipe',
  'corretor',
  'assistente',
  'secretaria',
  'sdr',
  'financeiro',
  'visualizacao',
];

/** Descrição curta de cada papel, para quem convida saber o que está dando. */
export const RESUMO_DO_PAPEL: Record<Papel, string> = {
  proprietario: 'Dono da conta. Vê e faz tudo, inclusive cobrança.',
  admin_equipe: 'Administra a equipe e as configurações. Não mexe na cobrança.',
  corretor: 'Atende clientes, cadastra imóveis e simula financiamento.',
  assistente: 'Apoia o corretor: cadastra e organiza, sem publicar nem excluir.',
  secretaria: 'Agenda, atende e organiza. Não vê valores de comissão.',
  sdr: 'Trabalha a entrada de leads. Não vê a carteira inteira.',
  financeiro: 'Comissões, contratos e cobrança. Não atende cliente.',
  visualizacao: 'Só leitura. Para contador, sócio ou auditoria.',
};
