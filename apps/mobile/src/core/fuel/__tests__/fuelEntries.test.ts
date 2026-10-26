import { migrate } from '../../db/migrations';
import { createTestDb } from '../../db/testing/testDb';
import type { Db } from '../../db';
import {
  addFuelEntry,
  deleteFuelEntry,
  getFuelRecord,
  listFuelEntries,
  listFuelPriceRows,
  updateFuelRecord,
} from '..';

const VEHICLE_ID = '018bcfe5-6800-7000-8000-000000000001';
const T0 = new Date('2026-10-20T10:00:00.000Z');
const later = new Date(T0.getTime() + 60_000);

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

const input = (km: number) => ({
  vehicleId: VEHICLE_ID,
  date: T0,
  km,
  fuelType: 'gasoline' as const,
  liters: 40,
  pricePerLiter: 6,
  total: 240,
  fullTank: true,
  stationName: 'Shell',
});

const queue = () =>
  db.getAllAsync<{ row_id: string; op: string; payload: string }>(
    'SELECT row_id, op, payload FROM outbox ORDER BY id',
  );

describe('getFuelRecord', () => {
  it('devolve o abastecimento salvo e null para o que não existe', async () => {
    const saved = await addFuelEntry(db, input(1500), { now: T0 });
    expect(await getFuelRecord(db, saved.id)).toEqual(saved);
    expect(await getFuelRecord(db, '018bcfe5-6800-7000-8000-0000000000ff')).toBeNull();
  });
});

describe('updateFuelRecord', () => {
  it('troca os dados do mesmo abastecimento e enfileira o envio', async () => {
    const saved = await addFuelEntry(db, input(1500), { now: T0 });

    expect(
      await updateFuelRecord(
        db,
        { ...saved, km: 1600, liters: 38, stationName: 'Ipiranga' },
        later,
      ),
    ).toBe(true);

    expect(await listFuelEntries(db, VEHICLE_ID)).toHaveLength(1);
    expect(await getFuelRecord(db, saved.id)).toMatchObject({
      km: 1600,
      liters: 38,
      stationName: 'Ipiranga',
    });
    const rows = await queue();
    expect(rows.map((row) => row.op)).toEqual(['upsert', 'upsert']);
    expect(JSON.parse(rows[1]!.payload)).toMatchObject({ id: saved.id, km: 1600 });
  });

  it('abastecimento excluído não é atualizado', async () => {
    const saved = await addFuelEntry(db, input(1500), { now: T0 });
    await deleteFuelEntry(db, saved.id, later);
    expect(await updateFuelRecord(db, { ...saved, km: 1600 })).toBe(false);
    expect(await getFuelRecord(db, saved.id)).toBeNull();
  });

  it('rejeita dado inválido antes de gravar', async () => {
    const saved = await addFuelEntry(db, input(1500), { now: T0 });
    await expect(updateFuelRecord(db, { ...saved, liters: 0 })).rejects.toThrow();
    expect(await getFuelRecord(db, saved.id)).toMatchObject({ liters: 40 });
  });
});

describe('deleteFuelEntry', () => {
  it('exclui de forma lógica: some das listas e vai para o sync', async () => {
    const saved = await addFuelEntry(db, input(1500), { now: T0 });
    await deleteFuelEntry(db, saved.id, later);

    expect(await listFuelEntries(db, VEHICLE_ID)).toEqual([]);
    const row = await db.getFirstAsync<{ deleted_at: string | null }>(
      'SELECT deleted_at FROM fuel_entries WHERE id = ?',
      saved.id,
    );
    expect(row?.deleted_at).toBe(later.toISOString());
    const rows = await queue();
    expect(rows.at(-1)).toMatchObject({ row_id: saved.id, op: 'delete' });
  });
});

describe('posto do abastecimento', () => {
  const station = {
    osmId: 'node/9',
    name: 'Shell',
    street: 'Av. da Pista',
    lat: -23.5,
    lng: -46.6,
  };

  it('cria o posto na mesma transação, antes do abastecimento na fila, e guarda o stationId', async () => {
    const saved = await addFuelEntry(
      db,
      { ...input(1500), stationName: 'Shell · Av. da Pista' },
      { now: T0, station },
    );
    expect(saved.stationId).toEqual(expect.any(String));
    expect((await getFuelRecord(db, saved.id))?.stationId).toBe(saved.stationId);
    const rows = await db.getAllAsync<{ table_name: string; payload: string }>(
      'SELECT table_name, payload FROM outbox ORDER BY id',
    );
    expect(rows.map((r) => r.table_name)).toEqual(['stations', 'fuel_entries']);
    expect(JSON.parse(rows[1]!.payload)).toMatchObject({ stationId: saved.stationId });
  });

  it('sem posto escolhido, fica sem stationId (como antes)', async () => {
    const saved = await addFuelEntry(db, input(1500), { now: T0 });
    expect(saved.stationId).toBeUndefined();
  });

  it('a edição pode trocar o posto', async () => {
    const saved = await addFuelEntry(db, input(1500), { now: T0, station });
    await updateFuelRecord(db, { ...saved, stationName: 'Ipiranga' }, later, { name: 'Ipiranga' });
    const record = await getFuelRecord(db, saved.id);
    expect(record?.stationName).toBe('Ipiranga');
    expect(record?.stationId).not.toBe(saved.stationId);
  });

  it('listFuelPriceRows traz os completos de todos os veículos, sem os excluídos', async () => {
    const a = await addFuelEntry(db, input(1500), { now: T0, station });
    const b = await addFuelEntry(db, input(1600), { now: T0 });
    await deleteFuelEntry(db, b.id, later);
    expect(await listFuelPriceRows(db)).toEqual([
      {
        stationId: a.stationId,
        stationName: 'Shell',
        fuelType: 'gasoline',
        liters: 40,
        total: 240,
      },
    ]);
  });
});
