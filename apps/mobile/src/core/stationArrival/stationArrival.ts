import {
  arrivalAreaCenter,
  encodeGeohash,
  geohashNeighborhood,
  isSameLocalDay,
  pickArrivalStations,
  pruneArrivalLog,
  shouldNotifyStationArrival,
  STATION_ARRIVAL_AREA_RADIUS_M,
  STATION_ARRIVAL_DWELL_MS,
  STATION_ARRIVAL_RADIUS_M,
  stationArrivalMessage,
  stationLabel,
  type ArrivalLog,
  type LatLng,
} from '@ta-em-dia/shared';
import { getSetting, setSetting, type Db } from '../db';
import type { ReminderScheduler } from '../notifications';
import { loadSettings, saveToggle } from '../settings';
// Direto do repositório (sem `../stations`), para não puxar a sessão da API para os avisos.
import { listStationCandidates } from '../stations/stations.repository';
import type { GeofenceRegion, Geofencer } from './geofencing';

/**
 * Aviso ao chegar no posto (C7). Com o aviso ligado e a permissão "sempre", o app vigia com
 * geofences os 19 postos mais usados ou mais perto e uma região de ~5 km em volta (ao sair dela,
 * troca os postos). Ao entrar num posto, agenda um aviso para daqui a ~2 min; se a pessoa sair
 * antes, cancela. As regras (12 h por posto, nada se já abasteceu hoje) vêm de `shared`.
 *
 * A posição só passa pela memória. No aparelho ficam as geofences (coordenada dos postos e o
 * centro da célula de ~5 km, não a posição) e a hora do último aviso de cada posto, só das
 * últimas 12 h (docs/05-privacidade-lgpd.md).
 */

/** Prefixo dos avisos agendados: `station-arrival:<posto>;`. */
export const STATION_ARRIVAL_NOTIFICATION_PREFIX = 'station-arrival:';

/** Região da área: ao sair dela, o app troca os postos vigiados. */
export const AREA_REGION_ID = 'area';

const STATION_REGION_PREFIX = 'posto:';

/** Hora do último aviso por posto (só as últimas 12 h). */
export const ARRIVAL_LOG_KEY = 'station_arrival.log';

/** Quando as geofences foram trocadas pela última vez (só a hora, sem lugar). */
export const ARRIVAL_REFRESHED_AT_KEY = 'station_arrival.refreshed_at';

/** Ao abrir o app, troca os postos vigiados se a última troca tem mais que isso (ms). */
export const STATION_ARRIVAL_REFRESH_MS = 6 * 60 * 60 * 1000;

export interface StationArrivalDeps {
  db: Db;
  geofencer: Geofencer;
  scheduler: ReminderScheduler;
  /** Flag `geo.fuelReminder` ligada e avisos locais na plataforma. */
  flagOn: boolean;
  /** Posição de agora (só com permissão), `null` se não deu. */
  getPosition: () => Promise<LatLng | null>;
  /** Baixa os postos da região que faltam (C6). Opcional: sem ela, vale o que já está guardado. */
  download?: (position: LatLng) => Promise<unknown>;
  now?: () => Date;
}

export type GeofenceEvent = { type: 'enter' | 'exit'; regionId: string };

export type ArrivalRefresh =
  'unavailable' | 'off' | 'no-permission' | 'fresh' | 'no-position' | 'started' | 'failed';

/** O aviso pode aparecer neste build (módulos nativos, avisos locais e flag)? */
export function stationArrivalAvailable(deps: Pick<StationArrivalDeps, 'geofencer' | 'flagOn'>) {
  return deps.geofencer.available && deps.flagOn;
}

const notificationId = (key: string) => `${STATION_ARRIVAL_NOTIFICATION_PREFIX}${key};`;

async function loadLog(db: Db, now: Date): Promise<ArrivalLog> {
  try {
    const parsed: unknown = JSON.parse((await getSetting(db, ARRIVAL_LOG_KEY)) ?? '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const log: ArrivalLog = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string') log[key] = value;
    }
    return pruneArrivalLog(log, now);
  } catch {
    return {};
  }
}

const saveLog = (db: Db, log: ArrivalLog) => setSetting(db, ARRIVAL_LOG_KEY, JSON.stringify(log));

/** Data do abastecimento completo mais recente, de qualquer veículo. */
export async function lastFuelEntryAt(db: Db): Promise<Date | null> {
  const row = await db.getFirstAsync<{ last: string | null }>(
    `SELECT MAX(date) AS last FROM fuel_entries WHERE deleted_at IS NULL AND status = 'complete'`,
  );
  return row?.last ? new Date(row.last) : null;
}

/** Quantos abastecimentos completos cada posto (`stations.id`) tem. */
async function stationUses(db: Db): Promise<Map<string, number>> {
  const rows = await db.getAllAsync<{ station_id: string; uses: number }>(
    `SELECT station_id, COUNT(*) AS uses
       FROM fuel_entries
      WHERE deleted_at IS NULL AND status = 'complete' AND station_id IS NOT NULL
      GROUP BY station_id`,
  );
  return new Map(rows.map((row) => [row.station_id, row.uses]));
}

/**
 * As regiões a vigiar em volta da posição: os postos escolhidos por `pickArrivalStations` (entre
 * os guardados na célula e nas 8 vizinhas e os do usuário) e, por último, a região da área.
 */
export async function buildArrivalRegions(db: Db, position: LatLng): Promise<GeofenceRegion[]> {
  const cells = geohashNeighborhood(encodeGeohash(position.lat, position.lng));
  const [candidates, uses] = await Promise.all([listStationCandidates(db, cells), stationUses(db)]);
  const picked = pickArrivalStations(
    position,
    candidates.map((candidate) => ({
      ...candidate,
      key: candidate.osmId ?? candidate.stationId!,
      uses: candidate.stationId ? (uses.get(candidate.stationId) ?? 0) : 0,
    })),
  );
  const center = arrivalAreaCenter(position);
  return [
    ...picked.map((station) => ({
      identifier: `${STATION_REGION_PREFIX}${station.key}`,
      latitude: station.lat,
      longitude: station.lng,
      radius: STATION_ARRIVAL_RADIUS_M,
      notifyOnEnter: true,
      notifyOnExit: true,
    })),
    {
      identifier: AREA_REGION_ID,
      latitude: center.lat,
      longitude: center.lng,
      radius: STATION_ARRIVAL_AREA_RADIUS_M,
      notifyOnEnter: false,
      notifyOnExit: true,
    },
  ];
}

/** Para de vigiar, cancela os avisos pendentes e apaga o registro dos avisos. Nunca lança erro. */
export async function stopStationArrival(
  deps: Pick<StationArrivalDeps, 'db' | 'geofencer' | 'scheduler'>,
): Promise<void> {
  try {
    await deps.geofencer.stop();
    await deps.scheduler.replaceScheduled(STATION_ARRIVAL_NOTIFICATION_PREFIX, []);
    await saveLog(deps.db, {});
    await setSetting(deps.db, ARRIVAL_REFRESHED_AT_KEY, '');
  } catch {
    // Aviso é um extra.
  }
}

/**
 * Liga ou mantém as geofences em dia: desligado (flag ou Configurações) ou sem o "sempre", para
 * tudo; ligado, troca os postos vigiados pelos da posição de agora, a não ser que a última troca
 * seja recente (`force` troca sempre). Nunca lança erro.
 */
export async function refreshStationArrival(
  deps: StationArrivalDeps,
  options: { force?: boolean } = {},
): Promise<ArrivalRefresh> {
  const now = deps.now ?? (() => new Date());
  try {
    if (!stationArrivalAvailable(deps)) return 'unavailable';
    const settings = await loadSettings(deps.db);
    // Ao abrir o app com o aviso desligado, só mexe se ainda há geofence ligada.
    if (!settings.stationArrival) {
      if (await deps.geofencer.started()) await stopStationArrival(deps);
      return 'off';
    }
    // O "sempre" pode ter sido tirado nos ajustes do aparelho: para até a pessoa permitir de novo.
    if ((await deps.geofencer.backgroundPermission()) !== 'granted') {
      if (await deps.geofencer.started()) await stopStationArrival(deps);
      return 'no-permission';
    }
    if (!options.force) {
      const last = new Date((await getSetting(deps.db, ARRIVAL_REFRESHED_AT_KEY)) ?? '').getTime();
      const recent = !Number.isNaN(last) && now().getTime() - last < STATION_ARRIVAL_REFRESH_MS;
      if (recent && (await deps.geofencer.started())) return 'fresh';
    }

    const position = await deps.getPosition();
    if (!position) return 'no-position';
    await deps.download?.(position);
    const started = await deps.geofencer.start(await buildArrivalRegions(deps.db, position));
    if (!started) return 'failed';
    await setSetting(deps.db, ARRIVAL_REFRESHED_AT_KEY, now().toISOString());
    return 'started';
  } catch {
    return 'failed';
  }
}

/** Liga o aviso (depois das permissões) e já registra as geofences. */
export async function enableStationArrival(deps: StationArrivalDeps): Promise<ArrivalRefresh> {
  await saveToggle(deps.db, 'stationArrival', true);
  return refreshStationArrival(deps, { force: true });
}

/** Desliga o aviso e para tudo. */
export async function disableStationArrival(deps: StationArrivalDeps): Promise<void> {
  await saveToggle(deps.db, 'stationArrival', false);
  await stopStationArrival(deps);
}

/** Rótulo do posto da geofence ("Shell · Av. da Pista"), pelos postos guardados no aparelho. */
async function labelFor(db: Db, key: string): Promise<string> {
  type Row = { name: string | null; brand: string | null; street: string | null };
  const own = await db.getFirstAsync<Row>(
    `SELECT name, brand, street FROM stations
      WHERE (id = ? OR osm_id = ?) AND deleted_at IS NULL
      ORDER BY created_at LIMIT 1`,
    key,
    key,
  );
  const row =
    own ??
    (await db.getFirstAsync<Row>(
      'SELECT name, brand, street FROM region_places WHERE osm_id = ? LIMIT 1',
      key,
    ));
  return stationLabel(row ?? {});
}

/**
 * Um evento de geofence (chega pela tarefa em segundo plano):
 * - Entrou num posto: se as regras deixam, agenda o aviso para daqui a ~2 min e anota a hora.
 * - Saiu do posto antes do aviso: cancela o aviso e apaga a anotação (não conta nas 12 h).
 * - Saiu da área: troca os postos vigiados pelos da posição de agora.
 * Nunca lança erro.
 */
export async function handleGeofenceEvent(
  deps: StationArrivalDeps,
  event: GeofenceEvent,
): Promise<void> {
  const now = (deps.now ?? (() => new Date()))();
  try {
    const settings = await loadSettings(deps.db);
    if (!deps.flagOn || !settings.stationArrival) {
      await stopStationArrival(deps);
      return;
    }

    if (event.regionId === AREA_REGION_ID) {
      if (event.type === 'exit') await refreshStationArrival(deps, { force: true });
      return;
    }
    if (!event.regionId.startsWith(STATION_REGION_PREFIX)) return;
    const key = event.regionId.slice(STATION_REGION_PREFIX.length);
    const id = notificationId(key);
    const log = await loadLog(deps.db, now);

    if (event.type === 'exit') {
      const pending = log[key] !== undefined && new Date(log[key]).getTime() > now.getTime();
      if (pending) {
        await deps.scheduler.replaceScheduled(id, []);
        delete log[key];
      }
      await saveLog(deps.db, log);
      return;
    }

    const lastNotifiedAt = log[key] ? new Date(log[key]) : null;
    const lastFuelAt = await lastFuelEntryAt(deps.db);
    if (!shouldNotifyStationArrival({ now, lastNotifiedAt, lastFuelAt })) return;

    const fireAt = new Date(now.getTime() + STATION_ARRIVAL_DWELL_MS);
    const scheduled = await deps.scheduler.replaceScheduled(id, [
      {
        id,
        title: 'Tá em Dia',
        body: stationArrivalMessage(await labelFor(deps.db, key)),
        fireAt,
        data: { openNewFuelEntry: true },
      },
    ]);
    if (scheduled) await saveLog(deps.db, { ...log, [key]: fireAt.toISOString() });
  } catch {
    // Aviso é um extra: erro aqui não pode quebrar nada.
  }
}

/**
 * Já houve abastecimento hoje: cancela o aviso de posto que ainda ia sair (a pessoa registrou nos
 * ~2 min). Chamado por `refreshReminders` depois de salvar. Nunca lança erro.
 */
export async function cancelStationArrivalIfFueled(
  db: Db,
  scheduler: ReminderScheduler,
  now: Date = new Date(),
): Promise<void> {
  try {
    const last = await lastFuelEntryAt(db);
    if (!last || !isSameLocalDay(last, now)) return;
    const log = await loadLog(db, now);
    const pending = Object.keys(log).filter((key) => new Date(log[key]!).getTime() > now.getTime());
    if (pending.length === 0) return;
    await scheduler.replaceScheduled(STATION_ARRIVAL_NOTIFICATION_PREFIX, []);
    for (const key of pending) delete log[key];
    await saveLog(db, log);
  } catch {
    // Aviso é um extra.
  }
}
