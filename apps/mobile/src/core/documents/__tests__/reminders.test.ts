import { migrate } from '../../db/migrations';
import { createTestDb } from '../../db/testing/testDb';
import type { Db } from '../../db';
import type { ReminderNotification, ReminderScheduler } from '../../notifications';
import { addDocument } from '../documents.repository';
import { countDocuments } from '../summary';
import { DOCUMENT_REMINDER_PREFIX, refreshDocumentReminders } from '../reminders';

// Sem o módulo nativo: o agendador de verdade nunca roda nestes testes.
jest.mock('../../notifications', () => ({
  reminderScheduler: { replaceScheduled: jest.fn(async () => false) },
}));

const VEHICLE_ID = '018bcfe5-6800-7000-8000-000000000001';
const NOW = new Date(2026, 9, 21, 12);

let db: Db;
let calls: { prefix: string; items: ReminderNotification[] }[];
const scheduler: ReminderScheduler = {
  async replaceScheduled(prefix, items) {
    calls.push({ prefix, items });
    return true;
  },
};
const last = () => calls[calls.length - 1].items;
const refresh = (now = NOW) => refreshDocumentReminders(db, { scheduler, now });

beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
  calls = [];
});

async function addVehicle(name = 'Gol') {
  await db.runAsync(
    `INSERT INTO vehicles (id, name, type, initial_km, created_at, updated_at)
     VALUES (?, ?, 'flex', 0, ?, ?)`,
    VEHICLE_ID,
    name,
    NOW.toISOString(),
    NOW.toISOString(),
  );
}

describe('refreshDocumentReminders', () => {
  it('agenda um aviso por dia de antecedência, às 9h, com o texto do tipo', async () => {
    await addVehicle();
    const ipva = await addDocument(db, {
      vehicleId: VEHICLE_ID,
      kind: 'ipva',
      dueDate: '2026-12-20',
    });
    const cnh = await addDocument(db, { kind: 'cnh', dueDate: '2026-12-05', notifyDays: [7] });
    await refresh();

    expect(calls[0].prefix).toBe(DOCUMENT_REMINDER_PREFIX);
    expect(last().map((i) => [i.id, i.body, i.fireAt])).toEqual(
      [
        [`document:${cnh.id}:7`, 'Sua CNH vence em 7 dias', new Date(2026, 10, 28, 9)],
        [`document:${ipva.id}:30`, 'IPVA do Gol vence em 30 dias', new Date(2026, 10, 20, 9)],
        [`document:${ipva.id}:7`, 'IPVA do Gol vence em 7 dias', new Date(2026, 11, 13, 9)],
      ].sort((a, b) => (a[2] as Date).getTime() - (b[2] as Date).getTime()),
    );
    expect(last()[1].data).toEqual({ documentId: cnh.id });
    expect(last()[0].title).toBe('Tá em Dia');
  });

  it('só agenda o que ainda está no futuro; vencido não avisa', async () => {
    await addVehicle();
    await addDocument(db, { vehicleId: VEHICLE_ID, kind: 'ipva', dueDate: '2026-11-13' });
    await addDocument(db, { vehicleId: VEHICLE_ID, kind: 'insurance', dueDate: '2026-10-01' });
    await refresh();

    expect(last().map((i) => i.body)).toEqual(['IPVA do Gol vence em 7 dias']);
  });

  it('prazo sem avisos marcados não agenda nada, mas troca os antigos (lista vazia)', async () => {
    await addVehicle();
    await addDocument(db, {
      vehicleId: VEHICLE_ID,
      kind: 'ipva',
      dueDate: '2026-12-20',
      notifyDays: [],
    });
    await refresh();
    expect(last()).toEqual([]);
    expect(calls).toHaveLength(1);
  });

  it('só avisa do veículo ativo e da CNH; sem veículo, só a CNH', async () => {
    await addVehicle();
    await addDocument(db, { vehicleId: VEHICLE_ID, kind: 'licensing', dueDate: '2026-12-20' });
    await db.runAsync('UPDATE vehicles SET archived = 1');
    await addDocument(db, { kind: 'cnh', dueDate: '2026-12-20' });
    await refresh();
    expect(last().map((i) => i.body)).toEqual([
      'Sua CNH vence em 30 dias',
      'Sua CNH vence em 7 dias',
    ]);
  });

  it('nunca lança erro (nem se o agendador falhar)', async () => {
    await addVehicle();
    await addDocument(db, { vehicleId: VEHICLE_ID, kind: 'ipva', dueDate: '2026-12-20' });
    const broken: ReminderScheduler = {
      replaceScheduled: async () => {
        throw new Error('boom');
      },
    };
    await expect(
      refreshDocumentReminders(db, { scheduler: broken, now: NOW }),
    ).resolves.toBeUndefined();
  });
});

describe('countDocuments', () => {
  const doc = (dueDate: string, notifyDays = [30, 7]) => ({
    id: dueDate,
    kind: 'ipva' as const,
    dueDate,
    notifyDays,
  });

  it('conta vencidos e perto de vencer', () => {
    expect(
      countDocuments(
        [doc('2026-10-15'), doc('2026-11-13'), doc('2026-11-20'), doc('2027-09-30')],
        NOW,
      ),
    ).toEqual({ overdue: 1, soon: 2 });
    expect(countDocuments([], NOW)).toEqual({ overdue: 0, soon: 0 });
  });
});
