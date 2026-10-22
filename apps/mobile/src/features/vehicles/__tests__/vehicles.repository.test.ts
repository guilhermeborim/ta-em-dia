import { migrate } from '../../../core/db/migrations';
import { createTestDb } from '../../../core/db/testing/testDb';
import type { Db } from '../../../core/db';
import { addFuelEntry, listFuelEntries, deleteFuelEntry } from '../../../core/fuel';
import {
  countVehicles,
  createVehicle,
  deleteVehicle,
  listVehicles,
  setVehicleArchived,
  VehicleLimitError,
} from '../models/vehicles.repository';

const VEHICLE_ID = '018bcfe5-6800-7000-8000-000000000001';
const ENTRY_ID = '018bcfe5-6800-7000-8000-000000000002';
const NOW = new Date('2026-10-21T12:00:00.000Z');

let db: Db;

beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
});

const newVehicle = { name: 'Gol', type: 'flex' as const, initialKm: 52000 };
const newEntry = {
  vehicleId: VEHICLE_ID,
  date: new Date('2026-10-20T10:00:00.000Z'),
  km: 52400,
  fuelType: 'gasoline' as const,
  liters: 40,
  pricePerLiter: 6,
  total: 240,
  fullTank: true,
};

describe('vehicles.repository', () => {
  it('grava o veículo e enfileira o upsert na outbox', async () => {
    const vehicle = await createVehicle(db, newVehicle, { id: VEHICLE_ID, now: NOW });

    expect(vehicle.id).toBe(VEHICLE_ID);
    expect(await listVehicles(db)).toEqual([vehicle]);

    const outbox = await db.getAllAsync<{ table_name: string; row_id: string; op: string }>(
      'SELECT table_name, row_id, op FROM outbox',
    );
    expect(outbox).toEqual([{ table_name: 'vehicles', row_id: VEHICLE_ID, op: 'upsert' }]);
  });

  it('respeita o limite do plano: o primeiro cabe, o segundo não, e nada é gravado', async () => {
    await createVehicle(db, newVehicle, { id: VEHICLE_ID, max: 1 });

    await expect(
      createVehicle(db, { ...newVehicle, name: 'Civic' }, { max: 1 }),
    ).rejects.toBeInstanceOf(VehicleLimitError);
    expect(await countVehicles(db)).toBe(1);
    expect(await db.getAllAsync('SELECT * FROM outbox')).toHaveLength(1);
  });

  it('sem limite (nulo ou ausente) cadastra quantos quiser', async () => {
    await createVehicle(db, newVehicle, { max: null });
    await createVehicle(db, { ...newVehicle, name: 'Civic' });
    await createVehicle(db, { ...newVehicle, name: 'Uno' }, { max: 3 });
    expect(await countVehicles(db)).toBe(3);
  });

  it('arquivado conta no limite; excluído libera a vaga', async () => {
    await createVehicle(db, newVehicle, { id: VEHICLE_ID });
    const other = await createVehicle(db, { ...newVehicle, name: 'Civic' });
    await setVehicleArchived(db, VEHICLE_ID, true);

    await expect(createVehicle(db, newVehicle, { max: 2 })).rejects.toBeInstanceOf(
      VehicleLimitError,
    );
    await deleteVehicle(db, other.id);
    await expect(createVehicle(db, newVehicle, { max: 2 })).resolves.toBeDefined();
  });

  it('rejeita dados inválidos sem gravar nada', async () => {
    await expect(
      createVehicle(db, { ...newVehicle, name: '' }, { id: VEHICLE_ID }),
    ).rejects.toThrow();

    expect(await listVehicles(db)).toEqual([]);
    expect(await db.getAllAsync('SELECT * FROM outbox')).toEqual([]);
  });

  it('exclusão é lógica: some da lista, a linha continua com deleted_at', async () => {
    await createVehicle(db, newVehicle, { id: VEHICLE_ID, now: NOW });
    await deleteVehicle(db, VEHICLE_ID, NOW);

    expect(await listVehicles(db)).toEqual([]);

    const row = await db.getFirstAsync<{ deleted_at: string }>(
      'SELECT deleted_at FROM vehicles WHERE id = ?',
      VEHICLE_ID,
    );
    expect(row?.deleted_at).toBe(NOW.toISOString());

    const ops = await db.getAllAsync<{ op: string }>('SELECT op FROM outbox ORDER BY id');
    expect(ops.map((o) => o.op)).toEqual(['upsert', 'delete']);
  });
});

describe('fuelEntries.repository', () => {
  beforeEach(async () => {
    await createVehicle(db, newVehicle, { id: VEHICLE_ID, now: NOW });
  });

  it('grava o abastecimento e lê de volta igual', async () => {
    const entry = await addFuelEntry(db, newEntry, { id: ENTRY_ID, now: NOW });

    expect(await listFuelEntries(db, VEHICLE_ID)).toEqual([entry]);
  });

  it('lista do mais recente ao mais antigo', async () => {
    await addFuelEntry(db, newEntry, { id: ENTRY_ID, now: NOW });
    const later = await addFuelEntry(
      db,
      { ...newEntry, date: new Date('2026-10-21T10:00:00.000Z'), km: 52900 },
      { id: '018bcfe5-6800-7000-8000-000000000003', now: NOW },
    );

    const list = await listFuelEntries(db, VEHICLE_ID);
    expect(list[0]).toEqual(later);
    expect(list).toHaveLength(2);
  });

  it('abastecimento parcial (fullTank false) é salvo normalmente', async () => {
    await addFuelEntry(db, { ...newEntry, fullTank: false }, { id: ENTRY_ID, now: NOW });

    const [entry] = await listFuelEntries(db, VEHICLE_ID);
    expect(entry?.fullTank).toBe(false);
  });

  it('não aceita abastecimento de veículo inexistente', async () => {
    await expect(
      addFuelEntry(
        db,
        { ...newEntry, vehicleId: '018bcfe5-6800-7000-8000-0000000000ff' },
        { id: ENTRY_ID, now: NOW },
      ),
    ).rejects.toThrow();

    expect(await db.getAllAsync("SELECT * FROM outbox WHERE table_name = 'fuel_entries'")).toEqual(
      [],
    );
  });

  it('exclusão é lógica e enfileira o delete', async () => {
    await addFuelEntry(db, newEntry, { id: ENTRY_ID, now: NOW });
    await deleteFuelEntry(db, ENTRY_ID, NOW);

    expect(await listFuelEntries(db, VEHICLE_ID)).toEqual([]);

    const ops = await db.getAllAsync<{ op: string }>(
      "SELECT op FROM outbox WHERE table_name = 'fuel_entries' ORDER BY id",
    );
    expect(ops.map((o) => o.op)).toEqual(['upsert', 'delete']);
  });
});
