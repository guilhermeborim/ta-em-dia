import { maintenanceLabel, MAINTENANCE_CATALOG, type MaintenanceRecord } from '@ta-em-dia/shared';
import { formatBRL, formatNumber, MONTH_NAMES_SHORT } from '../../../core/format';
import { buildAlertCards, intervalText, type PlanCardView } from '../../../core/maintenance';
import type { MaintenanceData } from './plans.repository';

export type MaintenanceTab = 'next' | 'done';

export { intervalText };
export type { PlanCardView };

export interface NoIntervalCardView {
  id: string;
  title: string;
  /** Tipo criado pela pessoa em "Outro". */
  own: boolean;
  /** Ex.: "Última vez: 12 out · 50.110 km". */
  lastDone: string;
}

export interface SuggestionView {
  code: string;
  title: string;
  /** Ex.: "A cada 60.000 km". */
  subtitle: string;
}

export interface MaintenanceListView {
  /** Itens com intervalo, o que vence primeiro no topo. */
  alerts: PlanCardView[];
  /** Itens sem intervalo: só histórico. */
  noInterval: NoIntervalCardView[];
  suggestions: SuggestionView[];
}

const km = (value: number) => formatNumber(value, 0);

/** Monta as telas "Próximas" e "Sugeridas": cartões ordenados pelo que vence primeiro. */
export function buildMaintenanceList(
  data: MaintenanceData,
  today: Date = new Date(),
): MaintenanceListView {
  const active = data.plans.filter((plan) => plan.enabled);

  const alerts = buildAlertCards(active, data, today);
  const noInterval: NoIntervalCardView[] = [];

  for (const plan of active) {
    if (plan.intervalKm || plan.intervalMonths) continue;
    const date = plan.lastDoneAt;
    noInterval.push({
      id: plan.id,
      title: maintenanceLabel(plan.type),
      own: !MAINTENANCE_CATALOG.some((item) => item.code === plan.type),
      lastDone: `Última vez: ${date.getDate()} ${MONTH_NAMES_SHORT[date.getMonth()]} · ${km(plan.lastDoneKm)} km`,
    });
  }

  const activeTypes = new Set(active.map((plan) => plan.type));
  return {
    alerts,
    noInterval,
    suggestions: MAINTENANCE_CATALOG.filter((item) => !activeTypes.has(item.code)).map((item) => ({
      code: item.code,
      title: item.label,
      subtitle: intervalText(item.intervalKm, item.intervalMonths),
    })),
  };
}

export interface RecordItemView {
  id: string;
  title: string;
  /** Ex.: "12 jan 2026 · 40.320 km · Auto Center do Zé". */
  details: string;
  /** Ex.: "R$ 289,00". Sem custo informado, fica sem valor. */
  cost?: string;
}

/** Aba "Feitas": os serviços registrados, do mais recente ao mais antigo. */
export function buildRecordItems(records: MaintenanceRecord[]): RecordItemView[] {
  return records.map((record) => ({
    id: record.id,
    title: maintenanceLabel(record.type),
    details: [
      `${record.date.getDate()} ${MONTH_NAMES_SHORT[record.date.getMonth()]} ${record.date.getFullYear()}`,
      `${km(record.km)} km`,
      record.shop,
    ]
      .filter(Boolean)
      .join(' · '),
    cost: record.cost === undefined ? undefined : formatBRL(record.cost),
  }));
}
