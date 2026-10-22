import {
  clearInstallationCredentials,
  ensureInstallationCredentials,
  type SecretStore,
} from '../installation';

function memoryStore(): SecretStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItemAsync: async (key) => data.get(key) ?? null,
    setItemAsync: async (key, value) => void data.set(key, value),
    deleteItemAsync: async (key) => void data.delete(key),
  };
}

describe('ensureInstallationCredentials', () => {
  it('gera e guarda id e segredo na primeira vez', async () => {
    const store = memoryStore();
    const creds = await ensureInstallationCredentials(store, {
      id: () => 'id-1',
      secret: () => 's-1',
    });
    expect(creds).toEqual({ installationId: 'id-1', secret: 's-1' });
    expect(store.data.size).toBe(2);
  });

  it('reaproveita o que já existe', async () => {
    const store = memoryStore();
    await ensureInstallationCredentials(store, { id: () => 'id-1', secret: () => 's-1' });
    const again = await ensureInstallationCredentials(store, {
      id: () => 'id-2',
      secret: () => 's-2',
    });
    expect(again).toEqual({ installationId: 'id-1', secret: 's-1' });
  });

  it('apaga as credenciais ao limpar', async () => {
    const store = memoryStore();
    await ensureInstallationCredentials(store, { id: () => 'id-1', secret: () => 's-1' });
    await clearInstallationCredentials(store);
    expect(store.data.size).toBe(0);
  });
});
