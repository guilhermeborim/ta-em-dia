import {
  formatNotifyDays,
  notifyDaysError,
  notifyDayOptions,
  toggleDay,
} from '../models/settingsView';

describe('formatNotifyDays', () => {
  it('"30 e 7 dias", com vírgulas e plural', () => {
    expect(formatNotifyDays([30, 7])).toBe('30 e 7 dias');
    expect(formatNotifyDays([7, 30, 15])).toBe('30, 15 e 7 dias');
    expect(formatNotifyDays([1])).toBe('1 dia');
    expect(formatNotifyDays([15])).toBe('15 dias');
    expect(formatNotifyDays([])).toBe('Sem aviso');
  });
});

describe('toggleDay', () => {
  it('marca e desmarca, do maior para o menor', () => {
    expect(toggleDay([30, 7], 15)).toEqual([30, 15, 7]);
    expect(toggleDay([30, 15, 7], 30)).toEqual([15, 7]);
  });
});

describe('notifyDaysError', () => {
  it('exige ao menos um dia', () => {
    expect(notifyDaysError([])).toBe('Marque ao menos um dia');
    expect(notifyDaysError([7])).toBeUndefined();
  });
});

describe('notifyDayOptions', () => {
  it('as mesmas opções do formulário de prazo', () => {
    expect(notifyDayOptions.map((o) => o.label)).toEqual([
      '30 dias',
      '15 dias',
      '7 dias',
      '3 dias',
      '1 dia',
    ]);
  });
});
