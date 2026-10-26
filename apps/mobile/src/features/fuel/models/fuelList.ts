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
  const sections: (FuelListSection & { spent: number; count: number })[] = [];

  const rows: { date: Date; item: FuelListItem; total: number }[] = [];
  entries.forEach((entry, index) => {
    if (!matches(entry, filter)) return;
    rows.push({
      date: entry.date,
      item: toFuelListItem(entry, segments[index]),
      total: entry.total,
    });
  });
  // A ordenação é estável: no mesmo instante, os abastecimentos ficam na ordem de antes.
  rows.sort((a, b) => b.date.getTime() - a.date.getTime());

  for (const { date, item, total } of rows) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;

    let section = sections.find((s) => s.key === key);
    if (!section) {
      const title =
        year === today.getFullYear() ? MONTH_NAMES[month] : `${MONTH_NAMES[month]} de ${year}`;
      section = { key, title, summary: '', items: [], spent: 0, count: 0 };
      sections.push(section);
    }
    section.items.push(item);
    section.count += 1;
    section.spent += total;
  }

  return sections
    .sort((a, b) => (a.key < b.key ? 1 : -1))
    .map(({ spent, count, ...section }) => ({
      ...section,
      summary: `${count} abast. · ${formatBRL(spent)}`,
    }));
}
