import { clearInstallationCredentials, type SecretStore } from '../../../core/auth';
import type { Db } from '../../../core/db';

/**
 * Volta o app ao estado de primeira abertura: apaga as preferências locais
 * (boas-vindas, login), os dados (veículos, abastecimentos, fila de sync) e as credenciais
 * do SecureStore. Só para desenvolvimento: é exclusão física, ao contrário das regras do app.
 */
export async function resetApp(db: Db, store?: SecretStore): Promise<void> {
  await db.withTransactionAsync(async () => {
    // fuel_entries antes de vehicles por causa da chave estrangeira.
    for (const table of ['fuel_entries', 'vehicles', 'outbox', 'sync_state', 'app_settings']) {
      await db.runAsync(`DELETE FROM ${table}`);
    }
  });
  await clearInstallationCredentials(store);
}
