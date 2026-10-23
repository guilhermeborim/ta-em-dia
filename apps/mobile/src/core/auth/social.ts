import {
  accountExistsSchema,
  authTokensSchema,
  linkResultSchema,
  type LinkConflictStrategy,
  type LinkOutcome,
  type LinkRequest,
  type SocialAuthRequest,
  type SocialProvider,
} from '@ta-em-dia/shared';
import { postJson } from '../api';
import { ensureAnonymousSession, type SessionDeps } from './anonymousSession';
import { ensureInstallationCredentials } from './installation';
import { expireSession, loadSession, saveSession, toSession } from './session';

/** O que o Google ou a Apple entregaram no app: o `id_token` e, quando vêm, nome e e-mail. */
export interface SocialCredential {
  provider: SocialProvider;
  idToken: string;
  name: string | null;
  email: string | null;
}

/** O que a API tem na conta que já existe (tela 24). */
export interface AccountData {
  vehicles: number;
  records: number;
}

export type LoginResult =
  | { kind: 'ok' }
  /** Sem internet, timeout, erro do servidor ou limite de chamadas: tentar de novo. */
  | { kind: 'retry' }
  /** A API recusou (token inválido, login indisponível neste ambiente). */
  | { kind: 'rejected'; code?: string };

export type LinkResult =
  | { kind: 'ok'; outcome: LinkOutcome }
  /** A conta já existe: o usuário escolhe juntar ou usar só a da conta (tela 24). */
  | { kind: 'conflict'; account: AccountData }
  | { kind: 'retry' }
  | { kind: 'rejected'; code?: string };

const payloadOf = (
  credential: SocialCredential,
  deps: SessionDeps,
  installationId: string,
): SocialAuthRequest => ({
  idToken: credential.idToken,
  installationId,
  platform: deps.platform,
  ...(credential.name ? { name: credential.name } : {}),
});

/**
 * "Entrar com Google/Apple" (tela 3): troca o `id_token` por tokens da API e guarda a sessão. O
 * aparelho passa a ser da conta. Nunca lança erro; nada do token vai para log.
 */
export async function loginWithSocial(
  deps: SessionDeps,
  credential: SocialCredential,
): Promise<LoginResult> {
  const now = deps.now ?? (() => new Date());
  try {
    const { installationId } = await (deps.credentials ?? ensureInstallationCredentials)(
      deps.store,
    );
    const result = await postJson(
      deps.apiUrl,
      `/v1/auth/${credential.provider}`,
      payloadOf(credential, deps, installationId),
      deps.fetchFn,
    );
    if (result.kind === 'unreachable') return { kind: 'retry' };
    if (result.kind === 'rejected') return { kind: 'rejected', code: result.code };

    const tokens = authTokensSchema.safeParse(result.body);
    if (!tokens.success) return { kind: 'retry' };
    await saveSession(deps.store, toSession(tokens.data, now()));
    return { kind: 'ok' };
  } catch {
    return { kind: 'retry' };
  }
}

/**
 * "Salvar meus dados" (tela 19): liga o login ao usuário anônimo deste aparelho. Se a conta já
 * existe, devolve `conflict` sem mudar nada; o app pergunta e chama de novo com `onConflict`.
 * Guarda os tokens novos (o usuário e a sessão passam a ser os da conta).
 */
export async function linkWithSocial(
  deps: SessionDeps,
  credential: SocialCredential,
  onConflict?: LinkConflictStrategy,
): Promise<LinkResult> {
  const now = deps.now ?? (() => new Date());
  try {
    // O `link` exige o token do usuário anônimo: garante que há sessão válida.
    const ensured = await ensureAnonymousSession(deps);
    if (ensured !== 'ready') return ensured === 'retry' ? { kind: 'retry' } : { kind: 'rejected' };
    const session = await loadSession(deps.store);
    if (!session) return { kind: 'retry' };

    const { installationId } = await (deps.credentials ?? ensureInstallationCredentials)(
      deps.store,
    );
    const body: LinkRequest = {
      ...payloadOf(credential, deps, installationId),
      provider: credential.provider,
      ...(onConflict ? { onConflict } : {}),
    };
    const result = await postJson(
      deps.apiUrl,
      '/v1/auth/link',
      body,
      deps.fetchFn,
      session.tokens.accessToken,
    );
    if (result.kind === 'unreachable') return { kind: 'retry' };
    if (result.kind === 'rejected') {
      if (result.status === 401 && result.code === 'UNAUTHORIZED') {
        // O acesso vale na data local mas a API o recusou: marca vencido para renovar na próxima.
        await expireSession(deps.store);
        return { kind: 'retry' };
      }
      const exists = accountExistsSchema.safeParse(result.body);
      if (result.status === 409 && exists.success) {
        return { kind: 'conflict', account: exists.data.account };
      }
      return { kind: 'rejected', code: result.code };
    }

    const linked = linkResultSchema.safeParse(result.body);
    if (!linked.success) return { kind: 'retry' };
    const { outcome, ...tokens } = linked.data;
    await saveSession(deps.store, toSession(tokens, now()));
    return { kind: 'ok', outcome };
  } catch {
    return { kind: 'retry' };
  }
}
