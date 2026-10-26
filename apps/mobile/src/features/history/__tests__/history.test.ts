import type { FuelEntry, MaintenanceRecord } from '@ta-em-dia/shared';
import { migrate } from '../../../core/db/migrations';
import { createTestDb } from '../../../core/db/testing/testDb';
import { addFuelDraft, addFuelEntry } from '../../../core/fuel';
import { buildTimeline, type HistoryData } from '../models/history';
import { loadHistory } from '../models/history.repository';

const VEHICLE_ID = '018bcfe5-6800-7000-8000-000000000001';
const TODAY = new Date(2026, 9, 21);

let n = 0;
const id = () => `018bcfe5-6800-7000-8000-${String(++n).padStart(12, '0')}`;

const fuel = (patch: Partial<FuelEntry> & Pick<FuelEntry, 'date' | 'km'>): FuelEntry => ({
  id: id(),
  vehicleId: VEHICLE_ID,
  fuelType: 'gasoline',
  liters: 40,
  pricePerLiter: 6,
  total: 240,
  fullTank: true,
  ...patch,
});

const service = (
  patch: Partial<MaintenanceRecord> & Pick<MaintenanceRecord, 'date' | 'km'>,
): MaintenanceRecord => ({ id: id(), vehicleId: VEHICLE_ID, type: 'oil', ...patch });

// Do mais recente ao mais antigo, como os repositórios devolvem.
const data: HistoryData = {
  entries: [
    fuel({ date: new Date(2026, 9, 18), km: 10800, liters: 38.25, total: 229.1 }),
    fuel({ date: new Date(2026, 9, 9), km: 10400, liters: 30, total: 182.7, fullTank: false }),
    fuel({ date: new Date(2026, 8, 24), km: 10000, liters: 35, total: 210.3 }),
    fuel({ date: new Date(2025, 11, 30), km: 9000, liters: 30, total: 150 }),
  ],
  records: [
    service({
      date: new Date(2026, 9, 12),
      km: 10600,
      cost: 289,
      shop: 'Auto Center do Zé',
    }),
    service({ date: new Date(2026, 8, 5), km: 9800, type: 'alignment' }),
  ],
};

const all = (sections: ReturnType<typeof buildTimeline>) => sections.flatMap((s) => s.items);

describe('buildTimeline', () => {
  it('mistura abastecimentos e manutenções por mês, do mais recente ao mais antigo', () => {
    const sections = buildTimeline(data, 'all', 'all', TODAY);
    expect(sections.map((s) => s.title)).toEqual([
      'Outubro 2026',
      'Setembro 2026',
      'Dezembro 2025',
    ]);
    expect(sections[0].items.map((i) => [i.kind, i.id])).toEqual([
      ['fuel', data.entries[0].id],
      ['maintenance', data.records[0].id],
      ['fuel', data.entries[1].id],
    ]);
    expect(sections[1].items.map((i) => i.kind)).toEqual(['fuel', 'maintenance']);
  });

  it('formata abastecimento com litros e km/l do trecho', () => {
    const [october] = buildTimeline(data, 'all', 'all', TODAY);
    // Tanque cheio de 10000 a 10800 (800 km) com 30 + 38,25 L.
    expect(october.items[0]).toMatchObject({
      title: 'Abastecimento',
      details: '18 out · 38,25 L · 11,7 km/l',
      value: 'R$ 229,10',
    });
    // Parcial: sem km/l.
    expect(october.items[2].details).toBe('09 out · 30,0 L');
  });

  it('formata a manutenção com a oficina, ou o km, e o custo quando existe', () => {
    const sections = buildTimeline(data, 'all', 'all', TODAY);
    expect(sections[0].items[1]).toMatchObject({
      title: 'Troca de óleo',
      details: '12 out · Auto Center do Zé',
      value: 'R$ 289,00',
    });
    expect(sections[1].items[1].details).toBe('05 set · 9.800 km');
    expect(sections[1].items[1].value).toBeUndefined();
  });

  it('filtra por tipo sem perder o km/l do trecho', () => {
    const fuelOnly = all(buildTimeline(data, 'fuel', 'all', TODAY));
    expect(fuelOnly).toHaveLength(4);
    expect(fuelOnly[0].details).toContain('11,7 km/l');

    const maintenanceOnly = all(buildTimeline(data, 'maintenance', 'all', TODAY));
    expect(maintenanceOnly.map((i) => i.kind)).toEqual(['maintenance', 'maintenance']);
  });

  it('filtra por período: mês, 3 meses e ano', () => {
    expect(all(buildTimeline(data, 'all', 'month', TODAY))).toHaveLength(3);
    // Agosto, setembro e outubro.
    expect(all(buildTimeline(data, 'all', '3months', TODAY))).toHaveLength(5);
    // O abastecimento de dezembro de 2025 sai.
    expect(all(buildTimeline(data, 'all', 'year', TODAY))).toHaveLength(5);
    expect(all(buildTimeline(data, 'all', 'all', TODAY))).toHaveLength(6);
  });

  it('o período de 3 meses atravessa a virada do ano', () => {
    const january = new Date(2026, 0, 15);
    const items = all(buildTimeline(data, 'all', '3months', january));
    // Novembro de 2025 em diante: só o abastecimento de 30/12/2025 (os outros são futuros).
    expect(items.map((i) => i.id)).toContain(data.entries[3].id);
  });

  it('no mesmo dia, o de maior km vem primeiro', () => {
    const sameDay: HistoryData = {
      entries: [fuel({ date: new Date(2026, 9, 12, 8), km: 10500 })],
      records: [service({ date: new Date(2026, 9, 12, 12), km: 10600 })],
    };
    expect(all(buildTimeline(sameDay, 'all', 'all', TODAY)).map((i) => i.kind)).toEqual([
      'maintenance',
      'fuel',
    ]);
  });

  it('sem dados ou sem itens no filtro, sem seções', () => {
    expect(buildTimeline({ entries: [], records: [] }, 'all', 'all', TODAY)).toEqual([]);
    expect(
      buildTimeline({ entries: data.entries, records: [] }, 'maintenance', 'all', TODAY),
    ).toEqual([]);
  });
});

describe('loadHistory', () => {
  it('sem veículo, volta vazio', async () => {
    const db = createTestDb();
    await migrate(db);
    expect(await loadHistory(db)).toEqual({
      vehicle: null,
      entries: [],
      drafts: [],
      records: [],
    });
  });

  it('traz abastecimentos e serviços do veículo, sem os excluídos', async () => {
    const db = createTestDb();
    await migrate(db);
    const now = '2026-10-01T12:00:00.000Z';
    await db.runAsync(
      `INSERT INTO vehicles (id, name, type, initial_km, created_at, updated_at)
       VALUES (?, 'Gol', 'flex', 9000, ?, ?)`,
      VEHICLE_ID,
      now,
      now,
    );
    await addFuelEntry(db, data.entries[2], { id: data.entries[2].id });
    await addFuelEntry(db, data.entries[0], { id: data.entries[0].id });
    const insertRecord = (record: MaintenanceRecord, deletedAt: string | null) =>
      db.runAsync(
        `INSERT INTO maintenance_records
           (id, vehicle_id, type, date, km, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        record.id,
        VEHICLE_ID,
        record.type,
        record.date.toISOString(),
        record.km,
        now,
        now,
        deletedAt,
      );
    await insertRecord(data.records[0], null);
    await insertRecord(data.records[1], now);

    const loaded = await loadHistory(db);
    expect(loaded.vehicle).toEqual({ id: VEHICLE_ID, name: 'Gol' });
    expect(loaded.entries.map((e) => e.id)).toEqual([data.entries[0].id, data.entries[2].id]);
    expect(loaded.records.map((r) => r.id)).toEqual([data.records[0].id]);
  });
});

describe('rascunhos no histórico', () => {
  const draft = {
    id: '018bcfe5-6800-7000-8000-0000000000d1',
    vehicleId: VEHICLE_ID,
    status: 'draft' as const,
    date: new Date(2026, 9, 15),
    liters: 25,
  };

  it('aparece como abastecimento "Incompleto", na ordem da data, sem valor quando falta', () => {
    const sections = buildTimeline({ ...data, drafts: [draft] }, 'all', 'all', TODAY);
    const items = sections[0]!.items;
    expect(items.map((item) => item.id)).toContain(draft.id);
    expect(items.find((item) => item.id === draft.id)).toEqual({
      id: draft.id,
      kind: 'fuel',
      title: 'Abastecimento',
      details: '15 out · 25,0 L',
      value: undefined,
      incomplete: true,
    });
    // Os outros itens não ganham a marca.
    expect(items.filter((item) => item.incomplete)).toHaveLength(1);
  });

  it('segue o filtro: some em Manutenções e aparece em Abastecimentos', () => {
    const withDraft = { ...data, drafts: [draft] };
    const ids = (filter: 'fuel' | 'maintenance') =>
      buildTimeline(withDraft, filter, 'all', TODAY).flatMap((s) => s.items.map((i) => i.id));
    expect(ids('maintenance')).not.toContain(draft.id);
    expect(ids('fuel')).toContain(draft.id);
  });

  it('o repositório do histórico devolve os rascunhos', async () => {
    const db = createTestDb();
    await migrate(db);
    await db.runAsync(
      `INSERT INTO vehicles (id, name, type, initial_km, created_at, updated_at)
       VALUES (?, 'Gol', 'flex', 0, ?, ?)`,
      VEHICLE_ID,
      TODAY.toISOString(),
      TODAY.toISOString(),
    );
    const saved = await addFuelDraft(db, { vehicleId: VEHICLE_ID, date: TODAY });
    expect((await loadHistory(db)).drafts).toEqual([saved]);
  });
});
