import type { Db } from '../db';
import { refreshDocumentReminders } from '../documents';
import { cancelLegacyFuelDraftReminders } from '../fuel';
import { refreshMaintenanceReminders } from '../maintenance/reminders';
import { reminderScheduler } from '../notifications';
import { refreshOdometerReminder } from '../odometer/reminders';
import { cancelStationArrivalIfFueled } from '../stationArrival/stationArrival';

/**
 * Reagenda todos os avisos locais (manutenção, documentos e atualizar o km) e cancela o aviso de
 * posto que ainda ia sair se já houve abastecimento hoje. Chame depois de qualquer mudança
 * que altere um aviso: km, plano, serviço, veículo ativo, prazo ou preferência de aviso; e ao abrir o app.
 */
export async function refreshReminders(db: Db): Promise<void> {
  await Promise.all([
    refreshMaintenanceReminders(db),
    refreshDocumentReminders(db),
    refreshOdometerReminder(db),
    cancelLegacyFuelDraftReminders(),
    cancelStationArrivalIfFueled(db, reminderScheduler),
  ]);
}
