import { SYNC_PUSH_MAX_CHANGES, syncChangeSchema, type SyncChange } from '@ta-em-dia/shared';
import type { Db } from '../db';

type OutboxRow = {
  id: number;
  table_name: string;
  row_id: string;
  op: string;
  payload: string;
  updated_at: string;
};

export interface OutboxBatch {
  /** Prontas para o push, na ordem em que foram gravadas. */
  changes: SyncChange[];
  /** `outbox.id` de cada item de `changes`, na mesma ordem. */
  ids: number[];
  /** `outbox.id` das linhas que não têm como ser enviadas (fora do formato); saem da fila. */
  invalid: number[];
}

/**
 * As próximas mudanças da fila, da mais antiga para a mais nova (pai antes do filho). Uma linha que
 * nem no formato do envio está (JSON quebrado, tabela desconhecida) iria travar a fila para
 * sempre: vai em `invalid`, para o motor descartar.
 */
export async function readOutboxBatch(
  db: Db,
  limit: number = SYNC_PUSH_MAX_CHANGES,
): Promise<OutboxBatch> {
  const rows = await db.getAllAsync<OutboxRow>(
    'SELECT id, table_name, row_id, op, payload, updated_at FROM outbox ORDER BY id LIMIT ?',
    limit,
  );
  const batch: OutboxBatch = { changes: [], ids: [], invalid: [] };
  for (const row of rows) {
    let payload: unknown;
    try {
      payload = JSON.parse(row.payload);
    } catch {
      batch.invalid.push(row.id);
      continue;
    }
    const change = syncChangeSchema.safeParse({
      table: row.table_name,
      id: row.row_id,
      op: row.op,
      updatedAt: row.updated_at,
      payload,
    });
    if (change.success) {
      batch.changes.push(change.data);
      batch.ids.push(row.id);
    } else {
      batch.invalid.push(row.id);
    }
  }
  return batch;
}

/** Tira da fila as mudanças que a API já respondeu (aceitas ou rejeitadas) e as inválidas. */
export async function removeFromOutbox(db: Db, ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  await db.runAsync(`DELETE FROM outbox WHERE id IN (${ids.map(() => '?').join(', ')})`, ...ids);
}
