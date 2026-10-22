import {
  authTokensSchema,
  type AnonymousAuthRequest,
  type RefreshRequest,
} from '@ta-em-dia/shared';
import { postJson } from '../api';
import { ensureInstallationCredentials, type SecretStore } from './installation';
import { isSessionValid, loadSession, saveSession, toSession, type ApiSession } from './session';

export type SessionOutcome =
  /** Há sessão válida (já existia ou acabou de ser criada). */
  | 'ready'
  /** Sem rede, timeout, erro do servidor ou limite de chamadas (429): tentar de novo depois. */
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
 * Renova o acesso com o refresh token (`POST /v1/auth/refresh`, que troca o token por um novo).
 * `'login'` = a API recusou (token vencido, já usado ou rota inexistente numa API antiga): quem
 * chama entra de novo pelo segredo do aparelho.
 */
async function renewSession(
  deps: SessionDeps,
  session: ApiSession,
  now: Date,
): Promise<'ready' | 'retry' | 'login'> {
  const result = await postJson(
    deps.apiUrl,
    '/v1/auth/refresh',
    { refreshToken: session.tokens.refreshToken } satisfies RefreshRequest,
    deps.fetchFn,
  );
  if (result.kind === 'unreachable') return 'retry';
  if (result.kind === 'rejected') return 'login';

  const tokens = authTokensSchema.safeParse(result.body);
  if (!tokens.success) return 'retry';
  await saveSession(deps.store, toSession(tokens.data, now));
  return 'ready';
}

/**
 * Garante que este aparelho tem usuário anônimo na API e tokens válidos ("Continuar sem login",
 * docs/03-arquitetura.md). Se já há sessão válida, não chama a API. Com o acesso vencido, troca o
 * refresh token por um par novo; se a API o recusar, entra de novo pelo segredo do aparelho
 * (`/v1/auth/anonymous`, idempotente: o mesmo aparelho recebe sempre o mesmo usuário). Nunca lança
 * erro; o app funciona sem a API.
 */
export async function ensureAnonymousSession(deps: SessionDeps): Promise<SessionOutcome> {
  const now = deps.now ?? (() => new Date());
  try {
    const session = await loadSession(deps.store);
    if (isSessionValid(session, now())) return 'ready';
    if (session) {
      const renewed = await renewSession(deps, session, now());
      if (renewed !== 'login') return renewed;
    }

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
