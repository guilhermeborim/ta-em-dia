import {
  deleteFailureMessage,
  deleteSummary,
  isDeleteConfirmed,
} from '../models/deleteAccount.model';

describe('isDeleteConfirmed', () => {
  it('libera com EXCLUIR, sem diferenciar maiúsculas nem espaços nas pontas', () => {
    expect(isDeleteConfirmed('EXCLUIR')).toBe(true);
    expect(isDeleteConfirmed(' excluir ')).toBe(true);
  });

  it('não libera vazio, incompleto ou com outra palavra', () => {
    expect(isDeleteConfirmed('')).toBe(false);
    expect(isDeleteConfirmed('EXCLUI')).toBe(false);
    expect(isDeleteConfirmed('EXCLUIR TUDO')).toBe(false);
  });
});

describe('deleteSummary', () => {
  it('lista veículos, registros, lembretes e a conta do provedor', () => {
    expect(deleteSummary({ vehicles: 2, records: 47 }, 'google')).toEqual([
      '2 veículos',
      '47 registros de abastecimento e manutenção',
      'Lembretes e prazos de documentos',
      'Sua conta Google vinculada ao app',
    ]);
  });

  it('usa o singular e o nome da Apple', () => {
    const [vehicles, records, , account] = deleteSummary({ vehicles: 1, records: 1 }, 'apple');
    expect(vehicles).toBe('1 veículo');
    expect(records).toBe('1 registro de abastecimento e manutenção');
    expect(account).toBe('Sua conta Apple vinculada ao app');
  });
});

describe('deleteFailureMessage', () => {
  it('avisa que nada foi apagado', () => {
    expect(deleteFailureMessage('retry')).toContain('Nada foi apagado');
    expect(deleteFailureMessage('rejected')).toContain('Nada foi apagado');
  });
});
