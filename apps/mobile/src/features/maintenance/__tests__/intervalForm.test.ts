import { buildIntervalInput, intervalFormFrom } from '../models/intervalForm';

describe('intervalFormFrom', () => {
  it('km com ponto de milhar e meses em número', () => {
    expect(intervalFormFrom({ intervalKm: 10000, intervalMonths: 12 })).toEqual({
      km: '10.000',
      months: '12',
    });
  });

  it('sem intervalo, campos vazios', () => {
    expect(intervalFormFrom({})).toEqual({ km: '', months: '' });
  });
});

describe('buildIntervalInput', () => {
  it('aceita km e meses (com ponto de milhar)', () => {
    expect(buildIntervalInput({ km: '10.000', months: '12' }).value).toEqual({
      intervalKm: 10000,
      intervalMonths: 12,
    });
  });

  it('aceita só um dos campos', () => {
    expect(buildIntervalInput({ km: '5.000', months: '' }).value).toEqual({
      intervalKm: 5000,
      intervalMonths: undefined,
    });
    expect(buildIntervalInput({ km: '', months: '6' }).value).toEqual({
      intervalKm: undefined,
      intervalMonths: 6,
    });
  });

  it('os dois vazios são válidos: o item só guarda o histórico', () => {
    expect(buildIntervalInput({ km: '', months: '' }).value).toEqual({
      intervalKm: undefined,
      intervalMonths: undefined,
    });
  });

  it('zero e valores muito altos são recusados, por campo', () => {
    expect(buildIntervalInput({ km: '0', months: '241' }).errors).toEqual({
      km: 'Informe um valor entre 1 e 1.000.000',
      months: 'Informe um valor entre 1 e 240',
    });
    expect(buildIntervalInput({ km: '1.000.001', months: '12' }).errors?.km).toBeDefined();
  });
});
