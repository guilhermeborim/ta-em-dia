import type { LinkConflictStrategy, LinkOutcome, SocialProvider } from '@ta-em-dia/shared';
import { setSetting, type Db } from '../db';
import { refreshReminders } from '../reminders';
import {
  countPending,
  uploadPending,
  wipeLocalData,
  type TransferProgress,
} from '../sync/accountData';
import { syncNow } from '../sync/syncEngine';
import { saveAccount, clearAccount, loadAccount } from './account';
import type { SessionDeps } from './anonymousSession';
import { clearInstallationCredentials } from './installation';
import type { SignInResult } from './providers';
import { clearSession, loadSession } from './session';
import { emitSignedOut } from './signOutEvents';
import { linkWithSocial, loginWithSocial, type AccountData, type SocialCredential } from './social';

/** O que o fluxo precisa de fora: banco, API, SecureStore e a janela nativa do Google/Apple. */
export interface AccountFlowDeps extends SessionDeps {
  db: Db;
  signIn: (provider: SocialProvider) => Promise<SignInResult>;
  signOutProvider?: (provider: SocialProvider) => Promise<void>;
  /** Chamado quando o pull mudou o SQLite local (reagendar os avisos). */
  onApplied?: () => void;
}

/** Por que o fluxo não seguiu. `cancelled` não é erro: a pessoa só fechou a janela do provedor. */
export type FlowFailure = 'cancelled' | 'unavailable' | 'error' | 'retry' | 'rejected';

const LOGIN_MODE_KEY = 'login_mode';

const failureOfSignIn = (result: Exclude<SignInResult, { kind: 'ok' }>): FlowFailure => result.kind;

async function remember(db: Db, credential: SocialCredential): Promise<void> {
  await saveAccount(db, {
    provider: credential.provider,
    name: credential.name,
    email: credential.email,
  });
  await setSetting(db, LOGIN_MODE_KEY, credential.provider);
}

async function accessToken(deps: AccountFlowDeps): Promise<string | null> {
  return (await loadSession(deps.store))?.tokens.accessToken ?? null;
}

/** Traz da API tudo o que a conta tem. `true` se terminou. */
async function pullAll(deps: AccountFlowDeps): Promise<boolean> {
  const token = await accessToken(deps);
  if (!token) return false;
  const result = await syncNow({
    db: deps.db,
    apiUrl: deps.apiUrl,
    accessToken: token,
    fetchFn: deps.fetchFn,
  });
  if (result.applied > 0) deps.onApplied?.();
  return result.outcome === 'done';
}

export type LoginFlowResult = { status: 'done'; hasVehicles: boolean } | { status: FlowFailure };

/**
 * "Entrar com Google/Apple" na tela de Login (primeira abertura): abre a janela do provedor, entra
 * na conta e traz os dados dela. `hasVehicles` diz se a conta já tem veículo (pula o "Primeiro
 * veículo"). Se o pull falhar, o login fica guardado mas o resultado é `retry`: tocar de novo é seguro.
 */
export async function loginFlow(
  deps: AccountFlowDeps,
  provider: SocialProvider,
  /** `onDownload` avisa que o login deu certo e os dados da conta estão vindo ("Baixando seus dados"). */
  hooks: { onDownload?: () => void } = {},
): Promise<LoginFlowResult> {
  const signed = await deps.signIn(provider);
  if (signed.kind !== 'ok') return { status: failureOfSignIn(signed) };

  const login = await loginWithSocial(deps, signed.credential);
  if (login.kind !== 'ok') return { status: login.kind };
  await remember(deps.db, signed.credential);
  hooks.onDownload?.();
  if (!(await pullAll(deps))) return { status: 'retry' };

  const row = await deps.db.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) AS total FROM vehicles WHERE deleted_at IS NULL',
  );
  return { status: 'done', hasVehicles: (row?.total ?? 0) > 0 };
}

export type LinkStart =
  | { status: 'done'; outcome: LinkOutcome }
  | { status: 'conflict'; account: AccountData; credential: SocialCredential }
  | { status: FlowFailure };

/**
 * "Salvar meus dados" (tela 19), primeira parte: abre a janela do provedor e liga o login a este
 * aparelho. Se a conta já existe, devolve `conflict` com o que ela tem e a credencial, para a tela
 * 24 perguntar e `resolveConflict` repetir com a escolha.
 */
export async function startLink(
  deps: AccountFlowDeps,
  provider: SocialProvider,
): Promise<LinkStart> {
  const signed = await deps.signIn(provider);
  if (signed.kind !== 'ok') return { status: failureOfSignIn(signed) };

  const linked = await linkWithSocial(deps, signed.credential);
  if (linked.kind === 'conflict') {
    return { status: 'conflict', account: linked.account, credential: signed.credential };
  }
  if (linked.kind !== 'ok') return { status: linked.kind };
  await remember(deps.db, signed.credential);
  return { status: 'done', outcome: linked.outcome };
}

/** Segunda parte, depois da tela 24: repete o vínculo com a escolha ("Juntar dados" ou "Usar só os da conta"). */
export async function resolveConflict(
  deps: AccountFlowDeps,
  credential: SocialCredential,
  strategy: LinkConflictStrategy,
): Promise<LinkStart> {
  const linked = await linkWithSocial(deps, credential, strategy);
  if (linked.kind === 'conflict') return { status: 'error' };
  if (linked.kind !== 'ok') return { status: linked.kind };
  await remember(deps.db, credential);
  return { status: 'done', outcome: linked.outcome };
}

/**
 * Terceira parte (tela 23): leva os dados para a conta. Em `linked` e `merged` envia a fila, com
 * o progresso. Em `switched` (usou só os da conta), apaga os dados do aparelho e traz os da conta.
 * `synced: false` = não deu para terminar agora; o app tenta de novo quando houver internet.
 */
export async function finishLink(
  deps: AccountFlowDeps,
  outcome: LinkOutcome,
  onProgress?: (progress: TransferProgress) => void,
): Promise<{ synced: boolean }> {
  if (outcome === 'switched') {
    await wipeLocalData(deps.db);
    const synced = await pullAll(deps);
    await refreshReminders(deps.db);
    return { synced };
  }
  const token = await accessToken(deps);
  if (!token) return { synced: false };
  const result = await uploadPending(
    { db: deps.db, apiUrl: deps.apiUrl, accessToken: token, fetchFn: deps.fetchFn },
    onProgress,
  );
  if (result.applied > 0) deps.onApplied?.();
  return { synced: result.outcome === 'done' };
}

/** Quantas mudanças ainda não foram enviadas: "Sair da conta" avisa antes de apagar. */
export const pendingChanges = (db: Db): Promise<number> => countPending(db);

/**
 * "Sair da conta": apaga os dados do aparelho (a cópia vale na conta), o perfil, a sessão e as
 * credenciais do aparelho (o próximo "Continuar sem login" ganha um aparelho novo, já que o antigo
 * é da conta) e cancela os avisos. No fim avisa (`onSignedOut`) para o app voltar ao Login.
 */
export async function signOut(deps: AccountFlowDeps): Promise<void> {
  const account = await loadAccount(deps.db);
  await wipeLocalData(deps.db);
  await clearAccount(deps.db);
  await deps.db.runAsync('DELETE FROM app_settings WHERE key = ?', LOGIN_MODE_KEY);
  await clearSession(deps.store);
  await clearInstallationCredentials(deps.store);
  await refreshReminders(deps.db);
  if (account) await deps.signOutProvider?.(account.provider);
  emitSignedOut();
}
