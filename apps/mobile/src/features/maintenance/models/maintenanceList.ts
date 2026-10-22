import {
  maintenanceLabel,
  maintenanceStatus,
  MAINTENANCE_CATALOG,
  type MaintenancePlan,
  type MaintenanceStatus,
} from '@ta-em-dia/shared';
import { formatNumber, MONTH_NAMES_SHORT } from '../../../core/format';
import type { MaintenanceData } from './plans.repository';

export type MaintenanceTab = 'next' | 'done';

export interface PlanCardView {
  id: string;
  title: string;
  /** Ex.: "10.000 km ou 12 meses". */
  subtitle: string;
  tone: 'ok' | 'warning' | 'danger';
  /** Ex.: "Vence em 12 dias". */
  status: string;
  /** De 0 a 1 (acima de 1 a barra fica cheia). */
  progress: number;
  /** Ex.: "8.600 de 10.000 km". */
  progressLabel: string;
  /** Ex.: "≈ 500 km · 12 dias". */
  hint: string;
}

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
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "10.000 km ou 12 meses", "A cada 10.000 km" ou "A cada 24 meses". */
export function intervalText(intervalKm?: number, intervalMonths?: number): string {
  if (intervalKm && intervalMonths) {
    return `${km(intervalKm)} km ou ${plural(intervalMonths, 'mês', 'meses')}`;
  }
  if (intervalKm) return `A cada ${km(intervalKm)} km`;
  if (intervalMonths) return `A cada ${plural(intervalMonths, 'mês', 'meses')}`;
  return 'Sem intervalo';
}

export function statusLabel(status: MaintenanceStatus): string {
  const days = status.remainingDays ?? 0;
  if (status.tone === 'overdue') return 'Vencido';
  if (status.tone === 'soon')
    return days <= 0 ? 'Vence hoje' : `Vence em ${plural(days, 'dia', 'dias')}`;
  return 'Em dia';
}

function progressLabel(plan: MaintenancePlan, status: MaintenanceStatus): string {
  if (status.limiting === 'time') {
    return `${status.usedMonths} de ${plural(plan.intervalMonths!, 'mês', 'meses')}`;
  }
  return `${km(status.usedKm)} de ${km(plan.intervalKm!)} km`;
}

/** Texto à direita da barra: o que falta (ou o quanto passou). */
function hintLabel(status: MaintenanceStatus): string {
  const days = status.remainingDays;
  if (status.tone === 'overdue') {
    if (status.limiting === 'km' && status.remainingKm !== null) {
      return `Passou ${km(-status.remainingKm)} km`;
    }
    return `Venceu há ${plural(Math.max(1, -(days ?? 0)), 'dia', 'dias')}`;
  }
  if (days !== null && days >= 60) return `≈ ${Math.round(days / 30)} meses`;
  if (status.limiting === 'km' && status.remainingKm !== null) {
    return days === null
      ? `≈ ${km(status.remainingKm)} km`
      : `≈ ${km(status.remainingKm)} km · ${plural(Math.max(days, 0), 'dia', 'dias')}`;
  }
  return `≈ ${plural(Math.max(days ?? 0, 0), 'dia', 'dias')}`;
}

/** Estado do `shared` → tom do cartão (UI). */
export const tones = { ok: 'ok', soon: 'warning', overdue: 'danger' } as const;

/** Monta as telas "Próximas" e "Sugeridas": cartões ordenados pelo que vence primeiro. */
export function buildMaintenanceList(
  data: MaintenanceData,
  today: Date = new Date(),
): MaintenanceListView {
  const active = data.plans.filter((plan) => plan.enabled);

  const alerts: { card: PlanCardView; days: number }[] = [];
  const noInterval: NoIntervalCardView[] = [];

  for (const plan of active) {
    const status = maintenanceStatus(plan, data.currentKm, data.dailyKm, today);
    const title = maintenanceLabel(plan.type);
    if (status.tone === 'none') {
      const date = plan.lastDoneAt;
      noInterval.push({
        id: plan.id,
        title,
        own: !MAINTENANCE_CATALOG.some((item) => item.code === plan.type),
        lastDone: `Última vez: ${date.getDate()} ${MONTH_NAMES_SHORT[date.getMonth()]} · ${km(plan.lastDoneKm)} km`,
      });
      continue;
    }
    alerts.push({
      card: {
        id: plan.id,
        title,
        subtitle: intervalText(plan.intervalKm, plan.intervalMonths),
        tone: tones[status.tone],
        status: statusLabel(status),
        progress: Math.max(0, status.progress ?? 0),
        progressLabel: progressLabel(plan, status),
        hint: hintLabel(status),
      },
      days: status.remainingDays ?? Infinity,
    });
  }

  alerts.sort((a, b) => a.days - b.days || a.card.title.localeCompare(b.card.title, 'pt-BR'));

  const activeTypes = new Set(active.map((plan) => plan.type));
  return {
    alerts: alerts.map((entry) => entry.card),
    noInterval,
    suggestions: MAINTENANCE_CATALOG.filter((item) => !activeTypes.has(item.code)).map((item) => ({
      code: item.code,
      title: item.label,
      subtitle: intervalText(item.intervalKm, item.intervalMonths),
    })),
  };
}
