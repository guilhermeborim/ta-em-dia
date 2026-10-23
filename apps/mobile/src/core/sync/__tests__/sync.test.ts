import { SYNC_UPSERT_SCHEMAS, syncDeletePayloadSchema } from '@ta-em-dia/shared';
import { addDocument, deleteDocument, listDocuments } from '../../documents';
import { migrate } from '../../db/migrations';
import { createTestDb } from '../../db/testing/testDb';
import type { Db } from '../../db';
import { addFuelEntry, deleteFuelEntry, listFuelEntries } from '../../fuel';
import { addManualReading } from '../../odometer';
import { registerMaintenance } from '../../../features/maintenance/models/register.repository';
import {
  createVehicle,
  deleteVehicle,
  listVehicles,
  updateVehicle,
} from '../../../features/vehicles/models/vehicles.repository';
import { readOutboxBatch } from '../outboxQueue';
import { syncNow } from '../syncEngine';
import { getSyncSince } from '../syncState';
import { createFakeServer } from '../testing/fakeServer';

const GOL = '018bcfe5-6800-7000-8000-000000000001';
const FUEL = '018bcfe5-6800-7000-8000-000000000002';
const T0 = new Date('2026-10-20T10:00:00.000Z');
const minutes = (n: number) => new Date(T0.getTime() + n * 60_000);

async function newDevice(): Promise<Db> {
  const db = createTestDb();
  await migrate(db);
  return db;
}

const deps = (db: Db, server: ReturnType<typeof createFakeServer>, extra = {}) => ({
  db,
  apiUrl: 'https://api.test',
  accessToken: 'token-do-teste',
  fetchFn: server.fetchFn,
  ...extra,
});

const outboxSize = async (db: Db) =>
  (await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM outbox'))!.n;

/** Tudo que o app grava no dia a dia, um de cada. */
async function seed(db: Db) {
  await createVehicle(
    db,
    { name: 'Gol', type: 'flex', brand: 'VW', plate: 'BRA2E19', initialKm: 1000 },
    { id: GOL, now: minutes(0) },
  );
  await addFuelEntry(
    db,
    {
      vehicleId: GOL,
      date: minutes(1),
      km: 1200,
      fuelType: 'gasoline',
      liters: 30.123,
      pricePerLiter: 5.499,
      total: 165.65,
      fullTank: true,
    },
    { id: FUEL, now: minutes(1) },
  );
  await addManualReading(db, { vehicleId: GOL, km: 1300 }, { now: minutes(2) });
  await registerMaintenance(
    db,
    { vehicleId: GOL, type: 'Revisão do freio', date: minutes(3), km: 1250, cost: 320.5 },
    { now: minutes(3) },
  );
  await addDocument(
    db,
    { vehicleId: GOL, kind: 'ipva', dueDate: '2026-11-20' },
    { now: minutes(4) },
  );
  await addDocument(
    db,
    { kind: 'cnh', dueDate: '2027-05-01', notifyDays: [30] },
    { now: minutes(5) },
  );
}

describe('o que o app grava na outbox cabe no contrato da API', () => {
  it('todo upsert passa no schema da tabela e toda exclusão, no de exclusão', async () => {
    const db = await newDevice();
    await seed(db);
    await updateVehicle(
      db,
      GOL,
      { name: 'Gol G6', brand: 'VW', model: 'G6', year: 2019, plate: 'BRA2E19' },
      minutes(6),
    );
    await deleteFuelEntry(db, FUEL, minutes(7));
    await deleteVehicle(db, GOL, minutes(8));

    const { changes, invalid } = await readOutboxBatch(db, 500);
    expect(invalid).toEqual([]);
    expect(new Set(changes.map((c) => c.table))).toEqual(
      new Set([
        'vehicles',
        'fuel_entries',
        'odometer_readings',
        'maintenance_plans',
        'maintenance_records',
        'documents',
      ]),
    );
    for (const change of changes) {
      const schema =
        change.op === 'delete' ? syncDeletePayloadSchema : SYNC_UPSERT_SCHEMAS[change.table];
      const parsed = schema.safeParse(change.payload);
      expect([change.table, change.op, parsed.success]).toEqual([change.table, change.op, true]);
    }
  });
});

describe('syncNow', () => {
  it('envia a fila inteira em lotes e esvazia a outbox', async () => {
    const db = await newDevice();
    const server = createFakeServer();
    await seed(db);
    const queued = await outboxSize(db);
    expect(queued).toBeGreaterThanOrEqual(6);

    const result = await syncNow(deps(db, server));

    expect(result.outcome).toBe('done');
    expect(await outboxSize(db)).toBe(0);
    expect(server.stored.size).toBe(queued);
    // Todo pedido leva o token.
    expect(server.calls.every((call) => call.token === 'token-do-teste')).toBe(true);
  });

  it('fila grande: vários lotes de até 100', async () => {
    const db = await newDevice();
    const server = createFakeServer();
    await createVehicle(db, { name: 'Gol', type: 'flex', initialKm: 1 }, { id: GOL, now: T0 });
    for (let i = 0; i < 230; i++) {
      await addManualReading(db, { vehicleId: GOL, km: 1000 + i }, { now: minutes(i) });
    }
    await syncNow(deps(db, server));

    const pushes = server.calls.filter((call) => call.method === 'POST');
    expect(pushes).toHaveLength(3);
    expect(await outboxSize(db)).toBe(0);
    expect(server.stored.size).toBe(231);
  });

  it('sem rede: a fila e o since ficam como estavam', async () => {
    const db = await newDevice();
    const server = createFakeServer();
    await seed(db);
    const queued = await outboxSize(db);
    server.state.down = true;

    expect(await syncNow(deps(db, server))).toEqual({ outcome: 'retry', applied: 0 });
    expect(await outboxSize(db)).toBe(queued);
    expect(await getSyncSince(db)).toBe('0');
  });

  it('401: devolve unauthorized sem mexer na fila', async () => {
    const db = await newDevice();
    const server = createFakeServer();
    await seed(db);
    const queued = await outboxSize(db);
    server.state.unauthorized = true;

    expect((await syncNow(deps(db, server))).outcome).toBe('unauthorized');
    expect(await outboxSize(db)).toBe(queued);
  });

  it('resposta do push de outro tamanho: não dá para saber o que foi aceito, a fila fica', async () => {
    const db = await newDevice();
    const server = createFakeServer();
    await seed(db);
    const queued = await outboxSize(db);
    server.state.malformedPush = true;

    expect((await syncNow(deps(db, server))).outcome).toBe('retry');
    expect(await outboxSize(db)).toBe(queued);
  });

  it('linha da fila que não tem como ser enviada é descartada, sem travar as outras', async () => {
    const db = await newDevice();
    const server = createFakeServer();
    await db.runAsync(
      "INSERT INTO outbox (table_name, row_id, op, payload, updated_at) VALUES ('vehicles', 'x', 'upsert', '{quebrado', '2026-10-20T10:00:00.000Z')",
    );
    await seed(db);

    const result = await syncNow(deps(db, server));
    expect(result.outcome).toBe('done');
    expect(await outboxSize(db)).toBe(0);
    expect(server.stored.has('vehicles:x')).toBe(false);
  });

  it('API que recusa o pedido (400): rejected, e não fica tentando', async () => {
    const db = await newDevice();
    await seed(db);
    const fetchFn = (async () =>
      ({
        ok: false,
        status: 400,
        json: async () => ({ code: 'SYNC_PROTOCOL_UNSUPPORTED' }),
      }) as Response) as unknown as typeof fetch;
    expect((await syncNow({ ...deps(db, createFakeServer()), fetchFn })).outcome).toBe('rejected');
  });
});

describe('dois aparelhos', () => {
  it('o segundo recebe tudo do primeiro, igual', async () => {
    const server = createFakeServer();
    const a = await newDevice();
    const b = await newDevice();
    await seed(a);
    await syncNow(deps(a, server));

    const result = await syncNow(deps(b, server));
    expect(result.outcome).toBe('done');
    expect(result.applied).toBeGreaterThanOrEqual(6);

    expect(await listVehicles(b)).toEqual(await listVehicles(a));
    expect(await listFuelEntries(b, GOL)).toEqual(await listFuelEntries(a, GOL));
    expect(await listDocuments(b, GOL)).toEqual(await listDocuments(a, GOL));
    for (const table of ['odometer_readings', 'maintenance_plans', 'maintenance_records']) {
      const rows = (db: Db) =>
        db.getAllAsync(`SELECT * FROM ${table} ORDER BY id`).then((r) =>
          (r as Record<string, unknown>[]).map(({ created_at, updated_at, version, ...rest }) => {
            void created_at;
            void updated_at;
            void version;
            return rest;
          }),
        );
      expect(await rows(b)).toEqual(await rows(a));
    }
    // O que chegou não volta para o servidor.
    expect(await outboxSize(b)).toBe(0);
  });

  it('o pull em páginas pega tudo, e o since anda até a última versão', async () => {
    const server = createFakeServer();
    const a = await newDevice();
    const b = await newDevice();
    await seed(a);
    await syncNow(deps(a, server));

    const result = await syncNow(deps(b, server, { pullLimit: 2 }));
    expect(result.outcome).toBe('done');
    expect(server.calls.filter((call) => call.method === 'GET').length).toBeGreaterThanOrEqual(4);
    expect(await getSyncSince(b)).toBe(String(server.stored.size));
    expect(await listVehicles(b)).toHaveLength(1);
  });

  it('a filha pode chegar antes do veículo (versões fora de ordem) sem quebrar', async () => {
    const server = createFakeServer();
    const a = await newDevice();
    const b = await newDevice();
    await seed(a);
    await syncNow(deps(a, server));
    // O veículo é editado depois: a versão dele passa a ser a maior e ele chega por último.
    await updateVehicle(
      a,
      GOL,
      { name: 'Gol G6', brand: 'VW', model: 'G6', year: 2019, plate: 'BRA2E19' },
      minutes(30),
    );
    await syncNow(deps(a, server));

    const result = await syncNow(deps(b, server));
    expect(result.outcome).toBe('done');
    expect((await listVehicles(b))[0]).toMatchObject({ name: 'Gol G6', model: 'G6' });
    expect(await listFuelEntries(b, GOL)).toHaveLength(1);
  });

  it('edição e exclusão do primeiro chegam ao segundo', async () => {
    const server = createFakeServer();
    const a = await newDevice();
    const b = await newDevice();
    await seed(a);
    await syncNow(deps(a, server));
    await syncNow(deps(b, server));

    await deleteFuelEntry(a, FUEL, minutes(40));
    const ipva = (await listDocuments(a, GOL)).find((d) => d.kind === 'ipva')!;
    await deleteDocument(a, ipva.id, minutes(41));
    await syncNow(deps(a, server));
    await syncNow(deps(b, server));

    expect(await listFuelEntries(b, GOL)).toEqual([]);
    expect((await listDocuments(b, GOL)).map((d) => d.kind)).toEqual(['cnh']);
    const row = await b.getFirstAsync<{ deleted_at: string }>(
      'SELECT deleted_at FROM fuel_entries WHERE id = ?',
      FUEL,
    );
    expect(row?.deleted_at).toBe(minutes(40).toISOString());
  });

  it('última escrita vence: a mais antiga é rejeitada e o aparelho fica com a do servidor', async () => {
    const server = createFakeServer();
    const a = await newDevice();
    const b = await newDevice();
    await seed(a);
    await syncNow(deps(a, server));
    await syncNow(deps(b, server));

    // B edita offline (mais antigo); A edita depois e envia primeiro.
    await updateVehicle(b, GOL, { name: 'Do B', brand: 'VW', plate: 'BRA2E19' }, minutes(50));
    await updateVehicle(a, GOL, { name: 'Do A', brand: 'VW', plate: 'BRA2E19' }, minutes(60));
    await syncNow(deps(a, server));
    const result = await syncNow(deps(b, server));

    expect(result.outcome).toBe('done');
    expect(await outboxSize(b)).toBe(0);
    expect((await listVehicles(b))[0].name).toBe('Do A');
  });

  it('mudança local ainda na fila não é sobrescrita pelo pull', async () => {
    const server = createFakeServer();
    const a = await newDevice();
    const b = await newDevice();
    await seed(a);
    await syncNow(deps(a, server));
    await syncNow(deps(b, server));
    await updateVehicle(a, GOL, { name: 'Do A', brand: 'VW', plate: 'BRA2E19' }, minutes(60));
    await syncNow(deps(a, server));

    // B grava no meio do sync: a mudança entra na fila depois do envio e antes do pull.
    server.state.down = false;
    const original = server.fetchFn;
    let wrote = false;
    const fetchFn = (async (url: string, init: RequestInit) => {
      if (init.method === 'GET' && !wrote) {
        wrote = true;
        await updateVehicle(
          b,
          GOL,
          { name: 'Do B agora', brand: 'VW', plate: 'BRA2E19' },
          minutes(70),
        );
      }
      return original(url, init);
    }) as unknown as typeof fetch;

    await syncNow({ ...deps(b, server), fetchFn });
    expect((await listVehicles(b))[0].name).toBe('Do B agora');
    expect(await outboxSize(b)).toBeGreaterThan(0);

    // No próximo ciclo a mudança sai e vale (é a mais nova).
    await syncNow(deps(b, server));
    await syncNow(deps(a, server));
    expect((await listVehicles(a))[0].name).toBe('Do B agora');
  });
});
