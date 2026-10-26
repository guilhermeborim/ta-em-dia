import { BadRequestException } from '@nestjs/common';
import type { SyncChange, SyncTable } from '@ta-em-dia/shared';
import type {
  DeleteInput,
  PulledRow,
  RowMeta,
  SyncRepository,
  SyncSession,
  UpsertInput,
} from './sync.repository';
import { SyncService } from './sync.service';

const USER = 'user-1';
const OTHER = 'user-2';
const GOL = '018bcfe5-6800-7000-8000-000000000001';
const FUEL = '018bcfe5-6800-7000-8000-000000000002';
const PLAN = '018bcfe5-6800-7000-8000-000000000003';
const RECORD = '018bcfe5-6800-7000-8000-000000000004';
const NOW = new Date('2026-10-23T12:00:00.000Z');
const SENT = '2026-10-23T11:00:00.000Z';

interface StoredRow extends RowMeta {
  deletedAt?: Date;
  version: bigint;
  data?: Record<string, unknown>;
}

/** Banco em memória: as linhas por tabela e o contador de versões do usuário. */
class FakeRepository {
  rows = new Map<string, StoredRow>();
  counter = 0n;
  touched: string[] = [];
  /** Linhas que o pull devolve (já no formato do banco). */
  pulled: PulledRow[] = [];
  listArgs: { since: bigint; limit: number }[] = [];

  key = (table: SyncTable, id: string) => `${table}:${id}`;

  seed(table: SyncTable, id: string, ownerId: string, updatedAt = new Date(SENT)) {
    this.rows.set(this.key(table, id), { ownerId, updatedAt, version: 0n });
  }

  async transaction<T>(_userId: string, work: (session: SyncSession) => Promise<T>) {
    const session: SyncSession = {
      findMeta: async (table, id) => this.rows.get(this.key(table, id)) ?? null,
      nextVersion: async () => ++this.counter,
      upsert: async (table: SyncTable, input: UpsertInput) => {
        this.rows.set(this.key(table, input.id), {
          ownerId: input.userId,
          updatedAt: input.updatedAt,
          version: input.version,
          data: input.data,
        });
      },
      softDelete: async (table: SyncTable, input: DeleteInput) => {
        const row = this.rows.get(this.key(table, input.id))!;
        this.rows.set(this.key(table, input.id), {
          ...row,
          updatedAt: input.updatedAt,
          deletedAt: input.deletedAt,
          version: input.version,
        });
      },
    };
    return work(session);
  }

  listTables: (readonly SyncTable[] | undefined)[] = [];

  async listChanges(_userId: string, since: bigint, limit: number, tables?: readonly SyncTable[]) {
    this.listArgs.push({ since, limit });
    this.listTables.push(tables);
    return this.pulled
      .filter((row) => row.version > since && (!tables || tables.includes(row.table)))
      .slice(0, limit + 1);
  }

  async touchDevices(userId: string) {
    this.touched.push(userId);
  }
}

const vehicle = (patch: Record<string, unknown> = {}): SyncChange => ({
  table: 'vehicles',
  id: GOL,
  op: 'upsert',
  updatedAt: SENT,
  payload: { id: GOL, name: 'Gol', type: 'flex', initialKm: 1000, ...patch },
});

const fuel = (patch: Record<string, unknown> = {}): SyncChange => ({
  table: 'fuel_entries',
  id: FUEL,
  op: 'upsert',
  updatedAt: SENT,
  payload: {
    id: FUEL,
    vehicleId: GOL,
    date: SENT,
    km: 1200,
    fuelType: 'gasoline',
    liters: 30,
    pricePerLiter: 5.5,
    total: 165,
    fullTank: true,
    ...patch,
  },
});

describe('SyncService.push', () => {
  let repo: FakeRepository;
  let service: SyncService;
  const push = (changes: SyncChange[], userId = USER) =>
    service.push(userId, { protocol: 1, changes }, NOW);

  beforeEach(() => {
    repo = new FakeRepository();
    service = new SyncService(repo as unknown as SyncRepository);
  });

  it('aceita o veículo e o abastecimento dele, cada um com a próxima versão do servidor', async () => {
    const { results } = await push([vehicle(), fuel()]);

    expect(results).toEqual([
      { table: 'vehicles', id: GOL, status: 'accepted' },
      { table: 'fuel_entries', id: FUEL, status: 'accepted' },
    ]);
    expect(repo.rows.get(`vehicles:${GOL}`)).toMatchObject({ ownerId: USER, version: 1n });
    expect(repo.rows.get(`fuel_entries:${FUEL}`)).toMatchObject({ ownerId: USER, version: 2n });
    expect(repo.touched).toEqual([USER]);
  });

  it('o dono vem do token, não do corpo', async () => {
    await push([vehicle({ userId: OTHER })]);
    expect(repo.rows.get(`vehicles:${GOL}`)?.ownerId).toBe(USER);
  });

  it('payload fora do schema, ou com outro id: rejeitada, sem derrubar as outras', async () => {
    const { results } = await push([
      vehicle({ name: '' }),
      { ...fuel(), payload: { ...(fuel().payload as object), id: GOL } },
      vehicle(),
    ]);
    expect(results.map((r) => [r.status, r.reason])).toEqual([
      ['rejected', 'INVALID'],
      ['rejected', 'INVALID'],
      ['accepted', undefined],
    ]);
    expect(repo.rows.size).toBe(1);
  });

  it('linha de outro usuário: rejeitada como inválida e nada muda', async () => {
    repo.seed('vehicles', GOL, OTHER, new Date('2020-01-01T00:00:00.000Z'));
    const { results } = await push([vehicle()]);

    expect(results[0]).toMatchObject({ status: 'rejected', reason: 'INVALID' });
    expect(repo.rows.get(`vehicles:${GOL}`)).toMatchObject({ ownerId: OTHER, version: 0n });
    expect(repo.counter).toBe(0n);
  });

  it('última escrita vence: mais antiga que a do servidor é STALE; igual ou mais nova vale', async () => {
    repo.seed('vehicles', GOL, USER, new Date('2026-10-23T11:30:00.000Z'));
    expect((await push([vehicle()])).results[0]).toMatchObject({
      status: 'rejected',
      reason: 'STALE',
    });

    expect(
      (await push([{ ...vehicle(), updatedAt: '2026-10-23T11:30:00.000Z' }])).results[0].status,
    ).toBe('accepted');
    expect(
      (await push([{ ...vehicle(), updatedAt: '2026-10-23T11:45:00.000Z' }])).results[0].status,
    ).toBe('accepted');
    expect(repo.rows.get(`vehicles:${GOL}`)?.updatedAt.toISOString()).toBe(
      '2026-10-23T11:45:00.000Z',
    );
  });

  it('relógio adiantado demais vale como a hora do servidor', async () => {
    await push([{ ...vehicle(), updatedAt: '2030-01-01T00:00:00.000Z' }]);
    expect(repo.rows.get(`vehicles:${GOL}`)?.updatedAt).toEqual(NOW);

    // Uma mudança honesta logo depois não perde para a do relógio errado.
    const after = await push([{ ...vehicle({ name: 'Gol G6' }), updatedAt: NOW.toISOString() }]);
    expect(after.results[0].status).toBe('accepted');
  });

  it('filha sem o veículo (ou com veículo de outro): PARENT_MISSING', async () => {
    expect((await push([fuel()])).results[0]).toMatchObject({
      status: 'rejected',
      reason: 'PARENT_MISSING',
    });

    repo.seed('vehicles', GOL, OTHER);
    expect((await push([fuel()])).results[0]).toMatchObject({
      status: 'rejected',
      reason: 'PARENT_MISSING',
    });
    expect(repo.rows.has(`fuel_entries:${FUEL}`)).toBe(false);
  });

  it('serviço aponta para um plano que precisa ser do usuário', async () => {
    repo.seed('vehicles', GOL, USER);
    const record: SyncChange = {
      table: 'maintenance_records',
      id: RECORD,
      op: 'upsert',
      updatedAt: SENT,
      payload: { id: RECORD, vehicleId: GOL, planId: PLAN, type: 'oil', date: SENT, km: 1500 },
    };
    expect((await push([record])).results[0].reason).toBe('PARENT_MISSING');

    repo.seed('maintenance_plans', PLAN, USER);
    expect((await push([record])).results[0].status).toBe('accepted');
  });

  it('exclusão: marca a linha com deletedAt e uma versão nova', async () => {
    await push([vehicle()]);
    const result = await push([
      {
        table: 'vehicles',
        id: GOL,
        op: 'delete',
        updatedAt: '2026-10-23T11:10:00.000Z',
        payload: { id: GOL, deletedAt: '2026-10-23T11:10:00.000Z' },
      },
    ]);

    expect(result.results[0].status).toBe('accepted');
    expect(repo.rows.get(`vehicles:${GOL}`)).toMatchObject({
      deletedAt: new Date('2026-10-23T11:10:00.000Z'),
      version: 2n,
    });
  });

  it('exclusão mais antiga que uma edição do servidor é STALE; de linha desconhecida, aceita sem gravar', async () => {
    repo.seed('vehicles', GOL, USER, new Date('2026-10-23T11:30:00.000Z'));
    const del = (id: string, updatedAt: string): SyncChange => ({
      table: 'vehicles',
      id,
      op: 'delete',
      updatedAt,
      payload: { id, deletedAt: updatedAt },
    });
    expect((await push([del(GOL, SENT)])).results[0].reason).toBe('STALE');

    const unknown = '018bcfe5-6800-7000-8000-0000000000ff';
    expect((await push([del(unknown, SENT)])).results[0].status).toBe('accepted');
    expect(repo.rows.has(`vehicles:${unknown}`)).toBe(false);
    expect(repo.counter).toBe(0n);
  });

  it('recria uma linha excluída quando a escrita é mais nova (a linha inteira vale)', async () => {
    await push([vehicle()]);
    await push([
      {
        table: 'vehicles',
        id: GOL,
        op: 'delete',
        updatedAt: '2026-10-23T11:10:00.000Z',
        payload: { id: GOL, deletedAt: '2026-10-23T11:10:00.000Z' },
      },
    ]);
    const back = await push([{ ...vehicle(), updatedAt: '2026-10-23T11:20:00.000Z' }]);
    expect(back.results[0].status).toBe('accepted');
  });

  it('protocolo mais novo que o da API: erro com código estável', async () => {
    const error = await service.push(USER, { protocol: 3, changes: [] }, NOW).catch((e) => e);
    expect(error).toBeInstanceOf(BadRequestException);
    expect(error.getResponse()).toMatchObject({ code: 'SYNC_PROTOCOL_UNSUPPORTED', supported: 2 });
    expect(repo.touched).toEqual([]);
  });

  it('posto é do próprio usuário, sem veículo pai', async () => {
    const STATION = '018bcfe5-6800-7000-8000-000000000201';
    const { results } = await push([
      vehicle(),
      {
        table: 'stations',
        id: STATION,
        op: 'upsert',
        updatedAt: SENT,
        payload: { id: STATION, osmId: 'node/1', name: 'Shell', lat: -23.5, lng: -46.6 },
      },
      fuel({ stationId: STATION, stationName: 'Shell' }),
    ]);
    expect(results.map((r) => r.status)).toEqual(['accepted', 'accepted', 'accepted']);
    expect(repo.rows.get(`stations:${STATION}`)).toMatchObject({ ownerId: USER });
    expect(repo.rows.get(`fuel_entries:${FUEL}`)?.data).toMatchObject({ stationId: STATION });
  });

  it('lote vazio vale', async () => {
    expect(await push([])).toEqual({ protocol: 2, results: [] });
  });
});

describe('SyncService.pull', () => {
  let repo: FakeRepository;
  let service: SyncService;
  const at = new Date('2026-10-20T15:30:00.000Z');

  const row = (table: SyncTable, id: string, version: bigint, extra = {}): PulledRow => ({
    table,
    id,
    version,
    updatedAt: at,
    deletedAt: null,
    row: { id, ...extra },
  });

  beforeEach(() => {
    repo = new FakeRepository();
    service = new SyncService(repo as unknown as SyncRepository);
  });

  it('devolve upsert no schema do app e delete só com id e data; nextSince é a última versão', async () => {
    repo.pulled = [
      row('vehicles', GOL, 3n, {
        name: 'Gol',
        type: 'flex',
        brand: null,
        model: null,
        year: null,
        plate: null,
        initialKm: 1000,
        archived: false,
        sortOrder: 0,
      }),
      { ...row('fuel_entries', FUEL, 5n), deletedAt: new Date('2026-10-21T10:00:00.000Z') },
    ];
    const res = await service.pull(USER, { protocol: 1, since: '0', limit: 200 }, NOW);

    expect(res.changes).toEqual([
      {
        table: 'vehicles',
        id: GOL,
        op: 'upsert',
        version: '3',
        updatedAt: at.toISOString(),
        payload: {
          id: GOL,
          name: 'Gol',
          type: 'flex',
          initialKm: 1000,
          sortOrder: 0,
          archived: false,
        },
      },
      {
        table: 'fuel_entries',
        id: FUEL,
        op: 'delete',
        version: '5',
        updatedAt: at.toISOString(),
        payload: { id: FUEL, deletedAt: '2026-10-21T10:00:00.000Z' },
      },
    ]);
    expect(res).toMatchObject({ protocol: 2, nextSince: '5', hasMore: false });
    expect(repo.touched).toEqual([USER]);
  });

  it('só traz o que passa de since; sem novidade, nextSince não anda', async () => {
    repo.pulled = [row('vehicles', GOL, 3n, { name: 'Gol', type: 'flex', initialKm: 0 })];
    const res = await service.pull(USER, { protocol: 1, since: '3', limit: 200 }, NOW);
    expect(res).toMatchObject({ changes: [], nextSince: '3', hasMore: false });
    expect(repo.listArgs).toEqual([{ since: 3n, limit: 200 }]);
  });

  it('página cheia: devolve até o limite e avisa que tem mais', async () => {
    repo.pulled = [1n, 2n, 3n].map((v) =>
      row('odometer_readings', `018bcfe5-6800-7000-8000-00000000010${v}`, v, {
        vehicleId: GOL,
        km: Number(v),
        readAt: at,
        source: 'manual',
      }),
    );
    const res = await service.pull(USER, { protocol: 1, since: '0', limit: 2 }, NOW);
    expect(res.changes.map((c) => c.version)).toEqual(['1', '2']);
    expect(res).toMatchObject({ nextSince: '2', hasMore: true });
  });

  it('app do protocolo 1 não recebe postos; o do 2 recebe, sem coordenada do posto local', async () => {
    const STATION = '018bcfe5-6800-7000-8000-000000000201';
    const LOCAL = '018bcfe5-6800-7000-8000-000000000202';
    repo.pulled = [
      row('stations', STATION, 1n, {
        osmId: 'node/1',
        name: 'Shell',
        brand: 'Shell',
        street: 'Av. da Pista',
        lat: -23.5,
        lng: -46.6,
      }),
      row('stations', LOCAL, 2n, {
        osmId: null,
        name: 'Posto do Zé',
        brand: null,
        street: null,
        lat: null,
        lng: null,
      }),
    ];
    const old = await service.pull(USER, { protocol: 1, since: '0', limit: 200 }, NOW);
    expect(old.changes).toEqual([]);
    expect(repo.listTables[0]).not.toContain('stations');

    const res = await service.pull(USER, { protocol: 2, since: '0', limit: 200 }, NOW);
    expect(res.changes.map((c) => c.payload)).toEqual([
      {
        id: STATION,
        osmId: 'node/1',
        name: 'Shell',
        brand: 'Shell',
        street: 'Av. da Pista',
        lat: -23.5,
        lng: -46.6,
      },
      { id: LOCAL, name: 'Posto do Zé' },
    ]);
  });

  it('protocolo mais novo que o da API: erro', async () => {
    await expect(
      service.pull(USER, { protocol: 9, since: '0', limit: 10 }, NOW),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
