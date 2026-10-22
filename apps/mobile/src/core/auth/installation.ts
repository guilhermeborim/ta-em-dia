import { getRandomBytes } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { newId } from '../db';

const INSTALLATION_ID_KEY = 'installation_id';
const INSTALLATION_SECRET_KEY = 'installation_secret';

/** Parte do expo-secure-store que o app usa. Permite testar com um armazém em memória. */
export interface SecretStore {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

export interface InstallationCredentials {
  installationId: string;
  secret: string;
}

function randomSecret(): string {
  return Array.from(getRandomBytes(32), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Garante o installation_id (UUID) e o segredo aleatório deste aparelho, no SecureStore.
 * Idempotente: se já existem, devolve os mesmos. Usado pelo usuário anônimo (ver docs/03-arquitetura.md).
 */
export async function ensureInstallationCredentials(
  store: SecretStore = SecureStore,
  generate: { id: () => string; secret: () => string } = { id: newId, secret: randomSecret },
): Promise<InstallationCredentials> {
  let installationId = await store.getItemAsync(INSTALLATION_ID_KEY);
  if (!installationId) {
    installationId = generate.id();
    await store.setItemAsync(INSTALLATION_ID_KEY, installationId);
  }
  let secret = await store.getItemAsync(INSTALLATION_SECRET_KEY);
  if (!secret) {
    secret = generate.secret();
    await store.setItemAsync(INSTALLATION_SECRET_KEY, secret);
  }
  return { installationId, secret };
}

/** Apaga o id e o segredo do aparelho. Só para reiniciar o app em desenvolvimento. */
export async function clearInstallationCredentials(
  store: SecretStore = SecureStore,
): Promise<void> {
  await store.deleteItemAsync(INSTALLATION_ID_KEY);
  await store.deleteItemAsync(INSTALLATION_SECRET_KEY);
}
