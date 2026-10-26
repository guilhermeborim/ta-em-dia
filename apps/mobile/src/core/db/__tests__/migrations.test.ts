import { MIGRATIONS, migrate } from '../migrations';
import { createTestDb } from '../testing/testDb';

describe('migrate', () => {
  it('cria as tabelas e grava a versão', async () => {
    const db = createTestDb();
    await migrate(db);

    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    );
    expect(tables.map((t) => t.name)).toEqual([
      'app_settings',
      'documents',
      'fuel_entries',
      'maintenance_plans',
      'maintenance_records',
      'odometer_readings',
      'outbox',
      'sync_state',
      'vehicles',
    ]);

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

  it('recria vehicles para aceitar motorcycle sem perder dados nem as chaves estrangeiras', async () => {
    const db = createTestDb();
    // O banco como estava antes da migration da moto.
    await migrate(db, MIGRATIONS.slice(0, 7));
    const at = '2026-10-01T10:00:00.000Z';
    for (const [id, name, type, sort] of [
      ['v1', 'Gol', 'flex', 0],
      ['v2', 'CG', 'combustion', 1],
    ] as const) {
      await db.runAsync(
        `INSERT INTO vehicles (id, name, type, plate, initial_km, archived, created_at, updated_at, sort_order)
         VALUES (?, ?, ?, 'ABC1D23', 100, 0, ?, ?, ?)`,
        id,
        name,
        type,
        at,
        at,
        sort,
      );
    }
    await db.runAsync(
      `INSERT INTO fuel_entries (id, vehicle_id, date, km, fuel_type, liters, price_per_liter, total, full_tank, created_at, updated_at)
       VALUES ('f1', 'v2', ?, 200, 'gasoline', 10, 6, 60, 1, ?, ?)`,
      at,
      at,
      at,
    );

    await migrate(db);

    const rows = await db.getAllAsync<{
      id: string;
      type: string;
      plate: string;
      sort_order: number;
    }>('SELECT id, type, plate, sort_order FROM vehicles ORDER BY sort_order');
    expect(rows).toEqual([
      { id: 'v1', type: 'flex', plate: 'ABC1D23', sort_order: 0 },
      { id: 'v2', type: 'motorcycle', plate: 'ABC1D23', sort_order: 1 },
    ]);
    // O abastecimento continua ligado à moto e as chaves estrangeiras voltaram a valer.
    expect(
      await db.getFirstAsync<{ plate: string }>(
        'SELECT v.plate FROM fuel_entries f JOIN vehicles v ON v.id = f.vehicle_id WHERE f.id = ?',
        'f1',
      ),
    ).toEqual({ plate: 'ABC1D23' });
    expect(await db.getFirstAsync('PRAGMA foreign_keys')).toEqual({ foreign_keys: 1 });
    await expect(
      db.runAsync(
        `INSERT INTO odometer_readings (id, vehicle_id, km, read_at, source, created_at, updated_at)
         VALUES ('o1', 'nao-existe', 1, ?, 'manual', ?, ?)`,
        at,
        at,
        at,
      ),
    ).rejects.toThrow();
    await db.runAsync(
      `INSERT INTO vehicles (id, name, type, initial_km, created_at, updated_at)
       VALUES ('v3', 'Biz', 'motorcycle', 0, ?, ?)`,
      at,
      at,
    );
    await expect(
      db.runAsync(
        `INSERT INTO vehicles (id, name, type, initial_km, created_at, updated_at)
         VALUES ('v4', 'X', 'bicycle', 0, ?, ?)`,
        at,
        at,
      ),
    ).rejects.toThrow();
  });

  it('desfaz tudo e religa as chaves estrangeiras se a migration de recriar falhar', async () => {
    const db = createTestDb();
    await expect(
      migrate(db, [
        { foreignKeysOff: true, sql: 'CREATE TABLE a (id INTEGER); CREATE TABLE a (id INTEGER);' },
      ]),
    ).rejects.toThrow();
    expect(await db.getFirstAsync('PRAGMA foreign_keys')).toEqual({ foreign_keys: 1 });
    expect(await db.getFirstAsync('PRAGMA user_version')).toEqual({ user_version: 0 });
  });
  it('recria fuel_entries com status e colunas opcionais sem perder os abastecimentos', async () => {
    const db = createTestDb();
    // O banco como estava antes do rascunho de abastecimento.
    await migrate(db, MIGRATIONS.slice(0, 8));
    const at = '2026-10-01T10:00:00.000Z';
    await db.runAsync(
      `INSERT INTO vehicles (id, name, type, initial_km, created_at, updated_at)
       VALUES ('v1', 'Gol', 'flex', 0, ?, ?)`,
      at,
      at,
    );
    await db.runAsync(
      `INSERT INTO fuel_entries (id, vehicle_id, date, km, fuel_type, liters, price_per_liter, total, full_tank, station_name, created_at, updated_at, version)
       VALUES ('f1', 'v1', ?, 200, 'gasoline', 10, 6, 60, 1, 'Shell', ?, ?, 7)`,
      at,
      at,
      at,
    );

    await migrate(db);

    expect(
      await db.getFirstAsync(
        'SELECT id, km, liters, full_tank, station_name, version, status FROM fuel_entries',
      ),
    ).toEqual({
      id: 'f1',
      km: 200,
      liters: 10,
      full_tank: 1,
      station_name: 'Shell',
      version: 7,
      status: 'complete',
    });
    // Rascunho: só o que se sabe; o resto fica nulo.
    await db.runAsync(
      `INSERT INTO fuel_entries (id, vehicle_id, date, station_name, status, created_at, updated_at)
       VALUES ('f2', 'v1', ?, 'Shell', 'draft', ?, ?)`,
      at,
      at,
      at,
    );
    expect(await db.getFirstAsync("SELECT km, total FROM fuel_entries WHERE id = 'f2'")).toEqual({
      km: null,
      total: null,
    });
    // Sem status informado, o abastecimento é completo; status fora da lista não vale.
    await db.runAsync(
      `INSERT INTO fuel_entries (id, vehicle_id, date, created_at, updated_at)
       VALUES ('f3', 'v1', ?, ?, ?)`,
      at,
      at,
      at,
    );
    expect(await db.getFirstAsync("SELECT status FROM fuel_entries WHERE id = 'f3'")).toEqual({
      status: 'complete',
    });
    await expect(
      db.runAsync(
        `INSERT INTO fuel_entries (id, vehicle_id, date, status, created_at, updated_at)
         VALUES ('f4', 'v1', ?, 'outro', ?, ?)`,
        at,
        at,
        at,
      ),
    ).rejects.toThrow();
    // O índice voltou e as chaves estrangeiras valem.
    expect(
      await db.getAllAsync(
        "SELECT name FROM sqlite_master WHERE name = 'idx_fuel_entries_vehicle_date'",
      ),
    ).toHaveLength(1);
    expect(await db.getFirstAsync('PRAGMA foreign_keys')).toEqual({ foreign_keys: 1 });
  });
});
