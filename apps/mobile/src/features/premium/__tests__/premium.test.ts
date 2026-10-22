import { migrate } from '../../../core/db/migrations';
import { createTestDb } from '../../../core/db/testing/testDb';
import { isOnWaitlist, joinWaitlist, premiumFeatures } from '../models/premium';

describe('premiumFeatures', () => {
  it('lista os 5 recursos do Figma, sem preço', () => {
    expect(premiumFeatures.map((f) => f.title)).toEqual([
      'Leitura da bomba pela câmera',
      'Lembrete ao chegar no posto',
      'Veículos ilimitados',
      'Relatório em PDF',
      'Valor FIPE e multas',
    ]);
    expect(JSON.stringify(premiumFeatures)).not.toMatch(/R\$|preço/i);
  });
});

describe('lista de espera', () => {
  it('começa de fora e, depois de entrar, continua dentro (só no aparelho)', async () => {
    const db = createTestDb();
    await migrate(db);
    expect(await isOnWaitlist(db)).toBe(false);

    await joinWaitlist(db);
    expect(await isOnWaitlist(db)).toBe(true);
    // Preferência local: não entra na fila de sync.
    expect(await db.getAllAsync('SELECT * FROM outbox')).toEqual([]);
  });

  it('entrar de novo não muda nada', async () => {
    const db = createTestDb();
    await migrate(db);
    await joinWaitlist(db);
    await joinWaitlist(db);
    expect(await isOnWaitlist(db)).toBe(true);
  });
});
