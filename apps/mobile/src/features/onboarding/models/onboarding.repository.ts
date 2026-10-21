import type { Db } from '../../../core/db';

const KEY = 'onboarding_done';

/** Boas-vindas só aparecem na primeira abertura: o aviso fica salvo no SQLite do aparelho. */
export async function isOnboardingDone(db: Db): Promise<boolean> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    KEY,
  );
  return row?.value === '1';
}

export async function markOnboardingDone(db: Db): Promise<void> {
  await db.runAsync('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', KEY, '1');
}
