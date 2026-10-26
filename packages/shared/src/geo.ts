/**
 * Distância e proximidade, puras. A posição da pessoa só existe na memória do aparelho
 * (docs/05-privacidade-lgpd.md): estas funções recebem a coordenada e não guardam nada.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

/** Raio médio da Terra, em metros. */
const EARTH_RADIUS_M = 6_371_008.8;

const toRad = (degrees: number) => (degrees * Math.PI) / 180;

/** Distância em metros entre dois pontos (fórmula de haversine). */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Os pontos a até `radiusM` metros de `from`, do mais perto ao mais longe, com a distância.
 * Empate na distância mantém a ordem de entrada. `limit` corta a lista (padrão: sem corte).
 */
export function nearestWithin<T extends LatLng>(
  from: LatLng,
  points: readonly T[],
  radiusM: number,
  limit: number = Infinity,
): (T & { distanceM: number })[] {
  return points
    .map((point, index) => ({ point, index, distanceM: distanceMeters(from, point) }))
    .filter((item) => item.distanceM <= radiusM)
    .sort((a, b) => a.distanceM - b.distanceM || a.index - b.index)
    .slice(0, limit)
    .map((item) => ({ ...item.point, distanceM: item.distanceM }));
}
