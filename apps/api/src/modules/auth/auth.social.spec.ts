import { JwtService } from '@nestjs/jwt';
import type { LinkRequest, SocialAuthRequest, SocialProvider } from '@ta-em-dia/shared';
import type {
  AuthRepository,
  AuthUser,
  DeviceOwner,
  SessionInput,
  SocialProfile,
  SwitchAccountInput,
} from './auth.repository';
import { AuthService } from './auth.service';
import { IdTokenClaims, IdTokenVerifier } from './id-token.verifier';
import { sha256 } from './tokens';

const NOW = new Date('2026-10-23T12:00:00.000Z');
const INSTALLATION = '018bcfe5-6800-7000-8000-000000000001';
const jwt = new JwtService({ secret: 'test-secret' });

const social: SocialAuthRequest = {
  idToken: 'token-da-ana',
  installationId: INSTALLATION,
  platform: 'android',
};
const link: LinkRequest = { ...social, provider: 'google' };

const anon: AuthUser = { id: 'anon-1', isAnonymous: true, plan: 'free' };
const account: AuthUser = { id: 'conta-1', isAnonymous: false, plan: 'free' };

class FakeVerifier extends IdTokenVerifier {
  calls: { provider: SocialProvider; idToken: string }[] = [];
  claims: IdTokenClaims = { subject: 'sub-ana', email: 'ana@example.com', name: 'Ana' };
  async verify(provider: SocialProvider, idToken: string) {
    this.calls.push({ provider, idToken });
    return this.claims;
  }
}

/** Repositório em memória: identidades sociais, usuários e o que o service pediu para gravar. */
class FakeRepository {
  users = new Map<string, AuthUser>([[anon.id, anon]]);
  identities = new Map<string, AuthUser>(); // "provider:sub" -> usuário
  device: DeviceOwner | null = { id: 'device-1', userId: anon.id };
  data = new Map([[account.id, { vehicles: 2, records: 22 }]]);
  sessions: { userId: string; input: SessionInput }[] = [];
  created: (SocialProfile & { userId: string })[] = [];
  linked: { userId: string; profile: SocialProfile }[] = [];
  switched: SwitchAccountInput[] = [];
  /** Simula outra chamada que criou/ligou o mesmo login no meio do caminho. */
  raceWinner: AuthUser | null = null;

  private key = (provider: string, subject: string) => `${provider}:${subject}`;

  async findSocialIdentity(provider: SocialProvider, subject: string) {
    return this.identities.get(this.key(provider, subject)) ?? null;
  }
  async findUser(id: string) {
    return this.users.get(id) ?? null;
  }
  async findDevice() {
    return this.device;
  }
  async countData(userId: string) {
    return this.data.get(userId) ?? { vehicles: 0, records: 0 };
  }
  async openSession(userId: string, input: SessionInput) {
    this.sessions.push({ userId, input });
  }
  async createSocialUser(input: SocialProfile & { userId: string; session: SessionInput }) {
    if (this.raceWinner) {
      this.identities.set(this.key(input.provider, input.subject), this.raceWinner);
      return null;
    }
    this.created.push(input);
    const user: AuthUser = { id: input.userId, isAnonymous: false, plan: 'free' };
    this.identities.set(this.key(input.provider, input.subject), user);
    this.sessions.push({ userId: user.id, input: input.session });
    return user;
  }
  async linkIdentity(userId: string, profile: SocialProfile, session: SessionInput) {
    if (this.raceWinner) {
      this.identities.set(this.key(profile.provider, profile.subject), this.raceWinner);
      return null;
    }
    this.linked.push({ userId, profile });
    this.sessions.push({ userId, input: session });
    return { ...this.users.get(userId)!, isAnonymous: false };
  }
  async switchAccount(input: SwitchAccountInput) {
    this.switched.push(input);
  }
  deleted: string[] = [];
  async deleteUser(userId: string) {
    this.deleted.push(userId);
  }
}

function setup() {
  const repository = new FakeRepository();
  const verifier = new FakeVerifier();
  const service = new AuthService(repository as unknown as AuthRepository, jwt, verifier);
  return { repository, verifier, service };
}

describe('AuthService.social', () => {
  it('conta nova: valida o token, cria o usuário com e-mail e nome e abre a sessão do aparelho', async () => {
    const { repository, verifier, service } = setup();
    const result = await service.social('google', social, NOW);

    expect(verifier.calls).toEqual([{ provider: 'google', idToken: 'token-da-ana' }]);
    expect(repository.created).toHaveLength(1);
    expect(repository.created[0]).toMatchObject({
      provider: 'google',
      subject: 'sub-ana',
      email: 'ana@example.com',
      name: 'Ana',
    });
    expect(result.user).toEqual({
      id: repository.created[0].userId,
      isAnonymous: false,
      plan: 'free',
    });
    const payload = await jwt.verifyAsync<{ sub: string }>(result.accessToken);
    expect(payload.sub).toBe(result.user.id);
    // Só o hash do refresh token vai para o banco.
    expect(repository.sessions[0].input.refreshTokenHash).toBe(sha256(result.refreshToken));
    expect(repository.sessions[0].input.installationId).toBe(INSTALLATION);
  });

  it('conta que já existe: entra nela sem criar outra', async () => {
    const { repository, service } = setup();
    repository.identities.set('apple:sub-ana', account);
    const result = await service.social('apple', social, NOW);

    expect(repository.created).toHaveLength(0);
    expect(result.user.id).toBe(account.id);
    expect(repository.sessions).toHaveLength(1);
    expect(repository.sessions[0].userId).toBe(account.id);
  });

  it('o nome do app vale quando o token não traz (Apple)', async () => {
    const { repository, verifier, service } = setup();
    verifier.claims = { subject: 'sub-ana', email: null, name: null };
    await service.social('apple', { ...social, name: 'Ana Maria' }, NOW);
    expect(repository.created[0]).toMatchObject({ email: null, name: 'Ana Maria' });
  });

  it('duas chamadas ao mesmo tempo: a que perde a corrida entra na conta criada pela outra', async () => {
    const { repository, service } = setup();
    repository.raceWinner = account;
    const result = await service.social('google', social, NOW);
    expect(result.user.id).toBe(account.id);
    expect(repository.sessions.map((s) => s.userId)).toEqual([account.id]);
  });

  it('token recusado pelo provedor: o erro sobe e nada é gravado', async () => {
    const { repository, verifier, service } = setup();
    verifier.verify = async () => {
      throw new Error('INVALID_ID_TOKEN');
    };
    await expect(service.social('google', social, NOW)).rejects.toThrow('INVALID_ID_TOKEN');
    expect(repository.created).toHaveLength(0);
    expect(repository.sessions).toHaveLength(0);
  });
});

describe('AuthService.link', () => {
  it('login novo: liga ao usuário anônimo, que deixa de ser anônimo, e devolve tokens novos', async () => {
    const { repository, service } = setup();
    const result = await service.link(anon.id, link, NOW);

    expect(result.outcome).toBe('linked');
    expect(result.user).toEqual({ id: anon.id, isAnonymous: false, plan: 'free' });
    expect(repository.linked[0].profile).toMatchObject({ provider: 'google', subject: 'sub-ana' });
    expect(repository.switched).toHaveLength(0);
    expect(repository.sessions[0].input.refreshTokenHash).toBe(sha256(result.refreshToken));
  });

  it('o mesmo login de novo no mesmo usuário é idempotente', async () => {
    const { repository, service } = setup();
    repository.identities.set('google:sub-ana', anon);
    const result = await service.link(anon.id, link, NOW);
    expect(result.outcome).toBe('linked');
    expect(repository.linked).toHaveLength(0);
    expect(repository.switched).toHaveLength(0);
  });

  it('conta que já existe e sem escolha: 409 ACCOUNT_EXISTS com os veículos e registros da conta, sem mexer em nada', async () => {
    const { repository, service } = setup();
    repository.identities.set('google:sub-ana', account);
    await expect(service.link(anon.id, link, NOW)).rejects.toMatchObject({
      status: 409,
      response: { code: 'ACCOUNT_EXISTS', account: { vehicles: 2, records: 22 } },
    });
    expect(repository.switched).toHaveLength(0);
    expect(repository.sessions).toHaveLength(0);
  });

  it.each([
    ['merge', 'merged', true],
    ['use_account', 'switched', false],
  ] as const)('conta que já existe com %s: %s', async (onConflict, outcome, merge) => {
    const { repository, service } = setup();
    repository.identities.set('google:sub-ana', account);
    const result = await service.link(anon.id, { ...link, onConflict }, NOW);

    expect(result.outcome).toBe(outcome);
    expect(result.user.id).toBe(account.id);
    expect(repository.switched).toHaveLength(1);
    expect(repository.switched[0]).toMatchObject({
      fromUserId: anon.id,
      toUserId: account.id,
      merge,
    });
    expect(repository.switched[0].session.refreshTokenHash).toBe(sha256(result.refreshToken));
    const payload = await jwt.verifyAsync<{ sub: string }>(result.accessToken);
    expect(payload.sub).toBe(account.id);
  });

  it('merge que passaria do limite de 1 veículo do plano grátis: 409 VEHICLE_LIMIT_REACHED e nada muda', async () => {
    const { repository, service } = setup();
    repository.identities.set('google:sub-ana', account);
    repository.data.set(anon.id, { vehicles: 1, records: 5 });
    await expect(
      service.link(anon.id, { ...link, onConflict: 'merge' }, NOW),
    ).rejects.toMatchObject({
      status: 409,
      response: { code: 'VEHICLE_LIMIT_REACHED' },
    });
    expect(repository.switched).toHaveLength(0);
    expect(repository.sessions).toHaveLength(0);
  });

  it('merge cabe quando o aparelho não tem veículo na API, e "usar só a conta" nunca é barrado', async () => {
    const { repository, service } = setup();
    repository.identities.set('google:sub-ana', account);
    expect((await service.link(anon.id, { ...link, onConflict: 'merge' }, NOW)).outcome).toBe(
      'merged',
    );

    repository.data.set(anon.id, { vehicles: 1, records: 5 });
    expect((await service.link(anon.id, { ...link, onConflict: 'use_account' }, NOW)).outcome).toBe(
      'switched',
    );
  });

  it('corrida: outra chamada ligou o login a uma conta no meio do caminho', async () => {
    const { repository, service } = setup();
    repository.raceWinner = account;
    await expect(service.link(anon.id, link, NOW)).rejects.toMatchObject({
      response: { code: 'ACCOUNT_EXISTS' },
    });
  });

  it('quem já tem login não vincula outro: 409 ALREADY_LINKED', async () => {
    const { repository, service } = setup();
    repository.users.set(account.id, account);
    await expect(service.link(account.id, link, NOW)).rejects.toMatchObject({
      status: 409,
      response: { code: 'ALREADY_LINKED' },
    });
  });

  it('aparelho de outro usuário ou desconhecido: 403 e o token nem é validado', async () => {
    const { repository, verifier, service } = setup();
    repository.device = { id: 'device-9', userId: 'outro' };
    await expect(service.link(anon.id, link, NOW)).rejects.toMatchObject({
      status: 403,
      response: { code: 'DEVICE_MISMATCH' },
    });
    repository.device = null;
    await expect(service.link(anon.id, link, NOW)).rejects.toMatchObject({ status: 403 });
    expect(verifier.calls).toHaveLength(0);
  });

  it('usuário do token que não existe mais: 401', async () => {
    const { service } = setup();
    await expect(service.link('sumiu', link, NOW)).rejects.toMatchObject({ status: 401 });
  });
});

describe('AuthService.deleteAccount', () => {
  it('apaga o usuário do token', async () => {
    const { repository, service } = setup();
    expect(await service.deleteAccount(account.id)).toEqual({ deleted: true });
    expect(repository.deleted).toEqual([account.id]);
  });
});
