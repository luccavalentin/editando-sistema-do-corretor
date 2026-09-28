import { z } from 'zod';

import {
  cpfValido,
  normalizarCelular,
  soNumeros,
} from '@/lib/privacidade/documentos';

/**
 * Regras de validação de uma pessoa.
 *
 * Fica em `dominio` — sem banco, sem rede, sem React — para ser testável
 * isoladamente e para ser o MESMO esquema usado pelo formulário e pela Server
 * Action. Validar só no formulário é validar nada: a Server Action é uma rota
 * HTTP e aceita qualquer coisa que alguém mande com curl.
 */

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;

/** Campo opcional de texto: string vazia do formulário vira `null`. */
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
 * Converte "R$ 11.200,00" e "11200,50" em número.
 *
 * O corretor digita como fala. Exigir ponto decimal americano num campo de renda
 * é a forma mais rápida de fazer alguém cadastrar 11 reais em vez de 11 mil.
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
      message: 'Informe um valor válido, como 11.200,00.',
    })
    .nullable()
    .optional();
}

export const esquemaPessoa = z
  .object({
    nome: z
      .string()
      .trim()
      .min(2, 'O nome precisa de pelo menos 2 letras.')
      .max(160, 'Nome muito longo.')
      // Nome só com números quase sempre é campo trocado no formulário.
      .refine((v) => /\p{L}/u.test(v), 'Informe o nome da pessoa.'),

    cpf: z
      .string()
      .trim()
      .transform((v) => (v === '' ? null : soNumeros(v)))
      .nullable()
      .optional()
      .refine((v) => v === null || v === undefined || v.length === 11, {
        message: 'O CPF precisa ter 11 dígitos.',
      })
      // Dígito verificador conferido de verdade. CPF inválido gravado hoje é um
      // cadastro que nunca vai casar com o retorno do banco nem com a consulta
      // de crédito — e só se descobre no pior momento.
      .refine((v) => v === null || v === undefined || cpfValido(v), {
        message: 'Esse CPF não é válido. Confira os dígitos.',
      }),

    dataNascimento: z
      .string()
      .trim()
      .transform((v) => (v === '' ? null : v))
      .nullable()
      .optional()
      .refine(
        (v) => {
          if (!v) return true;
          const d = new Date(v);
          if (Number.isNaN(d.getTime())) return false;
          // Futuro é erro de digitação; 120 anos também.
          const hoje = new Date();
          const minimo = new Date();
          minimo.setFullYear(hoje.getFullYear() - 120);
          return d <= hoje && d >= minimo;
        },
        { message: 'Data de nascimento inválida.' },
      ),

    email: z
      .string()
      .trim()
      .toLowerCase()
      .transform((v) => (v === '' ? null : v))
      .nullable()
      .optional()
      .refine((v) => v === null || v === undefined || z.string().email().safeParse(v).success, {
        message: 'Esse e-mail não parece válido.',
      }),

    celular: z
      .string()
      .trim()
      .transform((v) => (v === '' ? null : normalizarCelular(v)))
      .nullable()
      .optional()
      .refine((v) => v !== undefined, { message: 'Celular inválido.' })
      .refine((v) => v === null || v === undefined || v.length >= 10, {
        message: 'Informe o celular com DDD, como (11) 91234-5678.',
      }),

    cidade: textoOpcional(120),
    uf: z
      .string()
      .trim()
      .toUpperCase()
      .transform((v) => (v === '' ? null : v))
      .nullable()
      .optional()
      .refine((v) => v === null || v === undefined || UFS.includes(v as (typeof UFS)[number]), {
        message: 'UF inválida.',
      }),

    renda: moedaOpcional(),
    rendaComposta: moedaOpcional(),

    origem: z
      .enum([
        'whatsapp',
        'telefone',
        'email',
        'presencial',
        'portal',
        'portal_imobiliario',
        'indicacao',
        'outro',
      ])
      .nullable()
      .optional(),
    origemDetalhe: textoOpcional(160),

    temperatura: z.enum(['quente', 'morno', 'frio']).default('frio'),

    faixaValorMin: moedaOpcional(),
    faixaValorMax: moedaOpcional(),

    objetivo: textoOpcional(500),
    observacoes: textoOpcional(2000),

    responsavelId: z.string().uuid().nullable().optional(),
  })
  .refine(
    (d) =>
      d.faixaValorMin == null ||
      d.faixaValorMax == null ||
      d.faixaValorMax >= d.faixaValorMin,
    { message: 'O valor máximo precisa ser maior que o mínimo.', path: ['faixaValorMax'] },
  );

export type DadosDePessoa = z.infer<typeof esquemaPessoa>;

/**
 * Lê o formulário e devolve o resultado da validação.
 *
 * Centralizado para que formulário e Server Action leiam os MESMOS nomes de
 * campo: renomear um `name` no HTML sem mexer aqui viraria um campo que some em
 * silêncio, e o corretor só descobre que a renda não foi salva na hora da
 * simulação.
 */
export function lerFormularioDePessoa(formulario: FormData) {
  return esquemaPessoa.safeParse({
    nome: formulario.get('nome') ?? '',
    cpf: formulario.get('cpf') ?? '',
    dataNascimento: formulario.get('dataNascimento') ?? '',
    email: formulario.get('email') ?? '',
    celular: formulario.get('celular') ?? '',
    cidade: formulario.get('cidade') ?? '',
    uf: formulario.get('uf') ?? '',
    renda: formulario.get('renda') ?? '',
    rendaComposta: formulario.get('rendaComposta') ?? '',
    origem: formulario.get('origem') || null,
    origemDetalhe: formulario.get('origemDetalhe') ?? '',
    temperatura: formulario.get('temperatura') || 'frio',
    faixaValorMin: formulario.get('faixaValorMin') ?? '',
    faixaValorMax: formulario.get('faixaValorMax') ?? '',
    objetivo: formulario.get('objetivo') ?? '',
    observacoes: formulario.get('observacoes') ?? '',
    responsavelId: formulario.get('responsavelId') || null,
  });
}

/** Rótulos de origem para a interface. */
export const ROTULO_ORIGEM: Record<string, string> = {
  whatsapp: 'WhatsApp',
  telefone: 'Telefone',
  email: 'E-mail',
  presencial: 'Presencial',
  portal: 'Portal do cliente',
  portal_imobiliario: 'Portal imobiliário',
  indicacao: 'Indicação',
  outro: 'Outro',
};

export const ROTULO_TEMPERATURA: Record<string, string> = {
  quente: 'Quente',
  morno: 'Morno',
  frio: 'Frio',
};
