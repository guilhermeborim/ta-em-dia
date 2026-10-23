import { ensureInstallationCredentials, type SecretStore } from '../../../core/auth';
import { saveSession, toSession } from '../../../core/auth/session';
import { migrate } from '../../../core/db';
import { createTestDb } from '../../../core/db/testing/testDb';
import { isLoginDone, markLoginDone } from '../../login/models/login.repository';
import {
  isOnboardingDone,
  markOnboardingDone,
} from '../../onboarding/models/onboarding.repository';
import { addDocument } from '../../../core/documents';
import { addFuelEntry } from '../../../core/fuel';
import { addManualReading } from '../../../core/odometer';
import { activatePlan } from '../../maintenance/models/plans.repository';
import { registerMaintenance } from '../../maintenance/models/register.repository';
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
    await saveSession(
      store,
      toSession(
        {
          accessToken: 'a',
          expiresIn: 900,
          refreshToken: 'r',
          user: { id: 'u', isAnonymous: true, plan: 'free' },
        },
        new Date(),
      ),
    );
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

    await activatePlan(db, {
      vehicleId: vehicle.id,
      type: 'oil',
      intervalKm: 10000,
      currentKm: 200,
    });

    await registerMaintenance(db, {
      vehicleId: vehicle.id,
      type: 'oil',
      date: new Date(2026, 9, 20, 12),
      km: 300,
    });

    await addManualReading(db, { vehicleId: vehicle.id, km: 350 });
    await addDocument(db, { vehicleId: vehicle.id, kind: 'ipva', dueDate: '2026-11-20' });
    await addDocument(db, { kind: 'cnh', dueDate: '2027-05-01' });

    await resetApp(db, store);

    expect(await isOnboardingDone(db)).toBe(false);
    expect(await isLoginDone(db)).toBe(false);
    expect(data.size).toBe(0);
    expect(await listVehicles(db)).toEqual([]);
    const left = await db.getFirstAsync<{ total: number }>(
      `SELECT (SELECT COUNT(*) FROM fuel_entries) + (SELECT COUNT(*) FROM maintenance_plans) + (SELECT COUNT(*) FROM maintenance_records) + (SELECT COUNT(*) FROM odometer_readings) + (SELECT COUNT(*) FROM documents) + (SELECT COUNT(*) FROM outbox) + (SELECT COUNT(*) FROM sync_state) AS total`,
    );
    expect(left?.total).toBe(0);
  });
});
