import { describe, expect, it } from 'vitest';
import { documentStatus, isVehicleDocument, parseDueDate, toDueDate } from '../documents';
import { documentSchema } from '../schemas';

const today = new Date(2026, 9, 21, 15);

describe('toDueDate e parseDueDate', () => {
  it('vão e voltam sem mudar o dia', () => {
    expect(toDueDate(new Date(2026, 10, 20, 23, 59))).toBe('2026-11-20');
    expect(toDueDate(parseDueDate('2026-02-05')!)).toBe('2026-02-05');
  });

  it('recusa data que não existe ou mal escrita', () => {
    expect(parseDueDate('2026-02-30')).toBeNull();
    expect(parseDueDate('2026-13-01')).toBeNull();
    expect(parseDueDate('20/11/2026')).toBeNull();
    expect(parseDueDate('')).toBeNull();
  });
});

describe('documentStatus', () => {
  it('vencido: o dia já passou', () => {
    expect(documentStatus('2026-10-15', today)).toEqual({ tone: 'overdue', daysLeft: -6 });
    expect(documentStatus('2026-10-20', today)).toEqual({ tone: 'overdue', daysLeft: -1 });
  });

  it('vence hoje ainda não é vencido', () => {
    expect(documentStatus('2026-10-21', today)).toEqual({ tone: 'soon', daysLeft: 0 });
  });

  it('perto: faltam até 30 dias (o maior aviso)', () => {
    expect(documentStatus('2026-11-13', today)).toEqual({ tone: 'soon', daysLeft: 23 });
    expect(documentStatus('2026-11-20', today)).toEqual({ tone: 'soon', daysLeft: 30 });
  });

  it('em dia: mais de 30 dias', () => {
    expect(documentStatus('2026-11-21', today)).toEqual({ tone: 'ok', daysLeft: 31 });
    expect(documentStatus('2027-09-30', today).tone).toBe('ok');
  });

  it('o limite de "perto" pode ser outro', () => {
    expect(documentStatus('2026-11-13', today, 15).tone).toBe('ok');
  });

  it('conta dias do calendário na virada do horário de verão e do ano', () => {
    expect(documentStatus('2027-01-01', new Date(2026, 11, 31, 23, 30)).daysLeft).toBe(1);
  });

  it('data inválida lança erro', () => {
    expect(() => documentStatus('xx', today)).toThrow();
  });
});

describe('documentSchema', () => {
  const base = {
    id: '018bcfe5-6800-7000-8000-000000000001',
    kind: 'ipva',
    dueDate: '2026-11-20',
    notifyDays: [30, 7],
  };

  it('aceita documento do veículo e CNH sem veículo', () => {
    expect(documentSchema.safeParse({ ...base, vehicleId: base.id }).success).toBe(true);
    expect(documentSchema.safeParse({ ...base, kind: 'cnh' }).success).toBe(true);
  });

  it('recusa tipo e data inválidos', () => {
    expect(documentSchema.safeParse({ ...base, kind: 'crlv' }).success).toBe(false);
    expect(documentSchema.safeParse({ ...base, dueDate: '2026-02-30' }).success).toBe(false);
  });

  it('só a CNH é da pessoa', () => {
    expect(isVehicleDocument('ipva')).toBe(true);
    expect(isVehicleDocument('cnh')).toBe(false);
  });
});
