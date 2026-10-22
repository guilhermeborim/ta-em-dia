import {
  exactKmPerLiter,
  periodConsumption,
  segmentKmPerLiter,
  type FuelEntry,
} from '@ta-em-dia/shared';
import { formatBRL, formatNumber } from '../../../core/format';
import { fuelTypeOptions, type FuelType } from './fuelForm';

/** Filtro da lista: tudo, um combustível ou só tanque cheio. */
export type FuelFilter = 'all' | 'full' | FuelType;

export interface FuelFilterChip {
  filter: FuelFilter;
  label: string;
}

export interface FuelListItem {
  id: string;
  title: string;
  details: string;
  total: string;
  /** Só quando o trecho pode ser calculado. */
  kmPerLiter?: string;
}

export interface FuelListSection {
  key: string;
  title: string;
  summary: string;
  items: FuelListItem[];
}

export interface FuelAverage {
  /** Sem ela (menos de dois abastecimentos), o cartão pede mais um abastecimento. */
  periodAverage?: string;
  periodCalc?: string;
  exactAverage?: string;
}

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];
const MONTHS_SHORT = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];

const fuelLabel = Object.fromEntries(fuelTypeOptions.map((o) => [o.type, o.label])) as Record<
  FuelType,
  string
>;

/** "Tudo", os combustíveis que existem na lista e "Só tanque cheio". */
export function buildFilterChips(entries: FuelEntry[]): FuelFilterChip[] {
  const used = new Set(entries.map((e) => e.fuelType));
  return [
    { filter: 'all', label: 'Tudo' },
    ...fuelTypeOptions
      .filter((o) => used.has(o.type))
      .map((o) => ({ filter: o.type, label: o.label })),
    { filter: 'full', label: 'Só tanque cheio' },
  ];
}

function matches(entry: FuelEntry, filter: FuelFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'full') return entry.fullTank;
  return entry.fuelType === filter;
}

/**
 * Médias do veículo. Sempre sobre todos os abastecimentos: filtrar por
 * combustível quebraria a distância entre os tanques.
 */
export function buildAverage(entries: FuelEntry[]): FuelAverage {
  const period = periodConsumption(entries);
  if (!period) return {};
  const exact = exactKmPerLiter(entries);
  return {
    periodAverage: formatNumber(period.kmPerLiter, 1),
    periodCalc: `${formatNumber(period.distanceKm, 0)} km ÷ ${formatNumber(period.liters, 1)} L`,
    exactAverage: exact === null ? undefined : formatNumber(exact, 1),
  };
}

function toItem(entry: FuelEntry, kmPerLiter: number | null): FuelListItem {
  const day = String(entry.date.getDate()).padStart(2, '0');
  const date = `${day} ${MONTHS_SHORT[entry.date.getMonth()]}`;
  return {
    id: entry.id,
    title: entry.stationName ? `${date} · ${entry.stationName}` : date,
    details: `${formatNumber(entry.liters, 1, 2)} L · ${fuelLabel[entry.fuelType]} · ${
      entry.fullTank ? 'cheio' : 'parcial'
    }`,
    total: formatBRL(entry.total),
    kmPerLiter: kmPerLiter === null ? undefined : `${formatNumber(kmPerLiter, 1)} km/l`,
  };
}

/**
 * Lista por mês (do mais recente ao mais antigo) com o filtro aplicado. O km/l
 * de cada trecho é calculado com todos os abastecimentos, antes do filtro.
 */
export function buildSections(
  entries: FuelEntry[],
  filter: FuelFilter,
  today: Date = new Date(),
): FuelListSection[] {
  const segments = segmentKmPerLiter(entries);
  const sections: (FuelListSection & { spent: number })[] = [];

  entries.forEach((entry, index) => {
    if (!matches(entry, filter)) return;
    const year = entry.date.getFullYear();
    const month = entry.date.getMonth();
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;

    let section = sections.find((s) => s.key === key);
    if (!section) {
      const title = year === today.getFullYear() ? MONTHS[month] : `${MONTHS[month]} de ${year}`;
      section = { key, title, summary: '', items: [], spent: 0 };
      sections.push(section);
    }
    section.items.push(toItem(entry, segments[index]));
    section.spent += entry.total;
  });

  return sections
    .sort((a, b) => (a.key < b.key ? 1 : -1))
    .map(({ spent, ...section }) => ({
      ...section,
      summary: `${section.items.length} abast. · ${formatBRL(spent)}`,
    }));
}
