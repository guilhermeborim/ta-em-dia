import { authTokensSchema, type AuthTokens } from '@ta-em-dia/shared';
import * as SecureStore from 'expo-secure-store';
import type { SecretStore } from './installation';

const SESSION_KEY = 'api_session';

/** Quanto antes de expirar o token já não conta como válido (folga para a chamada demorar). */
const EXPIRY_MARGIN_MS = 2 * 60 * 1000;

/** Tokens da API e quando o access token expira (ms). Fica só no SecureStore. */
export interface ApiSession {
  tokens: AuthTokens;
  expiresAt: number;
}

export function toSession(tokens: AuthTokens, now: Date): ApiSession {
  return { tokens, expiresAt: now.getTime() + tokens.expiresIn * 1000 };
}

export async function saveSession(store: SecretStore, session: ApiSession): Promise<void> {
  await store.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

/** A sessão guardada, ou `null` se não há ou está corrompida. */
export async function loadSession(store: SecretStore): Promise<ApiSession | null> {
  const raw = await store.getItemAsync(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { tokens?: unknown; expiresAt?: unknown };
    const tokens = authTokensSchema.safeParse(parsed.tokens);
    if (!tokens.success || typeof parsed.expiresAt !== 'number') return null;
    return { tokens: tokens.data, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}

export async function clearSession(store: SecretStore = SecureStore): Promise<void> {
  await store.deleteItemAsync(SESSION_KEY);
}

/** O access token ainda serve (não expira nos próximos minutos). */
export const isSessionValid = (session: ApiSession | null, now: Date): boolean =>
  session !== null && session.expiresAt - EXPIRY_MARGIN_MS > now.getTime();
