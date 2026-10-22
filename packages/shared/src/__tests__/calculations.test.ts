import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DAILY_KM,
  calculateMissingFuelAmount,
  costPerKm,
  dailyAverageKm,
  exactKmPerLiter,
  periodConsumption,
  periodKmPerLiter,
  segmentKmPerLiter,
  monthFuelSummary,
  monthOverMonth,
  monthProjection,
  nextMaintenance,
} from '../calculations';

const d = (iso: string) => new Date(`${iso}T12:00:00Z`);

describe('exactKmPerLiter', () => {
  it('calcula entre dois tanques cheios somando parciais', () => {
    const result = exactKmPerLiter([
      { date: d('2026-10-01'), km: 10000, liters: 40, total: 240, fullTank: true },
      { date: d('2026-10-05'), km: 10200, liters: 10, total: 60, fullTank: false },
      { date: d('2026-10-10'), km: 10500, liters: 40, total: 240, fullTank: true },
    ]);
    expect(result).toBe(10);
  });

  it('retorna null sem dois tanques cheios', () => {
    expect(
      exactKmPerLiter([
        { date: d('2026-10-01'), km: 10000, liters: 40, total: 240, fullTank: true },
      ]),
    ).toBeNull();
  });
});

describe('periodKmPerLiter', () => {
  it('funciona sem nenhum tanque cheio', () => {
    const result = periodKmPerLiter([
      { date: d('2026-10-01'), km: 10000, liters: 20, total: 120, fullTank: false },
      { date: d('2026-10-05'), km: 10200, liters: 10, total: 60, fullTank: false },
      { date: d('2026-10-10'), km: 10500, liters: 40, total: 240, fullTank: false },
    ]);
    expect(result).toBe(10);
  });

  it('retorna null com um só abastecimento', () => {
    expect(
      periodKmPerLiter([
        { date: d('2026-10-01'), km: 10000, liters: 40, total: 240, fullTank: false },
      ]),
    ).toBeNull();
  });
});

describe('costPerKm', () => {
  it('divide gasto por distância', () => {
    expect(costPerKm(500, 1000)).toBe(0.5);
    expect(costPerKm(500, 0)).toBeNull();
  });
});

describe('dailyAverageKm', () => {
  it('usa o padrão com menos de duas leituras', () => {
    expect(dailyAverageKm([])).toBe(DEFAULT_DAILY_KM);
  });

  it('calcula km por dia', () => {
    expect(
      dailyAverageKm([
        { km: 10000, readAt: d('2026-10-01') },
        { km: 10400, readAt: d('2026-10-11') },
      ]),
    ).toBe(40);
  });
});

describe('nextMaintenance', () => {
  const today = d('2026-10-21');

  it('vence por km quando chega antes', () => {
    const next = nextMaintenance(
      { intervalKm: 10000, intervalMonths: 12, lastDoneKm: 10000, lastDoneAt: d('2026-10-01') },
      19000,
      50,
      today,
    );
    expect(next?.reason).toBe('km');
    expect(next?.dueKm).toBe(20000);
    expect(next?.dueDate.toISOString().slice(0, 10)).toBe('2026-11-10');
  });

  it('vence por tempo quando chega antes', () => {
    const next = nextMaintenance(
      { intervalKm: 10000, intervalMonths: 6, lastDoneKm: 10000, lastDoneAt: d('2026-05-01') },
      11000,
      10,
      today,
    );
    expect(next?.reason).toBe('time');
  });

  it('retorna null sem intervalo', () => {
    expect(nextMaintenance({ lastDoneKm: 0, lastDoneAt: today }, 0, 30, today)).toBeNull();
  });
});

describe('monthProjection e monthOverMonth', () => {
  it('projeta o mês pelo ritmo atual', () => {
    expect(monthProjection(300, new Date(2026, 9, 10))).toBeCloseTo(930);
  });

  it('compara com o mês anterior', () => {
    expect(monthOverMonth(110, 100)).toBeCloseTo(10);
    expect(monthOverMonth(110, 0)).toBeNull();
  });
});

describe('calculateMissingFuelAmount', () => {
  it('calcula o total por preço e litros', () => {
    expect(
      calculateMissingFuelAmount({ pricePerLiter: 5.99, liters: 38.25 }, [
        'pricePerLiter',
        'liters',
      ]),
    ).toEqual({ field: 'total', value: 229.12 });
  });

  it('calcula os litros por total e preço', () => {
    expect(
      calculateMissingFuelAmount({ total: 200, pricePerLiter: 6.25 }, ['total', 'pricePerLiter']),
    ).toEqual({ field: 'liters', value: 32 });
  });

  it('calcula o preço por total e litros, com 3 casas', () => {
    expect(calculateMissingFuelAmount({ total: 100, liters: 17 }, ['liters', 'total'])).toEqual({
      field: 'pricePerLiter',
      value: 5.882,
    });
  });

  it('com três preenchidos, recalcula o digitado há mais tempo', () => {
    expect(
      calculateMissingFuelAmount({ pricePerLiter: 6, liters: 40, total: 999 }, [
        'pricePerLiter',
        'liters',
        'total',
      ]),
    ).toEqual({ field: 'pricePerLiter', value: 24.975 });
  });

  it('editar de novo um campo o põe como mais recente', () => {
    expect(
      calculateMissingFuelAmount({ pricePerLiter: 6, liters: 40, total: 240 }, [
        'pricePerLiter',
        'liters',
        'total',
        'pricePerLiter',
      ]),
    ).toEqual({ field: 'liters', value: 40 });
  });

  it('retorna null com menos de dois valores ou valor zerado', () => {
    expect(calculateMissingFuelAmount({ liters: 40 }, ['liters'])).toBeNull();
    expect(calculateMissingFuelAmount({ liters: 40, total: null }, ['liters', 'total'])).toBeNull();
    expect(calculateMissingFuelAmount({ liters: 0, total: 100 }, ['liters', 'total'])).toBeNull();
  });
});

describe('periodConsumption', () => {
  const entries = [
    { date: d('2026-10-01'), km: 10000, liters: 40, total: 240, fullTank: true },
    { date: d('2026-10-05'), km: 10200, liters: 10, total: 60, fullTank: false },
    { date: d('2026-10-10'), km: 10500, liters: 40, total: 240, fullTank: true },
  ];

  it('traz a média e a conta (km rodados e litros depois do primeiro)', () => {
    expect(periodConsumption(entries)).toEqual({ kmPerLiter: 10, distanceKm: 500, liters: 50 });
    expect(periodKmPerLiter(entries)).toBe(10);
  });

  it('retorna null com menos de dois abastecimentos ou sem distância', () => {
    expect(periodConsumption(entries.slice(0, 1))).toBeNull();
    expect(periodConsumption([entries[0], { ...entries[0], km: 10000 }])).toBeNull();
  });
});

describe('segmentKmPerLiter', () => {
  const e = (km: number, liters: number, fullTank: boolean) => ({
    date: d('2026-10-01'),
    km,
    liters,
    total: liters * 6,
    fullTank,
  });

  it('calcula o trecho entre dois tanques cheios, somando os parciais do meio', () => {
    expect(
      segmentKmPerLiter([e(10000, 40, true), e(10200, 10, false), e(10500, 40, true)]),
    ).toEqual([null, null, 10]);
  });

  it('cada tanque cheio fecha um trecho e abre o próximo', () => {
    expect(segmentKmPerLiter([e(10000, 40, true), e(10400, 40, true), e(10900, 50, true)])).toEqual(
      [null, 10, 10],
    );
  });

  it('mantém a ordem da entrada, mesmo desordenada', () => {
    expect(segmentKmPerLiter([e(10500, 40, true), e(10000, 40, true)])).toEqual([12.5, null]);
  });

  it('parcial não tem km/l, e antes do primeiro tanque cheio não há trecho', () => {
    expect(
      segmentKmPerLiter([e(9800, 20, false), e(10000, 40, true), e(10300, 20, false)]),
    ).toEqual([null, null, null]);
  });

  it('retorna lista vazia sem abastecimentos', () => {
    expect(segmentKmPerLiter([])).toEqual([]);
  });
});

describe('monthFuelSummary', () => {
  const today = new Date(2026, 9, 21);
  const e = (date: Date, km: number, total: number) => ({
    date,
    km,
    liters: total / 6,
    total,
    fullTank: true,
  });

  it('soma o mês, compara com o anterior e parte do último abastecimento antes do mês', () => {
    const summary = monthFuelSummary(
      [
        e(new Date(2026, 9, 18), 11800, 240),
        e(new Date(2026, 9, 9), 11400, 180),
        e(new Date(2026, 8, 24), 11000, 200),
        e(new Date(2026, 8, 2), 10600, 100),
      ],
      today,
    );
    expect(summary).toMatchObject({ spent: 420, previousSpent: 300, count: 2, distanceKm: 800 });
    expect(summary.costPerKm).toBeCloseTo(0.525);
  });

  it('sem abastecimento antes do mês, o primeiro do mês só marca o km de partida', () => {
    const summary = monthFuelSummary(
      [e(new Date(2026, 9, 18), 11800, 240), e(new Date(2026, 9, 9), 11000, 180)],
      today,
    );
    expect(summary).toMatchObject({ spent: 420, previousSpent: 0, count: 2, distanceKm: 800 });
    expect(summary.costPerKm).toBeCloseTo(0.3);
  });

  it('um abastecimento só no mês e nenhum antes: sem distância nem custo por km', () => {
    expect(monthFuelSummary([e(new Date(2026, 9, 9), 11000, 180)], today)).toEqual({
      spent: 180,
      previousSpent: 0,
      count: 1,
      distanceKm: null,
      costPerKm: null,
    });
  });

  it('mês sem abastecimentos: gasto zero e base do mês anterior', () => {
    expect(monthFuelSummary([e(new Date(2026, 8, 24), 11000, 200)], today)).toEqual({
      spent: 0,
      previousSpent: 200,
      count: 0,
      distanceKm: null,
      costPerKm: null,
    });
  });

  it('janeiro compara com dezembro do ano anterior', () => {
    const summary = monthFuelSummary([e(new Date(2025, 11, 20), 10000, 150)], new Date(2026, 0, 5));
    expect(summary.previousSpent).toBe(150);
  });
});
