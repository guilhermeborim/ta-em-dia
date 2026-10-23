import type { AuthTokens } from '@ta-em-dia/shared';
import { ensureAnonymousSession, type SessionDeps } from '../anonymousSession';
import type { SecretStore } from '../installation';
import { isSessionValid, loadSession, saveSession, toSession } from '../session';

const NOW = new Date('2026-10-22T12:00:00.000Z');
const tokens: AuthTokens = {
  accessToken: 'access.jwt.token',
  expiresIn: 900,
  refreshToken: 'refresh-token',
  user: { id: '018bcfe5-6800-7000-8000-000000000001', isAnonymous: true, plan: 'free' },
};

function memoryStore(): SecretStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItemAsync: async (key) => data.get(key) ?? null,
    setItemAsync: async (key, value) => void data.set(key, value),
    deleteItemAsync: async (key) => void data.delete(key),
  };
}

const json = (status: number, body: unknown) =>
  ({ ok: status < 300, status, json: async () => body }) as Response;

function setup(fetchFn: jest.Mock) {
  const store = memoryStore();
  const deps: SessionDeps = {
    apiUrl: 'https://api.test',
    platform: 'android',
    store,
    fetchFn: fetchFn as unknown as typeof fetch,
    now: () => NOW,
    credentials: async () => ({ installationId: 'inst-1', secret: 'segredo-1' }),
  };
  return { store, deps };
}

describe('ensureAnonymousSession', () => {
  it('sem sessão: chama a API com o id, o segredo e a plataforma, e guarda os tokens', async () => {
    const fetchFn = jest.fn(async () => json(200, tokens));
    const { store, deps } = setup(fetchFn);

    expect(await ensureAnonymousSession(deps)).toBe('ready');

    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.test/v1/auth/anonymous');
    expect(JSON.parse(init.body as string)).toEqual({
      installationId: 'inst-1',
      secret: 'segredo-1',
      platform: 'android',
    });
    const saved = await loadSession(store);
    expect(saved?.tokens).toEqual(tokens);
    expect(saved?.expiresAt).toBe(NOW.getTime() + 900_000);
  });

  it('com sessão válida: não chama a API', async () => {
    const fetchFn = jest.fn();
    const { store, deps } = setup(fetchFn);
    await saveSession(store, toSession(tokens, NOW));

    expect(await ensureAnonymousSession(deps)).toBe('ready');
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('acesso expirado (ou perto de): troca o refresh token e guarda o par novo', async () => {
    const fresh = { ...tokens, accessToken: 'novo.jwt.token', refreshToken: 'refresh-novo' };
    const fetchFn = jest.fn(async () => json(200, fresh));
    const { store, deps } = setup(fetchFn);
    // Expira em 1 minuto: dentro da folga de 2 minutos.
    await saveSession(store, { tokens, expiresAt: NOW.getTime() + 60_000 });

    expect(await ensureAnonymousSession(deps)).toBe('ready');

    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.test/v1/auth/refresh');
    expect(JSON.parse(init.body as string)).toEqual({ refreshToken: 'refresh-token' });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const saved = await loadSession(store);
    expect(saved?.tokens.accessToken).toBe('novo.jwt.token');
    expect(saved?.tokens.refreshToken).toBe('refresh-novo');
  });

  it('refresh recusado (vencido, reusado ou API antiga sem a rota): entra de novo pelo segredo', async () => {
    for (const status of [401, 404, 400]) {
      const fresh = { ...tokens, accessToken: 'login.jwt.token' };
      const fetchFn = jest.fn(async (url: string) =>
        url.endsWith('/refresh')
          ? json(status, { code: 'INVALID_REFRESH_TOKEN' })
          : json(200, fresh),
      );
      const { store, deps } = setup(fetchFn);
      await saveSession(store, { tokens, expiresAt: NOW.getTime() - 1000 });

      expect(await ensureAnonymousSession(deps)).toBe('ready');
      expect(fetchFn.mock.calls.map(([url]) => url)).toEqual([
        'https://api.test/v1/auth/refresh',
        'https://api.test/v1/auth/anonymous',
      ]);
      expect((await loadSession(store))?.tokens.accessToken).toBe('login.jwt.token');
    }
  });

  it('quem entrou com Google ou Apple e teve o refresh recusado não vira anônimo: fica sem sessão', async () => {
    const fetchFn = jest.fn<Promise<Response>, [string]>(async () =>
      json(401, { code: 'INVALID_REFRESH_TOKEN' }),
    );
    const { store, deps } = setup(fetchFn);
    const account = { ...tokens, user: { ...tokens.user, isAnonymous: false } };
    await saveSession(store, { tokens: account, expiresAt: NOW.getTime() - 1000 });

    expect(await ensureAnonymousSession(deps)).toBe('rejected');
    // Só tentou renovar; não chamou /auth/anonymous.
    expect(fetchFn.mock.calls.map(([url]) => url)).toEqual(['https://api.test/v1/auth/refresh']);
  });

  it('refresh sem rede, 5xx ou 429: tentar de novo, sem cair para o login e sem perder a sessão', async () => {
    for (const fetchFn of [
      jest.fn(async () => {
        throw new TypeError('Network request failed');
      }),
      jest.fn(async () => json(503, {})),
      jest.fn(async () => json(429, { code: 'RATE_LIMITED' })),
    ]) {
      const { store, deps } = setup(fetchFn);
      const expired = { tokens, expiresAt: NOW.getTime() - 1000 };
      await saveSession(store, expired);

      expect(await ensureAnonymousSession(deps)).toBe('retry');
      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(await loadSession(store)).toEqual(expired);
    }
  });

  it('refresh com resposta fora do contrato: tentar de novo', async () => {
    const fetchFn = jest.fn(async () => json(200, { accessToken: 'x' }));
    const { store, deps } = setup(fetchFn);
    await saveSession(store, { tokens, expiresAt: NOW.getTime() - 1000 });
    expect(await ensureAnonymousSession(deps)).toBe('retry');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('login anônimo com 429: tentar de novo (não é recusa)', async () => {
    const fetchFn = jest.fn(async () => json(429, { code: 'RATE_LIMITED' }));
    const { deps } = setup(fetchFn);
    expect(await ensureAnonymousSession(deps)).toBe('retry');
  });

  it('sem internet, timeout ou erro 5xx: tentar de novo, sem guardar nada', async () => {
    for (const fetchFn of [
      jest.fn(async () => {
        throw new TypeError('Network request failed');
      }),
      jest.fn(async () => json(503, {})),
    ]) {
      const { store, deps } = setup(fetchFn);
      expect(await ensureAnonymousSession(deps)).toBe('retry');
      expect(await loadSession(store)).toBeNull();
    }
  });

  it('API recusou o aparelho (401): rejected, sem tentar de novo', async () => {
    const fetchFn = jest.fn(async () => json(401, { code: 'INVALID_CREDENTIALS' }));
    const { store, deps } = setup(fetchFn);
    expect(await ensureAnonymousSession(deps)).toBe('rejected');
    expect(await loadSession(store)).toBeNull();
  });

  it('resposta fora do contrato: tentar de novo, sem guardar lixo', async () => {
    const fetchFn = jest.fn(async () => json(200, { accessToken: 'x' }));
    const { store, deps } = setup(fetchFn);
    expect(await ensureAnonymousSession(deps)).toBe('retry');
    expect(await loadSession(store)).toBeNull();
  });

  it('nunca lança: falha ao ler as credenciais também vira retry', async () => {
    const { deps } = setup(jest.fn());
    const broken = {
      ...deps,
      credentials: async () => {
        throw new Error('SecureStore indisponível');
      },
    };
    expect(await ensureAnonymousSession(broken)).toBe('retry');
  });
});

describe('sessão guardada', () => {
  it('sessão corrompida ou fora do formato é ignorada', async () => {
    const store = memoryStore();
    store.data.set('api_session', 'não é json');
    expect(await loadSession(store)).toBeNull();
    store.data.set('api_session', JSON.stringify({ tokens: { accessToken: 'x' }, expiresAt: 1 }));
    expect(await loadSession(store)).toBeNull();
  });

  it('é válida até 2 minutos antes de expirar', () => {
    const session = toSession(tokens, NOW);
    expect(isSessionValid(session, NOW)).toBe(true);
    expect(isSessionValid(session, new Date(NOW.getTime() + 13 * 60_000))).toBe(false);
    expect(isSessionValid(null, NOW)).toBe(false);
  });
});
