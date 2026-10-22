import { migrate } from '../../../core/db/migrations';
import { createTestDb } from '../../../core/db/testing/testDb';
import type { Db } from '../../../core/db';
import { addFuelEntry } from '../../fuel/models/fuelEntries.repository';
import { createVehicle, deleteVehicle } from '../../vehicles/models/vehicles.repository';
import { loadHomeState } from '../models/home.repository';
import { vehicleDetails } from '../models/vehicleDetails';

const VEHICLE_ID = '018bcfe5-6800-7000-8000-000000000001';
const NOW = new Date('2026-10-21T12:00:00.000Z');

let db: Db;

beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});

describe('loadHomeState', () => {
  it('sem veículo: nada para mostrar', async () => {
    expect(await loadHomeState(db)).toEqual({ vehicle: null, hasFuelEntries: false });
  });

  it('com veículo e sem abastecimento: estado vazio', async () => {
    await createVehicle(
      db,
      { name: 'Golzinho', type: 'flex', brand: 'VW', model: 'Gol', year: 2019, initialKm: 48320 },
      { id: VEHICLE_ID, now: NOW },
    );
    const state = await loadHomeState(db);
    expect(state.vehicle).toMatchObject({ id: VEHICLE_ID, name: 'Golzinho', initialKm: 48320 });
    expect(state.hasFuelEntries).toBe(false);
  });

  it('com abastecimento: deixa de ser vazio', async () => {
    await createVehicle(db, { name: 'Gol', type: 'flex', initialKm: 100 }, { id: VEHICLE_ID });
    await addFuelEntry(db, {
      vehicleId: VEHICLE_ID,
      date: NOW,
      km: 200,
      fuelType: 'gasoline',
      liters: 40,
      pricePerLiter: 6,
      total: 240,
      fullTank: true,
    });
    expect((await loadHomeState(db)).hasFuelEntries).toBe(true);
  });

  it('ignora veículo excluído', async () => {
    await createVehicle(db, { name: 'Gol', type: 'flex', initialKm: 100 }, { id: VEHICLE_ID });
    await deleteVehicle(db, VEHICLE_ID);
    expect((await loadHomeState(db)).vehicle).toBeNull();
  });
});

describe('vehicleDetails', () => {
  it('junta marca, modelo, ano e km em pt-BR', () => {
    expect(
      vehicleDetails({
        id: 'x',
        name: 'G',
        brand: 'VW',
        model: 'Gol 1.0',
        year: 2019,
        initialKm: 48320,
      }),
    ).toBe('VW Gol 1.0 · 2019 · 48.320 km');
  });

  it('pula o que não existe', () => {
    expect(vehicleDetails({ id: 'x', name: 'G', initialKm: 0 })).toBe('0 km');
  });
});
