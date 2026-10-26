import type { Db } from './types';

export type OutboxTable =
  | 'vehicles'
  | 'fuel_entries'
  | 'maintenance_plans'
  | 'maintenance_records'
  | 'odometer_readings'
  | 'documents'
  | 'stations';

type OutboxListener = () => void;
const listeners = new Set<OutboxListener>();

/** Avisa quando entra uma mudança na `outbox` (o sync agenda o envio). Devolve como cancelar. */
export function onOutboxChange(listener: OutboxListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Registra uma mudança local para o sync enviar depois. Chame dentro da mesma transação da gravação. */
export async function enqueue(
  db: Db,
  table: OutboxTable,
  rowId: string,
  op: 'upsert' | 'delete',
  payload: unknown,
  updatedAt: string,
): Promise<void> {
  await db.runAsync(
    'INSERT INTO outbox (table_name, row_id, op, payload, updated_at) VALUES (?, ?, ?, ?, ?)',
    table,
    rowId,
    op,
    JSON.stringify(payload),
    updatedAt,
  );
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // Um ouvinte com defeito não pode quebrar a gravação.
    }
  }
}
