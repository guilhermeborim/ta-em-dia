import { enqueue, onOutboxChange } from '../outbox';
import { migrate } from '../migrations';
import { createTestDb } from '../testing/testDb';
import type { Db } from '../types';

let db: Db;

beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});

const add = (id: string) =>
  enqueue(db, 'vehicles', id, 'upsert', { id }, '2026-10-20T10:00:00.000Z');

describe('onOutboxChange', () => {
  it('avisa a cada mudança que entra na fila, até cancelar', async () => {
    const listener = jest.fn();
    const stop = onOutboxChange(listener);
    await add('a');
    await add('b');
    expect(listener).toHaveBeenCalledTimes(2);

    stop();
    await add('c');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('um ouvinte que quebra não impede a gravação nem os outros', async () => {
    const broken = onOutboxChange(() => {
      throw new Error('defeito');
    });
    const healthy = jest.fn();
    const stop = onOutboxChange(healthy);

    await expect(add('a')).resolves.toBeUndefined();
    expect(healthy).toHaveBeenCalledTimes(1);
    expect(await db.getFirstAsync('SELECT COUNT(*) AS n FROM outbox')).toEqual({ n: 1 });
    broken();
    stop();
  });
});
