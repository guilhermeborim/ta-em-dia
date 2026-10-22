import type { MaintenancePlan, Vehicle } from '@ta-em-dia/shared';
import { MIGRATIONS, migrate } from '../../../core/db/migrations';
import { createTestDb } from '../../../core/db/testing/testDb';
import { addFuelEntry } from '../../../core/fuel';
import { findActiveVehicle } from '../../../core/vehicle';
import { buildVehicleCards, moveId, moveItem, vehicleStatus } from '../models/vehicleList';
import { loadVehicleList } from '../models/vehicleList.repository';
import { createVehicle, reorderVehicles } from '../models/vehicles.repository';

const TODAY = new Date(2026, 9, 21);
const GOL = '018bcfe5-6800-7000-8000-000000000001';
const CG = '018bcfe5-6800-7000-8000-000000000002';
const UNO = '018bcfe5-6800-7000-8000-000000000003';

const plan = (patch: Partial<MaintenancePlan> = {}): MaintenancePlan => ({
  id: '018bcfe5-6800-7000-8000-0000000000a1',
  vehicleId: GOL,
  type: 'oil',
  intervalKm: 10000,
  lastDoneKm: 40000,
  lastDoneAt: new Date(2026, 8, 1),
  enabled: true,
  ...patch,
});

const status = (plans: MaintenancePlan[], currentKm = 41000) =>
  vehicleStatus({ plans, documents: [], currentKm, dailyKm: 30 }, TODAY);

describe('vehicleStatus', () => {
  it('sem lembretes ativos com intervalo, sem selo', () => {
    expect(status([])).toBeUndefined();
    expect(status([plan({ enabled: false })])).toBeUndefined();
    expect(status([plan({ intervalKm: undefined })])).toBeUndefined();
  });

  it('tudo em dia', () => {
    expect(status([plan()])).toEqual({ tone: 'ok', label: 'Tudo em dia' });
  });

  it('perto de vencer', () => {
    expect(status([plan()], 48500)).toEqual({ tone: 'warning', label: '1 perto de vencer' });
  });

  it('vencido tem prioridade e conta no plural', () => {
    const overdue = [plan(), plan({ id: '018bcfe5-6800-7000-8000-0000000000a2', type: 'brakes' })];
    expect(status(overdue.slice(0, 1), 51000)).toEqual({ tone: 'danger', label: '1 vencido' });
    expect(status(overdue, 51000)).toEqual({ tone: 'danger', label: '2 vencidos' });
  });
});

describe('vehicleStatus: documentos', () => {
  const document = (dueDate: string) => ({
    id: dueDate,
    vehicleId: GOL,
    kind: 'ipva' as const,
    dueDate,
    notifyDays: [30, 7],
  });
  const withDocs = (documents: ReturnType<typeof document>[], plans: MaintenancePlan[] = []) =>
    vehicleStatus({ plans, documents, currentKm: 41000, dailyKm: 30 }, TODAY);

  it('só prazos: vencido, perto e em dia', () => {
    expect(withDocs([document('2026-10-15')])).toEqual({ tone: 'danger', label: '1 vencido' });
    expect(withDocs([document('2026-11-13')])).toEqual({
      tone: 'warning',
      label: '1 perto de vencer',
    });
    expect(withDocs([document('2027-09-30')])).toEqual({ tone: 'ok', label: 'Tudo em dia' });
  });

  it('soma com a manutenção', () => {
    expect(withDocs([document('2026-10-15')], [plan()])).toEqual({
      tone: 'danger',
      label: '1 vencido',
    });
    expect(withDocs([document('2026-10-15'), document('2026-10-01')], [plan()])?.label).toBe(
      '2 vencidos',
    );
  });
});

describe('buildVehicleCards', () => {
  const vehicle = (id: string, patch: Partial<Vehicle> = {}): Vehicle => ({
    id,
    name: 'Golzinho',
    type: 'flex',
    brand: 'VW',
    model: 'Gol 1.0',
    year: 2019,
    initialKm: 48000,
    ...patch,
  });

  it('monta nome, detalhes e se pode subir ou descer', () => {
    const cards = buildVehicleCards(
      [GOL, CG, UNO].map((id) => ({
        vehicle: vehicle(id),
        currentKm: 48910,
        dailyKm: 30,
        plans: [],
        documents: [],
      })),
      TODAY,
    );
    expect(cards[0]).toEqual({
      id: GOL,
      name: 'Golzinho',
      icon: 'car',
      details: 'VW Gol 1.0 · 2019 · 48.910 km',
      status: undefined,
      canMoveUp: false,
      canMoveDown: true,
    });
    expect(cards.map((c) => [c.canMoveUp, c.canMoveDown])).toEqual([
      [false, true],
      [true, true],
      [true, false],
    ]);
  });
});

describe('moveId', () => {
  it('troca com o vizinho', () => {
    expect(moveId(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c']);
    expect(moveId(['a', 'b', 'c'], 'b', 1)).toEqual(['a', 'c', 'b']);
  });

  it('nos limites ou com id desconhecido, não muda', () => {
    expect(moveId(['a', 'b'], 'a', -1)).toEqual(['a', 'b']);
    expect(moveId(['a', 'b'], 'b', 1)).toEqual(['a', 'b']);
    expect(moveId(['a', 'b'], 'x', 1)).toEqual(['a', 'b']);
  });
});

describe('ordem e lista de veículos no SQLite', () => {
  const NOW = new Date('2026-10-21T12:00:00.000Z');
  const base = { type: 'flex' as const, initialKm: 1000 };

  async function setup() {
    const db = createTestDb();
    await migrate(db);
    await createVehicle(db, { ...base, name: 'Gol' }, { id: GOL, now: NOW });
    await createVehicle(db, { ...base, name: 'CG' }, { id: CG, now: NOW });
    await createVehicle(db, { ...base, name: 'Uno' }, { id: UNO, now: NOW });
    return db;
  }

  it('veículo novo vai para o fim da ordem', async () => {
    const db = await setup();
    const list = await loadVehicleList(db);
    expect(list.map((e) => [e.vehicle.name, e.vehicle.sortOrder])).toEqual([
      ['Gol', 0],
      ['CG', 1],
      ['Uno', 2],
    ]);
  });

  it('reordena, grava só o que mudou e enfileira o upsert', async () => {
    const db = await setup();
    await db.runAsync('DELETE FROM outbox');

    await reorderVehicles(db, [GOL, UNO, CG], NOW);

    expect((await loadVehicleList(db)).map((e) => e.vehicle.name)).toEqual(['Gol', 'Uno', 'CG']);
    const outbox = await db.getAllAsync<{ row_id: string; op: string; payload: string }>(
      'SELECT row_id, op, payload FROM outbox ORDER BY id',
    );
    expect(outbox.map((o) => [o.row_id, o.op])).toEqual([
      [UNO, 'upsert'],
      [CG, 'upsert'],
    ]);
    expect(JSON.parse(outbox[0].payload)).toMatchObject({ id: UNO, sortOrder: 1 });
  });

  it('o primeiro da ordem é o veículo ativo', async () => {
    const db = await setup();
    await reorderVehicles(db, [CG, GOL, UNO], NOW);
    expect((await findActiveVehicle(db))?.id).toBe(CG);
  });

  it('veículos antigos (sem ordem gravada) seguem a ordem de criação', async () => {
    const db = createTestDb();
    // As 4 primeiras migrations: antes da ordem dos veículos (sort_order).
    await migrate(db, MIGRATIONS.slice(0, 4));
    const insert = (id: string, createdAt: string) =>
      db.runAsync(
        `INSERT INTO vehicles (id, name, type, initial_km, created_at, updated_at)
         VALUES (?, 'V', 'flex', 0, ?, ?)`,
        id,
        createdAt,
        createdAt,
      );
    await insert(CG, '2026-02-01T00:00:00.000Z');
    await insert(GOL, '2026-01-01T00:00:00.000Z');
    await migrate(db);

    const rows = await db.getAllAsync<{ id: string; sort_order: number }>(
      'SELECT id, sort_order FROM vehicles ORDER BY sort_order',
    );
    expect(rows).toEqual([
      { id: GOL, sort_order: 0 },
      { id: CG, sort_order: 1 },
    ]);
  });

  it('traz km atual e lembretes de cada veículo', async () => {
    const db = await setup();
    await addFuelEntry(db, {
      vehicleId: CG,
      date: new Date(2026, 9, 10),
      km: 1500,
      fuelType: 'gasoline',
      liters: 10,
      pricePerLiter: 6,
      total: 60,
      fullTank: true,
    });
    const list = await loadVehicleList(db);
    expect(list.map((e) => e.currentKm)).toEqual([1000, 1500, 1000]);
    expect(list[0].plans).toEqual([]);
  });
});

describe('moveItem', () => {
  it('leva o item de uma posição para outra', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
    expect(moveItem(['a', 'b', 'c'], 1, 2)).toEqual(['a', 'c', 'b']);
  });

  it('fora dos limites ou no mesmo lugar, não muda', () => {
    const list = ['a', 'b'];
    expect(moveItem(list, 0, 0)).toBe(list);
    expect(moveItem(list, 0, 2)).toBe(list);
    expect(moveItem(list, -1, 1)).toBe(list);
  });
});
