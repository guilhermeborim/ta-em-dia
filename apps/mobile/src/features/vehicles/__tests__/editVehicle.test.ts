import type { Vehicle } from '@ta-em-dia/shared';
import { migrate } from '../../../core/db/migrations';
import { createTestDb } from '../../../core/db/testing/testDb';
import type { Db } from '../../../core/db';
import { addFuelEntry } from '../../../core/fuel';
import { findActiveVehicle } from '../../../core/vehicle';
import { addManualReading } from '../../../core/odometer';
import { activatePlan } from '../../maintenance/models/plans.repository';
import { registerMaintenance } from '../../maintenance/models/register.repository';
import { buildVehiclePatch, editFormFrom, normalizePlate } from '../models/editVehicle';
import { parseYear } from '../models/firstVehicle';
import {
  createVehicle,
  deleteVehicle,
  findVehicle,
  listArchivedVehicles,
  listVehicles,
  setVehicleArchived,
  updateVehicle,
} from '../models/vehicles.repository';

const GOL = '018bcfe5-6800-7000-8000-000000000001';
const CG = '018bcfe5-6800-7000-8000-000000000002';
const NOW = new Date('2026-10-21T12:00:00.000Z');
const LATER = new Date('2026-10-22T12:00:00.000Z');

const form = { brand: 'VW', model: 'Gol 1.0', year: '2019', nickname: '', plate: '' };

describe('normalizePlate', () => {
  it('deixa só letras e números, em maiúsculas, até 7', () => {
    expect(normalizePlate('bra-2e19')).toBe('BRA2E19');
    expect(normalizePlate('abc 1234 99')).toBe('ABC1234');
  });
});

describe('parseYear', () => {
  it('exige 4 dígitos entre 1950 e o ano que vem', () => {
    expect(parseYear('2019', 2026)).toEqual({ year: 2019 });
    expect(parseYear('', 2026).error).toBe('Informe o ano');
    expect(parseYear('19', 2026).error).toBe('Ano inválido');
    expect(parseYear('2028', 2026).error).toBe('Ano inválido');
  });
});

describe('buildVehiclePatch', () => {
  it('sem apelido, o nome é o modelo; sem placa, remove a placa', () => {
    expect(buildVehiclePatch(form, 2026).value).toEqual({
      name: 'Gol 1.0',
      brand: 'VW',
      model: 'Gol 1.0',
      year: 2019,
      plate: undefined,
    });
  });

  it('aceita placa antiga e Mercosul, e usa o apelido', () => {
    expect(
      buildVehiclePatch({ ...form, nickname: ' Golzinho ', plate: 'bra2e19' }, 2026).value,
    ).toMatchObject({
      name: 'Golzinho',
      plate: 'BRA2E19',
    });
    expect(buildVehiclePatch({ ...form, plate: 'ABC1234' }, 2026).value?.plate).toBe('ABC1234');
  });

  it('recusa marca, modelo, ano e placa inválidos', () => {
    const result = buildVehiclePatch(
      { brand: ' ', model: '', year: '', nickname: '', plate: '12' },
      2026,
    );
    expect(result.errors).toEqual({
      brand: 'Informe a marca',
      model: 'Informe o modelo',
      year: 'Informe o ano',
      plate: 'Placa inválida (ex.: ABC1D23)',
    });
  });
});

describe('editFormFrom', () => {
  const vehicle: Vehicle = {
    id: GOL,
    name: 'Gol 1.0',
    type: 'flex',
    brand: 'VW',
    model: 'Gol 1.0',
    year: 2019,
    initialKm: 1,
  };

  it('apelido vazio quando o nome é o modelo', () => {
    expect(editFormFrom(vehicle)).toEqual({ ...form, plate: '' });
    expect(editFormFrom({ ...vehicle, name: 'Golzinho', plate: 'BRA2E19' })).toMatchObject({
      nickname: 'Golzinho',
      plate: 'BRA2E19',
    });
  });
});

describe('editar, arquivar e excluir no SQLite', () => {
  let db: Db;

  beforeEach(async () => {
    db = createTestDb();
    await migrate(db);
    await createVehicle(
      db,
      { name: 'Gol', type: 'flex', initialKm: 1000, brand: 'VW' },
      { id: GOL, now: NOW },
    );
    await createVehicle(
      db,
      { name: 'CG', type: 'combustion', initialKm: 500 },
      { id: CG, now: NOW },
    );
    await db.runAsync('DELETE FROM outbox');
  });

  const outbox = () =>
    db.getAllAsync<{ table_name: string; row_id: string; op: string }>(
      'SELECT table_name, row_id, op FROM outbox ORDER BY id',
    );

  it('edita, grava e enfileira o upsert (placa vazia remove)', async () => {
    await updateVehicle(
      db,
      GOL,
      { name: 'Golzinho', brand: 'VW', model: 'Gol', year: 2019, plate: 'BRA2E19' },
      LATER,
    );
    expect(await findVehicle(db, GOL)).toMatchObject({
      name: 'Golzinho',
      model: 'Gol',
      year: 2019,
      plate: 'BRA2E19',
    });
    expect(await outbox()).toEqual([{ table_name: 'vehicles', row_id: GOL, op: 'upsert' }]);

    await updateVehicle(db, GOL, { name: 'Golzinho', brand: 'VW', model: 'Gol', year: 2019 });
    expect((await findVehicle(db, GOL))?.plate).toBeUndefined();
  });

  it('edição inválida não grava nada; veículo inexistente volta null', async () => {
    await expect(
      updateVehicle(db, GOL, { name: '', brand: 'VW', model: 'Gol', year: 2019 }),
    ).rejects.toThrow();
    expect((await findVehicle(db, GOL))?.name).toBe('Gol');
    expect(await outbox()).toEqual([]);
    expect(
      await updateVehicle(db, '018bcfe5-6800-7000-8000-0000000000ff', { name: 'X' }),
    ).toBeNull();
  });

  it('arquivar tira das listas e do veículo ativo, e restaurar põe no fim', async () => {
    expect(await setVehicleArchived(db, GOL, true, LATER)).toBe('ok');

    expect((await listVehicles(db)).map((v) => v.id)).toEqual([CG]);
    expect((await listArchivedVehicles(db)).map((v) => v.id)).toEqual([GOL]);
    expect((await findActiveVehicle(db))?.id).toBe(CG);
    // O detalhe ainda abre o arquivado.
    expect((await findVehicle(db, GOL))?.archived).toBe(true);
    expect(await outbox()).toEqual([{ table_name: 'vehicles', row_id: GOL, op: 'upsert' }]);

    await setVehicleArchived(db, GOL, false, LATER);
    expect((await listVehicles(db)).map((v) => v.id)).toEqual([CG, GOL]);
    expect(await listArchivedVehicles(db)).toEqual([]);
  });

  it('não arquiva o único veículo ativo: precisa de outro', async () => {
    await setVehicleArchived(db, GOL, true, LATER);
    const before = await outbox();

    expect(await setVehicleArchived(db, CG, true, LATER)).toBe('last_active');
    expect((await findVehicle(db, CG))?.archived).toBe(false);
    expect((await findActiveVehicle(db))?.id).toBe(CG);
    expect(await outbox()).toEqual(before);

    // Restaurar o outro libera arquivar este.
    await setVehicleArchived(db, GOL, false, LATER);
    expect(await setVehicleArchived(db, CG, true, LATER)).toBe('ok');
  });

  it('arquivar ou restaurar um veículo que não existe', async () => {
    expect(await setVehicleArchived(db, '018bcfe5-6800-7000-8000-0000000000ff', true)).toBe(
      'not_found',
    );
  });

  it('excluir apaga de forma lógica o veículo e tudo que depende dele', async () => {
    await addFuelEntry(db, {
      vehicleId: GOL,
      date: new Date(2026, 9, 10),
      km: 1200,
      fuelType: 'gasoline',
      liters: 10,
      pricePerLiter: 6,
      total: 60,
      fullTank: true,
    });
    await addManualReading(db, { vehicleId: GOL, km: 1300 });
    await activatePlan(db, { vehicleId: GOL, type: 'oil', intervalKm: 10000, currentKm: 1300 });
    await registerMaintenance(db, {
      vehicleId: GOL,
      type: 'oil',
      date: new Date(2026, 9, 12),
      km: 1250,
    });
    // Dado de outro veículo não é tocado.
    await addManualReading(db, { vehicleId: CG, km: 600 });
    await db.runAsync('DELETE FROM outbox');

    await deleteVehicle(db, GOL, LATER);

    for (const table of [
      'fuel_entries',
      'odometer_readings',
      'maintenance_plans',
      'maintenance_records',
    ]) {
      const rows = await db.getAllAsync<{ vehicle_id: string; deleted_at: string | null }>(
        `SELECT vehicle_id, deleted_at FROM ${table}`,
      );
      expect(rows.filter((r) => r.vehicle_id === GOL).every((r) => r.deleted_at !== null)).toBe(
        true,
      );
      expect(rows.filter((r) => r.vehicle_id === CG).every((r) => r.deleted_at === null)).toBe(
        true,
      );
    }
    expect(await findVehicle(db, GOL)).toBeNull();
    expect((await listVehicles(db)).map((v) => v.id)).toEqual([CG]);

    const ops = await outbox();
    expect(ops.every((o) => o.op === 'delete')).toBe(true);
    expect(ops.map((o) => o.table_name).sort()).toEqual([
      'fuel_entries',
      'maintenance_plans',
      'maintenance_records',
      'odometer_readings',
      'vehicles',
    ]);
  });
});
