import { migrate } from '../../db/migrations';
import { createTestDb } from '../../db/testing/testDb';
import type { Db } from '../../db';
import { getSetting } from '../../db';
import type { ReminderNotification, ReminderScheduler } from '../../notifications';
import { refreshMaintenanceReminders, REMINDER_PREFIX } from '../reminders';

// Sem o módulo nativo: o agendador de verdade nunca roda nestes testes.
jest.mock('../../notifications', () => ({
  reminderScheduler: { replaceScheduled: jest.fn(async () => false) },
}));

const VEHICLE_ID = '018bcfe5-6800-7000-8000-000000000001';
const OIL_ID = '018bcfe5-6800-7000-8000-0000000000a1';
const FLUID_ID = '018bcfe5-6800-7000-8000-0000000000a2';
const NOW = new Date(2026, 9, 21, 12);

let db: Db;
let calls: { prefix: string; items: ReminderNotification[] }[];
let result: boolean;
const scheduler: ReminderScheduler = {
  async replaceScheduled(prefix, items) {
    calls.push({ prefix, items });
    return result;
  },
};

const last = () => calls[calls.length - 1].items;
const refresh = (now = NOW) => refreshMaintenanceReminders(db, { scheduler, now });

async function addVehicle(initialKm: number) {
  await db.runAsync(
    `INSERT INTO vehicles (id, name, type, initial_km, created_at, updated_at)
     VALUES (?, 'Gol', 'flex', ?, ?, ?)`,
    VEHICLE_ID,
    initialKm,
    NOW.toISOString(),
    NOW.toISOString(),
  );
}

async function addPlan(
  id: string,
  type: string,
  fields: { intervalKm?: number; intervalMonths?: number; enabled?: number } = {},
) {
  await db.runAsync(
    `INSERT INTO maintenance_plans
       (id, vehicle_id, type, interval_km, interval_months, last_done_km, last_done_at, enabled,
        notify_before_km, notify_before_days, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 40000, ?, ?, 500, 7, ?, ?)`,
    id,
    VEHICLE_ID,
    type,
    fields.intervalKm ?? null,
    fields.intervalMonths ?? null,
    new Date(2026, 0, 12).toISOString(),
    fields.enabled ?? 1,
    NOW.toISOString(),
    NOW.toISOString(),
  );
}

beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
  calls = [];
  result = true;
});

describe('refreshMaintenanceReminders', () => {
  it('km: agenda para o dia em que faltarem 500 km, com o texto do doc', async () => {
    await addVehicle(48600);
    await addPlan(OIL_ID, 'oil', { intervalKm: 10000 });
    await refresh();

    expect(calls[0].prefix).toBe(REMINDER_PREFIX);
    expect(last()).toEqual([
      {
        id: `maintenance:${OIL_ID}`,
        title: 'Tá em Dia',
        body: 'Troca de óleo do Gol em ~500 km',
        // 900 km até o limite de aviso ÷ 30 km/dia = 30 dias.
        fireAt: new Date(2026, 10, 20, 9),
        data: { planId: OIL_ID },
      },
    ]);
  });

  it('tempo: agenda 7 dias antes da data limite', async () => {
    await addVehicle(48600);
    await addPlan(FLUID_ID, 'brake_fluid', { intervalMonths: 12 });
    await refresh();

    expect(last()).toMatchObject([
      { body: 'Fluido de freio do Gol vence em 7 dias', fireAt: new Date(2027, 0, 5, 9) },
    ]);
  });

  it('já dentro do limite: avisa amanhã às 9h e mantém esse aviso nos reagendamentos', async () => {
    await addVehicle(49700);
    await addPlan(OIL_ID, 'oil', { intervalKm: 10000 });

    await refresh();
    expect(last()).toMatchObject([
      { body: 'Troca de óleo do Gol em ~300 km', fireAt: new Date(2026, 9, 22, 9) },
    ]);

    // Reagendar de novo (ex.: abriu o app) não apaga nem muda o aviso que ainda vai chegar.
    await refresh(new Date(2026, 9, 21, 18));
    expect(last()).toMatchObject([{ fireAt: new Date(2026, 9, 22, 9) }]);

    // Depois que chegou, não repete.
    await refresh(new Date(2026, 9, 23, 8));
    expect(last()).toEqual([]);
  });

  it('antes das 9h, o aviso de item já dentro do limite sai hoje às 9h', async () => {
    await addVehicle(49700);
    await addPlan(OIL_ID, 'oil', { intervalKm: 10000 });
    await refresh(new Date(2026, 9, 21, 8));
    expect(last()[0].fireAt).toEqual(new Date(2026, 9, 21, 9));
  });

  it('item vencido: texto de prazo estourado', async () => {
    await addVehicle(50300);
    await addPlan(OIL_ID, 'oil', { intervalKm: 10000 });
    await refresh();
    expect(last()[0].body).toBe('Troca de óleo do Gol passou do prazo');
  });

  it('registrar o serviço de novo muda o ciclo e o item volta a poder avisar', async () => {
    await addVehicle(49700);
    await addPlan(OIL_ID, 'oil', { intervalKm: 10000 });
    await refresh();
    await refresh(new Date(2026, 9, 23, 8));
    expect(last()).toEqual([]);

    // Novo serviço: ciclo novo, 10.000 km pela frente.
    await db.runAsync(
      'UPDATE maintenance_plans SET last_done_km = 49700, last_done_at = ? WHERE id = ?',
      new Date(2026, 9, 23).toISOString(),
      OIL_ID,
    );
    await refresh(new Date(2026, 9, 23, 9));
    expect(last()).toHaveLength(1);
    expect(last()[0].fireAt > new Date(2026, 9, 23, 9)).toBe(true);
  });

  it('sem permissão (agendador devolve false) não marca como avisado: tenta de novo depois', async () => {
    await addVehicle(49700);
    await addPlan(OIL_ID, 'oil', { intervalKm: 10000 });

    result = false;
    await refresh();
    expect(await getSetting(db, `maint_notified:${OIL_ID}`)).toBeNull();

    result = true;
    await refresh(new Date(2026, 9, 22, 12));
    expect(last()).toHaveLength(1);
    expect(await getSetting(db, `maint_notified:${OIL_ID}`)).not.toBeNull();
  });

  it('desativado, só histórico ou sem veículo: nada agendado, e os antigos são cancelados', async () => {
    await refresh();
    expect(last()).toEqual([]);

    await addVehicle(49700);
    await addPlan(OIL_ID, 'oil', { intervalKm: 10000, enabled: 0 });
    await addPlan(FLUID_ID, 'Troca de bateria');
    await refresh();
    expect(last()).toEqual([]);
    expect(calls).toHaveLength(2);
  });

  it('nunca lança erro (nem se o agendador falhar)', async () => {
    await addVehicle(48600);
    await addPlan(OIL_ID, 'oil', { intervalKm: 10000 });
    const broken: ReminderScheduler = {
      replaceScheduled: async () => {
        throw new Error('boom');
      },
    };
    await expect(
      refreshMaintenanceReminders(db, { scheduler: broken, now: NOW }),
    ).resolves.toBeUndefined();
  });
});
