import type { Db } from '../db';
import { refreshDocumentReminders } from '../documents';
import { refreshMaintenanceReminders } from '../maintenance/reminders';

/**
 * Reagenda todos os avisos locais (manutenção e documentos). Chame depois de qualquer mudança
 * que altere um aviso: km, plano, serviço, veículo ativo ou prazo; e ao abrir o app.
 */
export async function refreshReminders(db: Db): Promise<void> {
  await Promise.all([refreshMaintenanceReminders(db), refreshDocumentReminders(db)]);
}
