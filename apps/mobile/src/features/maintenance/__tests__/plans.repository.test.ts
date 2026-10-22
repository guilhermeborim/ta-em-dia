import { migrate } from '../../../core/db/migrations';
import { createTestDb } from '../../../core/db/testing/testDb';
import type { Db } from '../../../core/db';
import { addFuelEntry } from '../../../core/fuel';
import { activatePlan, listPlans, loadMaintenance } from '../models/plans.repository';

const VEHICLE_ID = '018bcfe5-6800-7000-8000-000000000001';
const PLAN_ID = '018bcfe5-6800-7000-8000-0000000000a1';
const NOW = new Date(2026, 9, 21, 12);

let db: Db;

beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
  await db.runAsync(
    `INSERT INTO vehicles (id, name, type, initial_km, created_at, updated_at)
     VALUES (?, 'Gol', 'flex', 48320, ?, ?)`,
    VEHICLE_ID,
    NOW.toISOString(),
    NOW.toISOString(),
  );
});

const oil = { vehicleId: VEHICLE_ID, type: 'oil', intervalKm: 10000, intervalMonths: 12 };

describe('activatePlan', () => {
  it('cria o plano contando de agora e enfileira o upsert na outbox', async () => {
    const plan = await activatePlan(db, { ...oil, currentKm: 48910 }, { id: PLAN_ID, now: NOW });

    expect(plan).toMatchObject({
      id: PLAN_ID,
      type: 'oil',
      intervalKm: 10000,
      intervalMonths: 12,
      lastDoneKm: 48910,
      lastDoneAt: NOW,
      enabled: true,
      notifyBeforeKm: 500,
      notifyBeforeDays: 7,
    });
    expect(await listPlans(db, VEHICLE_ID)).toEqual([plan]);

    const outbox = await db.getAllAsync<{ table_name: string; row_id: string; op: string }>(
      'SELECT table_name, row_id, op FROM outbox',
    );
    expect(outbox).toEqual([{ table_name: 'maintenance_plans', row_id: PLAN_ID, op: 'upsert' }]);
  });

  it('aceita plano só por tempo (sem km)', async () => {
    const plan = await activatePlan(
      db,
      { vehicleId: VEHICLE_ID, type: 'brake_fluid', intervalMonths: 24, currentKm: 48910 },
      { id: PLAN_ID, now: NOW },
    );
    expect(plan.intervalKm).toBeUndefined();
    expect((await listPlans(db, VEHICLE_ID))[0].intervalMonths).toBe(24);
  });

  it('reativa um plano desativado sem zerar a última vez', async () => {
    await activatePlan(db, { ...oil, currentKm: 48910 }, { id: PLAN_ID, now: NOW });
    await db.runAsync('UPDATE maintenance_plans SET enabled = 0 WHERE id = ?', PLAN_ID);

    const later = new Date(2026, 10, 5);
    const plan = await activatePlan(db, { ...oil, currentKm: 49500 }, { now: later });

    expect(plan).toMatchObject({ id: PLAN_ID, enabled: true, lastDoneKm: 48910, lastDoneAt: NOW });
    expect(await listPlans(db, VEHICLE_ID)).toHaveLength(1);
    const ops = await db.getAllAsync<{ op: string }>('SELECT op FROM outbox ORDER BY id');
    expect(ops).toEqual([{ op: 'upsert' }, { op: 'upsert' }]);
  });

  it('rejeita dados inválidos sem gravar nada', async () => {
    await expect(
      activatePlan(db, { ...oil, intervalKm: -5, currentKm: 100 }, { id: PLAN_ID }),
    ).rejects.toThrow();
    expect(await listPlans(db, VEHICLE_ID)).toEqual([]);
    expect(await db.getAllAsync('SELECT * FROM outbox')).toEqual([]);
  });
});

describe('listPlans', () => {
  it('ignora plano excluído (exclusão lógica)', async () => {
    await activatePlan(db, { ...oil, currentKm: 48910 }, { id: PLAN_ID, now: NOW });
    await db.runAsync(
      'UPDATE maintenance_plans SET deleted_at = ? WHERE id = ?',
      '2026-10-22',
      PLAN_ID,
    );
    expect(await listPlans(db, VEHICLE_ID)).toEqual([]);
  });
});

describe('loadMaintenance', () => {
  it('sem veículo, volta vazio', async () => {
    const empty = createTestDb();
    await migrate(empty);
    expect(await loadMaintenance(empty)).toMatchObject({ vehicle: null, plans: [] });
  });

  it('sem abastecimentos, o km atual é o inicial e a média diária é a padrão', async () => {
    expect(await loadMaintenance(db)).toMatchObject({
      vehicle: { id: VEHICLE_ID, name: 'Gol' },
      currentKm: 48320,
      dailyKm: 30,
      plans: [],
    });
  });

  it('com abastecimentos, o km atual é o do último e a média vem do histórico', async () => {
    const base = {
      vehicleId: VEHICLE_ID,
      fuelType: 'gasoline' as const,
      liters: 40,
      pricePerLiter: 6,
      total: 240,
      fullTank: true,
    };
    await addFuelEntry(db, { ...base, date: new Date(2026, 8, 1), km: 48400 });
    await addFuelEntry(db, { ...base, date: new Date(2026, 8, 11), km: 48820 });

    const data = await loadMaintenance(db);
    expect(data.currentKm).toBe(48820);
    // 420 km em 10 dias.
    expect(data.dailyKm).toBeCloseTo(42);
  });
});
