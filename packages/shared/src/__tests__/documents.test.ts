import { describe, expect, it } from 'vitest';
import {
  currentDocuments,
  documentHistory,
  documentReminders,
  documentYear,
  lateDocumentReminder,
  documentStatus,
  isVehicleDocument,
  nextYearDueDate,
  parseDueDate,
  toDueDate,
} from '../documents';
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

describe('documentReminders', () => {
  const now = new Date(2026, 9, 21, 10);
  const input = (patch = {}) => ({
    id: 'a',
    kind: 'ipva' as const,
    dueDate: '2026-12-20',
    notifyDays: [30, 7],
    ...patch,
  });

  it('um aviso por dia de antecedência, às 9h, do mais próximo ao mais distante', () => {
    const reminders = documentReminders([input()], now);
    expect(reminders.map((r) => [r.daysBefore, r.fireAt])).toEqual([
      [30, new Date(2026, 10, 20, 9)],
      [7, new Date(2026, 11, 13, 9)],
    ]);
    expect(reminders[0]).toMatchObject({ documentId: 'a', kind: 'ipva' });
  });

  it('não repete o que já passou: 23 dias antes, só o aviso de 7 dias', () => {
    const reminders = documentReminders([input({ dueDate: '2026-11-13' })], now);
    expect(reminders.map((r) => r.daysBefore)).toEqual([7]);
  });

  it('o aviso de hoje só vale se as 9h ainda não passaram', () => {
    expect(documentReminders([input({ dueDate: '2026-10-28' })], now)).toEqual([]);
    expect(
      documentReminders([input({ dueDate: '2026-10-28' })], new Date(2026, 9, 21, 8)),
    ).toHaveLength(1);
  });

  it('vencido, sem antecedência ou data inválida: nada', () => {
    expect(documentReminders([input({ dueDate: '2026-10-15' })], now)).toEqual([]);
    expect(documentReminders([input({ notifyDays: [] })], now)).toEqual([]);
    expect(documentReminders([input({ dueDate: 'xx' })], now)).toEqual([]);
  });

  it('mistura os prazos em ordem e ignora dias repetidos', () => {
    const reminders = documentReminders(
      [
        input({ id: 'a', notifyDays: [7, 7] }),
        input({ id: 'b', kind: 'cnh', dueDate: '2026-12-01', notifyDays: [7] }),
      ],
      now,
    );
    expect(reminders.map((r) => r.documentId)).toEqual(['b', 'a']);
  });
});

describe('lateDocumentReminder', () => {
  const now = new Date(2026, 9, 21, 10);
  const input = (patch = {}) => ({
    id: 'a',
    kind: 'ipva' as const,
    dueDate: '2026-10-31',
    notifyDays: [30, 7],
    ...patch,
  });

  it('prazo dentro da janela: avisa uma vez, no próximo 9h, com os dias que faltam', () => {
    expect(lateDocumentReminder(input(), now)).toEqual({
      documentId: 'a',
      kind: 'ipva',
      daysLeft: 9,
      fireAt: new Date(2026, 9, 22, 9),
    });
  });

  it('antes das 9h o aviso é de hoje', () => {
    const early = new Date(2026, 9, 21, 8);
    expect(lateDocumentReminder(input(), early)).toMatchObject({
      daysLeft: 10,
      fireAt: new Date(2026, 9, 21, 9),
    });
  });

  it('nenhum aviso perdido: nada', () => {
    expect(lateDocumentReminder(input({ dueDate: '2026-12-31' }), now)).toBeNull();
  });

  it('vence hoje antes das 9h ainda avisa; depois das 9h o próximo 9h já é tarde', () => {
    const due = input({ dueDate: '2026-10-21' });
    expect(lateDocumentReminder(due, new Date(2026, 9, 21, 8))).toMatchObject({ daysLeft: 0 });
    expect(lateDocumentReminder(due, now)).toBeNull();
  });

  it('vencido, sem antecedência ou data inválida: nada', () => {
    expect(lateDocumentReminder(input({ dueDate: '2026-10-15' }), now)).toBeNull();
    expect(lateDocumentReminder(input({ notifyDays: [] }), now)).toBeNull();
    expect(lateDocumentReminder(input({ dueDate: 'xx' }), now)).toBeNull();
  });
});

describe('prazos por ano', () => {
  const GOL = '018bcfe5-6800-7000-8000-000000000001';
  const UNO = '018bcfe5-6800-7000-8000-000000000002';
  const item = (kind: 'ipva' | 'cnh', dueDate: string, vehicleId?: string) => ({
    kind,
    dueDate,
    vehicleId,
  });

  it('o ano é o do vencimento', () => {
    expect(documentYear('2026-11-20')).toBe(2026);
    expect(() => documentYear('2026-02-30')).toThrow();
  });

  it('o ano seguinte guarda o dia; 29/02 cai em 28/02 se não for bissexto', () => {
    expect(nextYearDueDate('2026-11-20')).toBe('2027-11-20');
    expect(nextYearDueDate('2028-02-29')).toBe('2029-02-28');
    expect(nextYearDueDate('2027-12-31')).toBe('2028-12-31');
    expect(() => nextYearDueDate('2026-13-01')).toThrow();
  });

  it('o prazo atual de cada tipo é o de vencimento mais recente, por veículo', () => {
    const list = [
      item('ipva', '2025-11-20', GOL),
      item('ipva', '2027-11-20', GOL),
      item('ipva', '2026-11-20', GOL),
      item('ipva', '2025-11-20', UNO),
      item('cnh', '2024-05-01'),
      item('cnh', '2029-05-01'),
    ];
    expect(currentDocuments(list)).toEqual([list[1], list[3], list[5]]);
  });

  it('o histórico é o resto, do mais novo ao mais antigo', () => {
    const list = [
      item('ipva', '2025-11-20', GOL),
      item('ipva', '2027-11-20', GOL),
      item('ipva', '2026-11-20', GOL),
      item('cnh', '2029-05-01'),
    ];
    expect(documentHistory(list).map((d) => d.dueDate)).toEqual(['2026-11-20', '2025-11-20']);
  });

  it('um prazo só, ou nenhum: não há histórico', () => {
    expect(currentDocuments([])).toEqual([]);
    expect(documentHistory([item('ipva', '2026-11-20', GOL)])).toEqual([]);
  });
});
