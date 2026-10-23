import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { authTokensSchema, linkResultSchema } from '@ta-em-dia/shared';
import { AppModule } from '../src/app.module';
import { AuthRepository } from '../src/modules/auth/auth.repository';
import { IdTokenVerifier } from '../src/modules/auth/id-token.verifier';

const INSTALLATION = '018bcfe5-6800-7000-8000-000000000001';
const body = { idToken: 'token-da-ana', installationId: INSTALLATION, platform: 'ios' };

/** Banco em memória: só o que as rotas sociais usam. */
const users = new Map<string, { id: string; isAnonymous: boolean; plan: 'free' }>();
const identities = new Map<string, string>();
const fakeRepository = {
  async findSocialIdentity(provider: string, subject: string) {
    const id = identities.get(`${provider}:${subject}`);
    return id ? users.get(id)! : null;
  },
  async createSocialUser(input: { userId: string; provider: string; subject: string }) {
    const user = { id: input.userId, isAnonymous: false, plan: 'free' as const };
    users.set(user.id, user);
    identities.set(`${input.provider}:${input.subject}`, user.id);
    return user;
  },
  async openSession() {},
  async deleteUser(id: string) {
    users.delete(id);
  },
  async findUser(id: string) {
    return users.get(id) ?? null;
  },
  async findDevice() {
    return { id: 'device-1', userId: [...users.keys()][0] };
  },
  async linkIdentity(userId: string, profile: { provider: string; subject: string }) {
    identities.set(`${profile.provider}:${profile.subject}`, userId);
    const user = { ...users.get(userId)!, isAnonymous: false };
    users.set(userId, user);
    return user;
  },
};

class FakeVerifier extends IdTokenVerifier {
  async verify(_provider: string, idToken: string) {
    if (idToken !== 'token-da-ana') {
      throw new UnauthorizedException({ code: 'INVALID_ID_TOKEN' });
    }
    return { subject: 'sub-ana', email: 'ana@example.com', name: 'Ana' };
  }
}

describe('login social (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AuthRepository)
      .useValue(fakeRepository)
      .overrideProvider(IdTokenVerifier)
      .useClass(FakeVerifier)
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1', { exclude: ['health'] });
    await app.init();
  });

  beforeEach(() => {
    users.clear();
    identities.clear();
  });
  afterAll(() => app.close());

  const post = (path: string, payload: unknown) =>
    request(app.getHttpServer())
      .post(`/v1/auth/${path}`)
      .send(payload as object);

  it('google e apple entram sem token e cumprem o contrato do app', async () => {
    const google = await post('google', body).expect(200);
    expect(authTokensSchema.safeParse(google.body).success).toBe(true);
    expect(google.body.user.isAnonymous).toBe(false);
    // A mesma conta de novo devolve o mesmo usuário.
    const again = await post('google', body).expect(200);
    expect(again.body.user.id).toBe(google.body.user.id);
    await post('apple', body).expect(200);
  });

  it('pedido inválido: 400 que não devolve o token', async () => {
    const res = await post('google', { ...body, installationId: 'abc', idToken: '' }).expect(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.fields).toEqual(expect.arrayContaining(['installationId', 'idToken']));
    expect(JSON.stringify(res.body)).not.toContain('token-da-ana');
  });

  it('vincular exige o token do usuário e liga o login a ele', async () => {
    await post('link', { ...body, provider: 'google' }).expect(401);

    // Usuário anônimo "logado": o access token vem de uma sessão anônima de mentira.
    const jwt = app.get(JwtService);
    users.set('anon-1', { id: 'anon-1', isAnonymous: true, plan: 'free' });
    const accessToken = await jwt.signAsync({ sub: 'anon-1' });
    const res = await request(app.getHttpServer())
      .post('/v1/auth/link')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ...body, provider: 'google' })
      .expect(200);
    expect(linkResultSchema.safeParse(res.body).success).toBe(true);
    expect(res.body).toMatchObject({
      outcome: 'linked',
      user: { id: 'anon-1', isAnonymous: false },
    });
  });

  it('excluir conta exige o token e apaga o usuário do token', async () => {
    await request(app.getHttpServer()).delete('/v1/auth/account').expect(401);

    const jwt = app.get(JwtService);
    users.set('conta-1', { id: 'conta-1', isAnonymous: false, plan: 'free' });
    users.set('outra', { id: 'outra', isAnonymous: false, plan: 'free' });
    const accessToken = await jwt.signAsync({ sub: 'conta-1' });
    const res = await request(app.getHttpServer())
      .delete('/v1/auth/account')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body).toEqual({ deleted: true });
    expect([...users.keys()]).toEqual(['outra']);
  });
});
