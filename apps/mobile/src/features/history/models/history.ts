import {
  maintenanceLabel,
  segmentKmPerLiter,
  type FuelEntry,
  type MaintenanceRecord,
} from '@ta-em-dia/shared';
import { formatBRL, formatNumber, MONTH_NAMES, MONTH_NAMES_SHORT } from '../../../core/format';
import type { TimelineKind } from '../../../ui';

/** Tipo de item mostrado: tudo, só abastecimentos ou só manutenções. */
export type HistoryFilter = 'all' | 'fuel' | 'maintenance';

/** Período: tudo, o mês atual, os 3 últimos meses (com o atual) ou o ano atual. */
export type HistoryPeriod = 'all' | 'month' | '3months' | 'year';

export const historyFilters: { filter: HistoryFilter; label: string }[] = [
  { filter: 'all', label: 'Tudo' },
  { filter: 'fuel', label: 'Abastecimentos' },
  { filter: 'maintenance', label: 'Manutenções' },
];

export const historyPeriods: { value: HistoryPeriod; label: string }[] = [
  { value: 'all', label: 'Tudo' },
  { value: 'month', label: 'Mês' },
  { value: '3months', label: '3 meses' },
  { value: 'year', label: 'Ano' },
];

export interface HistoryData {
  /** Do mais recente ao mais antigo. */
  entries: FuelEntry[];
  records: MaintenanceRecord[];
}

export interface TimelineEntry {
  id: string;
  kind: TimelineKind;
  title: string;
  /** Ex.: "18 out · 38,25 L · 11,7 km/l". */
  details: string;
  /** Ex.: "R$ 229,10". Serviço sem custo informado fica sem valor. */
  value?: string;
}

export interface TimelineSection {
  key: string;
  /** Ex.: "Outubro 2026". */
  title: string;
  items: TimelineEntry[];
}

const dayNumber = (date: Date) =>
  date.getFullYear() * 10000 + date.getMonth() * 100 + date.getDate();
const dayText = (date: Date) =>
  `${String(date.getDate()).padStart(2, '0')} ${MONTH_NAMES_SHORT[date.getMonth()]}`;

/** Primeiro dia do período, ou `null` para "Tudo". */
function periodStart(period: HistoryPeriod, today: Date): Date | null {
  switch (period) {
    case 'month':
      return new Date(today.getFullYear(), today.getMonth(), 1);
    case '3months':
      return new Date(today.getFullYear(), today.getMonth() - 2, 1);
    case 'year':
      return new Date(today.getFullYear(), 0, 1);
    default:
      return null;
  }
}

interface Event extends TimelineEntry {
  date: Date;
  km: number;
}

/**
 * Linha do tempo por mês (do mais recente ao mais antigo) com abastecimentos e
 * manutenções. O km/l de cada trecho é calculado com todos os abastecimentos,
 * antes dos filtros. No mesmo dia, o de maior km vem primeiro.
 */
export function buildTimeline(
  data: HistoryData,
  filter: HistoryFilter,
  period: HistoryPeriod,
  today: Date = new Date(),
): TimelineSection[] {
  const events: Event[] = [];

  if (filter !== 'maintenance') {
    const segments = segmentKmPerLiter(data.entries);
    data.entries.forEach((entry, index) => {
      const kmPerLiter = segments[index];
      events.push({
        id: entry.id,
        kind: 'fuel',
        title: 'Abastecimento',
        details: [
          dayText(entry.date),
          `${formatNumber(entry.liters, 1, 2)} L`,
          kmPerLiter === null ? null : `${formatNumber(kmPerLiter, 1)} km/l`,
        ]
          .filter(Boolean)
          .join(' · '),
        value: formatBRL(entry.total),
        date: entry.date,
        km: entry.km,
      });
    });
  }

  if (filter !== 'fuel') {
    for (const record of data.records) {
      events.push({
        id: record.id,
        kind: 'maintenance',
        title: maintenanceLabel(record.type),
        details: [dayText(record.date), record.shop ?? `${formatNumber(record.km, 0)} km`].join(
          ' · ',
        ),
        value: record.cost === undefined ? undefined : formatBRL(record.cost),
        date: record.date,
        km: record.km,
      });
    }
  }

  const start = periodStart(period, today);
  const visible = events
    .filter((event) => start === null || event.date >= start)
    .sort((a, b) => dayNumber(b.date) - dayNumber(a.date) || b.km - a.km);

  const sections: TimelineSection[] = [];
  for (const { date, id, kind, title, details, value } of visible) {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    let section = sections[sections.length - 1];
    if (section?.key !== key) {
      section = { key, title: `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`, items: [] };
      sections.push(section);
    }
    section.items.push({ id, kind, title, details, value });
  }
  return sections;
}
