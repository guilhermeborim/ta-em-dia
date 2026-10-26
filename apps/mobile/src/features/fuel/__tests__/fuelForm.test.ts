import {
  buildFuelEntryInput,
  deriveAmounts,
  emptyFuelForm,
  entryDateFor,
  formatDecimal,
  formatEntryDate,
  parseDecimal,
  sanitizeAmount,
  sanitizeDecimal,
  touchAmount,
  type FuelForm,
} from '../models/fuelForm';

const VEHICLE_ID = '018bcfe5-6800-7000-8000-000000000001';
const DATE = new Date('2026-10-21T12:00:00.000Z');

const form = (patch: Partial<FuelForm>): FuelForm => ({
  ...emptyFuelForm,
  km: '48.910',
  station: 'Posto Ipiranga',
  ...patch,
});

describe('sanitizeDecimal', () => {
  it('troca ponto por vírgula e limita as casas', () => {
    expect(sanitizeDecimal('5.999', 3)).toBe('5,999');
    expect(sanitizeDecimal('38,2599', 2)).toBe('38,25');
  });

  it('descarta letras, símbolos e segunda vírgula', () => {
    expect(sanitizeDecimal('R$ 5,9,9', 3)).toBe('5,99');
    expect(sanitizeDecimal('abc', 2)).toBe('');
  });

  it('mantém a vírgula recém-digitada', () => {
    expect(sanitizeDecimal('5,', 2)).toBe('5,');
  });
});

describe('sanitizeAmount', () => {
  it('preço por litro: primeiro dígito é o inteiro, o resto são casas', () => {
    expect(sanitizeAmount('pricePerLiter', '6')).toBe('6');
    expect(sanitizeAmount('pricePerLiter', '65')).toBe('6,5');
    expect(sanitizeAmount('pricePerLiter', '6559')).toBe('6,559');
  });

  it('preço por litro: começando em 1, o inteiro tem dois dígitos (10, 10,5)', () => {
    expect(sanitizeAmount('pricePerLiter', '1')).toBe('1');
    expect(sanitizeAmount('pricePerLiter', '10')).toBe('10');
    expect(sanitizeAmount('pricePerLiter', '105')).toBe('10,5');
    expect(sanitizeAmount('pricePerLiter', '1050')).toBe('10,50');
  });

  it('preço por litro: vírgula digitada vale como está', () => {
    expect(sanitizeAmount('pricePerLiter', '1,05')).toBe('1,05');
    expect(sanitizeAmount('pricePerLiter', '10,5')).toBe('10,5');
  });

  it('litros e total não mudam', () => {
    expect(sanitizeAmount('liters', '65')).toBe('65');
    expect(sanitizeAmount('total', '120,5')).toBe('120,5');
  });
});

describe('parseDecimal / formatDecimal', () => {
  it('lê vírgula e ponto; vazio vira null', () => {
    expect(parseDecimal('5,99')).toBe(5.99);
    expect(parseDecimal('5.99')).toBe(5.99);
    expect(parseDecimal('5,')).toBe(5);
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal(',')).toBeNull();
  });

  it('formata em pt-BR com casas por campo', () => {
    expect(formatDecimal(229.1, 'total')).toBe('229,10');
    expect(formatDecimal(38.25, 'liters')).toBe('38,25');
    expect(formatDecimal(5.9, 'pricePerLiter')).toBe('5,90');
    expect(formatDecimal(5.882, 'pricePerLiter')).toBe('5,882');
    expect(formatDecimal(1234.5, 'total')).toBe('1234,50');
  });
});

describe('deriveAmounts', () => {
  it('preenche o total com preço e litros', () => {
    const result = deriveAmounts(
      form({ pricePerLiter: '6', liters: '40', amountOrder: ['pricePerLiter', 'liters'] }),
    );
    expect(result).toMatchObject({ total: '240,00', calculated: 'total' });
    expect(result.pricePerLiter).toBe('6');
  });

  it('preenche o preço com total e litros', () => {
    const result = deriveAmounts(
      form({ total: '240', liters: '40', amountOrder: ['liters', 'total'] }),
    );
    expect(result).toMatchObject({ pricePerLiter: '6,00', calculated: 'pricePerLiter' });
  });

  it('não calcula com um valor só', () => {
    expect(deriveAmounts(form({ liters: '40', amountOrder: ['liters'] })).calculated).toBeNull();
  });

  it('digitar no campo calculado o torna entrada e recalcula o mais antigo', () => {
    const typed = form({
      pricePerLiter: '6',
      liters: '40',
      total: '300',
      amountOrder: touchAmount(['pricePerLiter', 'liters'], 'total'),
    });
    expect(deriveAmounts(typed)).toMatchObject({
      pricePerLiter: '7,50',
      calculated: 'pricePerLiter',
    });
  });

  it('apagar um valor digitado remove o calculado', () => {
    const cleared = form({
      pricePerLiter: '6',
      liters: '',
      amountOrder: ['pricePerLiter', 'liters'],
    });
    expect(deriveAmounts(cleared)).toMatchObject({ total: '', calculated: null });
  });
});

describe('touchAmount', () => {
  it('põe o campo por último sem repetir', () => {
    expect(touchAmount(['liters', 'total'], 'liters')).toEqual(['total', 'liters']);
  });
});

describe('formatEntryDate', () => {
  it('"Hoje" para hoje e só a data para outros dias', () => {
    const today = new Date(2026, 9, 21, 15);
    expect(formatEntryDate(new Date(2026, 9, 21, 9), today)).toBe('Hoje, 21 out');
    expect(formatEntryDate(new Date(2026, 9, 20), today)).toBe('20 out');
  });

  it('mostra o ano quando não é o atual', () => {
    const today = new Date(2026, 9, 21, 15);
    expect(formatEntryDate(new Date(2025, 11, 30), today)).toBe('30 dez 2025');
  });
});

describe('entryDateFor', () => {
  const now = new Date(2026, 9, 21, 15, 30);

  it('sem escolha, ou escolhendo hoje: o instante de agora (a ordem do dia segue a hora)', () => {
    expect(entryDateFor(null, now)).toBe(now);
    expect(entryDateFor(new Date(2026, 9, 21, 0, 0), now)).toBe(now);
  });

  it('outro dia: ao meio-dia', () => {
    expect(entryDateFor(new Date(2026, 9, 18, 0, 5), now)).toEqual(new Date(2026, 9, 18, 12));
  });
});

describe('buildFuelEntryInput', () => {
  it('reaproveita o nome de um posto já usado', () => {
    const result = buildFuelEntryInput(
      form({
        total: '240',
        liters: '40',
        amountOrder: ['total', 'liters'],
        station: 'posto ipiranga ',
      }),
      { vehicleId: 'v1', date: new Date('2026-10-21T12:00:00Z'), stations: ['Posto Ipiranga'] },
    );
    expect(result.value?.stationName).toBe('Posto Ipiranga');
  });

  it('monta o abastecimento com o terceiro valor calculado', () => {
    const result = buildFuelEntryInput(
      form({
        pricePerLiter: '5,99',
        liters: '38,25',
        amountOrder: ['pricePerLiter', 'liters'],
        fullTank: true,
        station: ' Posto Ipiranga ',
      }),
      { vehicleId: VEHICLE_ID, date: DATE },
    );
    expect(result.value).toEqual({
      vehicleId: VEHICLE_ID,
      date: DATE,
      km: 48910,
      fuelType: 'gasoline',
      liters: 38.25,
      pricePerLiter: 5.99,
      total: 229.12,
      fullTank: true,
      stationName: 'Posto Ipiranga',
    });
  });

  it('exige o posto', () => {
    const result = buildFuelEntryInput(
      form({ total: '240', liters: '40', amountOrder: ['total', 'liters'], station: '  ' }),
      { vehicleId: VEHICLE_ID, date: DATE },
    );
    expect(result.errors).toEqual({ station: 'Informe o posto' });
  });

  it('exige km e dois valores', () => {
    const result = buildFuelEntryInput(form({ km: '', liters: '40', amountOrder: ['liters'] }), {
      vehicleId: VEHICLE_ID,
      date: DATE,
    });
    expect(result.errors).toEqual({
      km: 'Informe o km do painel',
      amounts: 'Preencha 2 dos 3 valores: preço por litro, litros e total',
    });
  });
});
