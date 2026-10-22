import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AnonymousIdentity, AuthRepository, AuthUser, SessionInput } from './auth.repository';
import { AuthService } from './auth.service';
import { sha256 } from './tokens';

const request = {
  installationId: '018bcfe5-6800-7000-8000-000000000001',
  secret: 'a'.repeat(64),
  platform: 'android' as const,
};
const NOW = new Date('2026-10-22T12:00:00.000Z');

/** Repositório em memória: guarda o que o service pediu para gravar. */
class FakeRepository {
  identity: AnonymousIdentity | null = null;
  created: (SessionInput & { userId: string; secretHash: string })[] = [];
  sessions: { userId: string; input: SessionInput }[] = [];
  /** Simula outra chamada que criou a conta no meio do caminho. */
  raceWinner: AnonymousIdentity | null = null;

  async findAnonymousIdentity() {
    return this.identity;
  }
  async createAnonymousUser(input: SessionInput & { userId: string; secretHash: string }) {
    if (this.raceWinner) {
      this.identity = this.raceWinner;
      return null;
    }
    this.created.push(input);
    const user: AuthUser = { id: input.userId, isAnonymous: true, plan: 'free' };
    this.identity = { secretHash: input.secretHash, user };
    return user;
  }
  async openSession(userId: string, input: SessionInput) {
    this.sessions.push({ userId, input });
  }
}

const jwt = new JwtService({ secret: 'test-secret' });

function setup() {
  const repository = new FakeRepository();
  const service = new AuthService(repository as unknown as AuthRepository, jwt);
  return { repository, service };
}

describe('AuthService.anonymous', () => {
  it('aparelho novo: cria o usuário anônimo e devolve os dois tokens', async () => {
    const { repository, service } = setup();
    const result = await service.anonymous(request, NOW);

    expect(repository.created).toHaveLength(1);
    expect(result.user).toEqual({
      id: repository.created[0].userId,
      isAnonymous: true,
      plan: 'free',
    });
    expect(result.expiresIn).toBe(900);

    const payload = await jwt.verifyAsync<{ sub: string; exp: number; iat: number }>(
      result.accessToken,
    );
    expect(payload.sub).toBe(result.user.id);
    expect(payload.exp - payload.iat).toBe(900);
  });

  it('guarda só o hash do segredo e o hash do refresh token (90 dias)', async () => {
    const { repository, service } = setup();
    const result = await service.anonymous(request, NOW);
    const created = repository.created[0];

    expect(created.secretHash).toBe(sha256(request.secret));
    expect(JSON.stringify(created)).not.toContain(request.secret);
    expect(created.refreshTokenHash).toBe(sha256(result.refreshToken));
    expect(created.refreshTokenHash).not.toBe(result.refreshToken);
    expect(created.refreshExpiresAt).toEqual(new Date('2027-01-20T12:00:00.000Z'));
  });

  it('o id do usuário é um UUID v7', async () => {
    const { service } = setup();
    const { user } = await service.anonymous(request, NOW);
    expect(user.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('chamar de novo com o mesmo aparelho devolve o mesmo usuário, sem criar outro', async () => {
    const { repository, service } = setup();
    const first = await service.anonymous(request, NOW);
    const second = await service.anonymous(request, NOW);

    expect(repository.created).toHaveLength(1);
    expect(second.user).toEqual(first.user);
    expect(repository.sessions).toEqual([
      { userId: first.user.id, input: expect.objectContaining({ platform: 'android' }) },
    ]);
    expect(second.refreshToken).not.toBe(first.refreshToken);
  });

  it('segredo errado: 401 INVALID_CREDENTIALS e nada é gravado', async () => {
    const { repository, service } = setup();
    await service.anonymous(request, NOW);

    const error = await service
      .anonymous({ ...request, secret: 'b'.repeat(64) }, NOW)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(UnauthorizedException);
    expect((error as UnauthorizedException).getResponse()).toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
    expect(repository.sessions).toHaveLength(0);
  });

  it('identidade sem segredo guardado nunca é aceita', async () => {
    const { repository, service } = setup();
    repository.identity = {
      secretHash: null,
      user: { id: 'u', isAnonymous: true, plan: 'free' },
    };
    await expect(service.anonymous(request, NOW)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('duas primeiras chamadas ao mesmo tempo: a perdedora segue com o usuário que já existe', async () => {
    const { repository, service } = setup();
    repository.raceWinner = {
      secretHash: sha256(request.secret),
      user: { id: 'vencedor', isAnonymous: true, plan: 'free' },
    };
    const result = await service.anonymous(request, NOW);
    expect(result.user.id).toBe('vencedor');
    expect(repository.sessions[0].userId).toBe('vencedor');
  });
});
