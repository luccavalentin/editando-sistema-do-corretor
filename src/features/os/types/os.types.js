import { z } from "zod";
export const OSStatusSchema = z.enum([
    'aberta',
    'aguardando_mecanico',
    'checklist_diagnostico',
    'aguardando_peca',
    'em_execucao',
    'checklist_final',
    'aguardando_retirada',
    'enviado_financeiro',
    'concluida',
    'cancelada'
]);
