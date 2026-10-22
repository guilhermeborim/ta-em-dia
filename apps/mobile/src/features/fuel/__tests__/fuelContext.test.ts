import { migrate } from '../../../core/db/migrations';
import { createTestDb } from '../../../core/db/testing/testDb';
import type { Db } from '../../../core/db';
import { loadFuelFormContext } from '../models/fuelContext';
import { addFuelEntry, listFuelEntries } from '../models/fuelEntries.repository';

const VEHICLE_ID = '018bcfe5-6800-7000-8000-000000000001';
const NOW = '2026-10-21T12:00:00.000Z';

let db: Db;

beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});

async function insertVehicle(initialKm: number) {
  await db.runAsync(
    `INSERT INTO vehicles (id, name, type, initial_km, created_at, updated_at)
     VALUES (?, 'Gol', 'flex', ?, ?, ?)`,
    VEHICLE_ID,
    initialKm,
    NOW,
    NOW,
  );
}

const entry = (km: number, fuelType: 'gasoline' | 'ethanol', date: string) => ({
  vehicleId: VEHICLE_ID,
  date: new Date(date),
  km,
  fuelType,
  liters: 40,
  pricePerLiter: 6,
  total: 240,
  fullTank: false,
});

describe('loadFuelFormContext', () => {
  it('sem veículo, volta vazio', async () => {
    expect(await loadFuelFormContext(db)).toEqual({
      vehicle: null,
      lastFuelType: null,
      suggestedKm: null,
    });
  });

  it('sem abastecimentos, sugere o km inicial', async () => {
    await insertVehicle(48320);
    expect(await loadFuelFormContext(db)).toEqual({
      vehicle: { id: VEHICLE_ID, name: 'Gol' },
      lastFuelType: null,
      suggestedKm: 48320,
    });
  });

  it('sugere o último combustível e o maior km', async () => {
    await insertVehicle(48320);
    await addFuelEntry(db, entry(48500, 'gasoline', '2026-10-01T10:00:00.000Z'));
    await addFuelEntry(db, entry(48910, 'ethanol', '2026-10-10T10:00:00.000Z'));

    const context = await loadFuelFormContext(db);
    expect(context.lastFuelType).toBe('ethanol');
    expect(context.suggestedKm).toBe(48910);
  });

  it('ignora abastecimento excluído', async () => {
    await insertVehicle(48320);
    const saved = await addFuelEntry(db, entry(48910, 'ethanol', '2026-10-10T10:00:00.000Z'));
    await db.runAsync('UPDATE fuel_entries SET deleted_at = ? WHERE id = ?', NOW, saved.id);

    expect((await loadFuelFormContext(db)).suggestedKm).toBe(48320);
    expect(await listFuelEntries(db, VEHICLE_ID)).toEqual([]);
  });
});
