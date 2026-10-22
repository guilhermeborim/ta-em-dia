import { migrate } from '../../../core/db';
import { createTestDb } from '../../../core/db/testing/testDb';
import { isLoginDone, markLoginDone } from '../models/login.repository';

describe('login.repository', () => {
  it('começa como não feito', async () => {
    const db = createTestDb();
    await migrate(db);
    expect(await isLoginDone(db)).toBe(false);
  });

  it('lembra depois de concluído, mesmo chamando duas vezes', async () => {
    const db = createTestDb();
    await migrate(db);
    await markLoginDone(db, 'anonymous');
    await markLoginDone(db, 'anonymous');
    expect(await isLoginDone(db)).toBe(true);
  });
});
