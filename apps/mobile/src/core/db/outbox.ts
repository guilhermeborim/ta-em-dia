import type { Db } from './types';

export type OutboxTable =
  | 'vehicles'
  | 'fuel_entries'
  | 'maintenance_plans'
  | 'maintenance_records'
  | 'odometer_readings'
  | 'documents';

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
}
