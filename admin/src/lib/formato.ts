/** Formatação para o console. Menos variedade que a do sistema do corretor. */

export function numero(valor: number | null | undefined): string {
  return (valor ?? 0).toLocaleString('pt-BR');
}

export function moeda(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined) return '—';
  const n = typeof valor === 'string' ? Number(valor) : valor;
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function dataHora(valor: string | Date | null | undefined): string {
  if (!valor) return '—';
  const d = typeof valor === 'string' ? new Date(valor) : valor;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function tempoRelativo(valor: string | Date | null | undefined): string {
  if (!valor) return '—';
  const d = typeof valor === 'string' ? new Date(valor) : valor;
  if (Number.isNaN(d.getTime())) return '—';

  const segundos = Math.round((Date.now() - d.getTime()) / 1000);
  if (segundos < 60) return 'agora';
  if (segundos < 3600) return `há ${Math.floor(segundos / 60)} min`;
  if (segundos < 86400) return `há ${Math.floor(segundos / 3600)} h`;
  if (segundos < 2592000) return `há ${Math.floor(segundos / 86400)} d`;
  return d.toLocaleDateString('pt-BR');
}
