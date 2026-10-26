import { migrate } from '../../db/migrations';
import { createTestDb } from '../../db/testing/testDb';
import type { Db } from '../../db';
import { addFuelEntry, getFuelRecord, listFuelEntries, updateFuelRecord } from '..';

const VEHICLE_ID = '018bcfe5-6800-7000-8000-000000000001';
const T0 = new Date('2026-10-20T10:00:00.000Z');

let db: Db;

beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
  await db.runAsync(
    `INSERT INTO vehicles (id, name, type, initial_km, created_at, updated_at)
     VALUES (?, 'Gol', 'flex', 1000, ?, ?)`,
    VEHICLE_ID,
    T0.toISOString(),
    T0.toISOString(),
  );
});

const input = (km: number) => ({
  vehicleId: VEHICLE_ID,
  date: T0,
  km,
  fuelType: 'gasoline' as const,
  liters: 40,
  pricePerLiter: 6,
  total: 240,
  fullTank: true,
  stationName: 'Shell',
});

describe('updateFuelRecord', () => {
  it('troca os dados do mesmo abastecimento e enfileira o envio', async () => {
    const saved = await addFuelEntry(db, input(1500), { now: T0 });
    const later = new Date(T0.getTime() + 60_000);

    expect(await updateFuelRecord(db, { ...saved, km: 1600, liters: 38 }, later)).toBe(true);

    expect(await listFuelEntries(db, VEHICLE_ID)).toHaveLength(1);
    expect(await getFuelRecord(db, saved.id)).toMatchObject({ km: 1600, liters: 38 });
    const queue = await db.getAllAsync<{ op: string; payload: string }>(
      'SELECT op, payload FROM outbox ORDER BY id',
    );
    expect(queue.map((row) => row.op)).toEqual(['upsert', 'upsert']);
    expect(JSON.parse(queue[1]!.payload)).toMatchObject({ id: saved.id, km: 1600 });
  });

  it('abastecimento excluído não é atualizado', async () => {
    const saved = await addFuelEntry(db, input(1500), { now: T0 });
    await db.runAsync(
      'UPDATE fuel_entries SET deleted_at = ? WHERE id = ?',
      T0.toISOString(),
      saved.id,
    );
    expect(await updateFuelRecord(db, { ...saved, km: 1600 })).toBe(false);
    expect(await getFuelRecord(db, saved.id)).toBeNull();
  });
});
