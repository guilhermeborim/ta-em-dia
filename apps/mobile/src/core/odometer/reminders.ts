import { odometerReminder } from '@ta-em-dia/shared';
import { type Db } from '../db';
import {
  reminderScheduler,
  type ReminderNotification,
  type ReminderScheduler,
} from '../notifications';
import { loadSettings } from '../settings';
import { findActiveVehicle } from '../vehicle';
import { lastKmUpdateAt } from './lastUpdate';

/** Prefixo do id do aviso de atualizar o km (`odometer:<vehicleId>`). */
export const ODOMETER_REMINDER_PREFIX = 'odometer:';

/**
 * Reagenda o lembrete de atualizar o km do veículo ativo: um aviso às 9h, 15 dias depois da última
 * atualização (ou o próximo múltiplo de 15 dias). Desligado em Configurações, cancela o aviso.
 * Sem permissão não agenda nada (e não pede). Nunca lança erro.
 */
export async function refreshOdometerReminder(
  db: Db,
  opts: { scheduler?: ReminderScheduler; now?: Date } = {},
): Promise<void> {
  const scheduler = opts.scheduler ?? reminderScheduler;
  const now = opts.now ?? new Date();

  try {
    const items: ReminderNotification[] = [];
    const settings = await loadSettings(db);
    const vehicle = settings.notifyOdometer ? await findActiveVehicle(db) : null;
    const lastUpdate = vehicle ? await lastKmUpdateAt(db, vehicle.id) : null;

    if (vehicle && lastUpdate) {
      const { fireAt, daysWithout } = odometerReminder(lastUpdate, now);
      items.push({
        id: `${ODOMETER_REMINDER_PREFIX}${vehicle.id}`,
        title: 'Tá em Dia',
        body: `Faz ${daysWithout} dias sem atualizar o km do ${vehicle.name}`,
        fireAt,
        data: { vehicleId: vehicle.id },
      });
    }

    await scheduler.replaceScheduled(ODOMETER_REMINDER_PREFIX, items);
  } catch {
    // Aviso é um extra: erro aqui não pode atrapalhar quem salvou um abastecimento.
  }
}
