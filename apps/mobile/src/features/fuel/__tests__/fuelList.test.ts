import type { FuelEntry } from '@ta-em-dia/shared';
import { migrate } from '../../../core/db/migrations';
import { createTestDb } from '../../../core/db/testing/testDb';
import { addFuelDraft, addFuelEntry, buildAverage } from '../../../core/fuel';
import { buildFilterChips, buildSections } from '../models/fuelList';
import { loadFuelList } from '../models/fuelList.repository';

const VEHICLE_ID = '018bcfe5-6800-7000-8000-000000000001';
const TODAY = new Date(2026, 9, 21);

let n = 0;
const entry = (patch: Partial<FuelEntry> & Pick<FuelEntry, 'date' | 'km'>): FuelEntry => ({
  id: `018bcfe5-6800-7000-8000-${String(++n).padStart(12, '0')}`,
  vehicleId: VEHICLE_ID,
  fuelType: 'gasoline',
  liters: 40,
  pricePerLiter: 6,
  total: 240,
  fullTank: true,
  ...patch,
});

// Do mais recente ao mais antigo, como o repositório devolve.
const entries: FuelEntry[] = [
  entry({
    date: new Date(2026, 9, 18),
    km: 10800,
    liters: 38.25,
    total: 229.1,
    stationName: 'Posto Ipiranga',
  }),
  entry({
    date: new Date(2026, 9, 9),
    km: 10400,
    liters: 30,
    total: 182.7,
    fuelType: 'ethanol',
    fullTank: false,
  }),
  entry({ date: new Date(2026, 8, 24), km: 10000, liters: 35, total: 210.3 }),
  entry({ date: new Date(2025, 11, 30), km: 9000, liters: 30, total: 150 }),
];

describe('buildFilterChips', () => {
  it('mostra Tudo, só os combustíveis usados e Só tanque cheio', () => {
    expect(buildFilterChips(entries)).toEqual([
      { filter: 'all', label: 'Tudo' },
      { filter: 'gasoline', label: 'Gasolina' },
      { filter: 'ethanol', label: 'Etanol' },
      { filter: 'full', label: 'Só tanque cheio' },
    ]);
  });
});

describe('buildSections', () => {
  it('agrupa por mês, do mais recente ao mais antigo, com total do mês', () => {
    const sections = buildSections(entries, 'all', TODAY);
    expect(sections.map((s) => [s.title, s.summary])).toEqual([
      ['Outubro', '2 abast. · R$ 411,80'],
      ['Setembro', '1 abast. · R$ 210,30'],
      ['Dezembro de 2025', '1 abast. · R$ 150,00'],
    ]);
  });

  it('formata o item e traz o km/l só do trecho calculável', () => {
    const [october] = buildSections(entries, 'all', TODAY);
    // Trecho: tanque cheio de 10000 a 10800 (800 km) com 30 + 38,25 L.
    expect(october.items[0]).toEqual({
      id: entries[0].id,
      title: '18 out · Posto Ipiranga',
      details: '38,25 L · Gasolina · cheio',
      total: 'R$ 229,10',
      kmPerLiter: '11,7 km/l',
    });
    // Parcial e sem posto: sem km/l.
    expect(october.items[1]).toMatchObject({
      title: '09 out',
      details: '30,0 L · Etanol · parcial',
    });
    expect(october.items[1].kmPerLiter).toBeUndefined();
  });

  it('filtra por combustível sem perder o km/l do trecho', () => {
    const sections = buildSections(entries, 'gasoline', TODAY);
    expect(sections.flatMap((s) => s.items).length).toBe(3);
    expect(sections[0].items[0].kmPerLiter).toBe('11,7 km/l');
  });

  it('filtra só tanque cheio', () => {
    const items = buildSections(entries, 'full', TODAY).flatMap((s) => s.items);
    expect(items.map((i) => i.details.endsWith('cheio'))).toEqual([true, true, true]);
  });

  it('sem abastecimentos, sem seções', () => {
    expect(buildSections([], 'all', TODAY)).toEqual([]);
  });
});

describe('buildAverage', () => {
  it('traz a média do período com a conta e a média exata', () => {
    expect(buildAverage(entries)).toEqual({
      periodAverage: '17,4',
      periodCalc: '1.800 km ÷ 103,3 L',
      exactAverage: '11,7',
    });
  });

  it('com um abastecimento só, pede mais um (sem médias)', () => {
    expect(buildAverage(entries.slice(0, 1))).toEqual({});
  });

  it('sem dois tanques cheios, não mostra a média exata', () => {
    const partial = entries.map((e) => ({ ...e, fullTank: false }));
    expect(buildAverage(partial).exactAverage).toBeUndefined();
    expect(buildAverage(partial).periodAverage).toBeDefined();
  });
});

describe('loadFuelList', () => {
  it('sem veículo, volta vazio', async () => {
    const db = createTestDb();
    await migrate(db);
    expect(await loadFuelList(db)).toEqual({ vehicle: null, entries: [], drafts: [] });
  });

  it('traz o veículo e os abastecimentos do mais recente ao mais antigo', async () => {
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
    await addFuelEntry(db, entries[2]);
    await addFuelEntry(db, entries[0]);

    const list = await loadFuelList(db);
    expect(list.vehicle).toEqual({ id: VEHICLE_ID, name: 'Gol' });
    expect(list.entries.map((e) => e.km)).toEqual([10800, 10000]);
  });
});

describe('rascunhos na lista', () => {
  const draft = (date: Date, patch = {}) => ({
    id: `018bcfe5-6800-7000-8000-${String(++n).padStart(12, '0')}`,
    vehicleId: VEHICLE_ID,
    status: 'draft' as const,
    date,
    ...patch,
  });

  it('entra na ordem da data, com a etiqueta, e fica fora da contagem e do total', () => {
    const sections = buildSections(entries, 'all', TODAY, [
      draft(new Date(2026, 9, 15), { stationName: 'Shell', liters: 25 }),
    ]);
    const october = sections[0]!;
    expect(october.items.map((item) => item.incomplete ?? false)).toEqual([false, true, false]);
    expect(october.items[1]).toMatchObject({
      title: '15 out · Shell',
      details: '25,0 L',
      total: '—',
      incomplete: true,
    });
    expect(october.summary).toBe('2 abast. · R$ 411,80 · 1 incompleto');
    expect(october.items[1]!.kmPerLiter).toBeUndefined();
  });

  it('mês só com rascunho mostra só a contagem de incompletos', () => {
    const sections = buildSections([], 'all', TODAY, [
      draft(new Date(2026, 9, 15)),
      draft(new Date(2026, 9, 16)),
    ]);
    expect(sections).toHaveLength(1);
    expect(sections[0]!.summary).toBe('2 incompletos');
    expect(sections[0]!.items[0]!.details).toBe('Faltam dados');
  });

  it('com filtro de combustível ou tanque cheio, o rascunho some', () => {
    const drafts = [draft(new Date(2026, 9, 15), { fuelType: 'ethanol' as const })];
    expect(buildSections(entries, 'ethanol', TODAY, drafts).flatMap((s) => s.items)).toHaveLength(
      1,
    );
    expect(
      buildSections(entries, 'full', TODAY, drafts)
        .flatMap((s) => s.items)
        .some((item) => item.incomplete),
    ).toBe(false);
  });

  it('o repositório da lista devolve os rascunhos do veículo ativo', async () => {
    const db = createTestDb();
    await migrate(db);
    await db.runAsync(
      `INSERT INTO vehicles (id, name, type, initial_km, created_at, updated_at)
       VALUES (?, 'Gol', 'flex', 0, ?, ?)`,
      VEHICLE_ID,
      TODAY.toISOString(),
      TODAY.toISOString(),
    );
    const saved = await addFuelDraft(db, { vehicleId: VEHICLE_ID, date: TODAY, total: 99 });
    const data = await loadFuelList(db);
    expect(data.drafts).toEqual([saved]);
    expect(data.entries).toEqual([]);
  });
});
