import type { Db } from '../db';

const VERSION_KEY = 'last_version';

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
