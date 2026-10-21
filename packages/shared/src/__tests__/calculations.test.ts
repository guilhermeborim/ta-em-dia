import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DAILY_KM,
  costPerKm,
  dailyAverageKm,
  kmPerLiter,
  monthOverMonth,
  monthProjection,
  nextMaintenance,
} from '../calculations';

const d = (iso: string) => new Date(`${iso}T12:00:00Z`);

describe('kmPerLiter', () => {
  it('calcula entre dois tanques cheios somando parciais', () => {
    const result = kmPerLiter([
      { date: d('2026-10-01'), km: 10000, liters: 40, total: 240, fullTank: true },
      { date: d('2026-10-05'), km: 10200, liters: 10, total: 60, fullTank: false },
      { date: d('2026-10-10'), km: 10500, liters: 40, total: 240, fullTank: true },
    ]);
    expect(result).toBe(10);
  });

  it('retorna null sem dois tanques cheios', () => {
    expect(
      kmPerLiter([{ date: d('2026-10-01'), km: 10000, liters: 40, total: 240, fullTank: true }]),
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
