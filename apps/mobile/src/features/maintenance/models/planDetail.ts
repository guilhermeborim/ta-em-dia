import {
  maintenanceLabel,
  maintenanceStatus,
  MAINTENANCE_CATALOG,
  nextMaintenance,
} from '@ta-em-dia/shared';
import { formatNumber, MONTH_NAMES_SHORT } from '../../../core/format';
import { intervalText, statusLabel, tones } from '../../../core/maintenance';
import type { PlanDetailData } from './plans.repository';

export interface PlanDetailRow {
  label: string;
  value: string;
  /** Cor do valor (ex.: a previsão em laranja quando perto de vencer). */
  tone?: 'ok' | 'warning' | 'danger';
}

export interface PlanDetailView {
  title: string;
  /** Tipo criado pela pessoa em "Outro": mostra o selo "Seu". */
  own: boolean;
  /** `none` = sem intervalo (só histórico, tela 11b). */
  tone: 'none' | 'ok' | 'warning' | 'danger';
  /** Ex.: "Vence em 12 dias", "Sem alerta". */
  status: string;
  /** Anel de progresso (só com intervalo). */
  ring?: { progress: number; value: string; caption: string };
  /** Ex.: "Previsão feita com a sua média de 42 km por dia." */
  forecast?: string;
  /** Texto do estado "sem intervalo". */
  noIntervalText?: string;
  rows: PlanDetailRow[];
  enabled: boolean;
}

const km = (value: number) => formatNumber(value, 0);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "12 jan 2026". */
function dateWithYear(date: Date): string {
  return `${date.getDate()} ${MONTH_NAMES_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

/** "02 nov" (com o ano quando não é o atual). */
function dueDate(date: Date, today: Date): string {
  const base = `${String(date.getDate()).padStart(2, '0')} ${MONTH_NAMES_SHORT[date.getMonth()]}`;
  return date.getFullYear() === today.getFullYear() ? base : `${base} ${date.getFullYear()}`;
}

/** Arredonda para mostrar "~500": de 10 em 10 até 1.000 e de 100 em 100 acima. */
function roughKm(value: number): number {
  const step = value >= 1000 ? 100 : 10;
  return Math.round(value / step) * step;
}

function notifyText(plan: PlanDetailData['plan']): string {
  const parts: string[] = [];
  if (plan.notifyBeforeKm) parts.push(`${km(plan.notifyBeforeKm)} km`);
  if (plan.notifyBeforeDays) parts.push(plural(plan.notifyBeforeDays, 'dia', 'dias'));
  return parts.length ? parts.join(' e ') : '—';
}

/** Monta o detalhe do item do plano (telas 11 e 11b): anel, previsão e dados. */
export function buildPlanDetail(data: PlanDetailData, today: Date = new Date()): PlanDetailView {
  const { plan, currentKm, dailyKm } = data;
  const status = maintenanceStatus(plan, currentKm, dailyKm, today);
  const lastDone = `${dateWithYear(plan.lastDoneAt)} · ${km(plan.lastDoneKm)} km`;
  const base = {
    title: maintenanceLabel(plan.type),
    own: !MAINTENANCE_CATALOG.some((item) => item.code === plan.type),
    enabled: plan.enabled,
  };

  if (status.tone === 'none') {
    return {
      ...base,
      tone: 'none',
      status: 'Sem alerta',
      noIntervalText: 'Esse item só guarda o histórico. Defina um intervalo se quiser ser avisado.',
      rows: [
        { label: 'Intervalo', value: 'Sem intervalo' },
        { label: 'Última vez', value: lastDone },
        { label: 'Alerta', value: 'Desligado' },
      ],
    };
  }

  const tone = tones[status.tone];
  const days = status.remainingDays;
  const overdue = status.tone === 'overdue';
  const ring =
    status.limiting === 'km' && status.remainingKm !== null
      ? overdue
        ? { value: km(-status.remainingKm), caption: 'km acima do limite' }
        : { value: `~${km(roughKm(status.remainingKm))}`, caption: 'km restantes' }
      : overdue
        ? { value: km(Math.max(1, -(days ?? 0))), caption: 'dias de atraso' }
        : {
            value: km(Math.max(days ?? 0, 0)),
            caption: days === 1 ? 'dia restante' : 'dias restantes',
          };

  const next = nextMaintenance(plan, currentKm, dailyKm, today);
  const nextText = next
    ? [dueDate(next.dueDate, today), next.dueKm !== null ? `${km(next.dueKm)} km` : null]
        .filter(Boolean)
        .join(' · ')
    : '—';

  return {
    ...base,
    tone,
    status: statusLabel(status),
    ring: { progress: Math.min(Math.max(status.progress ?? 0, 0), 1), ...ring },
    forecast: plan.intervalKm
      ? `Previsão feita com a sua média de ${km(Math.round(dailyKm))} km por dia.`
      : undefined,
    rows: [
      { label: 'Intervalo', value: intervalText(plan.intervalKm, plan.intervalMonths) },
      { label: 'Última vez', value: lastDone },
      { label: 'Próxima prevista', value: nextText, tone: tone === 'ok' ? undefined : tone },
      { label: 'Avisar antes', value: notifyText(plan) },
    ],
  };
}
