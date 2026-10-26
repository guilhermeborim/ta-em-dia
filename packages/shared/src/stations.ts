/**
 * Posto padronizado: o campo "Posto" do abastecimento sugere os nomes já usados e reaproveita o
 * mesmo texto, sem diferenciar maiúsculas, acentos nem espaços repetidos.
 */

/** Quantas sugestões aparecem no máximo. */
export const STATION_SUGGESTION_LIMIT = 5;

/** Chave de comparação: sem acentos, minúscula e com espaços únicos ("  Posto  Ípiranga" → "posto ipiranga"). */
export function normalizeStationName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function tidy(name: string): string {
  return name.replace(/\s+/g, ' ').trim();
}

/**
 * Nome a gravar: se já existe um posto com a mesma chave, volta o nome existente; senão, o
 * digitado sem espaços sobrando. Vazio vira `undefined` (posto é opcional).
 */
export function resolveStationName(known: readonly string[], typed: string): string | undefined {
  const text = tidy(typed);
  if (text === '') return undefined;
  const key = normalizeStationName(text);
  return known.find((name) => normalizeStationName(name) === key) ?? text;
}

/** Raio em que um posto conta como "o posto onde você está" (metros). */
export const STATION_NEARBY_RADIUS_M = 150;

/** Quantos postos perto aparecem: o sugerido e o segundo mais perto, num chip. */
export const STATION_NEARBY_LIMIT = 2;

/** Maior texto de posto gravado no abastecimento (`stationName`). */
export const STATION_NAME_MAX = 80;

/** O que o rótulo de um posto usa (do OpenStreetMap ou local). */
export interface StationLabelInput {
  /** Nome; sem nome no OpenStreetMap, a API já põe a bandeira; sem os dois, `null`. */
  name?: string | null;
  brand?: string | null;
  street?: string | null;
}

/**
 * Como o posto aparece para a pessoa (e no `stationName` do abastecimento), nunca o ID:
 * "Shell · Av. da Pista". Sem nome, vale a bandeira; sem as duas, "Posto" ("Posto · Rua Tal").
 * Sem rua, só o nome. Até 80 caracteres: o que passa sai do fim da rua.
 */
export function stationLabel(station: StationLabelInput): string {
  const name = tidy(station.name ?? '') || tidy(station.brand ?? '') || 'Posto';
  const street = tidy(station.street ?? '');
  if (street === '' || normalizeStationName(street) === normalizeStationName(name)) {
    return name.slice(0, STATION_NAME_MAX);
  }
  const label = `${name} · ${street}`;
  return label.length <= STATION_NAME_MAX ? label : `${label.slice(0, STATION_NAME_MAX - 1)}…`;
}

/** Uma linha de abastecimento completo, só com o que a média por posto usa. */
export interface StationPriceRow {
  stationId?: string | null;
  stationName?: string | null;
  fuelType: string;
  liters: number;
  total: number;
}

export interface StationPriceAverage {
  /** R$ por litro: soma dos totais ÷ soma dos litros (pesa pelos litros). */
  pricePerLiter: number;
  /** Quantos abastecimentos entraram na média. */
  count: number;
}

/**
 * Média do preço do litro num posto, para um combustível. Um abastecimento é do posto se tem o
 * mesmo `stationId` ou o mesmo nome (sem diferenciar maiúsculas, acentos e espaços), o que cobre
 * os registros antigos, sem `stationId`. `null` sem nenhum abastecimento.
 */
export function stationPriceAverage(
  rows: readonly StationPriceRow[],
  station: { id?: string | null; name: string },
  fuelType: string,
): StationPriceAverage | null {
  const key = normalizeStationName(station.name);
  let liters = 0;
  let total = 0;
  let count = 0;
  for (const row of rows) {
    if (row.fuelType !== fuelType || row.liters <= 0) continue;
    const sameId = Boolean(station.id) && row.stationId === station.id;
    const sameName = key !== '' && normalizeStationName(row.stationName ?? '') === key;
    if (!sameId && !sameName) continue;
    liters += row.liters;
    total += row.total;
    count += 1;
  }
  return count === 0 ? null : { pricePerLiter: total / liters, count };
}

/**
 * Sugestões para o texto digitado. `known` vem do mais usado ao menos usado e essa ordem é
 * mantida; quando dois nomes têm a mesma chave, vale o primeiro. Sem texto, devolve os mais
 * usados. Não sugere o que já está escrito igualzinho.
 */
export function suggestStations(
  known: readonly string[],
  typed: string,
  limit: number = STATION_SUGGESTION_LIMIT,
): string[] {
  const query = normalizeStationName(typed);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of known) {
    const name = tidy(raw);
    const key = normalizeStationName(name);
    if (key === '' || seen.has(key)) continue;
    seen.add(key);
    if (key === query && name === tidy(typed)) continue;
    if (query === '' || key.includes(query)) result.push(name);
    if (result.length === limit) break;
  }
  return result;
}
