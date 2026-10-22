import { addMonths, DEFAULT_DAILY_KM, type MaintenancePlanInput } from './calculations';

/** Quanto do intervalo já passou para o item deixar de estar "em dia" e passar a "perto de vencer". */
export const MAINTENANCE_SOON_PROGRESS = 0.8;

/** Avisar antes, por padrão (ver tela "Plano de manutenção"). */
export const DEFAULT_NOTIFY_BEFORE_KM = 500;
export const DEFAULT_NOTIFY_BEFORE_DAYS = 7;

export interface MaintenanceCatalogItem {
  /** Código gravado em `maintenance_plans.type`. */
  code: string;
  label: string;
  intervalKm?: number;
  intervalMonths?: number;
}

/** Lista pronta de tipos, com o intervalo sugerido (valores comuns; o app deixa mudar). */
export const MAINTENANCE_CATALOG: MaintenanceCatalogItem[] = [
  { code: 'oil', label: 'Troca de óleo', intervalKm: 10000, intervalMonths: 12 },
  { code: 'alignment', label: 'Alinhamento', intervalKm: 10000 },
  { code: 'tire_rotation', label: 'Rodízio de pneus', intervalKm: 10000 },
  { code: 'air_filter', label: 'Filtro de ar', intervalKm: 15000, intervalMonths: 12 },
  { code: 'brake_pads', label: 'Pastilhas de freio', intervalKm: 30000 },
  { code: 'brake_fluid', label: 'Fluido de freio', intervalMonths: 24 },
  { code: 'timing_belt', label: 'Correia dentada', intervalKm: 60000 },
];

/** Nome para mostrar: o do catálogo, ou o próprio texto quando for um tipo criado em "Outro". */
export function maintenanceLabel(type: string): string {
  return MAINTENANCE_CATALOG.find((item) => item.code === type)?.label ?? type;
}

export type MaintenanceTone = 'none' | 'ok' | 'soon' | 'overdue';

export interface MaintenanceStatus {
  tone: MaintenanceTone;
  /** O que vence primeiro, entre km e tempo. Null sem intervalo. */
  limiting: 'km' | 'time' | null;
  /** Quanto do intervalo já passou (0 a mais de 1). Null sem intervalo. */
  progress: number | null;
  /** Km rodados desde a última vez. */
  usedKm: number;
  /** Meses inteiros desde a última vez. */
  usedMonths: number;
  /** Km que faltam (negativo se passou). Null sem intervalo em km. */
  remainingKm: number | null;
  /** Dias até vencer, pelo que vencer primeiro (negativo se passou). Null sem intervalo. */
  remainingDays: number | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Estado de um item do plano: o que já passou do intervalo e o que falta.
 * Vale o que vencer primeiro. A data do limite por km usa a média diária.
 */
export function maintenanceStatus(
  plan: MaintenancePlanInput,
  currentKm: number,
  dailyKm: number = DEFAULT_DAILY_KM,
  today: Date = new Date(),
): MaintenanceStatus {
  const usedKm = Math.max(0, currentKm - plan.lastDoneKm);
  let usedMonths = (today.getFullYear() - plan.lastDoneAt.getFullYear()) * 12;
  usedMonths += today.getMonth() - plan.lastDoneAt.getMonth();
  if (today.getDate() < plan.lastDoneAt.getDate()) usedMonths -= 1;
  usedMonths = Math.max(0, usedMonths);

  const km = plan.intervalKm
    ? {
        progress: (currentKm - plan.lastDoneKm) / plan.intervalKm,
        remainingKm: plan.lastDoneKm + plan.intervalKm - currentKm,
      }
    : null;
  const time = plan.intervalMonths
    ? (() => {
        const due = addMonths(plan.lastDoneAt, plan.intervalMonths);
        const total = due.getTime() - plan.lastDoneAt.getTime();
        return {
          progress: (today.getTime() - plan.lastDoneAt.getTime()) / total,
          remainingDays: (due.getTime() - today.getTime()) / DAY_MS,
        };
      })()
    : null;

  if (!km && !time) {
    return {
      tone: 'none',
      limiting: null,
      progress: null,
      usedKm,
      usedMonths,
      remainingKm: null,
      remainingDays: null,
    };
  }

  const kmDays = km && dailyKm > 0 ? km.remainingKm / dailyKm : null;
  const days = [kmDays, time?.remainingDays ?? null].filter((d): d is number => d !== null);
  const progress = Math.max(km?.progress ?? -Infinity, time?.progress ?? -Infinity);
  const limiting = (km?.progress ?? -Infinity) >= (time?.progress ?? -Infinity) ? 'km' : 'time';

  return {
    tone: progress >= 1 ? 'overdue' : progress >= MAINTENANCE_SOON_PROGRESS ? 'soon' : 'ok',
    limiting,
    progress,
    usedKm,
    usedMonths,
    remainingKm: km?.remainingKm ?? null,
    remainingDays: days.length ? Math.ceil(Math.min(...days)) : null,
  };
}
