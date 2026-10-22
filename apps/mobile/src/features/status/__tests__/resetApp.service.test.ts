import { ensureInstallationCredentials, type SecretStore } from '../../../core/auth';
import { migrate } from '../../../core/db';
import { createTestDb } from '../../../core/db/testing/testDb';
import { isLoginDone, markLoginDone } from '../../login/models/login.repository';
import {
  isOnboardingDone,
  markOnboardingDone,
} from '../../onboarding/models/onboarding.repository';
import { resetApp } from '../models/resetApp.service';

describe('resetApp', () => {
  it('apaga app_settings e o SecureStore', async () => {
    const data = new Map<string, string>();
    const store: SecretStore = {
      getItemAsync: async (key) => data.get(key) ?? null,
      setItemAsync: async (key, value) => void data.set(key, value),
      deleteItemAsync: async (key) => void data.delete(key),
    };
    const db = createTestDb();
    await migrate(db);
    await markOnboardingDone(db);
    await markLoginDone(db, 'anonymous');
    await ensureInstallationCredentials(store, { id: () => 'id', secret: () => 's' });

    await resetApp(db, store);

    expect(await isOnboardingDone(db)).toBe(false);
    expect(await isLoginDone(db)).toBe(false);
    expect(data.size).toBe(0);
  });
});
