import { describe, expect, it } from 'vitest';
import { odometerReminder } from '../odometer';

describe('odometerReminder', () => {
  const last = new Date(2026, 9, 1, 18, 30);

  it('avisa 15 dias depois, às 9h', () => {
    expect(odometerReminder(last, new Date(2026, 9, 5, 12))).toEqual({
      fireAt: new Date(2026, 9, 16, 9),
      daysWithout: 15,
    });
  });

  it('no dia do aviso, antes das 9h, ainda é o de 15 dias', () => {
    expect(odometerReminder(last, new Date(2026, 9, 16, 8)).daysWithout).toBe(15);
  });

  it('passou das 9h do dia do aviso: vai para os 30 dias', () => {
    expect(odometerReminder(last, new Date(2026, 9, 16, 9))).toEqual({
      fireAt: new Date(2026, 9, 31, 9),
      daysWithout: 30,
    });
  });

  it('sem atualizar há muito tempo, pega o próximo múltiplo de 15 dias', () => {
    expect(odometerReminder(last, new Date(2026, 11, 1, 12))).toEqual({
      fireAt: new Date(2026, 11, 15, 9),
      daysWithout: 75,
    });
  });

  it('é o mesmo aviso ao reagendar várias vezes no mesmo dia', () => {
    const a = odometerReminder(last, new Date(2026, 9, 20, 7));
    const b = odometerReminder(last, new Date(2026, 9, 20, 20));
    expect(a).toEqual(b);
  });
});
