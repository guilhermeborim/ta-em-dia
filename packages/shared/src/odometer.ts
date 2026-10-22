/**
 * Lembrete de atualizar o km: avisa a cada `ODOMETER_REMINDER_DAYS` dias contados da última
 * atualização do km do veículo (leitura manual, abastecimento ou serviço), até a pessoa atualizar.
 */

import { REMINDER_HOUR } from './maintenance';

/** De quantos em quantos dias o lembrete chega. */
export const ODOMETER_REMINDER_DAYS = 15;

export interface OdometerReminder {
  /** Quando o aviso aparece: sempre no futuro, às `REMINDER_HOUR` horas (fuso do aparelho). */
  fireAt: Date;
  /** Dias sem atualizar o km nessa data (15, 30, 45...). */
  daysWithout: number;
}

/**
 * Próximo aviso: `lastUpdateAt` + 15 dias, às 9h; se esse dia já passou, o próximo múltiplo de
 * 15 dias (30, 45...). É determinístico: reagendar várias vezes no mesmo dia dá o mesmo aviso.
 */
export function odometerReminder(
  lastUpdateAt: Date,
  now: Date = new Date(),
  everyDays: number = ODOMETER_REMINDER_DAYS,
  hour: number = REMINDER_HOUR,
): OdometerReminder {
  const at = (days: number) =>
    new Date(
      lastUpdateAt.getFullYear(),
      lastUpdateAt.getMonth(),
      lastUpdateAt.getDate() + days,
      hour,
    );

  let daysWithout = everyDays;
  while (at(daysWithout) <= now) daysWithout += everyDays;
  return { fireAt: at(daysWithout), daysWithout };
}
