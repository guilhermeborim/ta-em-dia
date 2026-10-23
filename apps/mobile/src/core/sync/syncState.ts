import type { Db } from '../db';

const VERSION_KEY = 'last_version';
const SYNCED_AT_KEY = 'last_synced_at';

/** Última `version` do servidor já aplicada neste aparelho ("0" antes do primeiro pull). */
export async function getSyncSince(db: Db): Promise<string> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM sync_state WHERE key = ?',
    VERSION_KEY,
  );
  return row?.value ?? '0';
}

export async function setSyncSince(db: Db, version: string): Promise<void> {
  await db.runAsync(
    'INSERT INTO sync_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    VERSION_KEY,
    version,
  );
}

/** Quando o último sync terminou sem falha (ISO), ou `null` se nunca terminou. */
export async function getLastSyncedAt(db: Db): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM sync_state WHERE key = ?',
    SYNCED_AT_KEY,
  );
  return row?.value ?? null;
}

export async function setLastSyncedAt(db: Db, at: Date): Promise<void> {
  await db.runAsync(
    'INSERT INTO sync_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    SYNCED_AT_KEY,
    at.toISOString(),
  );
}
