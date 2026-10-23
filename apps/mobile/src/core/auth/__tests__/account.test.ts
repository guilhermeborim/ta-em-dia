import { migrate } from '../../db/migrations';
import { createTestDb } from '../../db/testing/testDb';
import { clearAccount, displayName, initialOf, loadAccount, saveAccount } from '../account';

describe('account', () => {
  it('sem login guardado: null; guarda, lê e limpa', async () => {
    const db = createTestDb();
    await migrate(db);
    expect(await loadAccount(db)).toBeNull();

    await saveAccount(db, { provider: 'apple', name: null, email: 'ana@privaterelay.appleid.com' });
    expect(await loadAccount(db)).toEqual({
      provider: 'apple',
      name: null,
      email: 'ana@privaterelay.appleid.com',
    });

    await clearAccount(db);
    expect(await loadAccount(db)).toBeNull();
  });

  it('nome para mostrar: o do provedor, senão o começo do e-mail, senão "Sua conta"', () => {
    expect(displayName({ name: ' Ana Maria ', email: 'a@b.c' })).toBe('Ana Maria');
    expect(displayName({ name: null, email: 'ana.silva@example.com' })).toBe('ana.silva');
    expect(displayName({ name: '', email: null })).toBe('Sua conta');
  });

  it('inicial do avatar em maiúscula, também com acento', () => {
    expect(initialOf('guilherme')).toBe('G');
    expect(initialOf('érica')).toBe('É');
    expect(initialOf('')).toBe('?');
  });
});
