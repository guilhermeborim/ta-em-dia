import { migrate } from '../../../core/db';
import { createTestDb } from '../../../core/db/testing/testDb';
import { setLastSyncedAt } from '../../../core/sync/syncState';
import {
  conflictBody,
  failureMessage,
  formatLastSync,
  isEmptyAccount,
  loadLocalData,
  mergeBlockedHint,
  mergeHint,
  progressOf,
} from '../models/account.model';

describe('loadLocalData', () => {
  it('conta veículos e registros (abastecimentos e serviços) sem os excluídos e lê o último sync', async () => {
    const db = createTestDb();
    await migrate(db);
    const now = new Date('2026-10-23T12:00:00.000Z');
    expect(await loadLocalData(db)).toEqual({ vehicles: 0, records: 0, lastSyncedAt: null });

    await db.runAsync(
      `INSERT INTO vehicles (id, name, type, initial_km, sort_order, created_at, updated_at, deleted_at)
       VALUES ('v1', 'Gol', 'flex', 0, 0, ?, ?, NULL), ('v2', 'Del', 'flex', 0, 1, ?, ?, ?)`,
      now.toISOString(),
      now.toISOString(),
      now.toISOString(),
      now.toISOString(),
      now.toISOString(),
    );
    await db.runAsync(
      `INSERT INTO fuel_entries (id, vehicle_id, date, km, fuel_type, liters, price_per_liter, total, full_tank, created_at, updated_at, deleted_at)
       VALUES ('f1', 'v1', ?, 10, 'gasoline', 1, 1, 1, 1, ?, ?, NULL), ('f2', 'v1', ?, 20, 'gasoline', 1, 1, 1, 1, ?, ?, ?)`,
      now.toISOString(),
      now.toISOString(),
      now.toISOString(),
      now.toISOString(),
      now.toISOString(),
      now.toISOString(),
      now.toISOString(),
    );
    await setLastSyncedAt(db, now);

    expect(await loadLocalData(db)).toEqual({
      vehicles: 1,
      records: 1,
      lastSyncedAt: now.toISOString(),
    });
  });
});

describe('formatLastSync', () => {
  const now = new Date(2026, 9, 23, 15, 0);
  const at = (day: number, hour: number, minute: number) =>
    new Date(2026, 9, day, hour, minute).toISOString();

  it('hoje, ontem e dia/mês', () => {
    expect(formatLastSync(at(23, 9, 12), now)).toBe('hoje, 09:12');
    expect(formatLastSync(at(22, 23, 5), now)).toBe('ontem, 23:05');
    expect(formatLastSync(at(5, 8, 0), now)).toBe('05/10, 08:00');
  });

  it('sem sync ou data quebrada: "Ainda não"', () => {
    expect(formatLastSync(null, now)).toBe('Ainda não');
    expect(formatLastSync('lixo', now)).toBe('Ainda não');
  });
});

describe('textos da tela 24', () => {
  it('descreve o que a conta tem, no singular e no plural', () => {
    expect(conflictBody({ vehicles: 1, records: 22 })).toBe(
      'Encontramos 1 veículo e 22 registros salvos de outro celular. O que fazer com os dados deste aparelho?',
    );
    expect(conflictBody({ vehicles: 2, records: 1 })).toContain('2 veículos e 1 registro salvos');
  });

  it('"Juntar dados" soma o aparelho e a conta (como no Figma: 1 + 1 veículo, 47 + 22 registros)', () => {
    expect(mergeHint({ vehicles: 1, records: 47 }, { vehicles: 1, records: 22 })).toBe(
      'Soma tudo: 2 veículos e 69 registros',
    );
  });

  it('explica por que "Juntar dados" está bloqueado no plano grátis', () => {
    expect(mergeBlockedHint(1)).toBe('No plano grátis, o app guarda 1 veículo');
    expect(mergeBlockedHint(3)).toBe('No plano grátis, o app guarda 3 veículos');
  });

  it('conta vazia não pergunta nada', () => {
    expect(isEmptyAccount({ vehicles: 0, records: 0 })).toBe(true);
    expect(isEmptyAccount({ vehicles: 0, records: 3 })).toBe(false);
  });
});

describe('failureMessage', () => {
  it('janela fechada não avisa; os outros casos têm texto', () => {
    expect(failureMessage('cancelled')).toBeNull();
    for (const status of ['unavailable', 'retry', 'rejected', 'error'] as const) {
      expect(failureMessage(status)).toEqual(expect.any(String));
    }
  });
});

describe('progressOf', () => {
  it('vai de 0 a 1 e fila vazia vale 1', () => {
    expect(progressOf(32, 47)).toBeCloseTo(0.68, 2);
    expect(progressOf(0, 0)).toBe(1);
    expect(progressOf(60, 47)).toBe(1);
  });
});
