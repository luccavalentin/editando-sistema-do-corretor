import type { Database } from '@/lib/supabase/tipos-banco';

/**
 * O enum `regra_automacao` vive no schema `app`, e o gerador de tipos só cobre
 * o `public` — então ele não aparece em `Database['public']['Enums']`. Derivar
 * da COLUNA é melhor do que escrever a união à mão: se uma regra for
 * acrescentada na migração e esquecida aqui, o compilador aponta.
 */
export type RegraDeAutomacao = Database['public']['Tables']['automacoes']['Row']['regra'];

/**
 * As quatro regras, descritas para quem vai ligá-las.
 *
 * O texto aqui é o que o corretor lê antes de decidir. Ele precisa responder
 * três coisas sem sair da tela: o que a regra FAZ, QUANDO dispara, e o que ele
 * vai receber. Uma descrição vaga ("mantém seus negócios aquecidos") faz a
 * pessoa ligar sem entender e desligar na primeira surpresa.
 */
export const REGRAS: Record<
  RegraDeAutomacao,
  {
    nome: string;
    oQueFaz: string;
    quandoDispara: string;
    /** Nome do parâmetro ajustável, quando há um. */
    parametro?: { chave: string; rotulo: string; padrao: number; min: number; max: number; unidade: string };
  }
> = {
  negocio_parado: {
    nome: 'Negócio parado',
    oQueFaz:
      'Cria um follow-up quando um negócio fica sem nenhuma movimentação por tempo demais.',
    quandoDispara:
      'É a regra que mais rende: negócio esquecido não avisa que foi esquecido. Qualquer edição no negócio zera a contagem.',
    parametro: { chave: 'dias', rotulo: 'Parado há', padrao: 7, min: 2, max: 90, unidade: 'dias' },
  },
  visita_sem_retorno: {
    nome: 'Visita sem retorno',
    oQueFaz: 'Cria um follow-up depois de uma visita realizada em que você ainda não voltou a falar com a pessoa.',
    quandoDispara:
      'O intervalo entre a visita e o retorno é onde a maioria das vendas esfria. Só considera visitas dos últimos 30 dias.',
    parametro: { chave: 'horas', rotulo: 'Depois de', padrao: 24, min: 2, max: 168, unidade: 'horas' },
  },
  simulacao_aprovada: {
    nome: 'Crédito aprovado',
    oQueFaz: 'Cria um follow-up urgente assim que um banco aprova o crédito do cliente.',
    quandoDispara:
      'Crédito aprovado é a melhor notícia que você tem para dar, e ela esfria: quem foi aprovado hoje procura outro corretor amanhã.',
  },
  aniversario_do_cliente: {
    nome: 'Aniversário do cliente',
    oQueFaz: 'Cria um follow-up com mensagem pronta no dia do aniversário de cada cliente.',
    quandoDispara:
      'Só para quem tem data de nascimento no cadastro, e uma vez por ano.',
    parametro: {
      chave: 'dias_de_antecedencia',
      rotulo: 'Avisar com',
      padrao: 0,
      min: 0,
      max: 30,
      unidade: 'dias de antecedência',
    },
  },
};

/** Ordem de exibição: da que mais rende para a que menos. */
export const ORDEM_DAS_REGRAS: RegraDeAutomacao[] = [
  'negocio_parado',
  'visita_sem_retorno',
  'simulacao_aprovada',
  'aniversario_do_cliente',
];
