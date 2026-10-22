import {
  atNoon,
  dateFromInput,
  formatDateInput,
  parseDateInput,
  relativeDays,
  sameDay,
  toDateInput,
} from '../date';

const TODAY = new Date(2026, 9, 21, 15);

describe('formatDateInput', () => {
  it('aplica a máscara dd/mm/aaaa enquanto digita', () => {
    expect(formatDateInput('2')).toBe('2');
    expect(formatDateInput('211')).toBe('21/1');
    expect(formatDateInput('21102026')).toBe('21/10/2026');
    expect(formatDateInput('21/10/20269999')).toBe('21/10/2026');
    expect(formatDateInput('ab')).toBe('');
  });
});

describe('toDateInput', () => {
  it('formata com zeros à esquerda', () => {
    expect(toDateInput(new Date(2026, 0, 5))).toBe('05/01/2026');
  });
});

describe('parseDateInput', () => {
  it('lê a data como meio-dia local', () => {
    const { date } = parseDateInput('21/10/2026', TODAY);
    expect(date).toEqual(new Date(2026, 9, 21, 12));
  });

  it('aceita hoje, mesmo que já tenha passado do meio-dia', () => {
    expect(parseDateInput('21/10/2026', TODAY).error).toBeUndefined();
  });

  it('recusa data incompleta, inexistente, antiga demais ou no futuro', () => {
    expect(parseDateInput('21/10/26', TODAY).error).toBe('Informe a data (dd/mm/aaaa)');
    expect(parseDateInput('', TODAY).error).toBe('Informe a data (dd/mm/aaaa)');
    expect(parseDateInput('31/02/2026', TODAY).error).toBe('Data inválida');
    expect(parseDateInput('01/01/1980', TODAY).error).toBe('Data inválida');
    expect(parseDateInput('22/10/2026', TODAY).error).toBe('A data não pode ser no futuro');
  });

  it('29 de fevereiro só em ano bissexto', () => {
    expect(parseDateInput('29/02/2024', TODAY).error).toBeUndefined();
    expect(parseDateInput('29/02/2025', TODAY).error).toBe('Data inválida');
  });
});

describe('relativeDays', () => {
  it('conta os dias do calendário, não as 24 horas', () => {
    expect(relativeDays(new Date(2026, 9, 21, 8), TODAY)).toBe('hoje');
    expect(relativeDays(new Date(2026, 9, 20, 23), TODAY)).toBe('ontem');
    expect(relativeDays(new Date(2026, 9, 18), TODAY)).toBe('há 3 dias');
  });

  it('passa para meses e anos', () => {
    expect(relativeDays(new Date(2026, 8, 20), TODAY)).toBe('há 1 mês');
    expect(relativeDays(new Date(2026, 5, 1), TODAY)).toBe('há 4 meses');
    expect(relativeDays(new Date(2025, 9, 21), TODAY)).toBe('há 1 ano');
    expect(relativeDays(new Date(2023, 9, 21), TODAY)).toBe('há 3 anos');
  });

  it('data futura vira hoje', () => {
    expect(relativeDays(new Date(2026, 9, 25), TODAY)).toBe('hoje');
  });
});

describe('dateFromInput', () => {
  it('lê o dia digitado ao meio-dia, sem regra de passado ou futuro', () => {
    expect(dateFromInput('21/10/2026')).toEqual(new Date(2026, 9, 21, 12));
    expect(dateFromInput('20/12/2030')).toEqual(new Date(2030, 11, 20, 12));
  });

  it('incompleta ou inexistente: nulo', () => {
    expect(dateFromInput('21/10/20')).toBeNull();
    expect(dateFromInput('30/02/2026')).toBeNull();
    expect(dateFromInput('')).toBeNull();
  });
});

describe('atNoon e sameDay', () => {
  it('o dia escolhido no calendário vira meio-dia', () => {
    expect(atNoon(new Date(2026, 9, 21, 0, 5))).toEqual(new Date(2026, 9, 21, 12));
    expect(atNoon(new Date(2026, 9, 21, 23, 59))).toEqual(new Date(2026, 9, 21, 12));
  });

  it('compara só o dia do calendário', () => {
    expect(sameDay(new Date(2026, 9, 21, 1), new Date(2026, 9, 21, 23))).toBe(true);
    expect(sameDay(new Date(2026, 9, 21), new Date(2026, 9, 22))).toBe(false);
    expect(sameDay(new Date(2025, 9, 21), new Date(2026, 9, 21))).toBe(false);
  });
});
