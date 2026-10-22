import { ensureInstallationCredentials, type SecretStore } from '../../../core/auth';
import { migrate } from '../../../core/db';
import { createTestDb } from '../../../core/db/testing/testDb';
import { isLoginDone, markLoginDone } from '../../login/models/login.repository';
import {
  isOnboardingDone,
  markOnboardingDone,
} from '../../onboarding/models/onboarding.repository';
import { addFuelEntry } from '../../fuel/models/fuelEntries.repository';
import { createVehicle, listVehicles } from '../../vehicles/models/vehicles.repository';
import { resetApp } from '../models/resetApp.service';

describe('resetApp', () => {
  it('apaga app_settings, dados locais e o SecureStore', async () => {
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
    const vehicle = await createVehicle(db, { name: 'Gol', type: 'flex', initialKm: 100 });
    await addFuelEntry(db, {
      vehicleId: vehicle.id,
      date: new Date('2026-10-20T10:00:00.000Z'),
      km: 200,
      fuelType: 'gasoline',
      liters: 40,
      pricePerLiter: 6,
      total: 240,
      fullTank: true,
    });

    await resetApp(db, store);

    expect(await isOnboardingDone(db)).toBe(false);
    expect(await isLoginDone(db)).toBe(false);
    expect(data.size).toBe(0);
    expect(await listVehicles(db)).toEqual([]);
    const left = await db.getFirstAsync<{ total: number }>(
      `SELECT (SELECT COUNT(*) FROM fuel_entries) + (SELECT COUNT(*) FROM outbox) AS total`,
    );
    expect(left?.total).toBe(0);
  });
});
