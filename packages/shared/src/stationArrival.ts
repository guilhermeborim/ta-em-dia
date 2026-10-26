/**
 * Aviso ao chegar no posto (C7): regras puras de quais postos vigiar com geofence e de quando
 * avisar. A posição da pessoa só entra como argumento e não é guardada
 * (docs/05-privacidade-lgpd.md, "Localização sempre").
 */

import { distanceMeters, type LatLng } from './geo';
import { encodeGeohash, geohashBounds } from './places';

/** Regiões que o app vigia ao mesmo tempo: o limite do iOS (o Android aceita 100). */
export const STATION_ARRIVAL_REGION_LIMIT = 20;

/** Postos vigiados: o limite menos a região da área (que avisa quando a pessoa se afasta). */
export const STATION_ARRIVAL_STATION_LIMIT = STATION_ARRIVAL_REGION_LIMIT - 1;

/** Raio da geofence de cada posto (metros). */
export const STATION_ARRIVAL_RADIUS_M = 150;

/** Quanto tempo dentro da geofence antes do aviso (ms): ~2 min parado no posto. */
export const STATION_ARRIVAL_DWELL_MS = 2 * 60 * 1000;

/** No máximo um aviso por posto nesse intervalo (ms). */
export const STATION_ARRIVAL_COOLDOWN_MS = 12 * 60 * 60 * 1000;

/** Raio da região da área (metros): ao sair dela, o app troca os postos vigiados. */
export const STATION_ARRIVAL_AREA_RADIUS_M = 5_000;

/** Posto mais longe que isso da posição não entra, mesmo que seja dos mais usados (metros). */
export const STATION_ARRIVAL_MAX_DISTANCE_M = 10_000;

/** Um posto que pode ser vigiado. */
export interface ArrivalCandidate extends LatLng {
  /** Identifica o posto na geofence: o id do OpenStreetMap ou, no posto local, o id em `stations`. */
  key: string;
  /** Quantos abastecimentos a pessoa registrou nele (0 se nunca usou). */
  uses: number;
}

/**
 * Os postos a vigiar, no máximo `limit`: primeiro os já usados, do mais usado ao menos usado
 * (empate: o mais perto), depois os outros, do mais perto ao mais longe. Só entram postos a até
 * 10 km da posição; a mesma `key` vale uma vez.
 */
export function pickArrivalStations<T extends ArrivalCandidate>(
  position: LatLng,
  candidates: readonly T[],
  limit: number = STATION_ARRIVAL_STATION_LIMIT,
  maxDistanceM: number = STATION_ARRIVAL_MAX_DISTANCE_M,
): T[] {
  const seen = new Set<string>();
  const items = candidates
    .filter((candidate) => {
      if (seen.has(candidate.key)) return false;
      seen.add(candidate.key);
      return true;
    })
    .map((candidate, index) => ({
      candidate,
      index,
      distanceM: distanceMeters(position, candidate),
    }))
    .filter((item) => item.distanceM <= maxDistanceM);

  const used = items
    .filter((item) => item.candidate.uses > 0)
    .sort(
      (a, b) =>
        b.candidate.uses - a.candidate.uses || a.distanceM - b.distanceM || a.index - b.index,
    );
  const others = items
    .filter((item) => item.candidate.uses <= 0)
    .sort((a, b) => a.distanceM - b.distanceM || a.index - b.index);

  return [...used, ...others].slice(0, limit).map((item) => item.candidate);
}

/**
 * Centro da região da área: o centro da célula do geohash de 5 caracteres (~5 km) da posição, não
 * a posição. As geofences ficam guardadas pelo sistema, então só a célula aproximada fica nelas.
 */
export function arrivalAreaCenter(position: LatLng): LatLng {
  const bounds = geohashBounds(encodeGeohash(position.lat, position.lng));
  return {
    lat: (bounds.south + bounds.north) / 2,
    lng: (bounds.west + bounds.east) / 2,
  };
}

/** As duas datas caem no mesmo dia no fuso do aparelho? */
export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export interface ArrivalCheck {
  now: Date;
  /** Quando saiu (ou vai sair) o último aviso deste posto. */
  lastNotifiedAt?: Date | null;
  /** Data do abastecimento mais recente registrado (qualquer veículo). */
  lastFuelAt?: Date | null;
}

/**
 * Pode avisar ao chegar neste posto? Não se já houve abastecimento registrado hoje (fuso do
 * aparelho) nem se o último aviso deste posto foi há menos de 12 h.
 */
export function shouldNotifyStationArrival({
  now,
  lastNotifiedAt,
  lastFuelAt,
}: ArrivalCheck): boolean {
  if (lastFuelAt && isSameLocalDay(lastFuelAt, now)) return false;
  if (lastNotifiedAt && now.getTime() - lastNotifiedAt.getTime() < STATION_ARRIVAL_COOLDOWN_MS) {
    return false;
  }
  return true;
}

/** Último aviso por posto (`key` → data ISO). Fica só no aparelho. */
export type ArrivalLog = Record<string, string>;

/**
 * Tira do registro o que já passou de 12 h (não serve mais para a regra) e o que não é data. Assim
 * o aparelho guarda só os avisos das últimas 12 h, nunca um histórico de postos visitados.
 */
export function pruneArrivalLog(log: ArrivalLog, now: Date): ArrivalLog {
  const result: ArrivalLog = {};
  for (const [key, value] of Object.entries(log)) {
    const at = new Date(value).getTime();
    if (Number.isNaN(at)) continue;
    if (now.getTime() - at < STATION_ARRIVAL_COOLDOWN_MS) result[key] = value;
  }
  return result;
}

/** Texto do aviso: "Abastecendo no Shell · Av. da Pista? Registre agora." */
export function stationArrivalMessage(label: string): string {
  return `Abastecendo no ${label}? Registre agora.`;
}
