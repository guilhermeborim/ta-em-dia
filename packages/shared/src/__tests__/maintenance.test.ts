import { describe, expect, it } from 'vitest';
import {
  isCustomMaintenanceType,
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
