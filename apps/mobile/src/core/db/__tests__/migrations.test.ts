import { MIGRATIONS, migrate } from '../migrations';
import { createTestDb } from '../testing/testDb';

describe('migrate', () => {
  it('cria as tabelas e grava a versão', async () => {
    const db = createTestDb();
    await migrate(db);

    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    );
    expect(tables.map((t) => t.name)).toEqual(['fuel_entries', 'outbox', 'sync_state', 'vehicles']);

    const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    expect(row?.user_version).toBe(MIGRATIONS.length);
  });

  it('é idempotente: rodar de novo não refaz nada', async () => {
    const db = createTestDb();
    await migrate(db);
    await migrate(db);

    const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    expect(row?.user_version).toBe(MIGRATIONS.length);
  });

  it('aplica só as migrations novas', async () => {
    const db = createTestDb();
    await migrate(db, ['CREATE TABLE a (id INTEGER);']);
    await migrate(db, ['CREATE TABLE a (id INTEGER);', 'CREATE TABLE b (id INTEGER);']);

    const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    expect(row?.user_version).toBe(2);
  });

  it('desfaz a migration inteira se alguma instrução falhar', async () => {
    const db = createTestDb();
    await expect(
      migrate(db, ['CREATE TABLE a (id INTEGER); CREATE TABLE a (id INTEGER);']),
    ).rejects.toThrow();

    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE name = 'a'",
    );
    expect(tables).toHaveLength(0);
  });
});
