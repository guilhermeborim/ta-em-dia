import type { PrismaClient } from '../generated/prisma/client.js';

/** Meses sem uso até a conta anônima ser apagada (docs/05-privacidade-lgpd.md). */
export const INACTIVE_ACCOUNT_MONTHS = 12;

/** Refresh token vencido há mais de tantos dias já não serve nem para detectar reuso. */
const EXPIRED_TOKEN_GRACE_DAYS = 1;

export interface PurgeResult {
  anonymousUsers: number;
  refreshTokens: number;
}

/** O banco que o job usa: só o que ele toca. */
type PurgeDb = Pick<PrismaClient, 'user' | 'refreshToken'>;

/** Data de corte: `months` meses antes de `now`. */
export function inactiveCutoff(now: Date, months: number = INACTIVE_ACCOUNT_MONTHS): Date {
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
  return cutoff;
}

/**
 * Apaga as contas anônimas sem uso por 12 meses (nenhum aparelho abriu a sessão nem sincronizou
 * desde o corte; os dados saem junto, em cascata) e os refresh tokens vencidos. Conta com login
 * (Google/Apple) nunca é tocada. Com `dryRun`, só conta. Devolve quantos itens foram (ou seriam)
 * apagados; nunca devolve nem registra dado de usuário.
 */
export async function purgeInactive(
  db: PurgeDb,
  now: Date = new Date(),
  opts: { dryRun?: boolean } = {},
): Promise<PurgeResult> {
  const cutoff = inactiveCutoff(now);
  const usersWhere = {
    isAnonymous: true,
    createdAt: { lt: cutoff },
    devices: { none: { OR: [{ lastSeenAt: { gte: cutoff } }, { lastSyncAt: { gte: cutoff } }] } },
  };
  const tokensWhere = {
    expiresAt: { lt: new Date(now.getTime() - EXPIRED_TOKEN_GRACE_DAYS * 24 * 60 * 60 * 1000) },
  };

  if (opts.dryRun) {
    return {
      anonymousUsers: await db.user.count({ where: usersWhere }),
      refreshTokens: await db.refreshToken.count({ where: tokensWhere }),
    };
  }
  // Usuários primeiro: os tokens deles saem em cascata e não entram na segunda conta.
  const users = await db.user.deleteMany({ where: usersWhere });
  const tokens = await db.refreshToken.deleteMany({ where: tokensWhere });
  return { anonymousUsers: users.count, refreshTokens: tokens.count };
}
