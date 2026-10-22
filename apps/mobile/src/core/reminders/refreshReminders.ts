import type { Db } from '../db';
import { refreshDocumentReminders } from '../documents';
import { refreshMaintenanceReminders } from '../maintenance/reminders';
import { refreshOdometerReminder } from '../odometer/reminders';

/**
 * Reagenda todos os avisos locais (manutenção, documentos e atualizar o km). Chame depois de qualquer mudança
 * que altere um aviso: km, plano, serviço, veículo ativo, prazo ou preferência de aviso; e ao abrir o app.
 */
export async function refreshReminders(db: Db): Promise<void> {
  await Promise.all([
    refreshMaintenanceReminders(db),
    refreshDocumentReminders(db),
    refreshOdometerReminder(db),
  ]);
}
