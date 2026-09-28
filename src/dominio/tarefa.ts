import { z } from 'zod';

/**
 * Regras da tarefa.
 *
 * Espelha as restrições da migração 0003. A duplicação é deliberada: o banco é
 * a autoridade, e este arquivo existe para o corretor ver a mensagem no campo
 * certo em vez de um erro de constraint.
 */

export const PRIORIDADES = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  critica: 'Crítica',
} as const;

/** Tom de cada prioridade. Nunca só cor: o rótulo sempre aparece junto. */
export const TOM_DA_PRIORIDADE = {
  baixa: 'neutro',
  media: 'neutro',
  alta: 'atencao',
  critica: 'perigo',
} as const;

export const SITUACOES_DE_TAREFA = {
  aberta: 'Aberta',
  feita: 'Concluída',
  cancelada: 'Cancelada',
} as const;

export const esquemaTarefa = z.object({
  titulo: z
    .string()
    .trim()
    .min(2, 'A tarefa precisa de um título.')
    .max(200, 'Título muito longo.'),

  descricao: z
    .string()
    .trim()
    .max(4000)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional(),

  prioridade: z.enum(['baixa', 'media', 'alta', 'critica']),

  /**
   * Prazo opcional.
   *
   * Tarefa sem prazo é legítima — "ligar para o síndico quando der" existe no
   * dia do corretor. Obrigar uma data faria ele inventar uma, e aí a lista de
   * vencidas encheria de coisa que nunca teve prazo de verdade.
   */
  prazo: z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional(),

  pessoaId: z.string().uuid().nullable().optional(),
  negocioId: z.string().uuid().nullable().optional(),
  responsavelId: z.string().uuid().nullable().optional(),
});

export type DadosDaTarefa = z.infer<typeof esquemaTarefa>;

export function lerFormularioDeTarefa(formulario: FormData) {
  return esquemaTarefa.safeParse({
    titulo: formulario.get('titulo') ?? '',
    descricao: formulario.get('descricao') ?? '',
    prioridade: formulario.get('prioridade') || 'media',
    prazo: formulario.get('prazo') ?? '',
    pessoaId: formulario.get('pessoaId') || null,
    negocioId: formulario.get('negocioId') || null,
    responsavelId: formulario.get('responsavelId') || null,
  });
}

/**
 * Quanto uma tarefa está atrasada, em palavras.
 *
 * "Venceu há 3 dias" diz mais do que uma data: o corretor não precisa calcular
 * nada para saber o tamanho do problema.
 */
export function atrasoEmPalavras(prazo: string | null, agora = new Date()): string | null {
  if (!prazo) return null;

  const data = new Date(prazo);
  if (Number.isNaN(data.getTime())) return null;

  const minutos = Math.floor((agora.getTime() - data.getTime()) / 60000);
  if (minutos < 0) return null;

  if (minutos < 60) return 'venceu agora';
  if (minutos < 1440) {
    const horas = Math.floor(minutos / 60);
    return `venceu há ${horas} ${horas === 1 ? 'hora' : 'horas'}`;
  }

  const dias = Math.floor(minutos / 1440);
  if (dias < 30) return `venceu há ${dias} ${dias === 1 ? 'dia' : 'dias'}`;

  const meses = Math.floor(dias / 30);
  return `venceu há ${meses} ${meses === 1 ? 'mês' : 'meses'}`;
}
