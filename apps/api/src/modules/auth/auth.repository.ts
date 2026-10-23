import { Injectable } from '@nestjs/common';
import { SYNC_TABLES, type SocialProvider, type SyncTable } from '@ta-em-dia/shared';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service';
import { SYNC_SPECS } from '../sync/sync.tables';

export interface AuthUser {
  id: string;
  isAnonymous: boolean;
  plan: 'free' | 'premium';
}

export interface AnonymousIdentity {
  secretHash: string | null;
  user: AuthUser;
}

export interface SessionInput {
  installationId: string;
  platform: string;
  refreshTokenHash: string;
  refreshExpiresAt: Date;
  /** Quando a sessão abriu: vira o `lastSeenAt` do aparelho. */
  now: Date;
}

/** Um refresh token guardado (só o hash fica no banco) com o usuário dono do aparelho. */
export interface StoredRefreshToken {
  id: string;
  deviceId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  user: AuthUser;
}

export interface RotateInput {
  tokenId: string;
  deviceId: string;
  tokenHash: string;
  expiresAt: Date;
  now: Date;
}

/** Quem entra com o login social: o `sub` do provedor e o que ele disse sobre a pessoa. */
export interface SocialProfile {
  provider: SocialProvider;
  subject: string;
  email: string | null;
  name: string | null;
}

export interface DeviceOwner {
  id: string;
  userId: string;
}

export interface SwitchAccountInput {
  /** O usuário anônimo deste aparelho (some no fim). */
  fromUserId: string;
  /** A conta que já existia. */
  toUserId: string;
  /** `true` leva os dados do anônimo para a conta; `false` descarta. */
  merge: boolean;
  session: SessionInput;
}

const USER_SELECT = { id: true, isAnonymous: true, plan: true } as const;

type Tx = Prisma.TransactionClient;

/**
 * Abre uma sessão no aparelho para o usuário: atualiza plataforma e `lastSeenAt`, passa o aparelho
 * para o usuário (login em outra conta), revoga os refresh tokens anteriores (o aparelho tem uma
 * sessão só) e guarda o novo.
 */
async function openSessionIn(tx: Tx, userId: string, input: SessionInput): Promise<void> {
  const device = await tx.device.upsert({
    where: { installationId: input.installationId },
    create: {
      userId,
      installationId: input.installationId,
      platform: input.platform,
      lastSeenAt: input.now,
    },
    update: { userId, platform: input.platform, lastSeenAt: input.now },
    select: { id: true },
  });
  await tx.refreshToken.updateMany({
    where: { deviceId: device.id, revokedAt: null },
    data: { revokedAt: input.now },
  });
  await tx.refreshToken.create({
    data: {
      deviceId: device.id,
      tokenHash: input.refreshTokenHash,
      expiresAt: input.refreshExpiresAt,
    },
  });
}

/** Os ids das linhas do usuário numa tabela sincronizável (direto ou pelo veículo), do menor `version` ao maior. */
async function listOwnedIds(tx: Tx, table: SyncTable, userId: string): Promise<string[]> {
  const delegate = tx[SYNC_SPECS[table].model] as unknown as {
    findMany(args: unknown): Promise<{ id: string }[]>;
  };
  const rows = await delegate.findMany({
    where: SYNC_SPECS[table].ownedDirectly ? { userId } : { vehicle: { userId } },
    select: { id: true },
    orderBy: { version: 'asc' },
  });
  return rows.map((row) => row.id);
}

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** A identidade anônima deste aparelho (o `providerSubject` é o `installationId`). */
  findAnonymousIdentity(installationId: string): Promise<AnonymousIdentity | null> {
    return this.prisma.authIdentity.findUnique({
      where: {
        provider_providerSubject: { provider: 'anonymous', providerSubject: installationId },
      },
      select: { secretHash: true, user: { select: USER_SELECT } },
    });
  }

  /**
   * Cria usuário, identidade, aparelho e refresh token juntos. Devolve `null` se outra chamada
   * criou a mesma identidade ou o mesmo aparelho antes (o chamador busca de novo).
   */
  async createAnonymousUser(
    input: SessionInput & { userId: string; secretHash: string },
  ): Promise<AuthUser | null> {
    try {
      return await this.prisma.user.create({
        data: {
          id: input.userId,
          isAnonymous: true,
          identities: {
            create: {
              provider: 'anonymous',
              providerSubject: input.installationId,
              secretHash: input.secretHash,
            },
          },
          devices: {
            create: {
              installationId: input.installationId,
              platform: input.platform,
              refreshTokens: {
                create: { tokenHash: input.refreshTokenHash, expiresAt: input.refreshExpiresAt },
              },
            },
          },
        },
        select: USER_SELECT,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Abre uma sessão num aparelho já conhecido: atualiza plataforma e `lastSeenAt`, revoga os
   * refresh tokens anteriores do aparelho (ele tem uma sessão só) e guarda o novo.
   */
  async openSession(userId: string, input: SessionInput): Promise<void> {
    await this.prisma.$transaction((tx) => openSessionIn(tx, userId, input));
  }

  /** A conta (e o usuário dela) com esse login social, se existe. */
  async findSocialIdentity(provider: SocialProvider, subject: string): Promise<AuthUser | null> {
    const found = await this.prisma.authIdentity.findUnique({
      where: { provider_providerSubject: { provider, providerSubject: subject } },
      select: { user: { select: USER_SELECT } },
    });
    return found?.user ?? null;
  }

  async findUser(userId: string): Promise<AuthUser | null> {
    return this.prisma.user.findUnique({ where: { id: userId }, select: USER_SELECT });
  }

  /** O aparelho pelo `installationId` e de quem ele é; `null` se nunca abriu sessão. */
  findDevice(installationId: string): Promise<DeviceOwner | null> {
    return this.prisma.device.findUnique({
      where: { installationId },
      select: { id: true, userId: true },
    });
  }

  /** Quantos veículos (sem os excluídos) o usuário tem na API. */
  countVehicles(userId: string): Promise<number> {
    return this.prisma.vehicle.count({ where: { userId, deletedAt: null } });
  }

  /**
   * Cria o usuário do login social com a identidade e abre a sessão do aparelho (que passa a ser
   * dele). `null` se outra chamada criou a mesma identidade antes (o chamador busca de novo).
   */
  async createSocialUser(
    input: SocialProfile & { userId: string; session: SessionInput },
  ): Promise<AuthUser | null> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            id: input.userId,
            isAnonymous: false,
            email: input.email,
            name: input.name,
            identities: {
              create: {
                provider: input.provider,
                providerSubject: input.subject,
                email: input.email,
              },
            },
          },
          select: USER_SELECT,
        });
        await openSessionIn(tx, user.id, input.session);
        return user;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Vincula o login social ao usuário anônimo (que deixa de ser anônimo) e abre a sessão nova do
   * aparelho. `null` se esse login já pertence a outra conta (o chamador decide o que fazer).
   */
  async linkIdentity(
    userId: string,
    profile: SocialProfile,
    session: SessionInput,
  ): Promise<AuthUser | null> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.authIdentity.create({
          data: {
            userId,
            provider: profile.provider,
            providerSubject: profile.subject,
            email: profile.email,
          },
        });
        const user = await tx.user.update({
          where: { id: userId },
          data: { isAnonymous: false, email: profile.email, name: profile.name },
          select: USER_SELECT,
        });
        await openSessionIn(tx, userId, session);
        return user;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return null;
      }
      throw error;
    }
  }

  /**
   * O aparelho passa para a conta que já existia e o usuário anônimo é apagado. Com `merge`, antes
   * disso os dados dele (veículos, registros e prazos, inclusive os excluídos) vão para a conta, cada
   * linha com um `version` novo do contador da conta para os outros aparelhos da conta puxarem.
   * Tudo numa transação: se algo falha, nada muda.
   */
  async switchAccount(input: SwitchAccountInput): Promise<void> {
    await this.prisma.$transaction(
      async (tx) => {
        // Trava a conta e lê o contador: nenhum push dela cruza com a junção.
        const target = await tx.user.update({
          where: { id: input.toUserId },
          data: { syncVersion: { increment: 0 } },
          select: { syncVersion: true },
        });
        if (input.merge) {
          // Os ids saem antes de mover os veículos: as tabelas filhas chegam ao dono pelo veículo.
          const ids = await Promise.all(
            SYNC_TABLES.map(async (table) => ({
              table,
              ids: await listOwnedIds(tx, table, input.fromUserId),
            })),
          );
          let version = target.syncVersion;
          for (const { table, ids: rowIds } of ids) {
            const delegate = tx[SYNC_SPECS[table].model] as unknown as {
              update(args: unknown): Promise<unknown>;
            };
            for (const id of rowIds) {
              version += 1n;
              await delegate.update({
                where: { id },
                data: {
                  version,
                  ...(SYNC_SPECS[table].ownedDirectly ? { userId: input.toUserId } : {}),
                },
              });
            }
          }
          await tx.user.update({ where: { id: input.toUserId }, data: { syncVersion: version } });
        }
        await openSessionIn(tx, input.toUserId, input.session);
        // Sem aparelhos nem dados no anônimo, nada o segura: sai com tudo o que sobrou.
        await tx.user.delete({ where: { id: input.fromUserId } });
      },
      { timeout: 30_000 },
    );
  }

  /** O refresh token pelo hash, com o usuário do aparelho; `null` se não existe. */
  async findRefreshToken(tokenHash: string): Promise<StoredRefreshToken | null> {
    const found = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        deviceId: true,
        expiresAt: true,
        revokedAt: true,
        device: { select: { user: { select: USER_SELECT } } },
      },
    });
    if (!found) return null;
    const { device, ...token } = found;
    return { ...token, user: device.user };
  }

  /**
   * Troca o refresh token: revoga o antigo (só se ainda valia) e guarda o novo, juntos.
   * `false` se outra chamada já tinha trocado o mesmo token (nada é gravado).
   */
  rotateRefreshToken(input: RotateInput): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.refreshToken.updateMany({
        where: { id: input.tokenId, revokedAt: null },
        data: { revokedAt: input.now },
      });
      if (count === 0) return false;
      await tx.refreshToken.create({
        data: { deviceId: input.deviceId, tokenHash: input.tokenHash, expiresAt: input.expiresAt },
      });
      await tx.device.update({ where: { id: input.deviceId }, data: { lastSeenAt: input.now } });
      return true;
    });
  }

  /** Revoga todos os refresh tokens ativos do aparelho. */
  async revokeDeviceTokens(deviceId: string, now: Date): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { deviceId, revokedAt: null },
      data: { revokedAt: now },
    });
  }
}
