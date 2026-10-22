import { describe, expect, it } from 'vitest';
import {
  isCustomMaintenanceType,
  maintenanceReminders,
  MAINTENANCE_CATALOG,
  maintenanceLabel,
  maintenanceStatus,
  resolveMaintenanceType,
} from '../maintenance';

const plan = (patch = {}) => ({
  intervalKm: 10000,
  intervalMonths: 12,
  lastDoneKm: 40000,
  lastDoneAt: new Date(2026, 0, 12),
  ...patch,
});
const today = new Date(2026, 9, 21);

describe('maintenanceLabel', () => {
  it('usa o nome do catálogo ou o texto digitado em "Outro"', () => {
    expect(maintenanceLabel('oil')).toBe('Troca de óleo');
    expect(maintenanceLabel('Troca de bateria')).toBe('Troca de bateria');
  });

  it('o catálogo não repete código e todo item tem intervalo', () => {
    const codes = MAINTENANCE_CATALOG.map((i) => i.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(MAINTENANCE_CATALOG.every((i) => i.intervalKm || i.intervalMonths)).toBe(true);
  });
});

describe('resolveMaintenanceType', () => {
  it('nome de item pronto vira o código (ignora maiúsculas e acentos)', () => {
    expect(resolveMaintenanceType('troca de oleo')).toBe('oil');
    expect(resolveMaintenanceType('  ALINHAMENTO ')).toBe('alignment');
    expect(resolveMaintenanceType('revisão')).toBe('service');
    expect(resolveMaintenanceType('Óleo')).toBe('oil');
  });

  it('reaproveita a grafia de um atalho "Seu" que já existe', () => {
    expect(resolveMaintenanceType('troca de BATERIA', ['Troca de bateria'])).toBe(
      'Troca de bateria',
    );
  });

  it('nome novo fica como foi digitado, sem espaços sobrando', () => {
    expect(resolveMaintenanceType('  Troca   de bateria ')).toBe('Troca de bateria');
  });

  it('vazio não é um tipo', () => {
    expect(resolveMaintenanceType('   ')).toBeNull();
  });
});

describe('isCustomMaintenanceType', () => {
  it('código do catálogo não é "Seu"; nome digitado é', () => {
    expect(isCustomMaintenanceType('oil')).toBe(false);
    expect(isCustomMaintenanceType('Troca de bateria')).toBe(true);
  });
});

describe('maintenanceStatus', () => {
  it('em dia: poucos km e pouco tempo passados', () => {
    const status = maintenanceStatus(plan({ intervalMonths: undefined }), 43500, 30, today);
    expect(status).toMatchObject({
      tone: 'ok',
      limiting: 'km',
      usedKm: 3500,
      remainingKm: 6500,
    });
    expect(status.progress).toBeCloseTo(0.35);
    // 6.500 km ÷ 30 km/dia.
    expect(status.remainingDays).toBe(217);
  });

  it('perto de vencer: 80% ou mais do intervalo', () => {
    const status = maintenanceStatus(plan({ intervalMonths: undefined }), 48600, 42, today);
    expect(status).toMatchObject({ tone: 'soon', remainingKm: 1400 });
    expect(status.remainingDays).toBe(34);
  });

  it('vencido: passou do intervalo em km', () => {
    const status = maintenanceStatus(plan({ intervalMonths: undefined }), 50300, 42, today);
    expect(status).toMatchObject({ tone: 'overdue', remainingKm: -300 });
    expect(status.remainingDays).toBe(-7);
  });

  it('vale o que vencer primeiro: o tempo pode vencer antes dos km', () => {
    // 1.000 km rodados (10%), mas em 20 nov já passaram 86% dos 12 meses (até 12 jan 2027).
    const late = new Date(2026, 10, 20);
    const status = maintenanceStatus(plan(), 41000, 30, late);
    expect(status.limiting).toBe('time');
    expect(status.tone).toBe('soon');
    expect(status.usedMonths).toBe(10);
    // 53 dias até 12 jan 2027 (a média diária levaria 300 dias).
    expect(status.remainingDays).toBe(53);
  });

  it('só por tempo: sem km restantes', () => {
    const status = maintenanceStatus(
      { intervalMonths: 24, lastDoneKm: 10000, lastDoneAt: new Date(2026, 0, 1) },
      30000,
      30,
      today,
    );
    expect(status.limiting).toBe('time');
    expect(status.remainingKm).toBeNull();
    expect(status.tone).toBe('ok');
  });

  it('sem intervalo: só histórico, sem alerta', () => {
    expect(
      maintenanceStatus({ lastDoneKm: 50110, lastDoneAt: new Date(2026, 9, 12) }, 50500, 30, today),
    ).toEqual({
      tone: 'none',
      limiting: null,
      progress: null,
      usedKm: 390,
      usedMonths: 0,
      remainingKm: null,
      remainingDays: null,
    });
  });

  it('sem média diária (0), só o tempo conta para os dias', () => {
    const status = maintenanceStatus(plan(), 41000, 0, new Date(2026, 10, 20));
    expect(status.remainingDays).toBe(53);
  });
});

describe('maintenanceReminders', () => {
  const base = {
    id: 'p1',
    enabled: true,
    lastDoneKm: 40000,
    lastDoneAt: new Date(2026, 0, 12),
    notifyBeforeKm: 500,
    notifyBeforeDays: 7,
  };
  const at9 = (y: number, m: number, d: number) => new Date(y, m, d, 9);

  it('por km: avisa quando faltarem 500 km, pela média diária', () => {
    // Faltam 1.400 km; 900 km até o limite de aviso ÷ 42 km/dia = 22 dias.
    const [reminder] = maintenanceReminders([{ ...base, intervalKm: 10000 }], 48600, 42, today);
    expect(reminder).toEqual({
      planId: 'p1',
      fireAt: at9(2026, 10, 12),
      kind: 'km',
      crossed: false,
    });
  });

  it('por tempo: avisa 7 dias antes da data limite', () => {
    // 12 meses depois de 12 jan 2026 = 12 jan 2027; menos 7 dias = 5 jan.
    const [reminder] = maintenanceReminders([{ ...base, intervalMonths: 12 }], 41000, 30, today);
    expect(reminder).toEqual({
      planId: 'p1',
      fireAt: at9(2027, 0, 5),
      kind: 'time',
      crossed: false,
    });
  });

  it('com km e meses, vale o que avisar primeiro', () => {
    const plan = { ...base, intervalKm: 10000, intervalMonths: 12 };
    expect(maintenanceReminders([plan], 41000, 30, today)[0].kind).toBe('time');
    expect(maintenanceReminders([plan], 48600, 42, today)[0].kind).toBe('km');
  });

  it('já dentro do limite: fireAt é o 9h de hoje (pode estar no passado)', () => {
    const [reminder] = maintenanceReminders([{ ...base, intervalKm: 10000 }], 49700, 42, today);
    expect(reminder.fireAt).toEqual(at9(2026, 9, 21));
    expect(reminder.crossed).toBe(true);
  });

  it('sem média diária, os km só avisam se já estiverem dentro do limite', () => {
    const plan = { ...base, intervalKm: 10000 };
    expect(maintenanceReminders([plan], 48600, 0, today)).toEqual([]);
    expect(maintenanceReminders([plan], 49700, 0, today)).toHaveLength(1);
  });

  it('usa os padrões quando o plano não define o aviso', () => {
    const plan = { ...base, intervalKm: 10000, notifyBeforeKm: null, notifyBeforeDays: undefined };
    expect(maintenanceReminders([plan], 48600, 42, today)[0].fireAt).toEqual(at9(2026, 10, 12));
  });

  it('ignora itens desativados, sem intervalo ou de só histórico', () => {
    expect(
      maintenanceReminders(
        [
          { ...base, id: 'a', intervalKm: 10000, enabled: false },
          { ...base, id: 'b' },
        ],
        48600,
        42,
        today,
      ),
    ).toEqual([]);
  });

  it('ordena do aviso mais cedo para o mais tarde', () => {
    const list = maintenanceReminders(
      [
        { ...base, id: 'late', intervalMonths: 12 },
        { ...base, id: 'soon', intervalKm: 10000 },
      ],
      49000,
      42,
      today,
    );
    expect(list.map((r) => r.planId)).toEqual(['soon', 'late']);
  });
});
