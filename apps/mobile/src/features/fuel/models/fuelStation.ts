import {
  normalizeStationName,
  stationPriceAverage,
  suggestStations,
  type LatLng,
  type StationPriceRow,
} from '@ta-em-dia/shared';
import { formatBRL } from '../../../core/format';
import { fuelTypeLabel, type FuelType } from '../../../core/fuel';
import type { NearbyStation, StationInput } from '../../../core/stations';

/**
 * Posto do formulário pela localização (C6), puro. O campo "Posto" continua sendo texto: o posto
 * perto escolhido é o que tem o rótulo igual ao texto ("Shell · Av. da Pista"). Assim a fala, o
 * chip e a digitação mexem no mesmo campo, sem estado escondido.
 */

export interface StationChip {
  label: string;
  /** `station` preenche o campo; `switch` é o "Trocar" (limpa o campo e abre o teclado). */
  kind: 'station' | 'switch';
}

export const SWITCH_STATION_LABEL = 'Trocar';

const same = (a: string, b: string) => {
  const key = normalizeStationName(a);
  return key !== '' && key === normalizeStationName(b);
};

/** O posto perto cujo rótulo é o texto do campo, se houver. */
export function matchNearby(text: string, nearby: readonly NearbyStation[]): NearbyStation | null {
  return nearby.find((station) => same(station.label, text)) ?? null;
}

/**
 * Chips sob o campo "Posto". Com o campo num posto perto (sugerido ou escolhido): o outro posto
 * perto, se houver, e "Trocar". Fora disso, as sugestões de sempre (postos perto primeiro, depois
 * os já usados) filtradas pelo texto.
 */
export function stationChips(
  text: string,
  nearby: readonly NearbyStation[],
  known: readonly string[],
): StationChip[] {
  const current = matchNearby(text, nearby);
  if (current) {
    const other = nearby.find((station) => station !== current);
    return [
      ...(other ? [{ label: other.label, kind: 'station' as const }] : []),
      { label: SWITCH_STATION_LABEL, kind: 'switch' },
    ];
  }
  return suggestStations([...nearby.map((station) => station.label), ...known], text).map(
    (label) => ({ label, kind: 'station' as const }),
  );
}

/**
 * Texto que o formulário sugere ao abrir: o posto mais perto, só se o campo está vazio e a
 * pessoa ainda não mexeu nele (nem pela fala). `null` = não mexe no campo.
 */
export function autoStationText(
  text: string,
  touched: boolean,
  nearby: readonly NearbyStation[],
): string | null {
  if (touched || text.trim() !== '' || nearby.length === 0) return null;
  return nearby[0]!.label;
}

export interface StationInputContext {
  /** Nome do posto que vai ser gravado (já resolvido contra os nomes usados). */
  stationName: string;
  nearby: readonly NearbyStation[];
  /** Editando: o posto que o abastecimento já tinha. */
  original?: { id?: string; name?: string };
  /** Posição de agora (só na memória), para o posto local novo. */
  position: LatLng | null;
  /** Abastecimento de hoje: só aí a posição de agora é a do posto. */
  isToday: boolean;
}

/**
 * Que posto gravar com o abastecimento:
 * 1. o posto perto com o mesmo rótulo (já usado: pelo id; do OpenStreetMap: com os dados do mapa);
 * 2. editando, sem mudar o texto: o posto que já estava;
 * 3. senão, pelo nome digitado: um posto já salvo com o mesmo rótulo ou um posto local novo, com
 *    a posição de agora só se o abastecimento é de hoje (registro antigo não é feito no posto).
 */
export function stationInputFor(ctx: StationInputContext): StationInput {
  const near = matchNearby(ctx.stationName, ctx.nearby);
  if (near) {
    if (near.stationId) return { id: near.stationId };
    return {
      osmId: near.osmId,
      name: near.name,
      brand: near.brand,
      street: near.street,
      lat: near.lat,
      lng: near.lng,
    };
  }
  if (ctx.original?.id && same(ctx.original.name ?? '', ctx.stationName)) {
    return { id: ctx.original.id };
  }
  return {
    name: ctx.stationName,
    ...(ctx.position && ctx.isToday ? { lat: ctx.position.lat, lng: ctx.position.lng } : {}),
  };
}

/**
 * "Média neste posto: R$ 5,89 o litro de gasolina (3 abastecimentos)", com os abastecimentos
 * completos do posto (por id ou pelo nome) e do combustível escolhido. `null` sem histórico.
 */
export function stationAverageText(
  rows: readonly StationPriceRow[],
  station: { id?: string; name: string },
  fuelType: FuelType,
): string | null {
  if (station.name.trim() === '') return null;
  const average = stationPriceAverage(rows, station, fuelType);
  if (!average) return null;
  const times = average.count === 1 ? '1 abastecimento' : `${average.count} abastecimentos`;
  const fuel = fuelType === 'gnv' ? 'GNV' : fuelTypeLabel[fuelType].toLowerCase();
  return `Média neste posto: ${formatBRL(average.pricePerLiter)} o litro de ${fuel} (${times})`;
}
