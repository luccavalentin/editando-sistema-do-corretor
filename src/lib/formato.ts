/**
 * Formatação para o corretor brasileiro.
 *
 * Centralizado porque valor de imóvel aparece em dezenas de telas, e uma tela
 * mostrando "R$ 780.000,00" ao lado de outra mostrando "780000" destrói a
 * confiança no sistema mais rápido que qualquer bug funcional.
 *
 * Os formatadores de `Intl` são criados uma vez e reaproveitados: construir um
 * `Intl.NumberFormat` é caro, e uma tabela de 200 negócios construiria 200.
 */

const MOEDA = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
});

const MOEDA_CURTA = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const NUMERO = new Intl.NumberFormat('pt-BR');

const PERCENTUAL = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const DATA_CURTA = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'America/Sao_Paulo',
});

const DATA_LONGA = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'America/Sao_Paulo',
});

const HORA = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

const DATA_HORA = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

/** R$ 780.000,00 */
export function moeda(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  const n = typeof valor === 'string' ? Number(valor) : valor;
  return Number.isFinite(n) ? MOEDA.format(n) : '—';
}

/**
 * R$ 780 mil, R$ 8,4 mi — para indicador de painel.
 *
 * Existe porque "R$ 8.432.150,00" num cartão de indicador rouba a atenção do
 * número seguinte. No painel o corretor quer a ordem de grandeza; o valor exato
 * está a um clique, na lista que originou o número.
 */
export function moedaCurta(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  const n = typeof valor === 'string' ? Number(valor) : valor;
  if (!Number.isFinite(n)) return '—';

  const abs = Math.abs(n);
  if (abs >= 1_000_000) {
    return `R$ ${PERCENTUAL.format(n / 1_000_000)} mi`;
  }
  if (abs >= 1_000) {
    return `R$ ${NUMERO.format(Math.round(n / 1_000))} mil`;
  }
  return MOEDA_CURTA.format(n);
}

/** 1.234 */
export function numero(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return '—';
  return NUMERO.format(valor);
}

/** 16,2% */
export function percentual(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return '—';
  return `${PERCENTUAL.format(valor)}%`;
}

function paraData(valor: string | Date | null | undefined): Date | null {
  if (!valor) return null;
  const d = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 24/09/2026 */
export function data(valor: string | Date | null | undefined): string {
  const d = paraData(valor);
  return d ? DATA_CURTA.format(d) : '—';
}

/** terça-feira, 24 de setembro */
export function dataLonga(valor: string | Date | null | undefined): string {
  const d = paraData(valor);
  return d ? DATA_LONGA.format(d) : '—';
}

/** 09:30 */
export function hora(valor: string | Date | null | undefined): string {
  const d = paraData(valor);
  return d ? HORA.format(d) : '—';
}

/** 24/09 09:30 */
export function dataHora(valor: string | Date | null | undefined): string {
  const d = paraData(valor);
  return d ? DATA_HORA.format(d) : '—';
}

/**
 * "há 3 horas", "há 2 dias", "agora".
 *
 * O painel inteiro depende disto: o bloco de prioridades ordena por tempo
 * parado, e "há 3 horas" comunica urgência que "24/09 08:47" não comunica.
 *
 * Usa passos inteiros e nunca arredonda para cima de forma otimista — "há 1
 * hora" quando passaram 110 minutos faria o corretor achar que tem folga.
 */
export function tempoRelativo(valor: string | Date | null | undefined): string {
  const d = paraData(valor);
  if (!d) return '—';

  const segundos = Math.floor((Date.now() - d.getTime()) / 1000);

  if (segundos < 0) return 'em breve';
  if (segundos < 60) return 'agora';

  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `há ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} ${horas === 1 ? 'hora' : 'horas'}`;

  const dias = Math.floor(horas / 24);
  if (dias < 30) return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`;

  const meses = Math.floor(dias / 30);
  if (meses < 12) return `há ${meses} ${meses === 1 ? 'mês' : 'meses'}`;

  const anos = Math.floor(meses / 12);
  return `há ${anos} ${anos === 1 ? 'ano' : 'anos'}`;
}

/**
 * Tempo parado, em unidade grossa: "3h", "2d", "11d".
 * Para coluna estreita de tabela, onde "há 3 horas" não cabe.
 */
export function tempoCurto(valor: string | Date | null | undefined): string {
  const d = paraData(valor);
  if (!d) return '—';

  const minutos = Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000));
  if (minutos < 60) return `${minutos}min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `${horas}h`;

  return `${Math.floor(horas / 24)}d`;
}

/** Duração em segundos para "4,0 dias" — usado no tempo médio por etapa. */
export function duracaoEmDias(segundos: number | null | undefined): string {
  if (segundos === null || segundos === undefined || !Number.isFinite(segundos)) return '—';
  const dias = segundos / 86400;
  if (dias < 1) {
    const horas = Math.round(segundos / 3600);
    return `${horas}h`;
  }
  return `${PERCENTUAL.format(dias)} ${dias < 2 ? 'dia' : 'dias'}`;
}

/** Primeira letra de até duas palavras: "Mariana Duarte" vira "MD". */
export function iniciais(nome: string | null | undefined): string {
  if (!nome) return '?';
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0]!.slice(0, 2).toUpperCase();
  return (partes[0]![0]! + partes[partes.length - 1]![0]!).toUpperCase();
}

/** Primeiro nome, para saudação. */
export function primeiroNome(nome: string | null | undefined): string {
  if (!nome) return '';
  return nome.trim().split(/\s+/)[0] ?? '';
}
