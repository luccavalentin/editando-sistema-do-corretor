import { OSStatus } from "../types/os.types";

export const STATUS_FLOW: OSStatus[] = [
  'aberta',
  'aguardando_mecanico',
  'checklist_diagnostico',
  'aguardando_peca',
  'em_execucao',
  'checklist_final',
  'aguardando_retirada',
  'enviado_financeiro',
  'concluida'
];

export const STATUS_LABELS: Record<OSStatus, string> = {
  aberta: 'Aberta',
  aguardando_mecanico: 'Aguard. Mecânico',
  checklist_diagnostico: 'Checklist Diag.',
  aguardando_peca: 'Aguard. Peça',
  em_execucao: 'Em Execução',
  checklist_final: 'Checklist Final',
  aguardando_retirada: 'Aguard. Retirada',
  enviado_financeiro: 'Financeiro',
  concluida: 'Concluída',
  cancelada: 'Cancelada'
};
