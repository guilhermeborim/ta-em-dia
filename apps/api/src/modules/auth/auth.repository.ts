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

  /** Atualiza a plataforma do aparelho do usuário e guarda o novo refresh token. */
  async openSession(userId: string, input: SessionInput): Promise<void> {
    await this.prisma.device.upsert({
      where: { installationId: input.installationId },
      create: {
        userId,
        installationId: input.installationId,
        platform: input.platform,
        refreshTokens: {
          create: { tokenHash: input.refreshTokenHash, expiresAt: input.refreshExpiresAt },
        },
      },
      update: {
        platform: input.platform,
        refreshTokens: {
          create: { tokenHash: input.refreshTokenHash, expiresAt: input.refreshExpiresAt },
        },
      },
    });
  }
}
