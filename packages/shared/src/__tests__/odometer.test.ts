import { describe, expect, it } from 'vitest';
import { odometerReminder } from '../odometer';

describe('odometerReminder', () => {
  const last = new Date(2026, 9, 1, 18, 30);

  it('avisa 7 dias depois, às 9h', () => {
    expect(odometerReminder(last, new Date(2026, 9, 5, 12))).toEqual({
      fireAt: new Date(2026, 9, 8, 9),
      daysWithout: 7,
    });
  });

  it('no dia do aviso, antes das 9h, ainda é o de 7 dias', () => {
    expect(odometerReminder(last, new Date(2026, 9, 8, 8)).daysWithout).toBe(7);
  });

  it('passou das 9h do dia do aviso: vai para os 14 dias', () => {
    expect(odometerReminder(last, new Date(2026, 9, 8, 9))).toEqual({
      fireAt: new Date(2026, 9, 15, 9),
      daysWithout: 14,
    });
  });

  it('sem atualizar há muito tempo, pega o próximo múltiplo de 7 dias', () => {
    expect(odometerReminder(last, new Date(2026, 11, 1, 12))).toEqual({
      fireAt: new Date(2026, 11, 3, 9),
      daysWithout: 63,
    });
  });

  it('é o mesmo aviso ao reagendar várias vezes no mesmo dia', () => {
    const a = odometerReminder(last, new Date(2026, 9, 20, 7));
    const b = odometerReminder(last, new Date(2026, 9, 20, 20));
    expect(a).toEqual(b);
  });
});
