import type { Db } from '../../../core/db';

const DONE_KEY = 'login_done';
const MODE_KEY = 'login_mode';

export type LoginMode = 'anonymous';

/** O Login só aparece uma vez: o aviso fica salvo no SQLite do aparelho. */
export async function isLoginDone(db: Db): Promise<boolean> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    DONE_KEY,
  );
  return row?.value === '1';
}

export async function markLoginDone(db: Db, mode: LoginMode): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
      MODE_KEY,
      mode,
    );
    await db.runAsync(
      'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
      DONE_KEY,
      '1',
    );
  });
}
