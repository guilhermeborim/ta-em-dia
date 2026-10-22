import { describe, expect, it } from 'vitest';
import { fuelPeriodSummary } from '../calculations';
import { monthlyTotals, REPORT_PERIOD_MONTHS, reportWindow, spentBetween } from '../reports';

const today = new Date(2026, 9, 21);

describe('reportWindow', () => {
  it('abrange os meses pedidos, contando o atual, e o período anterior de mesmo tamanho', () => {
    const window = reportWindow(REPORT_PERIOD_MONTHS['6months'], today);
    expect(window.start).toEqual(new Date(2026, 4, 1));
    expect(window.end).toEqual(new Date(2026, 10, 1));
    expect(window.previousStart).toEqual(new Date(2025, 10, 1));
  });

  it('um mês: o mês atual e o anterior', () => {
    const window = reportWindow(1, today);
    expect(window.start).toEqual(new Date(2026, 9, 1));
    expect(window.previousStart).toEqual(new Date(2026, 8, 1));
  });

  it('atravessa a virada do ano', () => {
    const window = reportWindow(12, new Date(2026, 1, 10));
    expect(window.start).toEqual(new Date(2025, 2, 1));
    expect(window.previousStart).toEqual(new Date(2024, 2, 1));
  });
});

describe('monthlyTotals', () => {
  const fuel = [
    { date: new Date(2026, 9, 18), total: 240 },
    { date: new Date(2026, 9, 9), total: 180 },
    { date: new Date(2026, 8, 24), total: 200 },
    { date: new Date(2026, 0, 5), total: 999 },
  ];
  const services = [{ date: new Date(2026, 9, 12), cost: 289 }, { date: new Date(2026, 8, 5) }];

  it('um item por mês, do mais antigo ao atual, com combustível e manutenção', () => {
    const rows = monthlyTotals(fuel, services, 3, today);
    expect(rows.map((r) => [r.month, r.fuel, r.maintenance, r.total])).toEqual([
      [7, 0, 0, 0],
      [8, 200, 0, 200],
      [9, 420, 289, 709],
    ]);
  });

  it('o que está fora da janela não entra; serviço sem custo não soma', () => {
    const rows = monthlyTotals(fuel, services, 1, today);
    expect(rows).toHaveLength(1);
    expect(rows[0].total).toBe(709);
  });

  it('atravessa a virada do ano', () => {
    const rows = monthlyTotals(
      [{ date: new Date(2025, 11, 20), total: 100 }],
      [],
      3,
      new Date(2026, 1, 3),
    );
    expect(rows.map((r) => [r.year, r.month, r.total])).toEqual([
      [2025, 11, 100],
      [2026, 0, 0],
      [2026, 1, 0],
    ]);
  });
});

describe('spentBetween', () => {
  it('soma combustível e serviços com custo dentro de [início, fim)', () => {
    const fuel = [
      { date: new Date(2026, 9, 1), total: 100 },
      { date: new Date(2026, 10, 1), total: 50 },
    ];
    const services = [{ date: new Date(2026, 9, 30), cost: 30 }, { date: new Date(2026, 9, 2) }];
    expect(spentBetween(fuel, services, new Date(2026, 9, 1), new Date(2026, 10, 1))).toBe(130);
  });
});

describe('fuelPeriodSummary', () => {
  const e = (date: Date, km: number, total: number, liters = total / 6) => ({
    date,
    km,
    liters,
    total,
    fullTank: true,
  });
  const entries = [
    e(new Date(2026, 9, 18), 11800, 240),
    e(new Date(2026, 9, 9), 11400, 180),
    e(new Date(2026, 8, 24), 11000, 200),
  ];

  it('soma gasto e litros e parte do último abastecimento antes do período', () => {
    const summary = fuelPeriodSummary(entries, new Date(2026, 9, 1), new Date(2026, 10, 1));
    expect(summary).toMatchObject({ spent: 420, count: 2, distanceKm: 800 });
    expect(summary.liters).toBeCloseTo(70);
    expect(summary.costPerKm).toBeCloseTo(0.525);
  });

  it('serve para vários meses: o primeiro do período só marca a partida', () => {
    const summary = fuelPeriodSummary(entries, new Date(2026, 8, 1), new Date(2026, 10, 1));
    expect(summary).toMatchObject({ spent: 620, count: 3, distanceKm: 800 });
    expect(summary.costPerKm).toBeCloseTo(420 / 800);
  });

  it('período sem abastecimentos: zeros e sem distância', () => {
    expect(fuelPeriodSummary(entries, new Date(2026, 5, 1), new Date(2026, 6, 1))).toEqual({
      spent: 0,
      liters: 0,
      count: 0,
      distanceKm: null,
      costPerKm: null,
    });
  });
});
