import { segmentKmPerLiter, type FuelEntry } from '@ta-em-dia/shared';
import { formatBRL, MONTH_NAMES } from '../../../core/format';
import {
  fuelTypeOptions,
  toFuelListItem,
  type FuelListItem,
  type FuelType,
} from '../../../core/fuel';

/** Filtro da lista: tudo, um combustível ou só tanque cheio. */
export type FuelFilter = 'all' | 'full' | FuelType;

export interface FuelFilterChip {
  filter: FuelFilter;
  label: string;
}

export interface FuelListSection {
  key: string;
  title: string;
  summary: string;
  items: FuelListItem[];
}

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
      const title =
        year === today.getFullYear() ? MONTH_NAMES[month] : `${MONTH_NAMES[month]} de ${year}`;
      section = { key, title, summary: '', items: [], spent: 0 };
      sections.push(section);
    }
    section.items.push(toFuelListItem(entry, segments[index]));
    section.spent += entry.total;
  });

  return sections
    .sort((a, b) => (a.key < b.key ? 1 : -1))
    .map(({ spent, ...section }) => ({
      ...section,
      summary: `${section.items.length} abast. · ${formatBRL(spent)}`,
    }));
}
