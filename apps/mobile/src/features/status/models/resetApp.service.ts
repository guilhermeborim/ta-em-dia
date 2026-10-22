import { clearInstallationCredentials, type SecretStore } from '../../../core/auth';
import type { Db } from '../../../core/db';

/**
 * Volta o app ao estado de primeira abertura: apaga as preferências locais
 * (boas-vindas, login) e as credenciais do SecureStore. Só para desenvolvimento.
 */
export async function resetApp(db: Db, store?: SecretStore): Promise<void> {
  await db.runAsync('DELETE FROM app_settings');
  await clearInstallationCredentials(store);
}
