import Dexie, { type Table } from 'dexie';

export interface PendingChecklistResponse {
  id?: number;
  os_id: string | null;
  setor?: string;
  data?: string;
  tipo: string;
  item_id: string;
  status?: 'ok' | 'nao_ok' | 'nao_aplica';
  ok_abertura?: boolean;
  ok_fechamento?: boolean;
  observacao?: string;
  evidencias?: string[];
  timestamp: number;
  sincronizado: number; // 0 = pendente, 1 = sincronizado
}

export class ChecklistDatabase extends Dexie {
  responses!: Table<PendingChecklistResponse>;

  constructor() {
    super('TecnoarChecklistDB');
    this.version(2).stores({
      responses: '++id, [os_id+tipo+item_id], [setor+data+tipo+item_id], sincronizado, os_id, setor, data'
    });
  }
}

export const db = new ChecklistDatabase();

export async function saveOfflineResponse(response: Omit<PendingChecklistResponse, 'id' | 'timestamp' | 'sincronizado'>) {
  return await db.responses.put({
    ...response,
    timestamp: Date.now(),
    sincronizado: 0
  });
}

export async function getPendingResponses(osId: string | null, setor?: string, data?: string) {
  if (osId) {
    return await db.responses.where({ os_id: osId, sincronizado: 0 }).toArray();
  }
  return await db.responses.where({ setor, data, sincronizado: 0 }).toArray();
}

export async function markAsSynced(ids: number[]) {
  return await db.responses.where('id').anyOf(ids).modify({ sincronizado: 1 });
}