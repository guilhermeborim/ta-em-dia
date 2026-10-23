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
