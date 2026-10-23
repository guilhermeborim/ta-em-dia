import type { SocialProvider } from '@ta-em-dia/shared';
import { getSetting, setSetting, type Db } from '../db';

const KEYS = {
  provider: 'account_provider',
  name: 'account_name',
  email: 'account_email',
} as const;

/** Quem entrou com Google ou Apple, como a tela Conta mostra. Fica só no aparelho (`app_settings`). */
export interface AccountProfile {
  provider: SocialProvider;
  name: string | null;
  email: string | null;
}

export async function saveAccount(db: Db, account: AccountProfile): Promise<void> {
  await db.withTransactionAsync(async () => {
    await setSetting(db, KEYS.provider, account.provider);
    await setSetting(db, KEYS.name, account.name ?? '');
    await setSetting(db, KEYS.email, account.email ?? '');
  });
}

/** O perfil guardado, ou `null` quando o aparelho não tem login (usuário anônimo). */
export async function loadAccount(db: Db): Promise<AccountProfile | null> {
  const provider = await getSetting(db, KEYS.provider);
  if (provider !== 'google' && provider !== 'apple') return null;
  return {
    provider,
    name: (await getSetting(db, KEYS.name)) || null,
    email: (await getSetting(db, KEYS.email)) || null,
  };
}

export async function clearAccount(db: Db): Promise<void> {
  await db.runAsync(
    'DELETE FROM app_settings WHERE key IN (?, ?, ?)',
    KEYS.provider,
    KEYS.name,
    KEYS.email,
  );
}

/**
 * Nome para mostrar: o do provedor; sem ele, a parte do e-mail antes do "@" (a Apple pode esconder
 * o nome e o e-mail); sem nada, "Sua conta".
 */
export function displayName(account: Pick<AccountProfile, 'name' | 'email'>): string {
  const name = account.name?.trim();
  if (name) return name;
  const local = account.email?.split('@')[0]?.trim();
  return local || 'Sua conta';
}

/** Primeira letra do nome, em maiúscula, para o avatar. */
export function initialOf(name: string): string {
  return (Array.from(name.trim())[0] ?? '?').toLocaleUpperCase('pt-BR');
}

export const providerLabel = (provider: SocialProvider): string =>
  provider === 'google' ? 'Google' : 'Apple';
