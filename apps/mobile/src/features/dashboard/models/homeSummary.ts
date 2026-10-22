import {
  monthFuelSummary,
  monthOverMonth,
  periodConsumption,
  segmentKmPerLiter,
  type FuelEntry,
} from '@ta-em-dia/shared';
import { formatBRL, formatNumber, MONTH_NAMES, MONTH_NAMES_SHORT } from '../../../core/format';
import { toFuelListItem, type FuelListItem } from '../../../core/fuel';
import { buildMonthSummary } from './dashboard.service';

export interface HomeSummary {
  /** Ex.: "Gasto em outubro". */
  title: string;
  /** Sem o "R$". Ex.: "842,60". */
  amount: string;
  variation?: { label: string; trend: 'up' | 'down' };
  /** Ex.: "Projeção do mês: R$ 1.090". Só quando já houve gasto no mês. */
  projection?: string;
  stats: { label: string; value: string }[];
}

const NONE = '—';

/** Cartão do mês: gasto, variação contra o mês anterior, projeção, abastecimentos, custo por km e km rodados. */
export function buildHomeSummary(entries: FuelEntry[], today: Date = new Date()): HomeSummary {
  const month = monthFuelSummary(entries, today);
  const { projection, vsPreviousPct } = buildMonthSummary(month.spent, month.previousSpent, today);
  const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1).getMonth();

  return {
    title: `Gasto em ${MONTH_NAMES[today.getMonth()].toLowerCase()}`,
    amount: formatNumber(month.spent, 2),
    variation:
      vsPreviousPct === null
        ? undefined
        : {
            label: `${formatNumber(Math.abs(vsPreviousPct), 0)}% vs ${MONTH_NAMES_SHORT[previousMonth]}`,
            trend: vsPreviousPct <= 0 ? 'down' : 'up',
          },
    projection: month.spent > 0 ? `Projeção do mês: ${formatBRL(projection, 0)}` : undefined,
    stats: [
      { label: 'Abastecimentos', value: `${month.count} no mês` },
      {
        label: 'Custo por km',
        value: month.costPerKm === null ? NONE : formatBRL(month.costPerKm),
      },
      {
        label: 'Rodou',
        value: month.distanceKm === null ? NONE : `${formatNumber(month.distanceKm, 0)} km`,
      },
    ],
  };
}

/** "Último abastecimento": o mais recente, já formatado. `null` sem abastecimentos. */
export function buildLastEntry(entries: FuelEntry[]): FuelListItem | null {
  if (entries.length === 0) return null;
  return toFuelListItem(entries[0], segmentKmPerLiter(entries)[0], 'tanque cheio');
}

export interface SavedToast {
  title: string;
  /** Ex.: "Esse trecho fez 13,1 km/l · +4% vs média". Só quando o trecho pode ser calculado. */
  message?: string;
}

/** Aviso depois de salvar: km/l do trecho do abastecimento e como ele se compara com a média. */
export function buildSavedToast(entries: FuelEntry[], savedId: string): SavedToast | null {
  const index = entries.findIndex((e) => e.id === savedId);
  if (index === -1) return null;

  const title = 'Abastecimento salvo';
  const segment = segmentKmPerLiter(entries)[index];
  if (segment === null) return { title };

  const average = periodConsumption(entries)?.kmPerLiter;
  const pct = average ? monthOverMonth(segment, average) : null;
  const versus =
    pct === null ? '' : ` · ${pct >= 0 ? '+' : '−'}${formatNumber(Math.abs(pct), 0)}% vs média`;
  return { title, message: `Esse trecho fez ${formatNumber(segment, 1)} km/l${versus}` };
}
