import type { FuelEntry, MaintenanceRecord } from '@ta-em-dia/shared';
import { migrate } from '../../../core/db/migrations';
import { createTestDb } from '../../../core/db/testing/testDb';
import { addFuelEntry } from '../../../core/fuel';
import { availablePeriods, buildReport, hasReportData, type ReportData } from '../models/reports';
import { loadReportData } from '../models/reports.repository';

const TODAY = new Date(2026, 9, 21);
const VEHICLE_ID = '018bcfe5-6800-7000-8000-000000000001';

let n = 0;
const id = () => `018bcfe5-6800-7000-8000-${String(++n).padStart(12, '0')}`;
const fuel = (
  date: Date,
  km: number,
  liters: number,
  total: number,
  fullTank = true,
): FuelEntry => ({
  id: id(),
  vehicleId: VEHICLE_ID,
  date,
  km,
  fuelType: 'gasoline',
  liters,
  pricePerLiter: total / liters,
  total,
  fullTank,
});
const service = (date: Date, cost?: number): MaintenanceRecord => ({
  id: id(),
  vehicleId: VEHICLE_ID,
  type: 'oil',
  date,
  km: 11000,
  cost,
});

// Do mais recente ao mais antigo, como o repositório devolve.
const data: ReportData = {
  vehicle: { id: VEHICLE_ID, name: 'Gol' },
  entries: [
    fuel(new Date(2026, 9, 18), 11800, 40, 240),
    fuel(new Date(2026, 9, 9), 11400, 30, 180),
    fuel(new Date(2026, 8, 24), 11000, 40, 200),
    fuel(new Date(2026, 8, 2), 10600, 20, 100),
    fuel(new Date(2026, 4, 10), 9000, 40, 220),
  ],
  records: [service(new Date(2026, 9, 12), 289), service(new Date(2026, 8, 5))],
};

describe('buildReport: período e totais', () => {
  it('6 meses: título, total (combustível + manutenção) e variação contra o período anterior', () => {
    const report = buildReport(data, '6months', TODAY);
    expect(report.title).toBe('Total em 6 meses');
    // 240 + 180 + 200 + 100 + 220 (mai) + 289 = 1.229; o período anterior (nov–abr) não tem gasto.
    expect(report.total).toBe('1.229');
    expect(report.variation).toBeUndefined();
  });

  it('mês: total do mês e variação contra o mês anterior', () => {
    const report = buildReport(data, 'month', TODAY);
    expect(report.title).toBe('Total em outubro');
    // Outubro: 240 + 180 + 289 = 709; setembro: 200 + 100 = 300.
    expect(report.total).toBe('709');
    expect(report.variation).toEqual({ label: '+136% vs anterior', tone: 'warning' });
  });

  it('gastou menos: sinal de menos e tom ok', () => {
    const lower: ReportData = {
      ...data,
      entries: [
        fuel(new Date(2026, 9, 18), 11800, 10, 60),
        fuel(new Date(2026, 8, 2), 10600, 40, 240),
      ],
      records: [],
    };
    expect(buildReport(lower, 'month', TODAY).variation).toEqual({
      label: '−75% vs anterior',
      tone: 'ok',
    });
  });

  it('3 meses e ano: a janela cresce e as barras acompanham', () => {
    expect(buildReport(data, '3months', TODAY).title).toBe('Total em 3 meses');
    expect(buildReport(data, '3months', TODAY).bars).toHaveLength(3);
    expect(buildReport(data, 'year', TODAY).bars).toHaveLength(12);
    expect(buildReport(data, 'year', TODAY).total).toBe('1.229');
  });
});

describe('buildReport: barras', () => {
  it('um item por mês, do mais antigo ao atual, com combustível e manutenção', () => {
    const { bars } = buildReport(data, '6months', TODAY);
    expect(bars.map((b) => b.label)).toEqual(['mai', 'jun', 'jul', 'ago', 'set', 'out']);
    expect(bars.map((b) => b.current)).toEqual([false, false, false, false, false, true]);
    expect(bars[5].parts).toEqual([
      { category: 'fuel', value: 420 },
      { category: 'maint', value: 289 },
    ]);
    expect(bars[0].parts[0]).toEqual({ category: 'fuel', value: 220 });
  });

  it('mês: mostra também o anterior (uma barra só não compara nada)', () => {
    expect(buildReport(data, 'month', TODAY).bars.map((b) => b.label)).toEqual(['set', 'out']);
  });
});

describe('buildReport: números do período', () => {
  it('custo por km, km rodados e litros, partindo do abastecimento antes do mês', () => {
    const { stats } = buildReport(data, 'month', TODAY);
    // Outubro: 420 gastos ÷ 800 km (11000 → 11800).
    expect(stats).toEqual([
      { label: 'Custo por km', value: 'R$ 0,53' },
      { label: 'Rodou', value: '800 km' },
      { label: 'Litros', value: '70 L' },
    ]);
  });

  it('sem distância, custo por km e km rodados ficam "—"', () => {
    const one: ReportData = {
      ...data,
      entries: [fuel(new Date(2026, 9, 18), 11800, 40, 240)],
      records: [],
    };
    expect(
      buildReport(one, 'month', TODAY)
        .stats.slice(0, 2)
        .map((s) => s.value),
    ).toEqual(['—', '—']);
  });

  it('o cartão de consumo usa os abastecimentos do período mais o último antes dele', () => {
    const { average } = buildReport(data, 'month', TODAY);
    // 800 km ÷ (30 + 40) L, partindo de 11000 (setembro).
    expect(average.periodAverage).toBe('11,4');
    expect(average.periodCalc).toBe('800 km ÷ 70,0 L');
  });

  it('com um abastecimento só, o cartão pede mais um', () => {
    const one: ReportData = {
      ...data,
      entries: [fuel(new Date(2026, 9, 18), 11800, 40, 240)],
      records: [],
    };
    expect(buildReport(one, 'month', TODAY).average).toEqual({});
  });
});

describe('buildReport: consumo por trecho', () => {
  it('pontos em ordem de data, só dos meses do gráfico, e rótulos dos meses', () => {
    const { consumption } = buildReport(data, '3months', TODAY);
    expect(consumption.labels).toEqual(['ago', 'set', 'out']);
    expect(consumption.points.length).toBeGreaterThanOrEqual(2);
    const xs = consumption.points.map((p) => p.x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    expect(xs.every((x) => x >= 0 && x <= 1)).toBe(true);
  });

  it('sem trechos calculáveis, sem pontos', () => {
    const none: ReportData = { ...data, entries: [fuel(new Date(2026, 9, 18), 11800, 40, 240)] };
    expect(buildReport(none, '6months', TODAY).consumption.points).toEqual([]);
  });
});

describe('períodos e dados', () => {
  it('sem relatórios avançados (Premium), só o mês', () => {
    expect(availablePeriods(false).map((p) => p.value)).toEqual(['month']);
    expect(availablePeriods(true).map((p) => p.value)).toEqual([
      'month',
      '3months',
      '6months',
      'year',
    ]);
  });

  it('há dados com abastecimento ou serviço com custo', () => {
    expect(hasReportData({ vehicle: null, entries: [], records: [] })).toBe(false);
    expect(hasReportData({ vehicle: null, entries: [], records: [service(TODAY)] })).toBe(false);
    expect(hasReportData({ vehicle: null, entries: [], records: [service(TODAY, 50)] })).toBe(true);
    expect(hasReportData(data)).toBe(true);
  });
});

describe('loadReportData', () => {
  it('sem veículo, volta vazio; com veículo, traz abastecimentos e serviços', async () => {
    const db = createTestDb();
    await migrate(db);
    expect(await loadReportData(db)).toEqual({ vehicle: null, entries: [], records: [] });

    const now = '2026-10-01T12:00:00.000Z';
    await db.runAsync(
      `INSERT INTO vehicles (id, name, type, initial_km, created_at, updated_at)
       VALUES (?, 'Gol', 'flex', 9000, ?, ?)`,
      VEHICLE_ID,
      now,
      now,
    );
    const entry = fuel(new Date(2026, 9, 18), 11800, 40, 240);
    await addFuelEntry(db, entry, { id: entry.id });
    await db.runAsync(
      `INSERT INTO maintenance_records (id, vehicle_id, type, date, km, cost, created_at, updated_at)
       VALUES (?, ?, 'oil', ?, 11000, 289, ?, ?)`,
      id(),
      VEHICLE_ID,
      new Date(2026, 9, 12).toISOString(),
      now,
      now,
    );

    const loaded = await loadReportData(db);
    expect(loaded.vehicle).toEqual({ id: VEHICLE_ID, name: 'Gol' });
    expect(loaded.entries.map((e) => e.id)).toEqual([entry.id]);
    expect(loaded.records.map((r) => r.cost)).toEqual([289]);
  });
});
