import {
  encodeGeohash,
  geohashNeighborhood,
  nearestWithin,
  normalizeStationName,
  STATION_NEARBY_LIMIT,
  STATION_NEARBY_RADIUS_M,
  stationLabel,
  stationSchema,
  type LatLng,
  type StationRecord,
} from '@ta-em-dia/shared';
import { enqueue, newId, type Db } from '../db';

/**
 * Postos do usuário (`stations`, sincroniza) e os postos da região baixados do OpenStreetMap
 * (`region_places`, só no aparelho). A posição da pessoa entra aqui só como argumento: nada a
 * guarda, a não ser a coordenada de um posto local novo (docs/05-privacidade-lgpd.md).
 */

type StationRow = {
  id: string;
  osm_id: string | null;
  name: string | null;
  brand: string | null;
  street: string | null;
  lat: number | null;
  lng: number | null;
};

type RegionPlaceRow = {
  osm_id: string;
  name: string | null;
  brand: string | null;
  street: string | null;
  lat: number;
  lng: number;
};

/** Um posto com coordenada, que pode ser sugerido pela localização. */
export interface StationCandidate extends LatLng {
  /** Linha em `stations` (posto já usado), se houver. */
  stationId?: string;
  /** Id do OpenStreetMap (`node/123`); falta no posto local. */
  osmId?: string;
  name: string | null;
  brand: string | null;
  street: string | null;
  /** "Shell · Av. da Pista" (ver `stationLabel`). */
  label: string;
}

export interface NearbyStation extends StationCandidate {
  distanceM: number;
}

/** O posto escolhido no abastecimento: um já salvo (`id`), um do OpenStreetMap ou um digitado. */
export interface StationInput {
  id?: string;
  osmId?: string;
  name?: string | null;
  brand?: string | null;
  street?: string | null;
  /** Coordenada do posto: a do OpenStreetMap ou, no posto local novo, a posição de agora. */
  lat?: number;
  lng?: number;
}

const STATION_COLUMNS = 'id, osm_id, name, brand, street, lat, lng';

const toCandidate = (row: StationRow): StationCandidate => ({
  stationId: row.id,
  ...(row.osm_id ? { osmId: row.osm_id } : {}),
  name: row.name,
  brand: row.brand,
  street: row.street,
  lat: row.lat!,
  lng: row.lng!,
  label: stationLabel(row),
});

/** Payload do sync: posto local vai sem coordenada, que fica só no aparelho. */
function syncPayload(row: StationRow): StationRecord {
  return stationSchema.parse({
    id: row.id,
    ...(row.osm_id ? { osmId: row.osm_id } : {}),
    ...(row.name ? { name: row.name } : {}),
    ...(row.brand ? { brand: row.brand } : {}),
    ...(row.street ? { street: row.street } : {}),
    ...(row.osm_id && row.lat !== null && row.lng !== null ? { lat: row.lat, lng: row.lng } : {}),
  });
}

/**
 * Postos com coordenada nas células: os da região (OpenStreetMap) e os do usuário (inclusive
 * os locais). O mesmo posto do OpenStreetMap aparece uma vez só, com o `stationId` se já foi usado.
 */
export async function listStationCandidates(
  db: Db,
  cells: readonly string[],
): Promise<StationCandidate[]> {
  const own = await db.getAllAsync<StationRow>(
    `SELECT ${STATION_COLUMNS}
       FROM stations
      WHERE deleted_at IS NULL AND lat IS NOT NULL AND lng IS NOT NULL
      ORDER BY created_at`,
  );
  const byOsm = new Map(own.filter((row) => row.osm_id).map((row) => [row.osm_id!, row]));
  const region =
    cells.length === 0
      ? []
      : await db.getAllAsync<RegionPlaceRow>(
          `SELECT osm_id, name, brand, street, lat, lng
             FROM region_places
            WHERE geohash IN (${cells.map(() => '?').join(', ')})`,
          ...cells,
        );

  const seen = new Set<string>();
  const result: StationCandidate[] = [];
  for (const place of region) {
    if (seen.has(place.osm_id)) continue;
    seen.add(place.osm_id);
    const used = byOsm.get(place.osm_id);
    result.push({
      ...(used ? { stationId: used.id } : {}),
      osmId: place.osm_id,
      name: place.name,
      brand: place.brand,
      street: place.street,
      lat: place.lat,
      lng: place.lng,
      label: stationLabel(place),
    });
  }
  for (const row of own) {
    if (row.osm_id && seen.has(row.osm_id)) continue;
    result.push(toCandidate(row));
  }
  return result;
}

/**
 * Os postos a até ~150 m da posição, do mais perto ao mais longe (o sugerido e o segundo). Procura
 * na célula do geohash da posição e nas 8 vizinhas, entre os postos guardados no aparelho.
 */
export async function findNearbyStations(
  db: Db,
  position: LatLng,
  options: { radiusM?: number; limit?: number } = {},
): Promise<NearbyStation[]> {
  const cells = geohashNeighborhood(encodeGeohash(position.lat, position.lng));
  const candidates = await listStationCandidates(db, cells);
  return nearestWithin(
    position,
    candidates,
    options.radiusM ?? STATION_NEARBY_RADIUS_M,
    options.limit ?? STATION_NEARBY_LIMIT,
  );
}

async function insertStation(db: Db, row: StationRow, at: string): Promise<void> {
  await db.runAsync(
    `INSERT INTO stations (id, osm_id, name, brand, street, lat, lng, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    row.id,
    row.osm_id,
    row.name,
    row.brand,
    row.street,
    row.lat,
    row.lng,
    at,
    at,
  );
  await enqueue(db, 'stations', row.id, 'upsert', syncPayload(row), at);
}

const clean = (text: string | null | undefined) => {
  const value = (text ?? '').replace(/\s+/g, ' ').trim();
  return value === '' ? null : value;
};

/**
 * Id do posto do abastecimento; cria o posto se ainda não existe (UUID v7, com `upsert` na
 * `outbox`). Chame **dentro** da transação que grava o abastecimento.
 * - `id` de um posto ativo: ele mesmo.
 * - `osmId`: o posto do usuário com esse id do OpenStreetMap, ou um novo com os dados do mapa.
 * - Só o nome (digitado): o posto do usuário com o mesmo rótulo (sem diferenciar maiúsculas e
 *   acentos), ou um posto local novo, com a coordenada recebida (que não vai para o sync).
 * `null` se não há nome nem id (nada a gravar).
 */
export async function ensureStation(
  db: Db,
  input: StationInput,
  at: string,
): Promise<string | null> {
  if (input.id) {
    const found = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM stations WHERE id = ? AND deleted_at IS NULL',
      input.id,
    );
    if (found) return found.id;
  }

  const coords =
    input.lat !== undefined && input.lng !== undefined
      ? { lat: input.lat, lng: input.lng }
      : { lat: null, lng: null };

  if (input.osmId) {
    const found = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM stations WHERE osm_id = ? AND deleted_at IS NULL ORDER BY created_at LIMIT 1',
      input.osmId,
    );
    if (found) return found.id;
    const row: StationRow = {
      id: newId(),
      osm_id: input.osmId,
      name: clean(input.name),
      brand: clean(input.brand),
      street: clean(input.street),
      ...coords,
    };
    await insertStation(db, row, at);
    return row.id;
  }

  const name = clean(input.name);
  if (name === null) return null;
  const key = normalizeStationName(name);
  const own = await db.getAllAsync<StationRow>(
    `SELECT ${STATION_COLUMNS} FROM stations WHERE deleted_at IS NULL ORDER BY created_at`,
  );
  const same = own.find((row) => normalizeStationName(stationLabel(row)) === key);
  if (same) return same.id;

  const row: StationRow = {
    id: newId(),
    osm_id: null,
    name,
    brand: null,
    street: null,
    ...coords,
  };
  await insertStation(db, row, at);
  return row.id;
}
