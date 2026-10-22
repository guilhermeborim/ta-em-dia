import type { Vehicle } from '@ta-em-dia/shared';
import { migrate } from '../../../core/db/migrations';
import { createTestDb } from '../../../core/db/testing/testDb';
import type { Db } from '../../../core/db';
import { addFuelEntry } from '../../../core/fuel';
import { loadVehicleKm } from '../../../core/maintenance';
import { addManualReading, listManualReadings } from '../../../core/odometer';
import { buildKmInput } from '../models/updateKm';
import { buildVehicleDetail, type VehicleDetailData } from '../models/vehicleDetail';
import { loadVehicleDetail } from '../models/vehicleDetail.repository';
import { createVehicle } from '../models/vehicles.repository';

const TODAY = new Date(2026, 9, 21, 15);
const VEHICLE_ID = '018bcfe5-6800-7000-8000-000000000001';
const READING_ID = '018bcfe5-6800-7000-8000-0000000000c1';

const vehicle: Vehicle = {
  id: VEHICLE_ID,
  name: 'Golzinho',
  type: 'flex',
  brand: 'VW',
  model: 'Gol 1.0 MPI',
  year: 2019,
  plate: 'bra2e19',
  initialKm: 48000,
};

const data = (patch: Partial<VehicleDetailData> = {}): VehicleDetailData => ({
  vehicle,
  currentKm: 48910,
  dailyKm: 42.4,
  fuelTotal: 428.7,
  lastReadingAt: new Date(2026, 9, 18),
  ...patch,
});

describe('buildVehicleDetail', () => {
  it('monta título, placa, números e dados', () => {
    expect(buildVehicleDetail(data(), TODAY)).toEqual({
      title: 'Golzinho',
      icon: 'car',
      plate: 'BRA2E19',
      stats: [
        { label: 'Km atual', value: '48.910' },
        { label: 'Média/dia', value: '42 km' },
        { label: 'Custo/km', value: 'R$ 0,47' },
      ],
      rows: [
        { label: 'Marca e modelo', value: 'VW Gol 1.0 MPI' },
        { label: 'Ano', value: '2019' },
        { label: 'Combustível', value: 'Flex' },
        { label: 'Km atualizado', value: 'há 3 dias' },
      ],
    });
  });

  it('sem placa, marca, modelo ou ano, esses itens saem', () => {
    const view = buildVehicleDetail(
      data({
        vehicle: {
          ...vehicle,
          plate: undefined,
          brand: undefined,
          model: undefined,
          year: undefined,
          type: 'combustion',
        },
      }),
      TODAY,
    );
    expect(view.plate).toBeUndefined();
    expect(view.rows.map((r) => r.label)).toEqual(['Combustível', 'Km atualizado']);
    expect(view.rows[0].value).toBe('Combustão');
  });

  it('moto: ícone próprio e o tipo aparece como "Moto"', () => {
    const view = buildVehicleDetail(data({ vehicle: { ...vehicle, type: 'motorcycle' } }), TODAY);
    expect(view.icon).toBe('motorbike');
    expect(view.rows.find((r) => r.value === 'Moto')?.label).toBe('Tipo');
  });

  it('sem km rodado, o custo/km fica "—"; sem leitura, avisa que só há o km inicial', () => {
    const view = buildVehicleDetail(data({ currentKm: 48000, lastReadingAt: null }), TODAY);
    expect(view.stats[2].value).toBe('—');
    expect(view.rows.at(-1)).toEqual({ label: 'Km atualizado', value: 'Só o km inicial' });
  });
});

describe('buildKmInput', () => {
  it('aceita km maior ou igual ao atual, com ou sem ponto', () => {
    expect(buildKmInput('49.000', 48910)).toEqual({ km: 49000 });
    expect(buildKmInput('48910', 48910)).toEqual({ km: 48910 });
  });

  it('recusa vazio, menor que o atual e absurdo', () => {
    expect(buildKmInput('', 48910).error).toBe('Informe o km do painel');
    expect(buildKmInput('48.000', 48910).error).toBe(
      'O km não pode ser menor que o atual (48.910 km)',
    );
    expect(buildKmInput('9999999', 48910).error).toBe('Km inválido');
  });
});

describe('leituras manuais de km no SQLite', () => {
  let db: Db;

  beforeEach(async () => {
    db = createTestDb();
    await migrate(db);
    await createVehicle(
      db,
      { name: 'Gol', type: 'flex', initialKm: 48000 },
      { id: VEHICLE_ID, now: new Date(2026, 9, 1) },
    );
    await db.runAsync('DELETE FROM outbox');
  });

  it('grava a leitura e enfileira o upsert na outbox', async () => {
    const reading = await addManualReading(
      db,
      { vehicleId: VEHICLE_ID, km: 48910 },
      { id: READING_ID, now: new Date(2026, 9, 18) },
    );

    expect(reading).toMatchObject({ id: READING_ID, km: 48910, source: 'manual' });
    expect(await listManualReadings(db, VEHICLE_ID)).toEqual([
      { km: 48910, readAt: new Date(2026, 9, 18) },
    ]);
    const outbox = await db.getAllAsync<{ table_name: string; row_id: string; op: string }>(
      'SELECT table_name, row_id, op FROM outbox',
    );
    expect(outbox).toEqual([{ table_name: 'odometer_readings', row_id: READING_ID, op: 'upsert' }]);
  });

  it('rejeita km inválido sem gravar nada', async () => {
    await expect(addManualReading(db, { vehicleId: VEHICLE_ID, km: -1 })).rejects.toThrow();
    expect(await listManualReadings(db, VEHICLE_ID)).toEqual([]);
    expect(await db.getAllAsync('SELECT * FROM outbox')).toEqual([]);
  });

  it('a leitura manual conta no km atual e na média diária', async () => {
    await addManualReading(db, { vehicleId: VEHICLE_ID, km: 48500 }, { now: new Date(2026, 9, 1) });
    await addManualReading(
      db,
      { vehicleId: VEHICLE_ID, km: 49100 },
      { now: new Date(2026, 9, 21) },
    );

    // 600 km em 20 dias.
    expect(await loadVehicleKm(db, VEHICLE_ID, 48000)).toEqual({ currentKm: 49100, dailyKm: 30 });
  });

  it('traz o detalhe com a leitura mais recente e o gasto com combustível', async () => {
    await addFuelEntry(db, {
      vehicleId: VEHICLE_ID,
      date: new Date(2026, 9, 10),
      km: 48400,
      fuelType: 'gasoline',
      liters: 40,
      pricePerLiter: 6,
      total: 240,
      fullTank: true,
    });
    await addManualReading(
      db,
      { vehicleId: VEHICLE_ID, km: 48910 },
      { now: new Date(2026, 9, 18) },
    );

    const detail = await loadVehicleDetail(db, VEHICLE_ID);
    expect(detail).toMatchObject({ currentKm: 48910, fuelTotal: 240 });
    expect(detail?.lastReadingAt).toEqual(new Date(2026, 9, 18));
    expect(detail?.vehicle.name).toBe('Gol');
  });

  it('veículo inexistente ou excluído: null', async () => {
    expect(await loadVehicleDetail(db, '018bcfe5-6800-7000-8000-0000000000ff')).toBeNull();
    await db.runAsync('UPDATE vehicles SET deleted_at = ? WHERE id = ?', '2026-10-02', VEHICLE_ID);
    expect(await loadVehicleDetail(db, VEHICLE_ID)).toBeNull();
  });
});
