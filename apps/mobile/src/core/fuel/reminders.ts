import { fuelDraftReminders, fuelDraftReminderText, missingFuelFields } from '@ta-em-dia/shared';
import type { Db } from '../db';
import {
  reminderScheduler,
  type ReminderNotification,
  type ReminderScheduler,
} from '../notifications';

/** Prefixo do id dos lembretes de rascunho (`fuel-draft:<id>:<0 ou 1>`). */
export const FUEL_DRAFT_REMINDER_PREFIX = 'fuel-draft:';

interface DraftRow {
  id: string;
  station_name: string | null;
  km: number | null;
  fuel_type: 'gasoline' | 'ethanol' | 'diesel' | 'gnv' | null;
  liters: number | null;
  price_per_liter: number | null;
  total: number | null;
  full_tank: number | null;
  created_at: string;
}

/**
 * Reagenda o lembrete dos rascunhos de abastecimento (notificações locais) de todos os veículos
 * ativos: às 20h do dia em que o rascunho foi criado e às 20h do dia seguinte, depois para
 * (`fuelDraftReminders`). Troca todos os avisos antigos pelos novos, então completar ou excluir
 * o rascunho tira o aviso na próxima vez que `refreshReminders` rodar. Tocar no aviso abre o
 * rascunho. Sem permissão não agenda nada (e não pede). Nunca lança erro.
 */
export async function refreshFuelDraftReminders(
  db: Db,
  opts: { scheduler?: ReminderScheduler; now?: Date } = {},
): Promise<void> {
  const scheduler = opts.scheduler ?? reminderScheduler;
  const now = opts.now ?? new Date();

  try {
    const rows = await db.getAllAsync<DraftRow>(
      `SELECT f.id, f.station_name, f.km, f.fuel_type, f.liters, f.price_per_liter, f.total,
              f.full_tank, f.created_at
         FROM fuel_entries f
         JOIN vehicles v ON v.id = f.vehicle_id
        WHERE f.status = 'draft' AND f.deleted_at IS NULL
          AND v.deleted_at IS NULL AND v.archived = 0
        ORDER BY f.created_at`,
    );

    const items: ReminderNotification[] = [];
    for (const row of rows) {
      const missing = missingFuelFields({
        vehicleId: '',
        date: now,
        stationName: row.station_name ?? undefined,
        km: row.km ?? undefined,
        fuelType: row.fuel_type ?? undefined,
        liters: row.liters ?? undefined,
        pricePerLiter: row.price_per_liter ?? undefined,
        total: row.total ?? undefined,
        fullTank: row.full_tank === null ? undefined : row.full_tank === 1,
      });
      for (const { fireAt, dayOffset } of fuelDraftReminders(new Date(row.created_at), now)) {
        items.push({
          id: `${FUEL_DRAFT_REMINDER_PREFIX}${row.id}:${dayOffset}`,
          title: 'Tá em Dia',
          body: fuelDraftReminderText(missing, row.station_name ?? undefined, dayOffset),
          fireAt,
          data: { fuelDraftId: row.id },
        });
      }
    }

    await scheduler.replaceScheduled(FUEL_DRAFT_REMINDER_PREFIX, items);
  } catch {
    // Aviso é um extra: erro aqui não pode atrapalhar quem salvou um abastecimento.
  }
}
