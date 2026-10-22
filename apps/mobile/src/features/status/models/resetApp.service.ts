import { clearInstallationCredentials, type SecretStore } from '../../../core/auth';
import type { Db } from '../../../core/db';

/**
 * Volta o app ao estado de primeira abertura: apaga as preferências locais
 * (boas-vindas, login), os dados (veículos, abastecimentos, planos e serviços de manutenção, fila de sync) e as credenciais
 * do SecureStore. Só para desenvolvimento: é exclusão física, ao contrário das regras do app.
 */
export async function resetApp(db: Db, store?: SecretStore): Promise<void> {
  await db.withTransactionAsync(async () => {
    // Tabelas com vehicle_id antes de vehicles por causa da chave estrangeira.
    for (const table of [
      'fuel_entries',
      'maintenance_records',
      'maintenance_plans',
      'vehicles',
      'outbox',
      'sync_state',
      'app_settings',
    ]) {
      await db.runAsync(`DELETE FROM ${table}`);
    }
  });
  await clearInstallationCredentials(store);
}
