import { formatDateInput, parseDateInput, toDateInput } from '../date';

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
