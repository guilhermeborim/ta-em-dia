import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { syncPullResponseSchema, syncPushResponseSchema } from '@ta-em-dia/shared';
import { AppModule } from '../src/app.module';
import type { PulledRow, SyncSession } from '../src/modules/sync/sync.repository';
import { SyncRepository } from '../src/modules/sync/sync.repository';

const USER = '018bcfe5-6800-7000-8000-0000000000aa';
const GOL = '018bcfe5-6800-7000-8000-000000000001';

/** Banco em memória: o Postgres de verdade fica de fora do CI. */
const stored = new Map<string, { ownerId: string; updatedAt: Date; version: bigint }>();
let counter = 0n;
const pulled: PulledRow[] = [];
const fakeRepository = {
  async transaction<T>(_userId: string, work: (session: SyncSession) => Promise<T>) {
    return work({
      findMeta: async (_table, id) => stored.get(id) ?? null,
      nextVersion: async () => ++counter,
      upsert: async (_table, input) => {
        stored.set(input.id, {
          ownerId: input.userId,
          updatedAt: input.updatedAt,
          version: input.version,
        });
        pulled.push({
          table: 'vehicles',
          id: input.id,
          version: input.version,
          updatedAt: input.updatedAt,
          deletedAt: null,
          row: { id: input.id, ...input.data },
        });
      },
      softDelete: async () => undefined,
    });
  },
  async listChanges(_userId: string, since: bigint, limit: number) {
    return pulled.filter((row) => row.version > since).slice(0, limit + 1);
  },
  async touchDevices() {},
};

describe('sync (e2e)', () => {
  let app: INestApplication;
  let auth: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SyncRepository)
      .useValue(fakeRepository)
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1', { exclude: ['health'] });
    await app.init();
    auth = `Bearer ${await moduleRef.get(JwtService).signAsync({ sub: USER })}`;
  });

  beforeEach(() => {
    stored.clear();
    pulled.length = 0;
    counter = 0n;
  });
  afterAll(() => app.close());

  const push = (body: unknown) =>
    request(app.getHttpServer())
      .post('/v1/sync/push')
      .set('Authorization', auth)
      .send(body as object);
  const pull = (query: string) =>
    request(app.getHttpServer()).get(`/v1/sync/pull?${query}`).set('Authorization', auth);

  const vehicleChange = {
    table: 'vehicles',
    id: GOL,
    op: 'upsert',
    updatedAt: new Date(Date.now() - 60_000).toISOString(),
    payload: { id: GOL, name: 'Gol', type: 'flex', initialKm: 1000 },
  };

  it('exige token nas duas rotas', async () => {
    await request(app.getHttpServer()).post('/v1/sync/push').send({}).expect(401);
    await request(app.getHttpServer()).get('/v1/sync/pull?protocol=1').expect(401);
  });

  it('push aceita o veículo e pull devolve ele, nos contratos do app', async () => {
    const pushed = await push({ protocol: 1, changes: [vehicleChange] }).expect(200);
    expect(syncPushResponseSchema.safeParse(pushed.body).success).toBe(true);
    expect(pushed.body.results).toEqual([{ table: 'vehicles', id: GOL, status: 'accepted' }]);

    const pulledRes = await pull('protocol=1&since=0').expect(200);
    expect(syncPullResponseSchema.safeParse(pulledRes.body).success).toBe(true);
    expect(pulledRes.body).toMatchObject({ nextSince: '1', hasMore: false });
    expect(pulledRes.body.changes[0]).toMatchObject({
      table: 'vehicles',
      id: GOL,
      op: 'upsert',
      version: '1',
    });

    const nothingNew = await pull('protocol=1&since=1').expect(200);
    expect(nothingNew.body).toMatchObject({ changes: [], nextSince: '1' });
  });

  it('payload inválido volta como rejeitado, não como erro do lote', async () => {
    const res = await push({
      protocol: 1,
      changes: [{ ...vehicleChange, payload: { id: GOL, name: '' } }],
    }).expect(200);
    expect(res.body.results[0]).toMatchObject({ status: 'rejected', reason: 'INVALID' });
  });

  it('pedido mal formado: 400 com código estável, sem devolver o conteúdo', async () => {
    const res = await push({ protocol: 1, changes: [{ table: 'users', secret: 'xyz' }] }).expect(
      400,
    );
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(JSON.stringify(res.body)).not.toContain('xyz');

    const bad = await pull('protocol=1&since=abc').expect(400);
    expect(bad.body.code).toBe('VALIDATION_ERROR');
    await pull('protocol=1&limit=9999').expect(400);
  });

  it('lote com mais de 100 mudanças: 400', async () => {
    const changes = Array.from({ length: 101 }, () => vehicleChange);
    await push({ protocol: 1, changes }).expect(400);
  });

  it('protocolo que a API não conhece: 400 SYNC_PROTOCOL_UNSUPPORTED', async () => {
    const res = await push({ protocol: 3, changes: [] }).expect(400);
    expect(res.body.code).toBe('SYNC_PROTOCOL_UNSUPPORTED');
    const res2 = await pull('protocol=3').expect(400);
    expect(res2.body.code).toBe('SYNC_PROTOCOL_UNSUPPORTED');
  });
});
