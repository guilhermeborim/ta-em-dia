import { syncDeletePayloadSchema, type SyncPulledChange, type SyncTable } from '@ta-em-dia/shared';
import type { Db } from '../db';
import { toColumns } from './rowMapping';
import { setSyncSince } from './syncState';

/** Grava uma linha vinda do servidor. `true` se mudou alguma coisa. */
async function applyOne(db: Db, change: SyncPulledChange): Promise<boolean> {
  // `table` já passou pelo enum do schema: só um nome de `SYNC_TABLES` chega aqui.
  const table: SyncTable = change.table;
  // O app ainda tem uma mudança desta linha para enviar: ela vale mais que a cópia do servidor (o
  // servidor decide quem ganha quando a mudança chegar).
  const pending = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM outbox WHERE table_name = ? AND row_id = ? LIMIT 1',
    table,
    change.id,
  );
  if (pending) return false;

  const version = Number(change.version);
  const existing = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM ${table} WHERE id = ?`,
    change.id,
  );

  if (change.op === 'delete') {
    const parsed = syncDeletePayloadSchema.safeParse(change.payload);
    if (!parsed.success || !existing) return false;
    await db.runAsync(
      `UPDATE ${table} SET deleted_at = ?, updated_at = ?, version = ? WHERE id = ?`,
      parsed.data.deletedAt.toISOString(),
      change.updatedAt,
      version,
      change.id,
    );
    return true;
  }

  const columns = toColumns(table, change.payload);
  if (!columns) return false;
  const names = Object.keys(columns);
  const values = Object.values(columns);

  if (existing) {
    await db.runAsync(
      `UPDATE ${table}
          SET ${names.map((name) => `${name} = ?`).join(', ')},
              updated_at = ?, deleted_at = NULL, version = ?
        WHERE id = ?`,
      ...values,
      change.updatedAt,
      version,
      change.id,
    );
  } else {
    await db.runAsync(
      `INSERT INTO ${table} (id, ${names.join(', ')}, created_at, updated_at, version)
       VALUES (?, ${names.map(() => '?').join(', ')}, ?, ?, ?)`,
      change.id,
      ...values,
      change.updatedAt,
      change.updatedAt,
      version,
    );
  }
  return true;
}

/**
 * Aplica uma página do pull numa transação só e guarda `nextSince`. Linha com mudança local ainda na
 * `outbox`, ou fora do schema, é pulada (o pull avança do mesmo jeito). As chaves estrangeiras só
 * são conferidas no fim: uma filha pode vir antes do veículo na ordem de versões. Devolve quantas
 * linhas mudaram.
 */
export async function applyPulledChanges(
  db: Db,
  changes: SyncPulledChange[],
  nextSince: string,
): Promise<number> {
  let applied = 0;
  await db.withTransactionAsync(async () => {
    await db.execAsync('PRAGMA defer_foreign_keys = ON');
    for (const change of changes) {
      if (await applyOne(db, change)) applied += 1;
    }
    await setSyncSince(db, nextSince);
  });
  return applied;
}
