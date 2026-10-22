import {
  DEFAULT_NOTIFY_BEFORE_DAYS,
  DEFAULT_NOTIFY_BEFORE_KM,
  maintenanceLabel,
  maintenanceReminders,
  maintenanceStatus,
  nextReminderTime,
  type MaintenancePlan,
  type MaintenanceStatus,
} from '@ta-em-dia/shared';
import { getSetting, setSetting, type Db } from '../db';
import { formatNumber } from '../format';
import {
  reminderScheduler,
  type ReminderNotification,
  type ReminderScheduler,
} from '../notifications';
import { findActiveVehicle } from '../vehicle';
import { loadSettings } from '../settings';
import { listPlans, loadVehicleKm } from './plansRead';

/** Prefixo dos ids dos avisos de manutenção (`maintenance:<planId>`). */
export const REMINDER_PREFIX = 'maintenance:';

const km = (value: number) => formatNumber(value, 0);
const days = (n: number) => `${n} ${n === 1 ? 'dia' : 'dias'}`;

/** O ciclo do item: muda quando o serviço é feito de novo. */
const cycleKey = (plan: MaintenancePlan) => `${plan.lastDoneAt.toISOString()}|${plan.lastDoneKm}`;
const notifiedKey = (planId: string) => `maint_notified:${planId}`;

/** O que ficou guardado do último aviso agendado de um item: o ciclo e a hora dele. */
async function readNotified(
  db: Db,
  plan: MaintenancePlan,
): Promise<{ sameCycle: boolean; fireAt: Date | null }> {
  const stored = await getSetting(db, notifiedKey(plan.id));
  if (!stored) return { sameCycle: false, fireAt: null };
  const at = stored.lastIndexOf('#');
  return {
    sameCycle: stored.slice(0, at) === cycleKey(plan),
    fireAt: new Date(stored.slice(at + 1)),
  };
}

/** "Troca de óleo do Gol em ~500 km" / "Alinhamento do Gol vence em 7 dias" (docs/02-telas-e-fluxos.md). */
function futureBody(plan: MaintenancePlan, vehicle: string, kind: 'km' | 'time'): string {
  const label = `${maintenanceLabel(plan.type)} do ${vehicle}`;
  return kind === 'km'
    ? `${label} em ~${km(plan.notifyBeforeKm ?? DEFAULT_NOTIFY_BEFORE_KM)} km`
    : `${label} vence em ${days(plan.notifyBeforeDays ?? DEFAULT_NOTIFY_BEFORE_DAYS)}`;
}

/** Aviso de um item que já está dentro do limite: usa o estado de agora. */
function lateBody(plan: MaintenancePlan, vehicle: string, status: MaintenanceStatus): string {
  const label = `${maintenanceLabel(plan.type)} do ${vehicle}`;
  if (status.tone === 'overdue') return `${label} passou do prazo`;
  if (status.limiting === 'km' && status.remainingKm !== null) {
    return `${label} em ~${km(Math.max(10, Math.round(status.remainingKm / 10) * 10))} km`;
  }
  const left = Math.max(status.remainingDays ?? 0, 0);
  return left === 0 ? `${label} vence hoje` : `${label} vence em ${days(left)}`;
}

/**
 * Reagenda os avisos de manutenção do veículo ativo (notificações locais). Chame depois de
 * qualquer mudança de km, data ou plano, e ao abrir o app ou voltar a ele (a data muda).
 *
 * - Cada item ativo com intervalo ganha um aviso às 9h do dia em que cruza o limite de aviso
 *   (padrão: 500 km ou 7 dias antes); o que vencer primeiro vale.
 * - Se o item já passou do limite, avisa uma vez por ciclo, no próximo 9h (e guarda a hora para
 *   não cancelar esse aviso no próximo reagendamento). Quando o serviço é registrado de novo,
 *   o ciclo muda e o item volta a poder avisar.
 * - Troca todos os avisos antigos pelos novos. Sem permissão não agenda nada (e não pede).
 *   Com os avisos de manutenção desligados em Configurações, só cancela os antigos.
 * - Nunca lança erro.
 */
export async function refreshMaintenanceReminders(
  db: Db,
  opts: { scheduler?: ReminderScheduler; now?: Date } = {},
): Promise<void> {
  const scheduler = opts.scheduler ?? reminderScheduler;
  const now = opts.now ?? new Date();

  try {
    const items: ReminderNotification[] = [];
    const sent: { plan: MaintenancePlan; fireAt: Date }[] = [];

    // Desligado em Configurações: nada agendado (e o que havia é cancelado).
    const { notifyMaintenance } = await loadSettings(db);
    const vehicle = notifyMaintenance ? await findActiveVehicle(db) : null;
    if (vehicle) {
      const plans = await listPlans(db, vehicle.id);
      const { currentKm, dailyKm } = await loadVehicleKm(db, vehicle.id, vehicle.initial_km);

      for (const reminder of maintenanceReminders(plans, currentKm, dailyKm, now)) {
        const plan = plans.find((p) => p.id === reminder.planId)!;
        // `crossed`: já dentro do limite por km; o 9h de hoje não é hora de aviso.
        const future = !reminder.crossed && reminder.fireAt > now;

        let fireAt = reminder.fireAt;
        if (!future) {
          // Já dentro do limite: avisa uma vez por ciclo. Se o aviso já agendado ainda não
          // chegou, mantém a mesma hora; se já chegou, não repete.
          const notified = await readNotified(db, plan);
          if (notified.sameCycle && notified.fireAt && notified.fireAt <= now) continue;
          fireAt = notified.sameCycle && notified.fireAt ? notified.fireAt : nextReminderTime(now);
        }

        const status = maintenanceStatus(plan, currentKm, dailyKm, now);
        items.push({
          id: `${REMINDER_PREFIX}${plan.id}`,
          title: 'Tá em Dia',
          body: future
            ? futureBody(plan, vehicle.name, reminder.kind)
            : lateBody(plan, vehicle.name, status),
          fireAt,
          data: { planId: plan.id },
        });
        sent.push({ plan, fireAt });
      }
    }

    const scheduled = await scheduler.replaceScheduled(REMINDER_PREFIX, items);
    if (scheduled) {
      for (const { plan, fireAt } of sent) {
        await setSetting(db, notifiedKey(plan.id), `${cycleKey(plan)}#${fireAt.toISOString()}`);
      }
    }
  } catch {
    // Aviso é um extra: erro aqui não pode atrapalhar quem salvou um abastecimento.
  }
}
