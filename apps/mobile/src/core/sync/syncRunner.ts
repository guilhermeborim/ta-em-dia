import type { AnonymousAuthRequest } from '@ta-em-dia/shared';
import { ensureAnonymousSession, expireSession, loadSession, type SecretStore } from '../auth';
import type { Db } from '../db';
import { canSync } from './policy';
import type { SyncRunOutcome } from './scheduler';
import { syncNow } from './syncEngine';

export interface SyncRunnerDeps {
  db: Db;
  apiUrl: string;
  platform: AnonymousAuthRequest['platform'];
  store: SecretStore;
  flags: { cloud: boolean; anonymous: boolean };
  fetchFn?: typeof fetch;
  /** Chamado quando o pull mudou o SQLite local (ex.: reagendar os avisos). */
  onApplied?: () => void;
}

/**
 * Uma rodada completa: confere as flags, garante a sessão (sem chamar a API se o acesso ainda
 * vale), e sincroniza. Com 401, marca o acesso como vencido para a próxima rodada renovar.
 */
export async function runSync(deps: SyncRunnerDeps): Promise<SyncRunOutcome> {
  if (!deps.flags.cloud) return 'skipped';

  // Sessão já guardada e sem permissão para sincronizar: nem chama a API.
  const stored = await loadSession(deps.store);
  if (stored && !canSync(stored.tokens.user, deps.flags)) return 'skipped';

  const ensured = await ensureAnonymousSession({
    apiUrl: deps.apiUrl,
    platform: deps.platform,
    store: deps.store,
    fetchFn: deps.fetchFn,
  });
  if (ensured !== 'ready') return ensured === 'retry' ? 'retry' : 'rejected';

  const session = await loadSession(deps.store);
  if (!session) return 'retry';
  if (!canSync(session.tokens.user, deps.flags)) return 'skipped';

  const result = await syncNow({
    db: deps.db,
    apiUrl: deps.apiUrl,
    accessToken: session.tokens.accessToken,
    fetchFn: deps.fetchFn,
  });
  if (result.applied > 0) deps.onApplied?.();
  if (result.outcome === 'unauthorized') {
    await expireSession(deps.store);
    return 'retry';
  }
  return result.outcome;
}
