import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  AnonymousAuthRequest,
  AuthTokens,
  canMergeVehicles,
  DEFAULT_FLAGS,
  LinkOutcome,
  LinkRequest,
  LinkResult,
  RefreshRequest,
  SocialAuthRequest,
  SocialProvider,
  uuidv7,
} from '@ta-em-dia/shared';
import { randomBytes } from 'node:crypto';
import {
  AnonymousIdentity,
  AuthRepository,
  AuthUser,
  SessionInput,
  SocialProfile,
} from './auth.repository';
import { IdTokenVerifier } from './id-token.verifier';
import { ACCESS_TOKEN_SECONDS, newRefreshToken, sameHash, sha256 } from './tokens';

const invalidCredentials = () =>
  new UnauthorizedException({
    code: 'INVALID_CREDENTIALS',
    message: 'Credenciais do aparelho inválidas',
  });

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
    private readonly idTokens: IdTokenVerifier,
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
        // Sem identidade anônima, o aparelho já é de quem entrou com Google ou Apple: o segredo
        // dele não prova nada, então não abre sessão anônima por cima.
        if (!user) throw invalidCredentials();
        await this.repository.openSession(user.id, session);
      }
    }

    return this.tokensFor(user, refresh.token);
  }

  /**
   * "Entrar com Google/Apple" (tela 3): confere o `id_token`, abre a sessão deste aparelho para o
   * dono do login e cria o usuário se ele ainda não existe. O aparelho passa a ser da conta.
   */
  async social(
    provider: SocialProvider,
    request: SocialAuthRequest,
    now: Date = new Date(),
  ): Promise<AuthTokens> {
    const profile = await this.profile(provider, request);
    const refresh = newRefreshToken(now);
    const session = this.sessionOf(request, refresh, now);

    let user = await this.repository.findSocialIdentity(provider, profile.subject);
    if (user) {
      await this.repository.openSession(user.id, session);
    } else {
      const userId = uuidv7(now.getTime(), randomBytes(10));
      user = await this.repository.createSocialUser({ ...profile, userId, session });
      if (!user) {
        // Outra chamada criou a conta primeiro: entra nela.
        user = await this.repository.findSocialIdentity(provider, profile.subject);
        if (!user) throw new Error('Identidade social sumiu depois do conflito');
        await this.repository.openSession(user.id, session);
      }
    }
    return this.tokensFor(user, refresh.token);
  }

  /**
   * "Salvar meus dados" (tela 19): liga o login social ao usuário anônimo do token. Se o login já
   * tem conta (outro celular), responde 409 `ACCOUNT_EXISTS` com o que a conta tem, e o app manda de
   * novo com `onConflict`: `merge` leva os dados do aparelho para a conta; `use_account` descarta os
   * do anônimo. Nos dois o aparelho passa a ser da conta.
   */
  async link(userId: string, request: LinkRequest, now: Date = new Date()): Promise<LinkResult> {
    const user = await this.repository.findUser(userId);
    if (!user)
      throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Conta não existe mais.' });
    if (!user.isAnonymous) {
      throw new ConflictException({ code: 'ALREADY_LINKED', message: 'Essa conta já tem login.' });
    }
    // O aparelho tem de ser do usuário do token: ninguém move o aparelho de outra pessoa.
    const device = await this.repository.findDevice(request.installationId);
    if (!device || device.userId !== userId) {
      throw new ForbiddenException({
        code: 'DEVICE_MISMATCH',
        message: 'Esse aparelho não é desta conta.',
      });
    }

    const profile = await this.profile(request.provider, request);
    const refresh = newRefreshToken(now);
    const session = this.sessionOf(request, refresh, now);

    let existing = await this.repository.findSocialIdentity(request.provider, profile.subject);
    if (!existing) {
      const linked = await this.repository.linkIdentity(userId, profile, session);
      if (linked) return this.resultFor(linked, refresh.token, 'linked');
      // Outra chamada ligou esse login a uma conta no meio do caminho: trata como conta existente.
      existing = await this.repository.findSocialIdentity(request.provider, profile.subject);
      if (!existing) throw new Error('Identidade social sumiu depois do conflito');
    }

    if (existing.id === userId) {
      await this.repository.openSession(userId, session);
      return this.resultFor(existing, refresh.token, 'linked');
    }
    if (!request.onConflict) {
      throw new ConflictException({
        code: 'ACCOUNT_EXISTS',
        message: 'Essa conta já tem dados.',
        account: await this.repository.countData(existing.id),
      });
    }
    const merge = request.onConflict === 'merge';
    if (merge) {
      // O plano grátis guarda 1 veículo: a junção não pode passar disso (arquivados contam).
      const max = DEFAULT_FLAGS[existing.plan]['vehicles.max'];
      const [local, remote] = await Promise.all([
        this.repository.countData(userId),
        this.repository.countData(existing.id),
      ]);
      if (!canMergeVehicles(local.vehicles, remote.vehicles, max)) {
        throw new ConflictException({
          code: 'VEHICLE_LIMIT_REACHED',
          message: 'No plano grátis, o app guarda 1 veículo.',
        });
      }
    }
    await this.repository.switchAccount({
      fromUserId: userId,
      toUserId: existing.id,
      merge,
      session,
    });
    return this.resultFor(existing, refresh.token, merge ? 'merged' : 'switched');
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

    return this.tokensFor(stored.user, next.token);
  }

  private async tokensFor(user: AuthUser, refreshToken: string): Promise<AuthTokens> {
    return {
      accessToken: await this.jwt.signAsync({ sub: user.id }, { expiresIn: ACCESS_TOKEN_SECONDS }),
      expiresIn: ACCESS_TOKEN_SECONDS,
      refreshToken,
      user,
    };
  }

  private async resultFor(
    user: AuthUser,
    refreshToken: string,
    outcome: LinkOutcome,
  ): Promise<LinkResult> {
    return { ...(await this.tokensFor(user, refreshToken)), outcome };
  }

  private sessionOf(
    request: Pick<SocialAuthRequest, 'installationId' | 'platform'>,
    refresh: ReturnType<typeof newRefreshToken>,
    now: Date,
  ): SessionInput {
    return {
      installationId: request.installationId,
      platform: request.platform,
      refreshTokenHash: refresh.tokenHash,
      refreshExpiresAt: refresh.expiresAt,
      now,
    };
  }

  /** O `sub` e o e-mail do `id_token`; o nome vem do token (Google) ou do app (Apple). */
  private async profile(
    provider: SocialProvider,
    request: SocialAuthRequest,
  ): Promise<SocialProfile> {
    const claims = await this.idTokens.verify(provider, request.idToken);
    return {
      provider,
      subject: claims.subject,
      email: claims.email,
      name: claims.name ?? request.name ?? null,
    };
  }

  private async existingUser(installationId: string, secretHash: string): Promise<AuthUser | null> {
    const identity: AnonymousIdentity | null =
      await this.repository.findAnonymousIdentity(installationId);
    if (!identity) return null;
    if (!identity.secretHash || !sameHash(identity.secretHash, secretHash)) {
      throw invalidCredentials();
    }
    return identity.user;
  }
}
