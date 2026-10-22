import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AnonymousAuthRequest, AuthTokens, RefreshRequest, uuidv7 } from '@ta-em-dia/shared';
import { randomBytes } from 'node:crypto';
import { AnonymousIdentity, AuthRepository, AuthUser } from './auth.repository';
import { ACCESS_TOKEN_SECONDS, newRefreshToken, sameHash, sha256 } from './tokens';

const invalidRefreshToken = () =>
  new UnauthorizedException({
    code: 'INVALID_REFRESH_TOKEN',
    message: 'Sessão expirada. Entre de novo.',
  });

@Injectable()
export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly jwt: JwtService,
  ) {}

  /**
   * "Continuar sem login": cria o usuário anônimo deste aparelho ou, se o aparelho já existe e o
   * segredo confere, devolve novos tokens para o mesmo usuário (idempotente). Segredo errado = 401.
   */
  async anonymous(request: AnonymousAuthRequest, now: Date = new Date()): Promise<AuthTokens> {
    const secretHash = sha256(request.secret);
    const refresh = newRefreshToken(now);
    const session = {
      installationId: request.installationId,
      platform: request.platform,
      refreshTokenHash: refresh.tokenHash,
      refreshExpiresAt: refresh.expiresAt,
      now,
    };

    let user = await this.existingUser(request.installationId, secretHash);
    if (user) {
      await this.repository.openSession(user.id, session);
    } else {
      const userId = uuidv7(now.getTime(), randomBytes(10));
      user = await this.repository.createAnonymousUser({ ...session, userId, secretHash });
      if (!user) {
        // Outra chamada do mesmo aparelho criou a conta primeiro: segue como se já existisse.
        user = await this.existingUser(request.installationId, secretHash);
        if (!user) throw new Error('Identidade anônima sumiu depois do conflito');
        await this.repository.openSession(user.id, session);
      }
    }

    return {
      accessToken: await this.jwt.signAsync({ sub: user.id }, { expiresIn: ACCESS_TOKEN_SECONDS }),
      expiresIn: ACCESS_TOKEN_SECONDS,
      refreshToken: refresh.token,
      user,
    };
  }

  /**
   * Troca o refresh token por um par novo e invalida o antigo (rotação). Token desconhecido, vencido
   * ou já trocado é 401 `INVALID_REFRESH_TOKEN`. Um token já trocado que aparece de novo foi
   * reaproveitado (copiado ou repetido): todas as sessões do aparelho são encerradas, e o app
   * volta a entrar pelo segredo do aparelho (`/auth/anonymous`).
   */
  async refresh(request: RefreshRequest, now: Date = new Date()): Promise<AuthTokens> {
    const stored = await this.repository.findRefreshToken(sha256(request.refreshToken));
    if (!stored) throw invalidRefreshToken();
    if (stored.revokedAt) {
      await this.repository.revokeDeviceTokens(stored.deviceId, now);
      throw invalidRefreshToken();
    }
    if (stored.expiresAt <= now) throw invalidRefreshToken();

    const next = newRefreshToken(now);
    const rotated = await this.repository.rotateRefreshToken({
      tokenId: stored.id,
      deviceId: stored.deviceId,
      tokenHash: next.tokenHash,
      expiresAt: next.expiresAt,
      now,
    });
    if (!rotated) throw invalidRefreshToken();

    return {
      accessToken: await this.jwt.signAsync(
        { sub: stored.user.id },
        { expiresIn: ACCESS_TOKEN_SECONDS },
      ),
      expiresIn: ACCESS_TOKEN_SECONDS,
      refreshToken: next.token,
      user: stored.user,
    };
  }

  private async existingUser(installationId: string, secretHash: string): Promise<AuthUser | null> {
    const identity: AnonymousIdentity | null =
      await this.repository.findAnonymousIdentity(installationId);
    if (!identity) return null;
    if (!identity.secretHash || !sameHash(identity.secretHash, secretHash)) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Credenciais do aparelho inválidas',
      });
    }
    return identity.user;
  }
}
