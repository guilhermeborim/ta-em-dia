import { migrate } from '../../db/migrations';
import { createTestDb } from '../../db/testing/testDb';
import type { Db } from '../../db';
import type { ReminderNotification, ReminderScheduler } from '../../notifications';
import {
  addFuelDraft,
  addFuelEntry,
  deleteFuelEntry,
  updateFuelRecord,
} from '../fuelEntries.repository';
import { FUEL_DRAFT_REMINDER_PREFIX, refreshFuelDraftReminders } from '../reminders';

// Sem o módulo nativo: o agendador de verdade nunca roda nestes testes.
jest.mock('../../notifications', () => ({
  reminderScheduler: { replaceScheduled: jest.fn(async () => false) },
}));

const GOL = '018bcfe5-6800-7000-8000-000000000001';
const MOTO = '018bcfe5-6800-7000-8000-000000000002';
const CREATED = new Date(2026, 9, 26, 14, 30);
const NOW = new Date(2026, 9, 26, 15);

let db: Db;
let calls: { prefix: string; items: ReminderNotification[] }[];
const scheduler: ReminderScheduler = {
  async replaceScheduled(prefix, items) {
    calls.push({ prefix, items });
    return true;
  },
};
const last = () => calls[calls.length - 1]!.items;
const refresh = (now: Date = NOW) => refreshFuelDraftReminders(db, { scheduler, now });

beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
  calls = [];
  for (const [id, name, archived] of [
    [GOL, 'Gol', 0],
    [MOTO, 'CG', 1],
  ] as const) {
    await db.runAsync(
      `INSERT INTO vehicles (id, name, type, initial_km, archived, created_at, updated_at)
       VALUES (?, ?, 'flex', 0, ?, ?, ?)`,
      id,
      name,
      archived,
      CREATED.toISOString(),
      CREATED.toISOString(),
    );
  }
});

const draft = (patch = {}, vehicleId = GOL) =>
  addFuelDraft(
    db,
    { vehicleId, date: CREATED, stationName: 'Shell', total: 150, liters: 25, ...patch },
    { now: CREATED },
  );

describe('refreshFuelDraftReminders', () => {
  it('sem rascunho, troca os avisos por nenhum', async () => {
    await refresh();
    expect(calls).toEqual([{ prefix: FUEL_DRAFT_REMINDER_PREFIX, items: [] }]);
  });

  it('agenda às 20h do dia e às 20h do dia seguinte, abrindo o rascunho', async () => {
    const saved = await draft({ fuelType: 'gasoline', fullTank: true });
    await refresh();

    expect(last()).toEqual([
      {
        id: `fuel-draft:${saved.id}:0`,
        title: 'Tá em Dia',
        body: 'Falta o km do abastecimento de hoje no Shell',
        fireAt: new Date(2026, 9, 26, 20),
        data: { fuelDraftId: saved.id },
      },
      {
        id: `fuel-draft:${saved.id}:1`,
        title: 'Tá em Dia',
        body: 'Falta o km do abastecimento de ontem no Shell',
        fireAt: new Date(2026, 9, 27, 20),
        data: { fuelDraftId: saved.id },
      },
    ]);
  });

  it('o texto segue o que falta', async () => {
    await draft({ km: 1000, fuelType: 'gasoline', fullTank: false, stationName: undefined });
    await refresh();
    expect(last()[0]!.body).toBe('Falta o posto do abastecimento de hoje');
  });

  it('depois das 20h do segundo dia, não sobra aviso', async () => {
    await draft();
    await refresh(new Date(2026, 9, 27, 20, 5));
    expect(last()).toEqual([]);
  });

  it('completar o rascunho tira os avisos', async () => {
    const saved = await draft({ fuelType: 'gasoline', fullTank: true });
    await refresh();
    expect(last()).toHaveLength(2);

    await updateFuelRecord(db, {
      id: saved.id,
      vehicleId: GOL,
      date: CREATED,
      km: 1200,
      fuelType: 'gasoline',
      liters: 25,
      pricePerLiter: 6,
      total: 150,
      fullTank: true,
      stationName: 'Shell',
    });
    await refresh();
    expect(last()).toEqual([]);
  });

  it('excluir o rascunho tira os avisos', async () => {
    const saved = await draft();
    await deleteFuelEntry(db, saved.id);
    await refresh();
    expect(last()).toEqual([]);
  });

  it('abastecimento completo e veículo arquivado não geram aviso', async () => {
    await addFuelEntry(db, {
      vehicleId: GOL,
      date: CREATED,
      km: 1000,
      fuelType: 'gasoline',
      liters: 40,
      pricePerLiter: 6,
      total: 240,
      fullTank: true,
      stationName: 'Shell',
    });
    await draft({}, MOTO);
    await refresh();
    expect(last()).toEqual([]);
  });

  it('o prazo conta do dia em que o rascunho foi criado, não da data do abastecimento', async () => {
    await addFuelDraft(
      db,
      { vehicleId: GOL, date: new Date(2026, 9, 1), stationName: 'Shell' },
      { now: CREATED },
    );
    await refresh();
    expect(last().map((item) => item.fireAt)).toEqual([
      new Date(2026, 9, 26, 20),
      new Date(2026, 9, 27, 20),
    ]);
  });

  it('nunca lança erro, nem com o agendador quebrado', async () => {
    await draft();
    const broken: ReminderScheduler = {
      async replaceScheduled() {
        throw new Error('falhou');
      },
    };
    await expect(
      refreshFuelDraftReminders(db, { scheduler: broken, now: NOW }),
    ).resolves.toBeUndefined();
  });
});
