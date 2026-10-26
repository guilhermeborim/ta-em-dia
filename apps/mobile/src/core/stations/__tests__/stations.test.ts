import { encodeGeohash, type AuthTokens, type PlacesResponse } from '@ta-em-dia/shared';
import { loadSession, saveSession, toSession } from '../../auth/session';
import type { SecretStore } from '../../auth/installation';
import type { Db } from '../../db';
import { migrate } from '../../db/migrations';
import { createTestDb } from '../../db/testing/testDb';
import {
  downloadRegionPlaces,
  ensureStation,
  findNearbyStations,
  missingRegionCells,
  saveRegionCell,
} from '..';

const AT = '2026-10-26T12:00:00.000Z';
const NOW = new Date(AT);
// Um ponto na Av. Paulista e postos a ~20 m, ~110 m e ~1 km dele.
const HERE = { lat: -23.5614, lng: -46.6559 };
const CELL = encodeGeohash(HERE.lat, HERE.lng);

const place = (osmId: string, dLat: number, extra: Partial<PlacesResponse['places'][0]> = {}) => ({
  osmId,
  name: 'Shell',
  brand: 'Shell',
  street: 'Av. Paulista',
  lat: HERE.lat + dLat,
  lng: HERE.lng,
  ...extra,
});

const response = (places: PlacesResponse['places'], geohash = CELL): PlacesResponse => ({
  geohash,
  places,
  fetchedAt: AT,
});

let db: Db;

beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});

const outbox = () =>
  db.getAllAsync<{ table_name: string; row_id: string; payload: string }>(
    'SELECT table_name, row_id, payload FROM outbox ORDER BY id',
  );

const inTx = <T>(work: () => Promise<T>) => {
  let result: T;
  return db
    .withTransactionAsync(async () => {
      result = await work();
    })
    .then(() => result);
};

describe('saveRegionCell e missingRegionCells', () => {
  it('guarda a célula e troca os postos dela ao baixar de novo', async () => {
    await saveRegionCell(db, response([place('node/1', 0.0002), place('node/2', 0.001)]), NOW);
    await saveRegionCell(db, response([place('node/3', 0.0002)]), NOW);
    const rows = await db.getAllAsync<{ osm_id: string }>('SELECT osm_id FROM region_places');
    expect(rows.map((r) => r.osm_id)).toEqual(['node/3']);
  });

  it('falta a célula que nunca veio ou que tem mais de 30 dias', async () => {
    await saveRegionCell(db, response([], 'aaaaa'), new Date('2026-09-01T00:00:00.000Z'));
    await saveRegionCell(db, response([], 'bbbbb'), new Date('2026-10-20T00:00:00.000Z'));
    expect(await missingRegionCells(db, ['aaaaa', 'bbbbb', 'ccccc'], NOW)).toEqual([
      'aaaaa',
      'ccccc',
    ]);
  });
});

describe('findNearbyStations', () => {
  it('os postos a até 150 m, do mais perto ao mais longe, com o rótulo', async () => {
    await saveRegionCell(
      db,
      response([
        place('node/1', 0.001, { name: null, brand: null, street: 'Rua Augusta' }),
        place('node/2', 0.0002),
        place('node/3', 0.01),
      ]),
      NOW,
    );
    const nearby = await findNearbyStations(db, HERE);
    expect(nearby.map((s) => [s.osmId, s.label])).toEqual([
      ['node/2', 'Shell · Av. Paulista'],
      ['node/1', 'Posto · Rua Augusta'],
    ]);
    expect(nearby[0]!.stationId).toBeUndefined();
  });

  it('posto do mapa já usado vem com o stationId; posto local com coordenada também entra', async () => {
    await saveRegionCell(db, response([place('node/2', 0.0002)]), NOW);
    const osmId = await inTx(() =>
      ensureStation(
        db,
        { osmId: 'node/2', name: 'Shell', lat: HERE.lat + 0.0002, lng: HERE.lng },
        AT,
      ),
    );
    const localId = await inTx(() =>
      ensureStation(db, { name: 'Posto do Zé', lat: HERE.lat - 0.0005, lng: HERE.lng }, AT),
    );
    const nearby = await findNearbyStations(db, HERE);
    expect(nearby).toEqual([
      expect.objectContaining({ stationId: osmId, osmId: 'node/2' }),
      expect.objectContaining({ stationId: localId, label: 'Posto do Zé' }),
    ]);
  });

  it('sem postos guardados, lista vazia', async () => {
    expect(await findNearbyStations(db, HERE)).toEqual([]);
  });
});

describe('ensureStation', () => {
  it('posto do mapa novo: cria com coordenada e manda tudo para o sync', async () => {
    const id = await inTx(() =>
      ensureStation(
        db,
        { osmId: 'node/2', name: 'Shell', brand: 'Shell', street: 'Av. Paulista', ...HERE },
        AT,
      ),
    );
    const queue = await outbox();
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({ table_name: 'stations', row_id: id });
    expect(JSON.parse(queue[0]!.payload)).toEqual({
      id,
      osmId: 'node/2',
      name: 'Shell',
      brand: 'Shell',
      street: 'Av. Paulista',
      ...HERE,
    });
  });

  it('o mesmo posto do mapa de novo devolve o mesmo id, sem nova linha', async () => {
    const first = await inTx(() => ensureStation(db, { osmId: 'node/2', name: 'Shell' }, AT));
    const second = await inTx(() => ensureStation(db, { osmId: 'node/2', name: 'Shell' }, AT));
    expect(second).toBe(first);
    expect(await outbox()).toHaveLength(1);
  });

  it('posto digitado novo vira posto local: coordenada só no aparelho', async () => {
    const id = await inTx(() => ensureStation(db, { name: '  Posto  do Zé ', ...HERE }, AT));
    const row = await db.getFirstAsync(
      'SELECT name, osm_id, lat, lng FROM stations WHERE id = ?',
      id,
    );
    expect(row).toEqual({ name: 'Posto do Zé', osm_id: null, ...HERE });
    expect(JSON.parse((await outbox())[0]!.payload)).toEqual({ id, name: 'Posto do Zé' });
  });

  it('nome digitado igual ao rótulo de um posto salvo reaproveita o posto', async () => {
    const osm = await inTx(() =>
      ensureStation(db, { osmId: 'node/2', name: 'Shell', street: 'Av. Paulista' }, AT),
    );
    expect(await inTx(() => ensureStation(db, { name: 'shell · av. paulista' }, AT))).toBe(osm);
  });

  it('id de posto ativo vale; sem id válido nem nome, null', async () => {
    const id = await inTx(() => ensureStation(db, { name: 'Ipiranga' }, AT));
    expect(await inTx(() => ensureStation(db, { id: id! }, AT))).toBe(id);
    expect(await inTx(() => ensureStation(db, { id: 'sumiu', name: ' ' }, AT))).toBeNull();
  });
});

describe('downloadRegionPlaces', () => {
  function memoryStore(): SecretStore {
    const data = new Map<string, string>();
    return {
      getItemAsync: async (key) => data.get(key) ?? null,
      setItemAsync: async (key, value) => void data.set(key, value),
      deleteItemAsync: async (key) => void data.delete(key),
    };
  }
  const tokens: AuthTokens = {
    accessToken: 'jwt',
    expiresIn: 900,
    refreshToken: 'refresh',
    user: { id: '018bcfe5-6800-7000-8000-0000000000aa', isAnonymous: true, plan: 'free' },
  };

  async function setup(handler: (cell: string) => Response) {
    const store = memoryStore();
    await saveSession(store, toSession(tokens, new Date()));
    const calls: string[] = [];
    const fetchFn = (async (url: string, init?: RequestInit) => {
      const cell = new URL(url).searchParams.get('geohash')!;
      calls.push(cell);
      expect((init?.headers as Record<string, string>).authorization).toBe('Bearer jwt');
      return handler(cell);
    }) as unknown as typeof fetch;
    const deps = { db, apiUrl: 'https://api.test', platform: 'android' as const, store, fetchFn };
    return { deps, calls, store };
  }

  const ok = (cell: string, places: PlacesResponse['places'] = []) =>
    new Response(JSON.stringify(response(places, cell)), { status: 200 });

  it('baixa a célula da posição e as 8 vizinhas; a API recebe só a célula', async () => {
    const { deps, calls } = await setup((cell) =>
      ok(cell, cell === CELL ? [place('node/2', 0.0002)] : []),
    );
    expect(await downloadRegionPlaces(deps, HERE)).toBe(9);
    expect(calls[0]).toBe(CELL);
    expect(calls).toHaveLength(9);
    expect(calls.every((cell) => /^[0-9a-z]{5}$/.test(cell))).toBe(true);
    expect((await findNearbyStations(db, HERE)).map((s) => s.osmId)).toEqual(['node/2']);

    // Já guardadas: não chama a API de novo.
    expect(await downloadRegionPlaces(deps, HERE)).toBe(0);
    expect(calls).toHaveLength(9);
  });

  it('sem internet para na primeira falha e guarda o que já veio', async () => {
    let n = 0;
    const { deps } = await setup((cell) =>
      ++n <= 2 ? ok(cell) : new Response('', { status: 503 }),
    );
    expect(await downloadRegionPlaces(deps, HERE)).toBe(2);
  });

  it('token recusado: marca a sessão como vencida e para', async () => {
    const { deps, store, calls } = await setup(
      () => new Response(JSON.stringify({ code: 'UNAUTHORIZED' }), { status: 401 }),
    );
    expect(await downloadRegionPlaces(deps, HERE)).toBe(0);
    expect(calls).toHaveLength(1);
    expect((await loadSession(store))!.expiresAt).toBeLessThanOrEqual(Date.now());
  });
});
