import { encodeGeohash, type PlacesResponse } from '@ta-em-dia/shared';
import { getSetting, setSetting, type Db } from '../../db';
import { migrate } from '../../db/migrations';
import { createTestDb } from '../../db/testing/testDb';
import type { ReminderNotification, ReminderScheduler } from '../../notifications';
import { saveToggle } from '../../settings';
import { saveRegionCell } from '../../stations/regionPlaces';
import type { GeofenceRegion, Geofencer } from '../geofencing';
import {
  ARRIVAL_LOG_KEY,
  ARRIVAL_REFRESHED_AT_KEY,
  AREA_REGION_ID,
  buildArrivalRegions,
  cancelStationArrivalIfFueled,
  disableStationArrival,
  enableStationArrival,
  handleGeofenceEvent,
  refreshStationArrival,
  type StationArrivalDeps,
} from '../stationArrival';

// Um ponto na Av. Paulista e postos ao norte dele (~111 m por milésimo de grau).
const HERE = { lat: -23.5614, lng: -46.6559 };
const CELL = encodeGeohash(HERE.lat, HERE.lng);
const NOW = new Date(2026, 9, 26, 18, 0);

const place = (osmId: string, dLat: number, name: string | null = 'Shell') => ({
  osmId,
  name,
  brand: name,
  street: 'Av. da Pista',
  lat: HERE.lat + dLat,
  lng: HERE.lng,
});

const response = (places: PlacesResponse['places']): PlacesResponse => ({
  geohash: CELL,
  places,
  fetchedAt: NOW.toISOString(),
});

/** Agendador falso: guarda os avisos por id, como o do sistema. */
function fakeScheduler(granted = true) {
  const scheduled = new Map<string, ReminderNotification>();
  const scheduler: ReminderScheduler = {
    async replaceScheduled(prefix, items) {
      if (!granted) return false;
      for (const id of [...scheduled.keys()]) if (id.startsWith(prefix)) scheduled.delete(id);
      for (const item of items) scheduled.set(item.id, item);
      return true;
    },
  };
  return { scheduler, scheduled };
}

function fakeGeofencer(permission: 'granted' | 'undetermined' = 'granted') {
  const state = { regions: [] as GeofenceRegion[], started: false, starts: 0 };
  const geofencer: Geofencer = {
    available: true,
    backgroundPermission: async () => permission,
    requestBackgroundPermission: async () => permission,
    started: async () => state.started,
    async start(regions) {
      state.regions = regions;
      state.started = true;
      state.starts += 1;
      return true;
    },
    async stop() {
      state.regions = [];
      state.started = false;
    },
  };
  return { geofencer, state };
}

let db: Db;
let clock: Date;

beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
  clock = NOW;
});

function makeDeps(overrides: Partial<StationArrivalDeps> = {}) {
  const sched = fakeScheduler();
  const geo = fakeGeofencer();
  const deps: StationArrivalDeps = {
    db,
    geofencer: geo.geofencer,
    scheduler: sched.scheduler,
    flagOn: true,
    getPosition: async () => HERE,
    now: () => clock,
    ...overrides,
  };
  return { deps, scheduled: sched.scheduled, geo: geo.state };
}

async function addVehicle() {
  await db.runAsync(
    `INSERT INTO vehicles (id, name, type, initial_km, created_at, updated_at)
     VALUES ('v1', 'Gol', 'flex', 1000, ?, ?)`,
    NOW.toISOString(),
    NOW.toISOString(),
  );
}

async function addFuel(id: string, date: Date, stationId: string | null = null) {
  await db.runAsync(
    `INSERT INTO fuel_entries (id, vehicle_id, date, status, km, fuel_type, liters, price_per_liter,
       total, full_tank, station_name, station_id, created_at, updated_at)
     VALUES (?, 'v1', ?, 'complete', 2000, 'gasoline', 30, 6, 180, 0, 'Shell', ?, ?, ?)`,
    id,
    date.toISOString(),
    stationId,
    date.toISOString(),
    date.toISOString(),
  );
}

async function addStation(id: string, osmId: string | null, dLat: number, name = 'Posto da Vila') {
  await db.runAsync(
    `INSERT INTO stations (id, osm_id, name, lat, lng, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    osmId,
    name,
    HERE.lat + dLat,
    HERE.lng,
    NOW.toISOString(),
    NOW.toISOString(),
  );
}

describe('buildArrivalRegions', () => {
  it('vigia os usados primeiro, depois os mais perto, e termina com a região da área', async () => {
    await saveRegionCell(
      db,
      response([place('node/1', 0.0002), place('node/2', 0.01), place('node/3', 0.02)]),
    );
    await addVehicle();
    await addStation('s-osm', 'node/3', 0.02, 'Shell');
    await addStation('s-local', null, 0.005);
    await addFuel('f1', new Date(2026, 9, 1), 's-osm');
    await addFuel('f2', new Date(2026, 9, 5), 's-osm');
    await addFuel('f3', new Date(2026, 9, 9), 's-local');

    const regions = await buildArrivalRegions(db, HERE);
    expect(regions.map((r) => r.identifier)).toEqual([
      'posto:node/3',
      'posto:s-local',
      'posto:node/1',
      'posto:node/2',
      AREA_REGION_ID,
    ]);
    expect(regions[0]).toMatchObject({ radius: 150, notifyOnEnter: true, notifyOnExit: true });
    const area = regions.at(-1)!;
    expect(area).toMatchObject({ radius: 5000, notifyOnEnter: false, notifyOnExit: true });
    // O centro da área é o da célula, não a posição.
    expect({ lat: area.latitude, lng: area.longitude }).not.toEqual(HERE);
  });

  it('no máximo 19 postos + a área (20 regiões, o limite do iOS)', async () => {
    await saveRegionCell(
      db,
      response(Array.from({ length: 30 }, (_, i) => place(`node/${i}`, 0.0005 * (i + 1)))),
    );
    const regions = await buildArrivalRegions(db, HERE);
    expect(regions).toHaveLength(20);
  });

  it('sem postos, só a área', async () => {
    expect((await buildArrivalRegions(db, HERE)).map((r) => r.identifier)).toEqual([
      AREA_REGION_ID,
    ]);
  });
});

describe('refreshStationArrival', () => {
  it('desligado em Configurações não liga nada', async () => {
    const { deps, geo } = makeDeps();
    expect(await refreshStationArrival(deps)).toBe('off');
    expect(geo.started).toBe(false);
  });

  it('sem a flag, ou sem os módulos nativos, fica indisponível', async () => {
    await saveToggle(db, 'stationArrival', true);
    expect(await refreshStationArrival(makeDeps({ flagOn: false }).deps)).toBe('unavailable');
    const off = fakeGeofencer();
    off.geofencer.available = false;
    expect(await refreshStationArrival(makeDeps({ geofencer: off.geofencer }).deps)).toBe(
      'unavailable',
    );
  });

  it('sem o "sempre" para as geofences que estavam ligadas', async () => {
    await saveToggle(db, 'stationArrival', true);
    const geo = fakeGeofencer('undetermined');
    geo.state.started = true;
    const { deps } = makeDeps({ geofencer: geo.geofencer });
    expect(await refreshStationArrival(deps)).toBe('no-permission');
    expect(geo.state.started).toBe(false);
  });

  it('liga as geofences, baixa a região e só troca de novo depois de 6 h', async () => {
    await saveToggle(db, 'stationArrival', true);
    const download = jest.fn(async () => {
      await saveRegionCell(db, response([place('node/1', 0.0002)]));
    });
    const { deps, geo } = makeDeps({ download });
    expect(await refreshStationArrival(deps)).toBe('started');
    expect(download).toHaveBeenCalledWith(HERE);
    expect(geo.regions.map((r) => r.identifier)).toEqual(['posto:node/1', AREA_REGION_ID]);

    clock = new Date(NOW.getTime() + 60 * 60 * 1000);
    expect(await refreshStationArrival(deps)).toBe('fresh');
    clock = new Date(NOW.getTime() + 7 * 60 * 60 * 1000);
    expect(await refreshStationArrival(deps)).toBe('started');
    expect(geo.starts).toBe(2);
  });

  it('não guarda a posição: só a hora da troca', async () => {
    await saveToggle(db, 'stationArrival', true);
    const { deps } = makeDeps();
    await refreshStationArrival(deps);
    expect(await getSetting(db, ARRIVAL_REFRESHED_AT_KEY)).toBe(NOW.toISOString());
    const rows = await db.getAllAsync<{ value: string }>('SELECT value FROM app_settings');
    expect(JSON.stringify(rows)).not.toContain(String(HERE.lat));
  });

  it('sem posição não liga', async () => {
    await saveToggle(db, 'stationArrival', true);
    const { deps, geo } = makeDeps({ getPosition: async () => null });
    expect(await refreshStationArrival(deps)).toBe('no-position');
    expect(geo.started).toBe(false);
  });
});

describe('enableStationArrival e disableStationArrival', () => {
  it('liga a preferência e as geofences; desligar para tudo e cancela o aviso pendente', async () => {
    const { deps, geo, scheduled } = makeDeps();
    expect(await enableStationArrival(deps)).toBe('started');
    expect(geo.started).toBe(true);

    await saveRegionCell(db, response([place('node/1', 0.0002)]));
    await handleGeofenceEvent(deps, { type: 'enter', regionId: 'posto:node/1' });
    expect(scheduled.size).toBe(1);

    await disableStationArrival(deps);
    expect(geo.started).toBe(false);
    expect(scheduled.size).toBe(0);
    expect(await getSetting(db, ARRIVAL_LOG_KEY)).toBe('{}');
  });
});

describe('handleGeofenceEvent', () => {
  beforeEach(async () => {
    await saveToggle(db, 'stationArrival', true);
    await saveRegionCell(db, response([place('node/1', 0.0002), place('node/2', 0.01, null)]));
    await addVehicle();
  });

  it('ao entrar, agenda o aviso para daqui a 2 min com o rótulo do posto', async () => {
    const { deps, scheduled } = makeDeps();
    await handleGeofenceEvent(deps, { type: 'enter', regionId: 'posto:node/1' });
    expect([...scheduled.values()]).toEqual([
      {
        id: 'station-arrival:node/1;',
        title: 'Tá em Dia',
        body: 'Abastecendo no Shell · Av. da Pista? Registre agora.',
        fireAt: new Date(NOW.getTime() + 2 * 60 * 1000),
        data: { openNewFuelEntry: true },
      },
    ]);
  });

  it('posto sem nome no mapa aparece como "Posto · Rua"', async () => {
    const { deps, scheduled } = makeDeps();
    await handleGeofenceEvent(deps, { type: 'enter', regionId: 'posto:node/2' });
    expect([...scheduled.values()][0]!.body).toBe(
      'Abastecendo no Posto · Av. da Pista? Registre agora.',
    );
  });

  it('posto local usa o nome guardado', async () => {
    await addStation('s-local', null, 0.005);
    const { deps, scheduled } = makeDeps();
    await handleGeofenceEvent(deps, { type: 'enter', regionId: 'posto:s-local' });
    expect([...scheduled.values()][0]!.body).toBe('Abastecendo no Posto da Vila? Registre agora.');
  });

  it('saiu antes dos 2 min: cancela e não conta nas 12 h', async () => {
    const { deps, scheduled } = makeDeps();
    await handleGeofenceEvent(deps, { type: 'enter', regionId: 'posto:node/1' });
    clock = new Date(NOW.getTime() + 60_000);
    await handleGeofenceEvent(deps, { type: 'exit', regionId: 'posto:node/1' });
    expect(scheduled.size).toBe(0);

    clock = new Date(NOW.getTime() + 10 * 60_000);
    await handleGeofenceEvent(deps, { type: 'enter', regionId: 'posto:node/1' });
    expect(scheduled.size).toBe(1);
  });

  it('saiu depois do aviso: o aviso fica e o posto não avisa de novo por 12 h', async () => {
    const { deps, scheduled } = makeDeps();
    await handleGeofenceEvent(deps, { type: 'enter', regionId: 'posto:node/1' });
    clock = new Date(NOW.getTime() + 5 * 60_000);
    await handleGeofenceEvent(deps, { type: 'exit', regionId: 'posto:node/1' });
    expect(scheduled.size).toBe(1);
    scheduled.clear(); // o sistema mostrou o aviso

    clock = new Date(NOW.getTime() + 11 * 60 * 60_000);
    await handleGeofenceEvent(deps, { type: 'enter', regionId: 'posto:node/1' });
    expect(scheduled.size).toBe(0);

    // Outro posto avisa normalmente.
    await handleGeofenceEvent(deps, { type: 'enter', regionId: 'posto:node/2' });
    expect(scheduled.size).toBe(1);
    scheduled.clear();

    clock = new Date(NOW.getTime() + 12 * 60 * 60_000 + 3 * 60_000);
    await handleGeofenceEvent(deps, { type: 'enter', regionId: 'posto:node/1' });
    expect(scheduled.size).toBe(1);
  });

  it('não avisa se já houve abastecimento hoje', async () => {
    await addFuel('f1', new Date(2026, 9, 26, 7, 30));
    const { deps, scheduled } = makeDeps();
    await handleGeofenceEvent(deps, { type: 'enter', regionId: 'posto:node/1' });
    expect(scheduled.size).toBe(0);
  });

  it('abastecimento de ontem não impede', async () => {
    await addFuel('f1', new Date(2026, 9, 25, 22, 0));
    const { deps, scheduled } = makeDeps();
    await handleGeofenceEvent(deps, { type: 'enter', regionId: 'posto:node/1' });
    expect(scheduled.size).toBe(1);
  });

  it('sem permissão de notificações não anota nada', async () => {
    const { deps } = makeDeps({ scheduler: fakeScheduler(false).scheduler });
    await handleGeofenceEvent(deps, { type: 'enter', regionId: 'posto:node/1' });
    expect(await getSetting(db, ARRIVAL_LOG_KEY)).toBeNull();
  });

  it('o registro guarda só a hora por posto, das últimas 12 h', async () => {
    await setSetting(
      db,
      ARRIVAL_LOG_KEY,
      JSON.stringify({ 'node/9': new Date(NOW.getTime() - 13 * 60 * 60_000).toISOString() }),
    );
    const { deps } = makeDeps();
    await handleGeofenceEvent(deps, { type: 'enter', regionId: 'posto:node/1' });
    expect(JSON.parse((await getSetting(db, ARRIVAL_LOG_KEY))!)).toEqual({
      'node/1': new Date(NOW.getTime() + 2 * 60_000).toISOString(),
    });
  });

  it('saiu da área: troca os postos vigiados', async () => {
    const { deps, geo } = makeDeps();
    await handleGeofenceEvent(deps, { type: 'exit', regionId: AREA_REGION_ID });
    expect(geo.starts).toBe(1);
    expect(geo.regions.at(-1)!.identifier).toBe(AREA_REGION_ID);
  });

  it('desligado em Configurações: para as geofences e não avisa', async () => {
    await saveToggle(db, 'stationArrival', false);
    const geo = fakeGeofencer();
    geo.state.started = true;
    const { deps, scheduled } = makeDeps({ geofencer: geo.geofencer });
    await handleGeofenceEvent(deps, { type: 'enter', regionId: 'posto:node/1' });
    expect(scheduled.size).toBe(0);
    expect(geo.state.started).toBe(false);
  });

  it('região desconhecida não faz nada', async () => {
    const { deps, scheduled } = makeDeps();
    await handleGeofenceEvent(deps, { type: 'enter', regionId: 'outra' });
    expect(scheduled.size).toBe(0);
  });
});

describe('cancelStationArrivalIfFueled', () => {
  beforeEach(async () => {
    await saveToggle(db, 'stationArrival', true);
    await saveRegionCell(db, response([place('node/1', 0.0002)]));
    await addVehicle();
  });

  it('registrou o abastecimento nos 2 min: o aviso pendente é cancelado', async () => {
    const { deps, scheduled } = makeDeps();
    await handleGeofenceEvent(deps, { type: 'enter', regionId: 'posto:node/1' });
    await addFuel('f1', NOW);
    await cancelStationArrivalIfFueled(db, deps.scheduler, new Date(NOW.getTime() + 60_000));
    expect(scheduled.size).toBe(0);
    expect(await getSetting(db, ARRIVAL_LOG_KEY)).toBe('{}');
  });

  it('sem abastecimento hoje, o aviso fica', async () => {
    const { deps, scheduled } = makeDeps();
    await handleGeofenceEvent(deps, { type: 'enter', regionId: 'posto:node/1' });
    await cancelStationArrivalIfFueled(db, deps.scheduler, new Date(NOW.getTime() + 60_000));
    expect(scheduled.size).toBe(1);
  });
});
