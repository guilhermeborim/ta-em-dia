import type { AuthTokens, SocialProvider } from '@ta-em-dia/shared';
import { migrate } from '../../db/migrations';
import { createTestDb } from '../../db/testing/testDb';
import { getSetting, type Db } from '../../db';
import { addFuelEntry } from '../../fuel';
import { syncNow } from '../../sync/syncEngine';
import { getSyncSince } from '../../sync/syncState';
import { createFakeServer } from '../../sync/testing/fakeServer';
import { createVehicle } from '../../../features/vehicles/models/vehicles.repository';
import { loadAccount, saveAccount } from '../account';
import {
  finishLink,
  loginFlow,
  pendingChanges,
  resolveConflict,
  signOut,
  startLink,
  type AccountFlowDeps,
  deleteAccount,
} from '../accountFlow';
import type { SecretStore } from '../installation';
import type { SignInResult } from '../providers';
import { loadSession, saveSession, toSession } from '../session';
import { onSignedOut } from '../signOutEvents';

const mockRefreshReminders = jest.fn(async () => {});
jest.mock('../../reminders', () => ({ refreshReminders: () => mockRefreshReminders() }));

const NOW = new Date('2026-10-23T12:00:00.000Z');
const GOL = '018bcfe5-6800-7000-8000-000000000001';
const FUEL = '018bcfe5-6800-7000-8000-000000000002';

const anonymous: AuthTokens = {
  accessToken: 'anon.jwt',
  expiresIn: 900,
  refreshToken: 'anon-refresh',
  user: { id: 'anon-1', isAnonymous: true, plan: 'free' },
};
const account: AuthTokens = {
  accessToken: 'conta.jwt',
  expiresIn: 900,
  refreshToken: 'conta-refresh',
  user: { id: 'conta-1', isAnonymous: false, plan: 'free' },
};

const credential = (provider: SocialProvider = 'google') => ({
  provider,
  idToken: 'id-token-da-ana',
  name: 'Ana Maria',
  email: 'ana@example.com',
});

function memoryStore(): SecretStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItemAsync: async (key) => data.get(key) ?? null,
    setItemAsync: async (key, value) => void data.set(key, value),
    deleteItemAsync: async (key) => void data.delete(key),
  };
}

const json = (status: number, body: unknown) =>
  ({ ok: status < 300, status, json: async () => body }) as Response;

/** API de mentira: as rotas de login respondem o que o teste mandar; o sync é o de verdade do fake. */
function setup(routes: Record<string, () => Response | Promise<Response>>) {
  const sync = createFakeServer();
  const calls: { path: string; body: Record<string, unknown>; token?: string }[] = [];
  const fetchFn = (async (url: string, init: RequestInit) => {
    const path = new URL(url).pathname;
    const handler = routes[path];
    if (handler) {
      calls.push({
        path,
        body: init.body ? (JSON.parse(init.body as string) as Record<string, unknown>) : {},
        token: (init.headers as Record<string, string>).authorization?.replace('Bearer ', ''),
      });
      return handler();
    }
    return sync.fetchFn(url, init);
  }) as unknown as typeof fetch;
  return { fetchFn, calls, sync };
}

async function newDeps(
  fetchFn: typeof fetch,
  signIn: (provider: SocialProvider) => Promise<SignInResult>,
  options: { session?: AuthTokens } = {},
) {
  const db = createTestDb();
  await migrate(db);
  const store = memoryStore();
  if (options.session) await saveSession(store, toSession(options.session, NOW));
  const onApplied = jest.fn();
  const signOutProvider = jest.fn(async () => {});
  const deps: AccountFlowDeps = {
    db,
    apiUrl: 'https://api.test',
    platform: 'android',
    store,
    fetchFn,
    now: () => NOW,
    credentials: async () => ({ installationId: 'inst-1', secret: 'segredo-1' }),
    signIn,
    signOutProvider,
    onApplied,
  };
  return { db, store, deps, onApplied, signOutProvider };
}

const ok =
  (provider: SocialProvider = 'google'): (() => Promise<SignInResult>) =>
  async () => ({
    kind: 'ok',
    credential: credential(provider),
  });

/** O que o app grava no dia a dia, para ter fila para enviar. */
async function seed(db: Db) {
  await createVehicle(
    db,
    { name: 'Gol', type: 'flex', plate: 'BRA2E19', initialKm: 1000 },
    { id: GOL, now: NOW },
  );
  await addFuelEntry(
    db,
    {
      vehicleId: GOL,
      date: NOW,
      km: 1200,
      fuelType: 'gasoline',
      liters: 30,
      pricePerLiter: 5.5,
      total: 165,
      fullTank: true,
    },
    { id: FUEL, now: NOW },
  );
}

const countRows = async (db: Db, table: string) =>
  (await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`))!.n;

beforeEach(() => mockRefreshReminders.mockClear());

describe('loginFlow (tela 3)', () => {
  it('entra na conta, guarda o perfil e a sessão e traz os dados; sem veículo na conta, hasVehicles é falso', async () => {
    const { fetchFn, calls } = setup({ '/v1/auth/google': () => json(200, account) });
    const { db, store, deps } = await newDeps(fetchFn, ok());

    const onDownload = jest.fn();
    expect(await loginFlow(deps, 'google', { onDownload })).toEqual({
      status: 'done',
      hasVehicles: false,
    });
    // Só avisa que está baixando depois do login dar certo.
    expect(onDownload).toHaveBeenCalledTimes(1);

    expect(calls[0].body).toEqual({
      idToken: 'id-token-da-ana',
      installationId: 'inst-1',
      platform: 'android',
      name: 'Ana Maria',
    });
    expect((await loadSession(store))?.tokens.user.id).toBe('conta-1');
    expect(await loadAccount(db)).toEqual({
      provider: 'google',
      name: 'Ana Maria',
      email: 'ana@example.com',
    });
    expect(await getSetting(db, 'login_mode')).toBe('google');
  });

  it('a conta já tem veículo (outro celular): o pull traz e hasVehicles é verdadeiro', async () => {
    const { fetchFn, sync } = setup({ '/v1/auth/apple': () => json(200, account) });
    // Outro aparelho já enviou um veículo para a conta.
    const other = await newDeps(sync.fetchFn, ok('apple'));
    await seed(other.db);
    await syncNow({
      db: other.db,
      apiUrl: 'https://api.test',
      accessToken: 't',
      fetchFn: sync.fetchFn,
    });

    const { db, deps, onApplied } = await newDeps(fetchFn, ok('apple'));
    expect(await loginFlow(deps, 'apple')).toEqual({ status: 'done', hasVehicles: true });
    expect(await countRows(db, 'vehicles')).toBe(1);
    expect(onApplied).toHaveBeenCalled();
  });

  it('janela fechada, login indisponível e erro do provedor: nada é chamado nem guardado', async () => {
    const { fetchFn, calls } = setup({});
    for (const kind of ['cancelled', 'unavailable', 'error'] as const) {
      const { db, store, deps } = await newDeps(fetchFn, async () => ({ kind }));
      const onDownload = jest.fn();
      expect(await loginFlow(deps, 'google', { onDownload })).toEqual({ status: kind });
      expect(onDownload).not.toHaveBeenCalled();
      expect(await loadSession(store)).toBeNull();
      expect(await loadAccount(db)).toBeNull();
    }
    expect(calls).toHaveLength(0);
  });

  it('API recusou o token ou está fora: não guarda o perfil', async () => {
    for (const [response, status] of [
      [() => json(401, { code: 'INVALID_ID_TOKEN' }), 'rejected'],
      [() => json(503, {}), 'retry'],
    ] as const) {
      const { fetchFn } = setup({ '/v1/auth/google': response });
      const { db, deps } = await newDeps(fetchFn, ok());
      expect(await loginFlow(deps, 'google')).toEqual({ status });
      expect(await loadAccount(db)).toBeNull();
    }
  });

  it('o login deu certo mas o pull falhou: retry, e o login fica guardado para tocar de novo', async () => {
    const { fetchFn, sync } = setup({ '/v1/auth/google': () => json(200, account) });
    sync.state.down = true;
    const { db, deps } = await newDeps(fetchFn, ok());
    expect(await loginFlow(deps, 'google')).toEqual({ status: 'retry' });
    expect((await loadAccount(db))?.provider).toBe('google');
  });
});

describe('startLink, resolveConflict e finishLink (telas 19, 24 e 23)', () => {
  it('conta nova: liga ao anônimo, guarda os tokens da conta e envia a fila com progresso', async () => {
    const linked = { ...account, user: { ...account.user, id: 'anon-1' }, outcome: 'linked' };
    const { fetchFn, calls, sync } = setup({ '/v1/auth/link': () => json(200, linked) });
    const { db, store, deps } = await newDeps(fetchFn, ok(), { session: anonymous });
    await seed(db);
    expect(await pendingChanges(db)).toBe(2);

    const start = await startLink(deps, 'google');
    expect(start).toEqual({ status: 'done', outcome: 'linked' });
    // Foi com o token do anônimo, e o corpo leva o provedor.
    expect(calls[0].token).toBe('anon.jwt');
    expect(calls[0].body).toMatchObject({ provider: 'google', installationId: 'inst-1' });
    expect(calls[0].body).not.toHaveProperty('onConflict');
    expect((await loadSession(store))?.tokens.user.isAnonymous).toBe(false);
    expect((await loadSession(store))?.tokens.accessToken).toBe('conta.jwt');
    expect((await loadAccount(db))?.name).toBe('Ana Maria');

    const progress: { done: number; total: number }[] = [];
    expect(await finishLink(deps, 'linked', (p) => progress.push(p))).toEqual({ synced: true });
    expect(progress[0]).toEqual({ done: 0, total: 2 });
    expect(progress.at(-1)).toEqual({ done: 2, total: 2 });
    expect(sync.stored.size).toBe(2);
    expect(await pendingChanges(db)).toBe(0);
    // O envio foi com o token da conta.
    expect(sync.calls.every((call) => call.token === 'conta.jwt')).toBe(true);
  });

  it('conta que já existe: devolve o conflito com os números e não mexe em nada', async () => {
    const body = { code: 'ACCOUNT_EXISTS', account: { vehicles: 1, records: 22 } };
    const { fetchFn } = setup({ '/v1/auth/link': () => json(409, body) });
    const { db, store, deps } = await newDeps(fetchFn, ok(), { session: anonymous });
    await seed(db);

    const start = await startLink(deps, 'google');
    expect(start).toEqual({
      status: 'conflict',
      account: { vehicles: 1, records: 22 },
      credential: credential(),
    });
    expect((await loadSession(store))?.tokens.accessToken).toBe('anon.jwt');
    expect(await loadAccount(db)).toBeNull();
    expect(await countRows(db, 'vehicles')).toBe(1);
    expect(await pendingChanges(db)).toBe(2);
  });

  it('"Juntar dados": repete com merge, guarda a conta e envia a fila', async () => {
    const merged = { ...account, outcome: 'merged' };
    const { fetchFn, calls, sync } = setup({ '/v1/auth/link': () => json(200, merged) });
    const { db, deps } = await newDeps(fetchFn, ok(), { session: anonymous });
    await seed(db);

    expect(await resolveConflict(deps, credential(), 'merge')).toEqual({
      status: 'done',
      outcome: 'merged',
    });
    expect(calls[0].body.onConflict).toBe('merge');
    expect(await finishLink(deps, 'merged')).toEqual({ synced: true });
    expect(sync.stored.size).toBe(2);
    expect(await countRows(db, 'vehicles')).toBe(1);
  });

  it('"Usar só os da conta": apaga os dados do aparelho, zera o sync e traz os da conta', async () => {
    const switched = { ...account, outcome: 'switched' };
    const { fetchFn, calls, sync } = setup({ '/v1/auth/link': () => json(200, switched) });
    // A conta tem um veículo enviado por outro celular.
    sync.stored.set('vehicles:conta', {
      version: 1,
      change: {
        table: 'vehicles',
        id: '018bcfe5-6800-7000-8000-0000000000aa',
        op: 'upsert',
        updatedAt: NOW.toISOString(),
        payload: {
          id: '018bcfe5-6800-7000-8000-0000000000aa',
          name: 'Do outro celular',
          type: 'flex',
          initialKm: 5,
        },
      },
    });

    const { db, deps, onApplied } = await newDeps(fetchFn, ok(), { session: anonymous });
    await seed(db);

    expect(await resolveConflict(deps, credential(), 'use_account')).toEqual({
      status: 'done',
      outcome: 'switched',
    });
    expect(calls[0].body.onConflict).toBe('use_account');
    expect(await finishLink(deps, 'switched')).toEqual({ synced: true });

    const vehicles = await db.getAllAsync<{ id: string; name: string }>(
      'SELECT id, name FROM vehicles',
    );
    expect(vehicles.map((v) => v.name)).toEqual(['Do outro celular']);
    expect(await countRows(db, 'fuel_entries')).toBe(0);
    expect(await pendingChanges(db)).toBe(0);
    expect(await getSyncSince(db)).toBe('1');
    expect(onApplied).toHaveBeenCalled();
    expect(mockRefreshReminders).toHaveBeenCalled();
  });

  it('sem internet no envio: a conta foi ligada, synced é falso e a fila continua', async () => {
    const linked = { ...account, outcome: 'linked' };
    const { fetchFn, sync } = setup({ '/v1/auth/link': () => json(200, linked) });
    const { db, deps } = await newDeps(fetchFn, ok(), { session: anonymous });
    await seed(db);
    await startLink(deps, 'google');

    sync.state.down = true;
    expect(await finishLink(deps, 'linked')).toEqual({ synced: false });
    expect(await pendingChanges(db)).toBe(2);
  });

  it('janela fechada, API fora, acesso recusado e conta que já tem login: nada muda', async () => {
    const cases: [() => Response, string][] = [
      [() => json(503, {}), 'retry'],
      [() => json(409, { code: 'ALREADY_LINKED' }), 'rejected'],
      [() => json(403, { code: 'DEVICE_MISMATCH' }), 'rejected'],
      [() => json(401, { code: 'INVALID_ID_TOKEN' }), 'rejected'],
    ];
    for (const [response, status] of cases) {
      const { fetchFn } = setup({ '/v1/auth/link': response });
      const { db, store, deps } = await newDeps(fetchFn, ok(), { session: anonymous });
      expect(await startLink(deps, 'google')).toEqual({ status });
      expect((await loadSession(store))?.tokens.accessToken).toBe('anon.jwt');
      expect(await loadAccount(db)).toBeNull();
    }
    const { fetchFn, calls } = setup({});
    const { deps } = await newDeps(fetchFn, async () => ({ kind: 'cancelled' }), {
      session: anonymous,
    });
    expect(await startLink(deps, 'apple')).toEqual({ status: 'cancelled' });
    expect(calls).toHaveLength(0);
  });

  it('401 do acesso (UNAUTHORIZED): marca vencido para renovar e pede nova tentativa', async () => {
    const { fetchFn } = setup({ '/v1/auth/link': () => json(401, { code: 'UNAUTHORIZED' }) });
    const { store, deps } = await newDeps(fetchFn, ok(), { session: anonymous });
    expect(await startLink(deps, 'google')).toEqual({ status: 'retry' });
    expect((await loadSession(store))?.expiresAt).toBe(0);
  });
});

describe('signOut (Sair da conta)', () => {
  it('apaga dados, fila, perfil, sessão e credenciais do aparelho, cancela os avisos e sai do Google', async () => {
    const { fetchFn } = setup({});
    const { db, store, deps, signOutProvider } = await newDeps(fetchFn, ok(), { session: account });
    await seed(db);
    await saveAccount(db, {
      provider: 'google',
      name: 'Ana',
      email: 'a@b.c',
    });
    store.data.set('installation_id', 'inst-1');
    store.data.set('installation_secret', 'segredo-1');

    const signedOut = jest.fn();
    const stop = onSignedOut(signedOut);
    await signOut(deps);
    stop();

    expect(signedOut).toHaveBeenCalledTimes(1);
    expect(await countRows(db, 'vehicles')).toBe(0);
    expect(await countRows(db, 'fuel_entries')).toBe(0);
    expect(await pendingChanges(db)).toBe(0);
    expect(await loadAccount(db)).toBeNull();
    expect(await getSetting(db, 'login_mode')).toBeNull();
    expect(await loadSession(store)).toBeNull();
    expect(store.data.has('installation_id')).toBe(false);
    expect(store.data.has('installation_secret')).toBe(false);
    expect(mockRefreshReminders).toHaveBeenCalled();
    expect(signOutProvider).toHaveBeenCalledWith('google');
  });

  it('preserva as preferências do app (Configurações)', async () => {
    const { fetchFn } = setup({});
    const { db, deps } = await newDeps(fetchFn, ok(), { session: account });
    await db.runAsync(
      "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('settings.notify_odometer', '1')",
    );
    await signOut(deps);
    expect(await getSetting(db, 'settings.notify_odometer')).toBe('1');
  });
});

describe('deleteAccount (Excluir minha conta)', () => {
  it('a API apagou: faz o mesmo que sair (dados, perfil, sessão e credenciais) e avisa o app', async () => {
    const { fetchFn, calls } = setup({
      '/v1/auth/account': () => json(200, { deleted: true }),
    });
    const { db, store, deps, signOutProvider } = await newDeps(fetchFn, ok(), { session: account });
    await seed(db);
    await saveAccount(db, { provider: 'google', name: 'Ana', email: 'a@b.c' });
    store.data.set('installation_id', 'inst-1');

    const signedOut = jest.fn();
    const stop = onSignedOut(signedOut);
    expect(await deleteAccount(deps)).toBe('done');
    stop();

    expect(calls).toEqual([{ path: '/v1/auth/account', body: {}, token: expect.any(String) }]);
    expect(signedOut).toHaveBeenCalledTimes(1);
    expect(await countRows(db, 'vehicles')).toBe(0);
    expect(await loadAccount(db)).toBeNull();
    expect(await loadSession(store)).toBeNull();
    expect(store.data.has('installation_id')).toBe(false);
    expect(signOutProvider).toHaveBeenCalledWith('google');
  });

  it('sem internet ou servidor fora: não apaga nada no aparelho', async () => {
    const { fetchFn } = setup({ '/v1/auth/account': () => json(503, {}) });
    const { db, store, deps } = await newDeps(fetchFn, ok(), { session: account });
    await seed(db);
    await saveAccount(db, { provider: 'google', name: 'Ana', email: 'a@b.c' });

    const signedOut = jest.fn();
    const stop = onSignedOut(signedOut);
    expect(await deleteAccount(deps)).toBe('retry');
    stop();

    expect(signedOut).not.toHaveBeenCalled();
    expect(await countRows(db, 'vehicles')).toBe(1);
    expect(await loadAccount(db)).not.toBeNull();
    expect(await loadSession(store)).not.toBeNull();
  });

  it('a API recusou: rejected e nada é apagado; 401 do acesso marca vencido e pede nova tentativa', async () => {
    const refused = setup({ '/v1/auth/account': () => json(403, { code: 'FORBIDDEN' }) });
    const first = await newDeps(refused.fetchFn, ok(), { session: account });
    await seed(first.db);
    expect(await deleteAccount(first.deps)).toBe('rejected');
    expect(await countRows(first.db, 'vehicles')).toBe(1);

    const expired = setup({ '/v1/auth/account': () => json(401, { code: 'UNAUTHORIZED' }) });
    const second = await newDeps(expired.fetchFn, ok(), { session: account });
    expect(await deleteAccount(second.deps)).toBe('retry');
    expect((await loadSession(second.store))?.expiresAt).toBe(0);
  });
});
