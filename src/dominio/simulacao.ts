import { z } from 'zod';

/**
 * Simulação de financiamento: matemática e regras.
 *
 * Módulo puro — sem rede, sem banco. Duas responsabilidades:
 *
 *   1. A ESTIMATIVA LOCAL. O corretor está com o cliente na frente e precisa
 *      de um número agora, não em três minutos. O cálculo de SAC e PRICE é
 *      determinístico e roda aqui em microssegundos.
 *
 *   2. A TRADUÇÃO PARA A HOMEFIN. Os códigos de dois caracteres ('AP', 'CA',
 *      'U') vivem num lugar só, com o nome legível ao lado.
 *
 * SOBRE A ESTIMATIVA, E O PRINCÍPIO QUE ELA NÃO PODE VIOLAR
 *
 * O princípio 7 do produto proíbe inventar número e apresentá-lo como se fosse
 * do banco. A estimativa daqui NÃO é proposta: ela usa uma taxa de referência
 * que o corretor informa ou uma média de mercado, e a interface é obrigada a
 * rotulá-la como estimativa. Quando o banco responde, o número real substitui
 * o estimado — e a diferença fica visível, porque é ela que o cliente vai
 * perguntar.
 */

// ---------------------------------------------------------------------------
// CÓDIGOS DA HOMEFIN
// ---------------------------------------------------------------------------

/** `tipoImovel.id` no contrato da Homefin. */
export const TIPO_IMOVEL_HOMEFIN = {
  AP: 'Apartamento',
  CS: 'Casa',
  GA: 'Galpão',
  TE: 'Terreno',
  TC: 'Terreno em condomínio',
} as const;

export type TipoImovelHomefin = keyof typeof TIPO_IMOVEL_HOMEFIN;

/** `usoImovel.id`. */
export const USO_IMOVEL_HOMEFIN = { R: 'Residencial', C: 'Comercial' } as const;

/** `situacaoImovel.codigo` — repare que a chave é `codigo`, não `id`. */
export const SITUACAO_IMOVEL_HOMEFIN = { N: 'Novo', U: 'Usado' } as const;

/** `codigoSistemaAmortizacaoBanco.id`. */
export const SISTEMA_AMORTIZACAO_HOMEFIN = { S: 'SAC', P: 'PRICE' } as const;

/** `tipoEstadoCivil.id`. */
export const ESTADO_CIVIL_HOMEFIN = {
  S: 'Solteiro(a)',
  CA: 'Casado(a)',
  UE: 'União estável',
  DI: 'Divorciado(a)',
  SL: 'Separado(a) legalmente',
  VI: 'Viúvo(a)',
} as const;

export type EstadoCivilHomefin = keyof typeof ESTADO_CIVIL_HOMEFIN;

/**
 * Converte o tipo de imóvel do nosso cadastro para o código da Homefin.
 *
 * A Homefin tem cinco tipos; nós temos treze. Sobrado e cobertura são casa e
 * apartamento para efeito de financiamento — o banco avalia a garantia, não a
 * nomenclatura do anúncio. Sala, loja e chácara não têm equivalente e caem em
 * galpão, que é o tipo comercial genérico do contrato deles.
 */
export function tipoImovelParaHomefin(tipo: string): TipoImovelHomefin {
  switch (tipo) {
    case 'apartamento':
    case 'cobertura':
    case 'kitnet':
      return 'AP';
    case 'casa':
    case 'sobrado':
      return 'CS';
    case 'casa_condominio':
      return 'CS';
    case 'terreno':
      return 'TE';
    case 'terreno_condominio':
      return 'TC';
    case 'galpao':
    case 'sala_comercial':
    case 'loja':
      return 'GA';
    default:
      return 'AP';
  }
}

export function conservacaoParaHomefin(conservacao: string): 'N' | 'U' {
  // "Na planta" e "em construção" são imóveis novos para o banco: não houve
  // transferência de propriedade anterior.
  return conservacao === 'usado' ? 'U' : 'N';
}

export function usoParaHomefin(uso: string): 'R' | 'C' {
  return uso === 'comercial' ? 'C' : 'R';
}

// ---------------------------------------------------------------------------
// MATEMÁTICA
// ---------------------------------------------------------------------------

/**
 * Taxa mensal equivalente a partir da taxa efetiva anual.
 *
 * Conversão GEOMÉTRICA, não dividir por 12. Dividir por 12 é o erro clássico:
 * a 10% ao ano, a taxa mensal correta é 0,7974%, e não 0,8333%. Num
 * financiamento de 360 meses a diferença passa de vinte mil reais no total
 * pago, e o corretor perde a confiança do cliente quando o banco apresenta o
 * número certo.
 */
export function taxaMensalDeAnual(taxaAnualPercentual: number): number {
  return Math.pow(1 + taxaAnualPercentual / 100, 1 / 12) - 1;
}

export interface ParcelaEstimada {
  /** Primeira parcela. No SAC é a maior; no PRICE, todas são iguais. */
  primeira: number;
  /** Última parcela. No PRICE é igual à primeira. */
  ultima: number;
  /** Soma de todas as parcelas. */
  total: number;
  /** Total pago menos o valor financiado. */
  juros: number;
}

/**
 * SAC — amortização constante.
 *
 * A parcela começa alta e cai todo mês. É o sistema mais usado em
 * financiamento imobiliário no Brasil, e o que os bancos oferecem por padrão.
 */
export function calcularSac(
  valorFinanciado: number,
  prazoMeses: number,
  taxaAnualPercentual: number,
): ParcelaEstimada {
  const i = taxaMensalDeAnual(taxaAnualPercentual);
  const amortizacao = valorFinanciado / prazoMeses;

  const primeira = amortizacao + valorFinanciado * i;
  const ultima = amortizacao + amortizacao * i;

  // Soma de uma progressão aritmética: os juros caem linearmente porque o
  // saldo devedor cai linearmente.
  const total = ((primeira + ultima) / 2) * prazoMeses;

  return {
    primeira: arredondar(primeira),
    ultima: arredondar(ultima),
    total: arredondar(total),
    juros: arredondar(total - valorFinanciado),
  };
}

/**
 * PRICE — parcela fixa.
 *
 * Todas as parcelas iguais. Começa mais baixa que o SAC e termina mais alta;
 * o total pago é maior. Alguns clientes preferem pela previsibilidade.
 */
export function calcularPrice(
  valorFinanciado: number,
  prazoMeses: number,
  taxaAnualPercentual: number,
): ParcelaEstimada {
  const i = taxaMensalDeAnual(taxaAnualPercentual);

  // Taxa zero é degenerado para a fórmula (divisão por zero), e acontece em
  // simulação de teste. Vale tratar em vez de devolver NaN para a tela.
  const parcela = i === 0 ? valorFinanciado / prazoMeses : (valorFinanciado * i) / (1 - Math.pow(1 + i, -prazoMeses));

  const total = parcela * prazoMeses;

  return {
    primeira: arredondar(parcela),
    ultima: arredondar(parcela),
    total: arredondar(total),
    juros: arredondar(total - valorFinanciado),
  };
}

export function estimarParcela(
  sistema: 'sac' | 'price',
  valorFinanciado: number,
  prazoMeses: number,
  taxaAnualPercentual: number,
): ParcelaEstimada {
  return sistema === 'price'
    ? calcularPrice(valorFinanciado, prazoMeses, taxaAnualPercentual)
    : calcularSac(valorFinanciado, prazoMeses, taxaAnualPercentual);
}

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/**
 * Taxa de referência para a estimativa.
 *
 * NÃO é a taxa de nenhum banco. É um valor de mercado para dar ordem de
 * grandeza enquanto a resposta real não chega, e a interface tem que dizer
 * isso. Fica como constante nomeada, e não espalhada, para haver um único
 * lugar a atualizar quando o mercado mudar.
 */
export const TAXA_REFERENCIA_ANUAL = 11.5;

/**
 * Quanto da renda a parcela compromete.
 *
 * Os bancos brasileiros trabalham com teto de 30% da renda bruta. Passar disso
 * quase sempre significa recusa — e saber disso ANTES de enviar poupa o
 * corretor de prometer ao cliente o que não vai sair.
 */
export const COMPROMETIMENTO_MAXIMO = 0.3;

export interface AnaliseDeComprometimento {
  percentual: number;
  cabe: boolean;
  /** Renda que seria necessária para a parcela caber no teto. */
  rendaNecessaria: number;
  aviso: string | null;
}

export function analisarComprometimento(
  parcela: number,
  rendaTotal: number,
): AnaliseDeComprometimento {
  if (rendaTotal <= 0) {
    return {
      percentual: 0,
      cabe: false,
      rendaNecessaria: 0,
      aviso: 'Informe a renda para avaliar o comprometimento.',
    };
  }

  const percentual = parcela / rendaTotal;
  const cabe = percentual <= COMPROMETIMENTO_MAXIMO;
  const rendaNecessaria = arredondar(parcela / COMPROMETIMENTO_MAXIMO);

  return {
    percentual: Math.round(percentual * 1000) / 10,
    cabe,
    rendaNecessaria,
    aviso: cabe
      ? null
      : `A parcela compromete ${Math.round(percentual * 100)}% da renda. Os bancos costumam recusar acima de 30% — ` +
        `seria preciso renda de ${rendaNecessaria.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ` +
        `ou compor renda com outra pessoa.`,
  };
}

/**
 * Entrada mínima.
 *
 * Os bancos financiam até 80% do valor do imóvel usado e 90% do novo. Não é
 * regra universal, mas é o padrão — e avisar antes evita a simulação nascer
 * fadada à recusa.
 */
export function entradaMinima(valorImovel: number, conservacao: 'N' | 'U'): number {
  const percentualFinanciavel = conservacao === 'N' ? 0.9 : 0.8;
  return arredondar(valorImovel * (1 - percentualFinanciavel));
}

// ---------------------------------------------------------------------------
// VALIDAÇÃO DO FORMULÁRIO
// ---------------------------------------------------------------------------

function moeda() {
  return z
    .string()
    .trim()
    .transform((v) => {
      const limpo = v.replace(/[R$\s.]/g, '').replace(',', '.');
      const n = Number(limpo);
      return Number.isFinite(n) ? n : Number.NaN;
    })
    .refine((v) => Number.isFinite(v) && v >= 0, { message: 'Informe um valor válido.' });
}

function moedaOpcional() {
  return z
    .string()
    .trim()
    .transform((v) => {
      if (v === '') return null;
      const limpo = v.replace(/[R$\s.]/g, '').replace(',', '.');
      const n = Number(limpo);
      return Number.isFinite(n) ? n : Number.NaN;
    })
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0), {
      message: 'Informe um valor válido.',
    })
    .nullable();
}

export const esquemaSimulacao = z
  .object({
    pessoaId: z.string().uuid('Escolha o cliente.'),
    imovelId: z.string().uuid().nullable().optional(),
    negocioId: z.string().uuid().nullable().optional(),

    valorImovel: moeda().refine((v) => v > 0, 'O valor do imóvel é obrigatório.'),
    valorEntrada: moeda(),
    prazoMeses: z
      .string()
      .trim()
      .transform((v) => Number(v.replace(/\D/g, '')))
      .refine((v) => Number.isInteger(v) && v >= 12 && v <= 480, {
        message: 'O prazo precisa ficar entre 12 e 480 meses.',
      }),
    rendaTotal: moeda().refine((v) => v > 0, 'A renda é obrigatória para simular.'),

    sistemaAmortizacao: z.enum(['sac', 'price']),
    usaFgts: z
      .union([z.literal('on'), z.literal('true'), z.literal(''), z.null(), z.undefined()])
      .transform((v) => v === 'on' || v === 'true'),
    financiarDespesas: z
      .union([z.literal('on'), z.literal('true'), z.literal(''), z.null(), z.undefined()])
      .transform((v) => v === 'on' || v === 'true'),

    tipoImovelHomefin: z.enum(
      Object.keys(TIPO_IMOVEL_HOMEFIN) as [keyof typeof TIPO_IMOVEL_HOMEFIN],
    ),
    usoImovelHomefin: z.enum(['R', 'C']),
    situacaoImovelHomefin: z.enum(['N', 'U']),
    uf: z
      .string()
      .trim()
      .toUpperCase()
      .length(2, 'Informe a UF do imóvel.'),

    estadoCivilHomefin: z
      .string()
      .trim()
      .transform((v) => (v === '' ? null : v))
      .nullable()
      .optional(),

    compoeRenda: z
      .union([z.literal('on'), z.literal('true'), z.literal(''), z.null(), z.undefined()])
      .transform((v) => v === 'on' || v === 'true'),
    nomeCoparticipante: z
      .string()
      .trim()
      .max(160)
      .transform((v) => (v === '' ? null : v))
      .nullable()
      .optional(),
    cpfCoparticipante: z
      .string()
      .trim()
      .transform((v) => (v === '' ? null : v.replace(/\D/g, '')))
      .nullable()
      .optional()
      .refine((v) => v == null || v.length === 11, { message: 'O CPF precisa ter 11 dígitos.' }),
    dataNascimentoCoparticipante: z
      .string()
      .trim()
      .transform((v) => (v === '' ? null : v))
      .nullable()
      .optional(),
    rendaCoparticipante: moedaOpcional().optional(),

    /** Bancos escolhidos, pelos ids da Homefin. */
    bancos: z.array(z.coerce.number().int().positive()).min(1, 'Escolha pelo menos um banco.'),

    observacoes: z
      .string()
      .trim()
      .max(2000)
      .transform((v) => (v === '' ? null : v))
      .nullable()
      .optional(),
  })
  .superRefine((dados, contexto) => {
    const financiado = dados.valorImovel - dados.valorEntrada;

    if (financiado <= 0) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['valorEntrada'],
        message: 'A entrada cobre o imóvel inteiro. Não há o que financiar.',
      });
      return;
    }

    if (dados.valorEntrada > dados.valorImovel) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['valorEntrada'],
        message: 'A entrada não pode ser maior que o valor do imóvel.',
      });
    }

    // Avisa antes de gastar uma chamada que o banco vai recusar.
    const minima = entradaMinima(dados.valorImovel, dados.situacaoImovelHomefin);
    if (dados.valorEntrada < minima) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['valorEntrada'],
        message:
          `Para imóvel ${dados.situacaoImovelHomefin === 'N' ? 'novo' : 'usado'}, os bancos costumam exigir entrada de ` +
          `pelo menos ${minima.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`,
      });
    }

    if (dados.compoeRenda) {
      if (!dados.nomeCoparticipante) {
        contexto.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['nomeCoparticipante'],
          message: 'Informe quem compõe a renda.',
        });
      }
      if (!dados.cpfCoparticipante) {
        contexto.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['cpfCoparticipante'],
          message: 'O CPF de quem compõe a renda é obrigatório.',
        });
      }
    }
  });

export type DadosDaSimulacao = z.infer<typeof esquemaSimulacao>;

export function lerFormularioDeSimulacao(formulario: FormData) {
  return esquemaSimulacao.safeParse({
    pessoaId: formulario.get('pessoaId') ?? '',
    imovelId: formulario.get('imovelId') || null,
    negocioId: formulario.get('negocioId') || null,
    valorImovel: formulario.get('valorImovel') ?? '',
    valorEntrada: formulario.get('valorEntrada') ?? '0',
    prazoMeses: formulario.get('prazoMeses') ?? '360',
    rendaTotal: formulario.get('rendaTotal') ?? '',
    sistemaAmortizacao: formulario.get('sistemaAmortizacao') || 'sac',
    usaFgts: formulario.get('usaFgts'),
    financiarDespesas: formulario.get('financiarDespesas'),
    tipoImovelHomefin: formulario.get('tipoImovelHomefin') || 'AP',
    usoImovelHomefin: formulario.get('usoImovelHomefin') || 'R',
    situacaoImovelHomefin: formulario.get('situacaoImovelHomefin') || 'U',
    uf: formulario.get('uf') ?? '',
    estadoCivilHomefin: formulario.get('estadoCivilHomefin') ?? '',
    compoeRenda: formulario.get('compoeRenda'),
    nomeCoparticipante: formulario.get('nomeCoparticipante') ?? '',
    cpfCoparticipante: formulario.get('cpfCoparticipante') ?? '',
    dataNascimentoCoparticipante: formulario.get('dataNascimentoCoparticipante') ?? '',
    rendaCoparticipante: formulario.get('rendaCoparticipante') ?? '',
    bancos: formulario.getAll('bancos').map(String),
    observacoes: formulario.get('observacoes') ?? '',
  });
}

/** Rótulos das situações, para a interface não repetir o `switch`. */
export const ROTULO_SITUACAO_SIMULACAO = {
  rascunho: { texto: 'Rascunho', tom: 'neutro' },
  sem_integracao: { texto: 'Sem integração', tom: 'neutro' },
  erro_no_envio: { texto: 'Erro ao enviar', tom: 'perigo' },
  em_analise: { texto: 'Em análise', tom: 'atencao' },
  aprovado: { texto: 'Aprovado', tom: 'sucesso' },
  recusado: { texto: 'Recusado', tom: 'perigo' },
} as const;

/** Traduz o código de uma letra da Homefin para a nossa situação. */
export function situacaoDaHomefin(
  codigo: string | null | undefined,
): keyof typeof ROTULO_SITUACAO_SIMULACAO {
  switch (codigo) {
    case 'A':
      // CUIDADO: na OPORTUNIDADE, 'A' significa "Ativa". Aqui é a situação da
      // SIMULAÇÃO, onde 'A' é "Crédito Aprovado". Nunca use esta função para
      // interpretar o `tipoSituacao` de uma oportunidade.
      return 'aprovado';
    case 'R':
      return 'recusado';
    case 'N':
      return 'em_analise';
    case 'P':
      return 'erro_no_envio';
    case 'S':
      return 'sem_integracao';
    default:
      return 'sem_integracao';
  }
}
