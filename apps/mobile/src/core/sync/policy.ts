/** Quem pode sincronizar: depende das flags (`sync.cloud`, `sync.anonymous`) e de a conta ter login. */
export function canSync(
  user: { isAnonymous: boolean },
  flags: { cloud: boolean; anonymous: boolean },
): boolean {
  if (!flags.cloud) return false;
  return user.isAnonymous ? flags.anonymous : true;
}
