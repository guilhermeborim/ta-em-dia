import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service';

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

const USER_SELECT = { id: true, isAnonymous: true, plan: true } as const;

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
    await this.prisma.$transaction(async (tx) => {
      const device = await tx.device.upsert({
        where: { installationId: input.installationId },
        create: {
          userId,
          installationId: input.installationId,
          platform: input.platform,
          lastSeenAt: input.now,
        },
        update: { platform: input.platform, lastSeenAt: input.now },
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
    });
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
