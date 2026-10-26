import type { FuelDraft } from '@ta-em-dia/shared';
import { migrate } from '../../db/migrations';
import { createTestDb } from '../../db/testing/testDb';
import type { Db } from '../../db';
import { lastKmUpdateAt } from '../../odometer/lastUpdate';
import {
  addFuelDraft,
  addFuelEntry,
  deleteFuelEntry,
  getFuelRecord,
  listFuelDrafts,
  listFuelEntries,
  listStationNames,
  updateFuelRecord,
} from '..';

const VEHICLE_ID = '018bcfe5-6800-7000-8000-000000000001';
const DRAFT_ID = '018bcfe5-6800-7000-8000-0000000000d1';
const T0 = new Date('2026-10-20T10:00:00.000Z');
const minutes = (n: number) => new Date(T0.getTime() + n * 60_000);

let db: Db;

beforeEach(async () => {
  db = createTestDb();
  await migrate(db);
  await db.runAsync(
    `INSERT INTO vehicles (id, name, type, initial_km, created_at, updated_at)
     VALUES (?, 'Gol', 'flex', 1000, ?, ?)`,
    VEHICLE_ID,
    T0.toISOString(),
    T0.toISOString(),
  );
});

const complete = (km: number, date: Date) => ({
  vehicleId: VEHICLE_ID,
  date,
  km,
  fuelType: 'gasoline' as const,
  liters: 40,
  pricePerLiter: 6,
  total: 240,
  fullTank: true,
  stationName: 'Shell',
});

const outbox = async () =>
  (
    await db.getAllAsync<{ row_id: string; op: string; payload: string }>(
      'SELECT row_id, op, payload FROM outbox ORDER BY id',
    )
  ).map((row) => ({ ...row, payload: JSON.parse(row.payload) as Record<string, unknown> }));

describe('rascunho de abastecimento', () => {
  it('grava só o que se sabe e enfileira com status draft', async () => {
    const draft = await addFuelDraft(
      db,
      { vehicleId: VEHICLE_ID, date: minutes(1), stationName: 'Shell', total: 150 },
      { id: DRAFT_ID, now: minutes(1) },
    );

    expect(draft).toMatchObject({
      id: DRAFT_ID,
      status: 'draft',
      stationName: 'Shell',
      total: 150,
    });
    expect(await listFuelDrafts(db, VEHICLE_ID)).toEqual([draft]);
    expect(await getFuelRecord(db, DRAFT_ID)).toEqual(draft);

    const [change] = await outbox();
    expect(change).toMatchObject({ row_id: DRAFT_ID, op: 'upsert' });
    expect(change.payload).toMatchObject({ status: 'draft', stationName: 'Shell', total: 150 });
    expect(change.payload).not.toHaveProperty('km');
  });

  it('guarda "tanque cheio: não" e "sem informação" de forma diferente', async () => {
    await addFuelDraft(db, { vehicleId: VEHICLE_ID, date: minutes(1), fullTank: false });
    await addFuelDraft(db, { vehicleId: VEHICLE_ID, date: minutes(2) });
    const [, informed, unknown] = [
      null,
      ...(await listFuelDrafts(db, VEHICLE_ID)).sort((a, b) => a.date.getTime() - b.date.getTime()),
    ];
    expect(informed?.fullTank).toBe(false);
    expect(unknown?.fullTank).toBeUndefined();
  });

  it('fica fora das listas e das contas do abastecimento completo', async () => {
    await addFuelEntry(db, complete(1200, minutes(1)));
    await addFuelDraft(db, {
      vehicleId: VEHICLE_ID,
      date: minutes(2),
      km: 9999,
      liters: 500,
      total: 1,
    });

    const entries = await listFuelEntries(db, VEHICLE_ID);
    expect(entries.map((entry) => entry.km)).toEqual([1200]);
    expect(await listFuelDrafts(db, VEHICLE_ID)).toHaveLength(1);
    // O rascunho também não conta como atualização do km do veículo.
    expect(await lastKmUpdateAt(db, VEHICLE_ID)).toEqual(minutes(1));
  });

  it('o posto do rascunho entra nas sugestões de posto', async () => {
    await addFuelDraft(db, { vehicleId: VEHICLE_ID, date: minutes(1), stationName: 'Ipiranga' });
    expect(await listStationNames(db)).toEqual(['Ipiranga']);
  });

  it('completar troca o rascunho pelo abastecimento completo (mesmo id) e enfileira sem status', async () => {
    const draft = await addFuelDraft(
      db,
      { vehicleId: VEHICLE_ID, date: minutes(1), stationName: 'Shell', total: 240 },
      { id: DRAFT_ID, now: minutes(1) },
    );

    const saved = await updateFuelRecord(
      db,
      { ...complete(1300, draft.date), id: DRAFT_ID },
      minutes(5),
    );

    expect(saved).toBe(true);
    expect(await listFuelDrafts(db, VEHICLE_ID)).toEqual([]);
    const [entry] = await listFuelEntries(db, VEHICLE_ID);
    expect(entry).toMatchObject({ id: DRAFT_ID, km: 1300, total: 240, fullTank: true });
    expect(await getFuelRecord(db, DRAFT_ID)).not.toHaveProperty('status');

    const changes = await outbox();
    expect(changes).toHaveLength(2);
    expect(changes[1]!.payload).toMatchObject({ id: DRAFT_ID, km: 1300 });
    expect(changes[1]!.payload).not.toHaveProperty('status');
  });

  it('atualizar um rascunho com mais dados continua rascunho', async () => {
    const draft = await addFuelDraft(db, { vehicleId: VEHICLE_ID, date: minutes(1) });
    const next: FuelDraft = { ...draft, km: 1500, stationName: 'BR' };
    expect(await updateFuelRecord(db, next, minutes(2))).toBe(true);
    expect(await getFuelRecord(db, draft.id)).toMatchObject({
      status: 'draft',
      km: 1500,
      stationName: 'BR',
    });
  });

  it('rascunho excluído não volta nem é atualizado', async () => {
    const draft = await addFuelDraft(db, { vehicleId: VEHICLE_ID, date: minutes(1) });
    await deleteFuelEntry(db, draft.id, minutes(2));

    expect(await listFuelDrafts(db, VEHICLE_ID)).toEqual([]);
    expect(await getFuelRecord(db, draft.id)).toBeNull();
    expect(await updateFuelRecord(db, { ...draft, km: 1 }, minutes(3))).toBe(false);
    expect((await outbox()).map((change) => change.op)).toEqual(['upsert', 'delete']);
  });

  it('abastecimento completo antigo continua completo depois da migration', async () => {
    const entry = await addFuelEntry(db, complete(1200, minutes(1)));
    expect(await getFuelRecord(db, entry.id)).toEqual(entry);
    const row = await db.getFirstAsync<{ status: string }>(
      'SELECT status FROM fuel_entries WHERE id = ?',
      entry.id,
    );
    expect(row?.status).toBe('complete');
  });
});
