import {
  fuelPeriodSummary,
  monthlyTotals,
  monthOverMonth,
  REPORT_PERIOD_MONTHS,
  reportWindow,
  segmentKmPerLiter,
  spentBetween,
  type FuelEntry,
  type MaintenanceRecord,
  type ReportPeriod,
} from '@ta-em-dia/shared';
import { formatBRL, formatNumber, MONTH_NAMES, MONTH_NAMES_SHORT } from '../../../core/format';
import { buildAverage, type FuelAverage } from '../../../core/fuel';
import type { StackedBar } from '../../../ui';

export type { ReportPeriod };

export interface ReportData {
  vehicle: { id: string; name: string } | null;
  /** Do mais recente ao mais antigo. */
  entries: FuelEntry[];
  records: MaintenanceRecord[];
}

export interface ReportView {
  /** Ex.: "Total em 6 meses". */
  title: string;
  /** Sem o "R$". Ex.: "4.982". */
  total: string;
  variation?: { label: string; tone: 'ok' | 'warning' };
  bars: StackedBar[];
  /** Cartão de consumo do período. */
  average: FuelAverage;
  stats: { label: string; value: string }[];
  /** Consumo por trecho (km/l) ao longo dos meses mostrados; precisa de 2 pontos ou mais. */
  consumption: { points: { x: number; value: number }[]; labels: string[] };
}

export const periodOptions: { value: ReportPeriod; label: string }[] = [
  { value: 'month', label: 'Mês' },
  { value: '3months', label: '3 meses' },
  { value: '6months', label: '6 meses' },
  { value: 'year', label: 'Ano' },
];

/**
 * Períodos disponíveis. Sem `reports.advanced` (Premium), só o mês atual e o anterior
 * (docs/01-roadmap.md); com ela, tudo.
 */
export function availablePeriods(advanced: boolean): typeof periodOptions {
  return advanced ? periodOptions : periodOptions.filter((option) => option.value === 'month');
}

const NONE = '—';

/**
 * Tela 14. O período vai de 1 a 12 meses terminando no mês atual ("Ano" são os últimos 12
 * meses); "vs anterior" compara com o período de mesmo tamanho logo antes. Em "Mês", o gráfico
 * e a linha mostram também o mês anterior (uma barra só não diz nada). As médias de consumo
 * partem do último abastecimento antes do período, para cobrir a distância toda.
 */
export function buildReport(
  data: ReportData,
  period: ReportPeriod,
  today: Date = new Date(),
): ReportView {
  const months = REPORT_PERIOD_MONTHS[period];
  const window = reportWindow(months, today);
  const chartMonths = Math.max(months, 2);

  const rows = monthlyTotals(data.entries, data.records, chartMonths, today);
  const bars: StackedBar[] = rows.map((row, index) => ({
    key: `${row.year}-${row.month}`,
    label: MONTH_NAMES_SHORT[row.month],
    current: index === rows.length - 1,
    parts: [
      { category: 'fuel', value: row.fuel },
      { category: 'maint', value: row.maintenance },
    ],
  }));

  const total = spentBetween(data.entries, data.records, window.start, window.end);
  const previous = spentBetween(data.entries, data.records, window.previousStart, window.start);
  const change = monthOverMonth(total, previous);

  const summary = fuelPeriodSummary(data.entries, window.start, window.end);
  const inWindow = data.entries.filter((e) => e.date >= window.start && e.date < window.end);
  const before = data.entries.filter((e) => e.date < window.start);
  const baseline = before.length
    ? [before.reduce((latest, e) => (e.date > latest.date ? e : latest))]
    : [];

  // Consumo por trecho nos meses do gráfico, do mais antigo ao mais novo.
  const chartStart = new Date(rows[0].year, rows[0].month, 1).getTime();
  const spanMs = window.end.getTime() - chartStart;
  const segments = segmentKmPerLiter(data.entries);
  const points = data.entries
    .flatMap((entry, index) => {
      const value = segments[index];
      const at = entry.date.getTime();
      return value === null || at < chartStart ? [] : [{ x: (at - chartStart) / spanMs, value }];
    })
    .sort((a, b) => a.x - b.x);

  return {
    title:
      months === 1
        ? `Total em ${MONTH_NAMES[today.getMonth()].toLowerCase()}`
        : `Total em ${months} meses`,
    total: formatNumber(total, 0),
    variation:
      change === null
        ? undefined
        : {
            label: `${change <= 0 ? '−' : '+'}${formatNumber(Math.abs(change), 0)}% vs anterior`,
            tone: change <= 0 ? 'ok' : 'warning',
          },
    bars,
    average: buildAverage([...inWindow, ...baseline]),
    stats: [
      {
        label: 'Custo por km',
        value: summary.costPerKm === null ? NONE : formatBRL(summary.costPerKm),
      },
      {
        label: 'Rodou',
        value: summary.distanceKm === null ? NONE : `${formatNumber(summary.distanceKm, 0)} km`,
      },
      { label: 'Litros', value: `${formatNumber(summary.liters, 0)} L` },
    ],
    consumption: { points, labels: bars.map((bar) => bar.label) },
  };
}

/** Há algo para mostrar em qualquer período (abastecimento ou serviço com custo)? */
export function hasReportData(data: ReportData): boolean {
  return data.entries.length > 0 || data.records.some((record) => (record.cost ?? 0) > 0);
}
