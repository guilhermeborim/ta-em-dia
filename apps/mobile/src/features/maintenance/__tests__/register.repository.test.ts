import { migrate } from '../../../core/db/migrations';
import { createTestDb } from '../../../core/db/testing/testDb';
import type { Db } from '../../../core/db';
import { addFuelEntry } from '../../../core/fuel';
import {
  activatePlan,
  listPlans,
  loadMaintenance,
  loadPlanDetail,
} from '../models/plans.repository';
import {
  latestRecord,
  listCustomTypes,
  listRecords,
  maxRecordKm,
} from '../models/records.repository';
import { loadRegisterContext, registerMaintenance } from '../models/register.repository';

const VEHICLE_ID = '018bcfe5-6800-7000-8000-000000000001';
const PLAN_ID = '018bcfe5-6800-7000-8000-0000000000a1';
const RECORD_ID = '018bcfe5-6800-7000-8000-0000000000b1';
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

const service = (patch = {}) => ({
  vehicleId: VEHICLE_ID,
  type: 'oil',
  date: new Date(2026, 9, 20, 12),
  km: 50110,
  cost: 289,
  shop: 'Auto Center do Zé',
  ...patch,
});

const oil = { vehicleId: VEHICLE_ID, type: 'oil', intervalKm: 10000, intervalMonths: 12 };

const outbox = () =>
  db.getAllAsync<{ table_name: string; op: string }>(
    'SELECT table_name, op FROM outbox ORDER BY id',
  );

describe('registerMaintenance', () => {
  it('grava o serviço e enfileira o upsert na outbox', async () => {
    const { record, plan } = await registerMaintenance(db, service(), { id: RECORD_ID, now: NOW });

    expect(record).toMatchObject({ id: RECORD_ID, type: 'oil', km: 50110, cost: 289 });
    expect(plan).toBeNull();
    expect(await listRecords(db, VEHICLE_ID)).toEqual([record]);
    expect(await outbox()).toEqual([{ table_name: 'maintenance_records', op: 'upsert' }]);
  });

  it('reinicia o ciclo do plano do mesmo tipo e liga o serviço ao plano', async () => {
    await activatePlan(
      db,
      { ...oil, currentKm: 48320 },
      { id: PLAN_ID, now: new Date(2026, 0, 12) },
    );

    const { record, plan } = await registerMaintenance(db, service(), { id: RECORD_ID, now: NOW });

    expect(plan).toMatchObject({
      id: PLAN_ID,
      lastDoneKm: 50110,
      lastDoneAt: new Date(2026, 9, 20, 12),
    });
    expect(record.planId).toBe(PLAN_ID);
    expect((await listPlans(db, VEHICLE_ID))[0]).toMatchObject({ lastDoneKm: 50110 });
    expect(await outbox()).toEqual([
      { table_name: 'maintenance_plans', op: 'upsert' },
      { table_name: 'maintenance_plans', op: 'upsert' },
      { table_name: 'maintenance_records', op: 'upsert' },
    ]);
  });

  it('serviço mais antigo que a última vez do plano não faz o plano voltar no tempo', async () => {
    await activatePlan(
      db,
      { ...oil, currentKm: 50000 },
      { id: PLAN_ID, now: new Date(2026, 9, 1) },
    );
    await registerMaintenance(db, service({ date: new Date(2026, 5, 1, 12), km: 45000 }));

    const detail = await loadPlanDetail(db, PLAN_ID);
    expect(detail?.plan).toMatchObject({ lastDoneKm: 50000, lastDoneAt: new Date(2026, 9, 1) });
    expect((await listRecords(db, VEHICLE_ID))[0].planId).toBe(PLAN_ID);
  });

  it('plano desativado reinicia o ciclo mas continua desativado', async () => {
    await activatePlan(
      db,
      { ...oil, currentKm: 48320 },
      { id: PLAN_ID, now: new Date(2026, 0, 12) },
    );
    await db.runAsync('UPDATE maintenance_plans SET enabled = 0 WHERE id = ?', PLAN_ID);

    const { plan } = await registerMaintenance(db, service());
    expect(plan).toMatchObject({ enabled: false, lastDoneKm: 50110 });
  });

  it('tipo criado em "Outro" cria um plano só de histórico (atalho "Seu")', async () => {
    const { record, plan } = await registerMaintenance(db, service({ type: 'Troca de bateria' }), {
      id: RECORD_ID,
      planId: PLAN_ID,
      now: NOW,
    });

    expect(plan).toMatchObject({
      id: PLAN_ID,
      type: 'Troca de bateria',
      enabled: true,
      lastDoneKm: 50110,
    });
    expect(plan?.intervalKm).toBeUndefined();
    expect(plan?.intervalMonths).toBeUndefined();
    expect(record.planId).toBe(PLAN_ID);
    expect(await listCustomTypes(db)).toEqual(['Troca de bateria']);
  });

  it('o segundo serviço do mesmo tipo "Seu" reaproveita o plano', async () => {
    await registerMaintenance(db, service({ type: 'Troca de bateria' }));
    await registerMaintenance(
      db,
      service({ type: 'Troca de bateria', km: 60000, date: new Date(2026, 9, 21, 12) }),
    );

    const plans = await listPlans(db, VEHICLE_ID);
    expect(plans).toHaveLength(1);
    expect(plans[0].lastDoneKm).toBe(60000);
    expect(await listRecords(db, VEHICLE_ID)).toHaveLength(2);
  });

  it('rejeita dados inválidos sem gravar nada (nem plano nem outbox)', async () => {
    await expect(
      registerMaintenance(db, service({ type: 'Troca de bateria', km: -1 })),
    ).rejects.toThrow();
    expect(await listRecords(db, VEHICLE_ID)).toEqual([]);
    expect(await listPlans(db, VEHICLE_ID)).toEqual([]);
    expect(await outbox()).toEqual([]);
  });
});

describe('records.repository', () => {
  it('lista do mais recente ao mais antigo, ignora excluídos e acha o último de um tipo', async () => {
    await registerMaintenance(db, service({ date: new Date(2026, 1, 1, 12), km: 45000 }));
    const { record } = await registerMaintenance(db, service({ date: new Date(2026, 9, 20, 12) }));
    await registerMaintenance(db, service({ type: 'alignment', km: 50000 }));
    await db.runAsync(
      'UPDATE maintenance_records SET deleted_at = ? WHERE km = 50000',
      '2026-10-22',
    );

    expect((await listRecords(db, VEHICLE_ID)).map((r) => r.km)).toEqual([50110, 45000]);
    expect((await latestRecord(db, VEHICLE_ID, 'oil'))?.id).toBe(record.id);
    expect(await latestRecord(db, VEHICLE_ID, 'alignment')).toBeNull();
    expect(await maxRecordKm(db, VEHICLE_ID)).toBe(50110);
  });

  it('maxRecordKm sem serviços é 0', async () => {
    expect(await maxRecordKm(db, VEHICLE_ID)).toBe(0);
  });
});

describe('activatePlan com serviço registrado', () => {
  it('o ciclo começa do último serviço, não de agora', async () => {
    await registerMaintenance(db, service());
    const plan = await activatePlan(db, { ...oil, currentKm: 50500 }, { now: NOW });
    expect(plan).toMatchObject({ lastDoneKm: 50110, lastDoneAt: new Date(2026, 9, 20, 12) });
  });
});

describe('loadMaintenance / loadRegisterContext', () => {
  it('o km do serviço conta como leitura do hodômetro e a lista traz os serviços', async () => {
    await addFuelEntry(db, {
      vehicleId: VEHICLE_ID,
      date: new Date(2026, 9, 1),
      km: 49000,
      fuelType: 'gasoline',
      liters: 40,
      pricePerLiter: 6,
      total: 240,
      fullTank: true,
    });
    await registerMaintenance(db, service());

    const data = await loadMaintenance(db);
    expect(data.currentKm).toBe(50110);
    expect(data.records).toHaveLength(1);
  });

  it('sugere o km atual, os atalhos "Seu" e o tipo do plano de origem', async () => {
    await registerMaintenance(db, service({ type: 'Troca de bateria' }), { planId: PLAN_ID });

    expect(await loadRegisterContext(db, PLAN_ID)).toEqual({
      vehicle: { id: VEHICLE_ID, name: 'Gol' },
      currentKm: 50110,
      customTypes: ['Troca de bateria'],
      planType: 'Troca de bateria',
    });
    expect((await loadRegisterContext(db)).planType).toBeNull();
  });

  it('sem veículo, volta sem veículo', async () => {
    const empty = createTestDb();
    await migrate(empty);
    expect(await loadRegisterContext(empty)).toEqual({
      vehicle: null,
      currentKm: 0,
      customTypes: [],
      planType: null,
    });
  });
});
