import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { authTokensSchema } from '@ta-em-dia/shared';
import { AppModule } from '../src/app.module';
import { CurrentUserId } from '../src/common/auth/current-user.decorator';
import { AuthRepository } from '../src/modules/auth/auth.repository';
import { sha256 } from '../src/modules/auth/tokens';

const body = {
  installationId: '018bcfe5-6800-7000-8000-000000000001',
  secret: 'a'.repeat(64),
  platform: 'android',
};

/** Banco em memória: só o que a rota usa. O Postgres de verdade fica de fora do CI. */
const identities = new Map<string, { secretHash: string; user: { id: string } }>();
const fakeRepository = {
  async findAnonymousIdentity(installationId: string) {
    const found = identities.get(installationId);
    return found
      ? { secretHash: found.secretHash, user: { ...found.user, isAnonymous: true, plan: 'free' } }
      : null;
  },
  async createAnonymousUser(input: { installationId: string; userId: string; secretHash: string }) {
    identities.set(input.installationId, {
      secretHash: input.secretHash,
      user: { id: input.userId },
    });
    return { id: input.userId, isAnonymous: true, plan: 'free' };
  },
  async openSession() {},
};

/** Rota protegida só para o teste: devolve o userId que o guard tirou do token. */
@Controller('probe')
class ProbeController {
  @Get()
  whoami(@CurrentUserId() userId: string) {
    return { userId };
  }
}

describe('POST /v1/auth/anonymous (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ProbeController],
    })
      .overrideProvider(AuthRepository)
      .useValue(fakeRepository)
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1', { exclude: ['health'] });
    await app.init();
  });

  beforeEach(() => identities.clear());
  afterAll(() => app.close());

  const post = (payload: unknown) =>
    request(app.getHttpServer())
      .post('/v1/auth/anonymous')
      .send(payload as object);

  it('cria o usuário anônimo sem token e devolve os tokens', async () => {
    const res = await post(body).expect(200);
    expect(res.body).toMatchObject({
      expiresIn: 900,
      user: { isAnonymous: true, plan: 'free' },
    });
    // Contrato com o app: ele valida a resposta com o mesmo schema.
    expect(authTokensSchema.safeParse(res.body).success).toBe(true);
    expect(typeof res.body.accessToken).toBe('string');
    expect(typeof res.body.refreshToken).toBe('string');
    expect(identities.get(body.installationId)?.secretHash).toBe(sha256(body.secret));
  });

  it('repetir o pedido devolve o mesmo usuário', async () => {
    const first = await post(body).expect(200);
    const second = await post(body).expect(200);
    expect(second.body.user.id).toBe(first.body.user.id);
  });

  it('segredo errado: 401 com código estável', async () => {
    await post(body).expect(200);
    const res = await post({ ...body, secret: 'b'.repeat(64) }).expect(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('pedido inválido: 400 que não devolve o segredo', async () => {
    const res = await post({ ...body, installationId: 'abc', secret: 'curto' }).expect(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.fields).toEqual(expect.arrayContaining(['installationId', 'secret']));
    expect(JSON.stringify(res.body)).not.toContain('curto');
  });

  it('rota protegida: sem token 401; com o access token, o userId vem do token', async () => {
    const { body: tokens } = await post(body).expect(200);
    const denied = await request(app.getHttpServer()).get('/v1/probe').expect(401);
    expect(denied.body.code).toBe('UNAUTHORIZED');
    const ok = await request(app.getHttpServer())
      .get('/v1/probe')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .expect(200);
    expect(ok.body.userId).toBe(tokens.user.id);
  });
});
