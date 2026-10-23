export { ensureAnonymousSession, type SessionOutcome } from './anonymousSession';
export {
  clearInstallationCredentials,
  ensureInstallationCredentials,
  type InstallationCredentials,
  type SecretStore,
} from './installation';
export { clearSession, expireSession, loadSession, type ApiSession } from './session';
export { useAnonymousSession } from './useAnonymousSession';
export {
  clearAccount,
  displayName,
  initialOf,
  loadAccount,
  providerLabel,
  saveAccount,
  type AccountProfile,
} from './account';
export { onSignedOut } from './signOutEvents';
export type { AccountData, SocialCredential } from './social';
// O fluxo de conta (`accountFlow`, `useAccountFlow`, `providers`) fica fora deste índice: ele usa os
// módulos nativos do Google e da Apple e os avisos, e quem só precisa da sessão não deve carregá-los.
