import { migrate } from '../../db/migrations';
import { createTestDb } from '../../db/testing/testDb';
import type { Db } from '../../db';
import type { ReminderNotification, ReminderScheduler } from '../../notifications';
import { saveToggle } from '../../settings';
import { addManualReading } from '../odometer.repository';
import { lastKmUpdateAt } from '../lastUpdate';
import { ODOMETER_REMINDER_PREFIX, refreshOdometerReminder } from '../reminders';

// Sem o módulo nativo: o agendador de verdade nunca roda nestes testes.
jest.mock('../../notifications', () => ({
  reminderScheduler: { replaceScheduled: jest.fn(async () => false) },
}));

const VEHICLE_ID = '018bcfe5-6800-7000-8000-000000000001';
const CREATED = new Date(2026, 8, 1, 10);

let db: Db;
let calls: { prefix: string; items: ReminderNotification[] }[];
const scheduler: ReminderScheduler = {
  async replaceScheduled(prefix, items) {
    calls.push({ prefix, items });
    return true;
  },
};
const last = () => calls[calls.length - 1].items;

beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
  calls = [];
  await db.runAsync(
    `INSERT INTO vehicles (id, name, type, initial_km, created_at, updated_at)
     VALUES (?, 'Gol', 'flex', 0, ?, ?)`,
    VEHICLE_ID,
    CREATED.toISOString(),
    CREATED.toISOString(),
  );
});

describe('lastKmUpdateAt', () => {
  it('sem leituras: a data em que o veículo foi cadastrado', async () => {
    expect(await lastKmUpdateAt(db, VEHICLE_ID)).toEqual(CREATED);
  });

  it('pega a mais recente entre leitura manual, abastecimento e serviço', async () => {
    await addManualReading(db, { vehicleId: VEHICLE_ID, km: 100 }, { now: new Date(2026, 8, 10) });
    await db.runAsync(
      `INSERT INTO fuel_entries (id, vehicle_id, date, km, fuel_type, liters, price_per_liter, total, created_at, updated_at)
       VALUES ('f1', ?, ?, 200, 'gasoline', 10, 5, 50, ?, ?)`,
      VEHICLE_ID,
      new Date(2026, 8, 20).toISOString(),
      CREATED.toISOString(),
      CREATED.toISOString(),
    );
    await db.runAsync(
      `INSERT INTO maintenance_records (id, vehicle_id, type, date, km, created_at, updated_at)
       VALUES ('m1', ?, 'oil', ?, 150, ?, ?)`,
      VEHICLE_ID,
      new Date(2026, 8, 15).toISOString(),
      CREATED.toISOString(),
      CREATED.toISOString(),
    );
    expect(await lastKmUpdateAt(db, VEHICLE_ID)).toEqual(new Date(2026, 8, 20));
  });

  it('ignora leitura excluída', async () => {
    const reading = await addManualReading(
      db,
      { vehicleId: VEHICLE_ID, km: 100 },
      { now: new Date(2026, 8, 25) },
    );
    await db.runAsync(
      'UPDATE odometer_readings SET deleted_at = ? WHERE id = ?',
      '2026-09-26',
      reading.id,
    );
    expect(await lastKmUpdateAt(db, VEHICLE_ID)).toEqual(CREATED);
  });
});

describe('refreshOdometerReminder', () => {
  const now = new Date(2026, 8, 5, 12);
  const refresh = (at = now) => refreshOdometerReminder(db, { scheduler, now: at });

  it('desligado (padrão): não agenda nada e cancela o que havia', async () => {
    await refresh();
    expect(calls).toHaveLength(1);
    expect(calls[0].prefix).toBe(ODOMETER_REMINDER_PREFIX);
    expect(last()).toEqual([]);
  });

  it('ligado: um aviso 15 dias depois da última atualização, às 9h', async () => {
    await saveToggle(db, 'notifyOdometer', true);
    await refresh();
    expect(last()).toEqual([
      {
        id: `odometer:${VEHICLE_ID}`,
        title: 'Tá em Dia',
        body: 'Faz 15 dias sem atualizar o km do Gol',
        fireAt: new Date(2026, 8, 16, 9),
        data: { vehicleId: VEHICLE_ID },
      },
    ]);
  });

  it('atualizar o km empurra o aviso', async () => {
    await saveToggle(db, 'notifyOdometer', true);
    await addManualReading(db, { vehicleId: VEHICLE_ID, km: 10 }, { now: new Date(2026, 8, 4) });
    await refresh();
    expect(last()[0].fireAt).toEqual(new Date(2026, 8, 19, 9));
  });

  it('sem atualizar há muito tempo: repete a cada 15 dias', async () => {
    await saveToggle(db, 'notifyOdometer', true);
    await refresh(new Date(2026, 9, 20, 12));
    expect(last()[0].body).toBe('Faz 60 dias sem atualizar o km do Gol');
    expect(last()[0].fireAt).toEqual(new Date(2026, 9, 31, 9));
  });

  it('sem veículo: não agenda nada', async () => {
    await saveToggle(db, 'notifyOdometer', true);
    await db.runAsync('UPDATE vehicles SET deleted_at = ?', CREATED.toISOString());
    await refresh();
    expect(last()).toEqual([]);
  });
});
