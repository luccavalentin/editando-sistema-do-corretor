/**
 * Regras do compromisso.
 *
 * O QUE ESTE MÓDULO EXISTE PARA RESOLVER
 *
 * A agenda de um corretor não é uma lista de horários: é uma sequência de
 * deslocamentos pela cidade. Dois problemas custam o dia dele, e nenhum dos
 * dois aparece numa grade comum:
 *
 *   1. VISITA NÃO CONFIRMADA. Ele atravessa a cidade e o cliente não aparece.
 *   2. INTERVALO CURTO DEMAIS. Duas visitas com 15 minutos entre elas, em
 *      bairros opostos, garantem atraso na segunda — e o atraso contamina o
 *      resto do dia.
 *
 * As funções aqui são puras e testáveis. A tela só desenha o que elas apontam.
 */

export const TIPOS_DE_COMPROMISSO = {
  visita: 'Visita',
  retorno: 'Retorno',
  ligacao: 'Ligação',
  reuniao: 'Reunião',
  assinatura: 'Assinatura',
  avaliacao: 'Avaliação',
  parceiro: 'Parceiro',
  interna: 'Interna',
} as const;

export const SITUACOES_DE_COMPROMISSO = {
  agendado: 'Agendado',
  confirmado: 'Confirmado',
  realizado: 'Realizado',
  faltou: 'Não compareceu',
  cancelado: 'Cancelado',
  remarcado: 'Remarcado',
} as const;

export const TOM_DA_SITUACAO = {
  agendado: 'neutro',
  confirmado: 'sucesso',
  realizado: 'sucesso',
  faltou: 'perigo',
  cancelado: 'neutro',
  remarcado: 'atencao',
} as const;

/** Tipos que exigem o corretor sair do lugar. São os que sofrem com deslocamento. */
export const EXIGEM_DESLOCAMENTO = new Set(['visita', 'avaliacao', 'assinatura', 'reuniao']);

/** Situações que ainda vão acontecer. Só elas entram em conflito. */
export const AINDA_VALEM = new Set(['agendado', 'confirmado']);

export interface JanelaDeCompromisso {
  id: string;
  inicio: string;
  fim: string;
  tipo: string;
  situacao: string;
  deslocamentoMin: number | null;
}

export interface Sobreposicao {
  id: string;
  conflitaCom: string;
}

/**
 * Compromissos que se sobrepõem no tempo.
 *
 * Só compara o que ainda vai acontecer: um compromisso cancelado sobre um
 * confirmado não é conflito, é histórico.
 *
 * A comparação é par a par. Com a agenda de um dia — dezenas de itens, não
 * milhares — isso é instantâneo, e um algoritmo mais esperto só acrescentaria
 * chance de erro.
 */
export function acharSobreposicoes(janelas: JanelaDeCompromisso[]): Sobreposicao[] {
  const ativos = janelas.filter((j) => AINDA_VALEM.has(j.situacao));
  const achados: Sobreposicao[] = [];

  for (let i = 0; i < ativos.length; i++) {
    for (let j = i + 1; j < ativos.length; j++) {
      const a = ativos[i]!;
      const b = ativos[j]!;

      // Faixa meio-aberta `[inicio, fim)`, igual à do banco: um compromisso que
      // termina 14h e outro que começa 14h NÃO se sobrepõem.
      const seSobrepoem =
        new Date(a.inicio) < new Date(b.fim) && new Date(b.inicio) < new Date(a.fim);

      if (seSobrepoem) {
        achados.push({ id: a.id, conflitaCom: b.id });
        achados.push({ id: b.id, conflitaCom: a.id });
      }
    }
  }

  return achados;
}

export interface IntervaloApertado {
  id: string;
  minutosDisponiveis: number;
  minutosNecessarios: number;
}

/**
 * Compromissos com tempo insuficiente para chegar.
 *
 * Compara o intervalo real entre o fim de um e o início do próximo com o
 * deslocamento declarado. Só considera os que exigem sair do lugar: duas
 * ligações seguidas não precisam de intervalo.
 *
 * Quando o deslocamento não foi informado, nada é apontado — inventar um número
 * aqui seria fingir que o sistema sabe a distância, e um aviso falso treina o
 * corretor a ignorar os verdadeiros.
 */
export function acharIntervalosApertados(
  janelas: JanelaDeCompromisso[],
): IntervaloApertado[] {
  const emOrdem = janelas
    .filter((j) => AINDA_VALEM.has(j.situacao))
    .slice()
    .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());

  const apertados: IntervaloApertado[] = [];

  for (let i = 1; i < emOrdem.length; i++) {
    const anterior = emOrdem[i - 1]!;
    const atual = emOrdem[i]!;

    if (!EXIGEM_DESLOCAMENTO.has(atual.tipo)) continue;
    if (atual.deslocamentoMin == null) continue;

    const minutosDisponiveis = Math.round(
      (new Date(atual.inicio).getTime() - new Date(anterior.fim).getTime()) / 60000,
    );

    // Sobreposição já é tratada por `acharSobreposicoes`; não avisar duas vezes.
    if (minutosDisponiveis < 0) continue;

    if (minutosDisponiveis < atual.deslocamentoMin) {
      apertados.push({
        id: atual.id,
        minutosDisponiveis,
        minutosNecessarios: atual.deslocamentoMin,
      });
    }
  }

  return apertados;
}

/**
 * Visitas por confirmar que já estão perto.
 *
 * O limite é de 24 horas porque é a janela em que a confirmação ainda muda o
 * dia: confirmar com uma semana de antecedência não evita nada — o cliente
 * esquece. Confirmar na véspera, sim.
 */
export function porConfirmar(
  janelas: JanelaDeCompromisso[],
  agora = new Date(),
  horasDeAntecedencia = 24,
): string[] {
  const limite = new Date(agora.getTime() + horasDeAntecedencia * 3600000);

  return janelas
    .filter(
      (j) =>
        j.situacao === 'agendado' &&
        EXIGEM_DESLOCAMENTO.has(j.tipo) &&
        new Date(j.inicio) > agora &&
        new Date(j.inicio) <= limite,
    )
    .map((j) => j.id);
}

/** Faixa de horas do dia, para a grade não começar às 00h. */
export function faixaDoDia(janelas: JanelaDeCompromisso[]): { de: number; ate: number } {
  if (janelas.length === 0) return { de: 8, ate: 19 };

  let de = 23;
  let ate = 0;

  for (const janela of janelas) {
    de = Math.min(de, new Date(janela.inicio).getHours());
    ate = Math.max(ate, new Date(janela.fim).getHours() + 1);
  }

  // Margem de uma hora dos dois lados, dentro do dia.
  return { de: Math.max(0, Math.min(de, 8) - 0), ate: Math.min(24, Math.max(ate, 19)) };
}
