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

export type OSStatus = z.infer<typeof OSStatusSchema>;

export interface Cliente {
  id: string;
  nome: string;
  documento?: string;
  telefone?: string;
  email?: string;
  endereco_rua?: string;
  endereco_bairro?: string;
  endereco_cidade?: string;
  endereco_uf?: string;
  endereco_cep?: string;
}

export interface Veiculo {
  id: string;
  placa_cavalo: string;
  modelo_cavalo: string;
  placa_carreta?: string;
  modelo_carreta?: string;
  km_atual?: number;
}

export interface OrdemServico {
  id: string;
  protocolo: string;
  cliente_id: string;
  veiculo_id: string;
  status: OSStatus;
  box?: string;
  motorista_cliente?: string;
  km_entrada?: number;
  valor_pecas?: number;
  valor_servico?: number;
  criado_em: string;
  cliente?: Partial<Cliente>;
  veiculo?: Partial<Veiculo>;
  tecnico?: { nome: string };
}
