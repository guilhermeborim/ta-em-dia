import type { AuthTokens } from '@ta-em-dia/shared';
import { loadSession, saveSession, toSession } from '../../auth/session';
import type { SecretStore } from '../../auth/installation';
import { enqueue } from '../../db';
import { migrate } from '../../db/migrations';
import { createTestDb } from '../../db/testing/testDb';
import { canSync } from '../policy';
import { runSync } from '../syncRunner';
import { createFakeServer } from '../testing/fakeServer';

const VEHICLE = '018bcfe5-6800-7000-8000-000000000001';

function memoryStore(): SecretStore {
  const data = new Map<string, string>();
  return {
    getItemAsync: async (key) => data.get(key) ?? null,
    setItemAsync: async (key, value) => void data.set(key, value),
    deleteItemAsync: async (key) => void data.delete(key),
  };
}

const tokens = (isAnonymous: boolean): AuthTokens => ({
  accessToken: 'jwt-valido',
  expiresIn: 900,
  refreshToken: 'refresh',
  user: { id: '018bcfe5-6800-7000-8000-0000000000aa', isAnonymous, plan: 'free' },
});

async function setup(isAnonymous: boolean, flags: { cloud: boolean; anonymous: boolean }) {
  const db = createTestDb();
  await migrate(db);
  await db.runAsync(
    `INSERT INTO vehicles (id, name, type, initial_km, created_at, updated_at)
     VALUES (?, 'Gol', 'flex', 1000, '2026-10-20T10:00:00.000Z', '2026-10-20T10:00:00.000Z')`,
    VEHICLE,
  );
  await enqueue(
    db,
    'vehicles',
    VEHICLE,
    'upsert',
    { id: VEHICLE, name: 'Gol', type: 'flex', initialKm: 1000 },
    '2026-10-20T10:00:00.000Z',
  );
  const store = memoryStore();
  await saveSession(store, toSession(tokens(isAnonymous), new Date()));
  const server = createFakeServer();
  const onApplied = jest.fn();
  const run = () =>
    runSync({
      db,
      apiUrl: 'https://api.test',
      platform: 'android',
      store,
      flags,
      fetchFn: server.fetchFn,
      onApplied,
    });
  return { db, store, server, run, onApplied };
}

const queued = async (db: Awaited<ReturnType<typeof setup>>['db']) =>
  (await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM outbox'))!.n;

describe('canSync', () => {
  it('conta com login sincroniza; anônimo só com a flag; sem sync.cloud, ninguém', () => {
    expect(canSync({ isAnonymous: false }, { cloud: true, anonymous: false })).toBe(true);
    expect(canSync({ isAnonymous: true }, { cloud: true, anonymous: false })).toBe(false);
    expect(canSync({ isAnonymous: true }, { cloud: true, anonymous: true })).toBe(true);
    expect(canSync({ isAnonymous: false }, { cloud: false, anonymous: true })).toBe(false);
  });
});

describe('runSync', () => {
  it('anônimo com a flag desligada (o padrão): não chama a API e não mexe na fila', async () => {
    const { db, server, run } = await setup(true, { cloud: true, anonymous: false });
    expect(await run()).toBe('skipped');
    expect(server.calls).toEqual([]);
    expect(await queued(db)).toBe(1);
  });

  it('sem sync.cloud: nem olha a sessão', async () => {
    const { server, run } = await setup(false, { cloud: false, anonymous: true });
    expect(await run()).toBe('skipped');
    expect(server.calls).toEqual([]);
  });

  it('anônimo com a flag ligada: sincroniza com o token da sessão', async () => {
    const { db, server, run } = await setup(true, { cloud: true, anonymous: true });
    expect(await run()).toBe('done');
    expect(await queued(db)).toBe(0);
    expect(server.calls.map((c) => [c.method, c.path, c.token])).toEqual([
      ['POST', '/v1/sync/push', 'jwt-valido'],
      ['GET', '/v1/sync/pull', 'jwt-valido'],
    ]);
  });

  it('conta com login sincroniza mesmo com a flag de anônimo desligada', async () => {
    const { server, run } = await setup(false, { cloud: true, anonymous: false });
    expect(await run()).toBe('done');
    expect(server.calls.length).toBeGreaterThan(0);
  });

  it('avisa só quando o pull mudou o banco local', async () => {
    const { db, run, onApplied } = await setup(false, { cloud: true, anonymous: false });
    expect(await run()).toBe('done');
    // O próprio veículo volta no pull (1 linha aplicada).
    expect(onApplied).toHaveBeenCalledTimes(1);
    // Nada novo no servidor: não avisa de novo.
    expect(await run()).toBe('done');
    expect(onApplied).toHaveBeenCalledTimes(1);
    expect(await queued(db)).toBe(0);
  });

  it('401: marca o acesso como vencido (a próxima rodada renova) e pede nova tentativa', async () => {
    const { db, store, server, run } = await setup(false, { cloud: true, anonymous: false });
    server.state.unauthorized = true;

    expect(await run()).toBe('retry');
    expect((await loadSession(store))?.expiresAt).toBe(0);
    expect(await queued(db)).toBe(1);
  });
});
