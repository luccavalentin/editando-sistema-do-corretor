import { z } from 'zod';

/**
 * Regras de validação de um imóvel.
 *
 * Espelha as restrições da migração 0009 DE PROPÓSITO. A duplicação é
 * deliberada e tem uma divisão de trabalho clara:
 *
 *   - O banco é a autoridade. Ele recusa mesmo quando a regra muda aqui, mesmo
 *     que alguém escreva direto na API, mesmo num job.
 *   - Este arquivo existe para o corretor ver a mensagem no campo certo em vez
 *     de um erro de constraint do Postgres, que não diz nada para quem está
 *     atendendo um cliente.
 *
 * Quando as duas divergirem, o banco vence e o erro aparece — que é melhor do
 * que este arquivo ser permissivo e o dado entrar errado.
 */

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;

export const TIPOS_DE_IMOVEL = {
  apartamento: 'Apartamento',
  casa: 'Casa',
  casa_condominio: 'Casa em condomínio',
  sobrado: 'Sobrado',
  cobertura: 'Cobertura',
  kitnet: 'Kitnet / Studio',
  terreno: 'Terreno',
  terreno_condominio: 'Terreno em condomínio',
  chacara: 'Chácara / Sítio',
  sala_comercial: 'Sala comercial',
  loja: 'Loja',
  galpao: 'Galpão',
  outro: 'Outro',
} as const;

export const FINALIDADES = {
  venda: 'Venda',
  aluguel: 'Aluguel',
  venda_aluguel: 'Venda e aluguel',
} as const;

export const SITUACOES_DE_IMOVEL = {
  rascunho: 'Rascunho',
  disponivel: 'Disponível',
  reservado: 'Reservado',
  em_negociacao: 'Em negociação',
  vendido: 'Vendido',
  alugado: 'Alugado',
  suspenso: 'Suspenso',
} as const;

export const USOS = { residencial: 'Residencial', comercial: 'Comercial' } as const;

export const CONSERVACOES = {
  novo: 'Novo',
  usado: 'Usado',
  na_planta: 'Na planta',
  em_construcao: 'Em construção',
} as const;

/** Situações em que o imóvel ainda pode aparecer no portfólio público. */
export const SITUACOES_PUBLICAVEIS = ['disponivel', 'reservado'] as const;

/** Mínimo de caracteres na descrição para publicar. O banco exige o mesmo. */
export const MINIMO_DESCRICAO_PUBLICA = 40;

export const COMODIDADES = [
  'Piscina',
  'Churrasqueira',
  'Academia',
  'Salão de festas',
  'Playground',
  'Portaria 24h',
  'Elevador',
  'Varanda gourmet',
  'Área de serviço',
  'Armários planejados',
  'Ar-condicionado',
  'Aquecimento solar',
  'Quadra poliesportiva',
  'Espaço pet',
  'Coworking',
  'Vaga coberta',
  'Jardim',
  'Lareira',
] as const;

/**
 * Aceita o valor vindo da URL só quando ele é uma das opções conhecidas.
 *
 * A URL é entrada do usuário como qualquer outra, e chega tanto da tela interna
 * quanto da vitrine pública. `?tipo=qualquer_coisa` não derruba nada, mas faria
 * a consulta devolver vazio sem explicação — e quem está procurando imóvel
 * conclui que o corretor não tem nenhum. Valor desconhecido vira filtro
 * ausente, que é o comportamento honesto.
 *
 * Fica aqui, e não em cada página, porque duas cópias divergem: uma ganha um
 * tipo novo e a outra passa a esconder imóveis em silêncio.
 */
export function opcaoConhecida<T extends Record<string, unknown>>(
  valor: string | undefined | null,
  opcoes: T,
): keyof T | undefined {
  return valor && Object.prototype.hasOwnProperty.call(opcoes, valor)
    ? (valor as keyof T)
    : undefined;
}

// ---------------------------------------------------------------------------

function textoOpcional(max: number) {
  return z
    .string()
    .trim()
    .max(max, `Máximo de ${max} caracteres.`)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional();
}

/**
 * Converte "R$ 780.000,00" em número.
 *
 * Mesma razão do cadastro de pessoa: o corretor digita como fala. Exigir ponto
 * decimal americano num campo de preço de imóvel é como um erro de mil vezes
 * espera para acontecer.
 */
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
      message: 'Informe um valor válido, como 780.000,00.',
    })
    .nullable()
    .optional();
}

function inteiroOpcional(minimo: number, maximo: number, rotulo: string) {
  return z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : Number(v.replace(/\D/g, ''))))
    .refine((v) => v === null || (Number.isInteger(v) && v >= minimo && v <= maximo), {
      message: `${rotulo} precisa ficar entre ${minimo} e ${maximo}.`,
    })
    .nullable()
    .optional();
}

function decimalOpcional(rotulo: string) {
  return z
    .string()
    .trim()
    .transform((v) => {
      if (v === '') return null;
      const n = Number(v.replace(/\./g, '').replace(',', '.'));
      return Number.isFinite(n) ? n : Number.NaN;
    })
    .refine((v) => v === null || (Number.isFinite(v) && v > 0), {
      message: `Informe ${rotulo} como número positivo.`,
    })
    .nullable()
    .optional();
}

function booleanoDeFormulario() {
  // Checkbox não marcado simplesmente NÃO É ENVIADO pelo navegador — não vem
  // como `false`, vem ausente. Por isso `undefined` e `null` entram na união e
  // viram `false` na transformação, em vez de `.default(false)`: o default do
  // Zod se aplica à ENTRADA, e a entrada aqui é string, não booleano.
  return z
    .union([
      z.literal('on'),
      z.literal('true'),
      z.literal('false'),
      z.literal(''),
      z.null(),
      z.undefined(),
    ])
    .transform((valor) => valor === 'on' || valor === 'true');
}

export const esquemaImovel = z
  .object({
    titulo: z
      .string()
      .trim()
      .min(3, 'O título precisa de pelo menos 3 caracteres.')
      .max(200, 'Título muito longo.'),

    tipo: z.enum(Object.keys(TIPOS_DE_IMOVEL) as [keyof typeof TIPOS_DE_IMOVEL]),
    finalidade: z.enum(Object.keys(FINALIDADES) as [keyof typeof FINALIDADES]),
    situacao: z.enum(Object.keys(SITUACOES_DE_IMOVEL) as [keyof typeof SITUACOES_DE_IMOVEL]),
    uso: z.enum(Object.keys(USOS) as [keyof typeof USOS]),
    conservacao: z.enum(Object.keys(CONSERVACOES) as [keyof typeof CONSERVACOES]),

    proprietarioId: z.string().uuid().nullable().optional(),

    cep: z
      .string()
      .trim()
      .transform((v) => (v === '' ? null : v.replace(/\D/g, '')))
      .nullable()
      .optional()
      .refine((v) => v == null || v.length === 8, { message: 'O CEP precisa ter 8 dígitos.' }),
    logradouro: textoOpcional(200),
    numero: textoOpcional(20),
    complemento: textoOpcional(100),
    bairro: textoOpcional(120),
    cidade: textoOpcional(120),
    uf: z
      .string()
      .trim()
      .toUpperCase()
      .transform((v) => (v === '' ? null : v))
      .nullable()
      .optional()
      .refine((v) => v == null || (UFS as readonly string[]).includes(v), {
        message: 'UF inválida.',
      }),

    mostrarEnderecoNoPortfolio: booleanoDeFormulario(),

    valor: moedaOpcional(),
    valorAluguel: moedaOpcional(),
    valorCondominio: moedaOpcional(),
    valorIptu: moedaOpcional(),
    aceitaFinanciamento: booleanoDeFormulario(),
    aceitaFgts: booleanoDeFormulario(),
    aceitaPermuta: booleanoDeFormulario(),

    areaUtil: decimalOpcional('a área útil'),
    areaTotal: decimalOpcional('a área total'),
    quartos: inteiroOpcional(0, 30, 'Quartos'),
    suites: inteiroOpcional(0, 30, 'Suítes'),
    banheiros: inteiroOpcional(0, 30, 'Banheiros'),
    vagas: inteiroOpcional(0, 50, 'Vagas'),
    andar: inteiroOpcional(0, 200, 'Andar'),
    anoConstrucao: inteiroOpcional(1800, 2100, 'Ano de construção'),
    mobiliado: booleanoDeFormulario(),
    aceitaPet: booleanoDeFormulario(),
    comodidades: z.array(z.string().trim().max(60)).max(40).optional().default([]),

    comissaoPercentual: z
      .string()
      .trim()
      .transform((v) => {
        if (v === '') return null;
        const n = Number(v.replace(',', '.'));
        return Number.isFinite(n) ? n : Number.NaN;
      })
      .refine((v) => v === null || (Number.isFinite(v) && v >= 0 && v <= 100), {
        message: 'A comissão precisa ficar entre 0 e 100.',
      })
      .nullable()
      .optional(),
    exclusividade: booleanoDeFormulario(),
    exclusividadeAte: z
      .string()
      .trim()
      .transform((v) => (v === '' ? null : v))
      .nullable()
      .optional(),

    descricaoPublica: textoOpcional(6000),
    observacoesInternas: textoOpcional(6000),

    publicadoNoPortfolio: booleanoDeFormulario(),
    responsavelId: z.string().uuid().nullable().optional(),
  })

  // -------------------------------------------------------------------------
  // As regras que cruzam campos. Cada uma existe porque o banco tem a mesma, e
  // sem elas o corretor levaria um erro de constraint no lugar de um aviso.
  // -------------------------------------------------------------------------

  .superRefine((dados, contexto) => {
    // Venda precisa de preço de venda; aluguel, de preço de aluguel.
    if (dados.situacao !== 'rascunho') {
      if (
        (dados.finalidade === 'venda' || dados.finalidade === 'venda_aluguel') &&
        dados.valor == null
      ) {
        contexto.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['valor'],
          message: 'Imóvel à venda precisa de valor de venda.',
        });
      }
      if (
        (dados.finalidade === 'aluguel' || dados.finalidade === 'venda_aluguel') &&
        dados.valorAluguel == null
      ) {
        contexto.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['valorAluguel'],
          message: 'Imóvel para alugar precisa de valor de aluguel.',
        });
      }
    }

    if (dados.suites != null && dados.quartos != null && dados.suites > dados.quartos) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['suites'],
        message: 'Não há como ter mais suítes do que quartos.',
      });
    }

    if (
      dados.areaUtil != null &&
      dados.areaTotal != null &&
      dados.areaUtil > dados.areaTotal
    ) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['areaUtil'],
        message: 'A área útil não pode ser maior que a área total.',
      });
    }

    if (dados.exclusividade && !dados.exclusividadeAte) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['exclusividadeAte'],
        message: 'Exclusividade precisa de data de término.',
      });
    }

    // Publicar exige conteúdo que converte. É restrição do banco também.
    if (dados.publicadoNoPortfolio) {
      const descricao = dados.descricaoPublica ?? '';
      if (descricao.trim().length < MINIMO_DESCRICAO_PUBLICA) {
        contexto.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['descricaoPublica'],
          message: `Para publicar, escreva pelo menos ${MINIMO_DESCRICAO_PUBLICA} caracteres de descrição.`,
        });
      }
      if (dados.valor == null && dados.valorAluguel == null) {
        contexto.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['valor'],
          message: 'Anúncio publicado precisa de preço.',
        });
      }
      if (!dados.cidade) {
        contexto.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['cidade'],
          message: 'Anúncio publicado precisa da cidade.',
        });
      }
      if (!(SITUACOES_PUBLICAVEIS as readonly string[]).includes(dados.situacao)) {
        contexto.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['situacao'],
          message: 'Só imóvel disponível ou reservado aparece no portfólio.',
        });
      }
    }
  });

export type DadosDeImovel = z.infer<typeof esquemaImovel>;

export function lerFormularioDeImovel(formulario: FormData) {
  return esquemaImovel.safeParse({
    titulo: formulario.get('titulo') ?? '',
    tipo: formulario.get('tipo') || 'apartamento',
    finalidade: formulario.get('finalidade') || 'venda',
    situacao: formulario.get('situacao') || 'rascunho',
    uso: formulario.get('uso') || 'residencial',
    conservacao: formulario.get('conservacao') || 'usado',
    proprietarioId: formulario.get('proprietarioId') || null,
    cep: formulario.get('cep') ?? '',
    logradouro: formulario.get('logradouro') ?? '',
    numero: formulario.get('numero') ?? '',
    complemento: formulario.get('complemento') ?? '',
    bairro: formulario.get('bairro') ?? '',
    cidade: formulario.get('cidade') ?? '',
    uf: formulario.get('uf') ?? '',
    mostrarEnderecoNoPortfolio: formulario.get('mostrarEnderecoNoPortfolio'),
    valor: formulario.get('valor') ?? '',
    valorAluguel: formulario.get('valorAluguel') ?? '',
    valorCondominio: formulario.get('valorCondominio') ?? '',
    valorIptu: formulario.get('valorIptu') ?? '',
    aceitaFinanciamento: formulario.get('aceitaFinanciamento'),
    aceitaFgts: formulario.get('aceitaFgts'),
    aceitaPermuta: formulario.get('aceitaPermuta'),
    areaUtil: formulario.get('areaUtil') ?? '',
    areaTotal: formulario.get('areaTotal') ?? '',
    quartos: formulario.get('quartos') ?? '',
    suites: formulario.get('suites') ?? '',
    banheiros: formulario.get('banheiros') ?? '',
    vagas: formulario.get('vagas') ?? '',
    andar: formulario.get('andar') ?? '',
    anoConstrucao: formulario.get('anoConstrucao') ?? '',
    mobiliado: formulario.get('mobiliado'),
    aceitaPet: formulario.get('aceitaPet'),
    comodidades: formulario.getAll('comodidades').map(String),
    comissaoPercentual: formulario.get('comissaoPercentual') ?? '',
    exclusividade: formulario.get('exclusividade'),
    exclusividadeAte: formulario.get('exclusividadeAte') ?? '',
    descricaoPublica: formulario.get('descricaoPublica') ?? '',
    observacoesInternas: formulario.get('observacoesInternas') ?? '',
    publicadoNoPortfolio: formulario.get('publicadoNoPortfolio'),
    responsavelId: formulario.get('responsavelId') || null,
  });
}

/**
 * Gera o pedaço legível da URL pública do anúncio.
 *
 * Endereço legível vale posição no Google, que é de onde vem o comprador que o
 * corretor não conhece. O sufixo aleatório evita colisão entre dois "casa-3-
 * dormitorios-gonzaga" sem transformar a URL num identificador ilegível.
 */
export function gerarSlug(titulo: string, cidade: string | null, sufixo: string): string {
  const base = [titulo, cidade]
    .filter(Boolean)
    .join(' ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70)
    .replace(/-+$/g, '');

  const limpo = base.length >= 3 ? base : 'imovel';
  return `${limpo}-${sufixo}`.slice(0, 82);
}

/** Resumo de uma linha para leitura rápida na lista: "3 quartos · 2 vagas · 78 m²". */
export function resumirCaracteristicas(imovel: {
  quartos: number | null;
  vagas: number | null;
  area_util: number | string | null;
  banheiros: number | null;
}): string {
  const partes: string[] = [];
  if (imovel.quartos != null) {
    partes.push(`${imovel.quartos} ${imovel.quartos === 1 ? 'quarto' : 'quartos'}`);
  }
  if (imovel.banheiros != null) {
    partes.push(`${imovel.banheiros} ${imovel.banheiros === 1 ? 'banheiro' : 'banheiros'}`);
  }
  if (imovel.vagas != null) {
    partes.push(`${imovel.vagas} ${imovel.vagas === 1 ? 'vaga' : 'vagas'}`);
  }
  const area = imovel.area_util == null ? null : Number(imovel.area_util);
  if (area != null && Number.isFinite(area) && area > 0) {
    partes.push(`${area.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} m²`);
  }
  return partes.join(' · ');
}
