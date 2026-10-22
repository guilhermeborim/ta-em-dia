import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { THROTTLE_LIMITS } from '../src/common/throttle/throttle';
import { AuthRepository } from '../src/modules/auth/auth.repository';

/** Repositório que nunca acha nada: cada chamada é um pedido válido, mas barato. */
const emptyRepository = {
  async findRefreshToken() {
    return null;
  },
};

describe('rate limit (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AuthRepository)
      .useValue(emptyRepository)
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1', { exclude: ['health'] });
    await app.init();
  });

  afterAll(() => app.close());

  it('passou do limite de /auth/refresh por IP: 429 RATE_LIMITED com Retry-After', async () => {
    const call = () =>
      request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send({ refreshToken: 'x'.repeat(40) });

    for (let i = 0; i < THROTTLE_LIMITS.refresh; i++) await call().expect(401);
    const res = await call().expect(429);
    expect(res.body.code).toBe('RATE_LIMITED');
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('o health check fica fora do limite', async () => {
    for (let i = 0; i < THROTTLE_LIMITS.default + 5; i++) {
      await request(app.getHttpServer()).get('/health').expect(200);
    }
  });
});
