import {
  encodeGeohash,
  geohashNeighborhood,
  placesResponseSchema,
  type AnonymousAuthRequest,
  type LatLng,
  type PlacesResponse,
} from '@ta-em-dia/shared';
import { getJson } from '../api';
import { ensureAnonymousSession, expireSession, loadSession, type SecretStore } from '../auth';
import type { Db } from '../db';

/**
 * Postos da região, baixados da API (`GET /v1/places`, OpenStreetMap) por célula do geohash de 5
 * caracteres e guardados no aparelho para achar o posto sem internet. A API recebe só a célula
 * (~5 km), nunca a coordenada (docs/05-privacidade-lgpd.md).
 */

/** Depois disso a célula é baixada de novo (a API também guarda por 30 dias). */
export const REGION_CELL_MAX_AGE_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/** As células da lista que o aparelho não tem, ou tem há mais de 30 dias, na ordem da lista. */
export async function missingRegionCells(
  db: Db,
  cells: readonly string[],
  now: Date = new Date(),
): Promise<string[]> {
  if (cells.length === 0) return [];
  const rows = await db.getAllAsync<{ geohash: string; fetched_at: string }>(
    `SELECT geohash, fetched_at FROM region_cells WHERE geohash IN (${cells.map(() => '?').join(', ')})`,
    ...cells,
  );
  const fresh = new Set(
    rows
      .filter(
        (row) =>
          now.getTime() - new Date(row.fetched_at).getTime() < REGION_CELL_MAX_AGE_DAYS * DAY_MS,
      )
      .map((row) => row.geohash),
  );
  return cells.filter((cell) => !fresh.has(cell));
}

/** Troca os postos guardados da célula pelos que vieram da API. */
export async function saveRegionCell(
  db: Db,
  response: PlacesResponse,
  now: Date = new Date(),
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM region_places WHERE geohash = ?', response.geohash);
    await db.runAsync(
      'INSERT OR REPLACE INTO region_cells (geohash, fetched_at) VALUES (?, ?)',
      response.geohash,
      now.toISOString(),
    );
    for (const place of response.places) {
      await db.runAsync(
        `INSERT OR REPLACE INTO region_places (osm_id, geohash, name, brand, street, lat, lng)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        place.osmId,
        response.geohash,
        place.name,
        place.brand,
        place.street,
        place.lat,
        place.lng,
      );
    }
  });
}

export interface RegionDownloadDeps {
  db: Db;
  apiUrl: string;
  platform: AnonymousAuthRequest['platform'];
  store: SecretStore;
  fetchFn?: typeof fetch;
  now?: () => Date;
}

/**
 * Baixa as células que faltam em volta da posição (a dela primeiro, depois as 8 vizinhas), uma
 * chamada por célula. Para na primeira falha (sem internet, API fora, sessão recusada): o que já
 * veio fica guardado e o resto tenta da próxima vez. Nunca lança erro. Devolve quantas células
 * foram guardadas.
 */
export async function downloadRegionPlaces(
  deps: RegionDownloadDeps,
  position: LatLng,
): Promise<number> {
  const now = deps.now ?? (() => new Date());
  try {
    const cells = geohashNeighborhood(encodeGeohash(position.lat, position.lng));
    const missing = await missingRegionCells(deps.db, cells, now());
    if (missing.length === 0) return 0;

    const ensured = await ensureAnonymousSession({
      apiUrl: deps.apiUrl,
      platform: deps.platform,
      store: deps.store,
      fetchFn: deps.fetchFn,
    });
    if (ensured !== 'ready') return 0;
    const session = await loadSession(deps.store);
    if (!session) return 0;

    let saved = 0;
    for (const cell of missing) {
      const result = await getJson(
        deps.apiUrl,
        `/v1/places?geohash=${cell}`,
        deps.fetchFn,
        session.tokens.accessToken,
      );
      if (result.kind === 'rejected' && result.status === 401) {
        await expireSession(deps.store);
        break;
      }
      if (result.kind !== 'ok') break;
      const parsed = placesResponseSchema.safeParse(result.body);
      if (!parsed.success || parsed.data.geohash !== cell) break;
      await saveRegionCell(deps.db, parsed.data, now());
      saved += 1;
    }
    return saved;
  } catch {
    return 0;
  }
}
