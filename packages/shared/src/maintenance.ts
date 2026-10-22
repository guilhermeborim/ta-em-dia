import { addMonths, DEFAULT_DAILY_KM, type MaintenancePlanInput } from './calculations';

/** Quanto do intervalo já passou para o item deixar de estar "em dia" e passar a "perto de vencer". */
export const MAINTENANCE_SOON_PROGRESS = 0.8;

/** Avisar antes, por padrão (ver tela "Plano de manutenção"). */
export const DEFAULT_NOTIFY_BEFORE_KM = 500;
export const DEFAULT_NOTIFY_BEFORE_DAYS = 7;

export interface MaintenanceCatalogItem {
  /** Código gravado em `maintenance_plans.type` e `maintenance_records.type`. */
  code: string;
  label: string;
  /** Nome curto, para os botões de escolha de tipo (ex.: "Óleo"). */
  shortLabel: string;
  intervalKm?: number;
  intervalMonths?: number;
}

/** Lista pronta de tipos, com o intervalo sugerido (valores comuns; o app deixa mudar). */
export const MAINTENANCE_CATALOG: MaintenanceCatalogItem[] = [
  {
    code: 'oil',
    label: 'Troca de óleo',
    shortLabel: 'Óleo',
    intervalKm: 10000,
    intervalMonths: 12,
  },
  {
    code: 'air_filter',
    label: 'Filtro de ar',
    shortLabel: 'Filtros',
    intervalKm: 15000,
    intervalMonths: 12,
  },
  { code: 'tire_rotation', label: 'Rodízio de pneus', shortLabel: 'Pneus', intervalKm: 10000 },
  { code: 'brake_pads', label: 'Pastilhas de freio', shortLabel: 'Freios', intervalKm: 30000 },
  {
    code: 'brake_fluid',
    label: 'Fluido de freio',
    shortLabel: 'Fluido de freio',
    intervalMonths: 24,
  },
  { code: 'timing_belt', label: 'Correia dentada', shortLabel: 'Correia', intervalKm: 60000 },
  { code: 'alignment', label: 'Alinhamento', shortLabel: 'Alinhamento', intervalKm: 10000 },
  {
    code: 'service',
    label: 'Revisão',
    shortLabel: 'Revisão',
    intervalKm: 10000,
    intervalMonths: 12,
  },
];

/** Nome para mostrar: o do catálogo, ou o próprio texto quando for um tipo criado em "Outro". */
export function maintenanceLabel(type: string): string {
  return MAINTENANCE_CATALOG.find((item) => item.code === type)?.label ?? type;
}

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/**
 * O que gravar como tipo quando a pessoa digita um nome em "Outro": o código do catálogo se o
 * nome for o de um item pronto (ignora maiúsculas e acentos), a grafia de um atalho "Seu" que já
 * existe, ou o próprio nome (sem espaços sobrando). Vazio devolve null.
 */
export function resolveMaintenanceType(input: string, customTypes: string[] = []): string | null {
  const name = input.replace(/\s+/g, ' ').trim();
  if (name === '') return null;
  const key = normalize(name);

  const ready = MAINTENANCE_CATALOG.find(
    (item) => normalize(item.label) === key || normalize(item.shortLabel) === key,
  );
  if (ready) return ready.code;
  return customTypes.find((custom) => normalize(custom) === key) ?? name;
}

/** O tipo é um nome criado pela pessoa (não é código do catálogo). */
export function isCustomMaintenanceType(type: string): boolean {
  return !MAINTENANCE_CATALOG.some((item) => item.code === type);
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

/** Hora do dia (fuso do aparelho) em que os avisos de manutenção chegam. */
export const REMINDER_HOUR = 9;

export interface MaintenanceReminderInput extends MaintenancePlanInput {
  id: string;
  enabled: boolean;
  /** Avisar quando faltarem tantos km (padrão: `DEFAULT_NOTIFY_BEFORE_KM`). */
  notifyBeforeKm?: number | null;
  /** Avisar quando faltarem tantos dias (padrão: `DEFAULT_NOTIFY_BEFORE_DAYS`). */
  notifyBeforeDays?: number | null;
}

export interface MaintenanceReminder {
  planId: string;
  /**
   * Quando o limite de aviso é cruzado, às 9h. Se `crossed`, é só o 9h de hoje (a data real
   * do cruzamento não é conhecida) e não deve ser usado como hora do aviso.
   */
  fireAt: Date;
  /**
   * O item por km já está dentro do limite de aviso. Muda a cada dia só porque "hoje" muda:
   * quem agenda precisa avisar uma vez por ciclo, não a cada reagendamento.
   */
  crossed: boolean;
  /** O que cruza primeiro: os km (pela média diária) ou o tempo. */
  kind: 'km' | 'time';
}

const atReminderHour = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), REMINDER_HOUR);

/**
 * Quando avisar cada item do plano: o primeiro entre "faltam `notifyBeforeKm` km" (data
 * estimada pela média diária) e "faltam `notifyBeforeDays` dias para a data limite". Só itens
 * ativos com intervalo. Se a média diária for 0, os km só avisam quando já estão dentro do limite.
 * Do aviso mais cedo para o mais tarde.
 */
export function maintenanceReminders(
  plans: MaintenanceReminderInput[],
  currentKm: number,
  dailyKm: number,
  today: Date = new Date(),
): MaintenanceReminder[] {
  const reminders: MaintenanceReminder[] = [];

  for (const plan of plans) {
    if (!plan.enabled || (!plan.intervalKm && !plan.intervalMonths)) continue;
    const candidates: { fireAt: Date; kind: 'km' | 'time'; crossed: boolean }[] = [];

    if (plan.intervalKm) {
      const remaining = plan.lastDoneKm + plan.intervalKm - currentKm;
      const excess = remaining - (plan.notifyBeforeKm ?? DEFAULT_NOTIFY_BEFORE_KM);
      if (excess <= 0) {
        candidates.push({ fireAt: atReminderHour(today), kind: 'km', crossed: true });
      } else if (dailyKm > 0) {
        const days = Math.ceil(excess / dailyKm);
        const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + days);
        candidates.push({ fireAt: atReminderHour(date), kind: 'km', crossed: false });
      }
    }

    if (plan.intervalMonths) {
      const due = addMonths(plan.lastDoneAt, plan.intervalMonths);
      const before = plan.notifyBeforeDays ?? DEFAULT_NOTIFY_BEFORE_DAYS;
      const date = new Date(due.getFullYear(), due.getMonth(), due.getDate() - before);
      candidates.push({ fireAt: atReminderHour(date), kind: 'time', crossed: false });
    }

    if (candidates.length === 0) continue;
    const first = candidates.reduce((a, b) => (b.fireAt < a.fireAt ? b : a));
    reminders.push({ planId: plan.id, ...first });
  }

  return reminders.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
}
