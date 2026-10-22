import {
  maintenanceLabel,
  maintenanceStatus,
  type MaintenancePlan,
  type MaintenanceStatus,
} from '@ta-em-dia/shared';
import { formatNumber } from '../format';

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

/** Cartão de um plano com intervalo (ou `null` se o item é só histórico). */
export function toPlanCard(plan: MaintenancePlan, status: MaintenanceStatus): PlanCardView {
  return {
    id: plan.id,
    title: maintenanceLabel(plan.type),
    subtitle: intervalText(plan.intervalKm, plan.intervalMonths),
    tone: tones[status.tone as keyof typeof tones],
    status: statusLabel(status),
    progress: Math.max(0, status.progress ?? 0),
    progressLabel: progressLabel(plan, status),
    hint: hintLabel(status),
  };
}

/**
 * Cartões dos planos com intervalo, o que vence primeiro no topo (menos dias restantes;
 * empate pelo nome). Passe só os planos ativos. Itens só de histórico ficam de fora.
 */
export function buildAlertCards(
  plans: MaintenancePlan[],
  ctx: { currentKm: number; dailyKm: number },
  today: Date = new Date(),
): PlanCardView[] {
  const cards: { card: PlanCardView; days: number }[] = [];
  for (const plan of plans) {
    const status = maintenanceStatus(plan, ctx.currentKm, ctx.dailyKm, today);
    if (status.tone === 'none') continue;
    cards.push({ card: toPlanCard(plan, status), days: status.remainingDays ?? Infinity });
  }
  cards.sort((a, b) => a.days - b.days || a.card.title.localeCompare(b.card.title, 'pt-BR'));
  return cards.map((entry) => entry.card);
}
