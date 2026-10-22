import {
  buildRegisterInput,
  buildTypeOptions,
  emptyRegisterForm,
  OTHER_TYPE,
} from '../models/registerForm';

const VEHICLE_ID = '018bcfe5-6800-7000-8000-000000000001';
const TODAY = new Date(2026, 9, 21, 15);
const ctx = { vehicleId: VEHICLE_ID, customTypes: [] as string[], today: TODAY };

const form = (patch = {}) => ({
  ...emptyRegisterForm,
  typeKey: 'oil',
  date: '21/10/2026',
  km: '50.110',
  ...patch,
});

describe('buildTypeOptions', () => {
  it('itens prontos, atalhos "Seu" e "Outro" por último', () => {
    const options = buildTypeOptions(['Troca de bateria']);
    expect(options[0]).toEqual({ key: 'oil', label: 'Óleo', own: false });
    expect(options.slice(-2)).toEqual([
      { key: 'Troca de bateria', label: 'Troca de bateria', own: true },
      { key: OTHER_TYPE, label: 'Outro', own: false },
    ]);
    expect(options.map((o) => o.label)).toEqual(
      expect.arrayContaining([
        'Óleo',
        'Filtros',
        'Pneus',
        'Freios',
        'Correia',
        'Alinhamento',
        'Revisão',
      ]),
    );
  });
});

describe('buildRegisterInput', () => {
  it('monta o serviço com tipo pronto, custo e oficina', () => {
    const { value } = buildRegisterInput(
      form({ cost: '289,00', shop: ' Auto Center do Zé ' }),
      ctx,
    );
    expect(value).toEqual({
      vehicleId: VEHICLE_ID,
      type: 'oil',
      date: new Date(2026, 9, 21, 12),
      km: 50110,
      cost: 289,
      shop: 'Auto Center do Zé',
    });
  });

  it('custo e oficina são opcionais', () => {
    const { value } = buildRegisterInput(form(), ctx);
    expect(value?.cost).toBeUndefined();
    expect(value?.shop).toBeUndefined();
  });

  it('custo zero é válido (serviço sem custo)', () => {
    expect(buildRegisterInput(form({ cost: '0' }), ctx).value?.cost).toBe(0);
  });

  it('"Outro": o nome digitado vira o tipo', () => {
    const { value } = buildRegisterInput(
      form({ typeKey: OTHER_TYPE, customName: '  Troca  de bateria ' }),
      ctx,
    );
    expect(value?.type).toBe('Troca de bateria');
  });

  it('"Outro" com nome de item pronto usa o código do catálogo', () => {
    expect(
      buildRegisterInput(form({ typeKey: OTHER_TYPE, customName: 'alinhamento' }), ctx).value?.type,
    ).toBe('alignment');
  });

  it('"Outro" com nome de atalho existente reaproveita a grafia dele', () => {
    const { value } = buildRegisterInput(
      form({ typeKey: OTHER_TYPE, customName: 'TROCA DE BATERIA' }),
      {
        ...ctx,
        customTypes: ['Troca de bateria'],
      },
    );
    expect(value?.type).toBe('Troca de bateria');
  });

  it('atalho "Seu" escolhido vale como o próprio nome', () => {
    expect(buildRegisterInput(form({ typeKey: 'Troca de bateria' }), ctx).value?.type).toBe(
      'Troca de bateria',
    );
  });

  it('exige tipo, data e km', () => {
    expect(buildRegisterInput(form({ typeKey: null, date: '', km: '' }), ctx).errors).toEqual({
      type: 'Escolha o tipo',
      date: 'Informe a data (dd/mm/aaaa)',
      km: 'Informe o km do painel',
    });
  });

  it('"Outro" sem nome pede o nome do tipo', () => {
    expect(buildRegisterInput(form({ typeKey: OTHER_TYPE, customName: '  ' }), ctx).errors).toEqual(
      {
        customName: 'Informe o nome do tipo',
      },
    );
  });

  it('data no futuro é recusada', () => {
    expect(buildRegisterInput(form({ date: '22/10/2026' }), ctx).errors?.date).toBe(
      'A data não pode ser no futuro',
    );
  });
});
