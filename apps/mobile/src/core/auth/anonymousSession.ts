import { authTokensSchema, type AnonymousAuthRequest } from '@ta-em-dia/shared';
import { postJson } from '../api';
import { ensureInstallationCredentials, type SecretStore } from './installation';
import { isSessionValid, loadSession, saveSession, toSession } from './session';

export type SessionOutcome =
  /** Há sessão válida (já existia ou acabou de ser criada). */
  | 'ready'
  /** Sem rede, timeout ou erro do servidor: tentar de novo depois. */
  | 'retry'
  /** A API recusou este aparelho (4xx): tentar de novo igual não adianta. */
  | 'rejected';

export interface SessionDeps {
  apiUrl: string;
  platform: AnonymousAuthRequest['platform'];
  store: SecretStore;
  fetchFn?: typeof fetch;
  now?: () => Date;
  credentials?: typeof ensureInstallationCredentials;
}

/**
 * Garante que este aparelho tem usuário anônimo na API e tokens válidos ("Continuar sem login",
 * docs/03-arquitetura.md). Se já há sessão válida, não chama a API. A chamada é idempotente: o
 * mesmo aparelho recebe sempre o mesmo usuário. Nunca lança erro; o app funciona sem a API.
 */
export async function ensureAnonymousSession(deps: SessionDeps): Promise<SessionOutcome> {
  const now = deps.now ?? (() => new Date());
  try {
    if (isSessionValid(await loadSession(deps.store), now())) return 'ready';

    const { installationId, secret } = await (deps.credentials ?? ensureInstallationCredentials)(
      deps.store,
    );
    const result = await postJson(
      deps.apiUrl,
      '/v1/auth/anonymous',
      { installationId, secret, platform: deps.platform } satisfies AnonymousAuthRequest,
      deps.fetchFn,
    );
    if (result.kind === 'unreachable') return 'retry';
    if (result.kind === 'rejected') return 'rejected';

    const tokens = authTokensSchema.safeParse(result.body);
    // Resposta fora do contrato (ex.: API de outra versão): tratar como falha passageira.
    if (!tokens.success) return 'retry';
    await saveSession(deps.store, toSession(tokens.data, now()));
    return 'ready';
  } catch {
    return 'retry';
  }
}
