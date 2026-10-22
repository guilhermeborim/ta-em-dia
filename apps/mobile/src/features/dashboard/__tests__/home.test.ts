import { migrate } from '../../../core/db/migrations';
import { createTestDb } from '../../../core/db/testing/testDb';
import type { Db } from '../../../core/db';
import { addFuelEntry } from '../../../core/fuel';
import { activatePlan, setPlanEnabled } from '../../maintenance/models/plans.repository';
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
    expect(await loadHomeState(db)).toEqual({ vehicle: null, entries: [], plans: [] });
  });

  it('com veículo e sem abastecimento: estado vazio', async () => {
    await createVehicle(
      db,
      { name: 'Golzinho', type: 'flex', brand: 'VW', model: 'Gol', year: 2019, initialKm: 48320 },
      { id: VEHICLE_ID, now: NOW },
    );
    const state = await loadHomeState(db);
    expect(state.vehicle).toMatchObject({
      id: VEHICLE_ID,
      name: 'Golzinho',
      initialKm: 48320,
      currentKm: 48320,
    });
    expect(state.entries).toEqual([]);
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
    const state = await loadHomeState(db);
    expect(state.entries).toHaveLength(1);
    // O km atual passa a ser o do último abastecimento.
    expect(state.vehicle?.currentKm).toBe(200);

    // Um serviço de manutenção com km maior também conta.
    await db.runAsync(
      `INSERT INTO maintenance_records (id, vehicle_id, type, date, km, created_at, updated_at)
       VALUES ('r1', ?, 'oil', ?, 350, ?, ?)`,
      VEHICLE_ID,
      NOW.toISOString(),
      NOW.toISOString(),
      NOW.toISOString(),
    );
    expect((await loadHomeState(db)).vehicle?.currentKm).toBe(350);
  });

  it('ignora veículo excluído', async () => {
    await createVehicle(db, { name: 'Gol', type: 'flex', initialKm: 100 }, { id: VEHICLE_ID });
    await deleteVehicle(db, VEHICLE_ID);
    expect((await loadHomeState(db)).vehicle).toBeNull();
  });
});

describe('loadHomeState: planos de manutenção', () => {
  it('traz os planos do veículo (ativos e desativados)', async () => {
    await createVehicle(db, { name: 'Gol', type: 'flex', initialKm: 100 }, { id: VEHICLE_ID });
    const plan = await activatePlan(db, {
      vehicleId: VEHICLE_ID,
      type: 'oil',
      intervalKm: 10000,
      currentKm: 100,
    });
    expect((await loadHomeState(db)).plans).toEqual([plan]);

    await setPlanEnabled(db, plan.id, false);
    expect((await loadHomeState(db)).plans[0].enabled).toBe(false);
  });
});

describe('vehicleDetails', () => {
  it('junta marca, modelo, ano e km em pt-BR', () => {
    expect(vehicleDetails({ brand: 'VW', model: 'Gol 1.0', year: 2019, currentKm: 48910 })).toBe(
      'VW Gol 1.0 · 2019 · 48.910 km',
    );
  });

  it('pula o que não existe', () => {
    expect(vehicleDetails({ currentKm: 0 })).toBe('0 km');
  });
});
