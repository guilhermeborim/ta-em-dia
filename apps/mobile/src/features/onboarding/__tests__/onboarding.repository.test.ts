import { migrate } from '../../../core/db';
import { createTestDb } from '../../../core/db/testing/testDb';
import { isOnboardingDone, markOnboardingDone } from '../models/onboarding.repository';

describe('onboarding.repository', () => {
  it('começa como não visto', async () => {
    const db = createTestDb();
    await migrate(db);
    expect(await isOnboardingDone(db)).toBe(false);
  });

  it('lembra depois de concluído, mesmo chamando duas vezes', async () => {
    const db = createTestDb();
    await migrate(db);
    await markOnboardingDone(db);
    await markOnboardingDone(db);
    expect(await isOnboardingDone(db)).toBe(true);
  });
});
