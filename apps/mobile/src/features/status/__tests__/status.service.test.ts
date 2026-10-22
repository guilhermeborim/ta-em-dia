import { fetchApiStatus, sessionLabel } from '../models/status.service';

const mockFetch = (impl: () => Promise<unknown>) => {
  globalThis.fetch = jest.fn(impl) as unknown as typeof fetch;
};

describe('fetchApiStatus', () => {
  it('lê status, ambiente e versão da API', async () => {
    mockFetch(async () => ({
      ok: true,
      json: async () => ({ status: 'ok', env: 'staging', version: 'abc123' }),
    }));
    expect(await fetchApiStatus('https://api.test')).toEqual({
      ok: true,
      env: 'staging',
      version: 'abc123',
    });
  });

  it('devolve erro quando a API responde com falha', async () => {
    mockFetch(async () => ({ ok: false, status: 503 }));
    expect(await fetchApiStatus('https://api.test')).toEqual({ ok: false, error: 'HTTP 503' });
  });

  it('devolve erro quando não há conexão', async () => {
    mockFetch(async () => {
      throw new TypeError('Network request failed');
    });
    expect(await fetchApiStatus('https://api.test')).toEqual({ ok: false, error: 'Sem conexão' });
  });
});

describe('sessionLabel', () => {
  const now = new Date('2026-10-22T12:00:00.000Z');

  it('sem sessão: ainda não criado', () => {
    expect(sessionLabel(null, now)).toBe('Usuário anônimo na API: ainda não criado');
  });

  it('com sessão: acesso válido ou expirado, sem mostrar token nem id', () => {
    expect(sessionLabel({ expiresAt: now.getTime() + 1 }, now)).toBe(
      'Usuário anônimo na API: criado, acesso válido',
    );
    expect(sessionLabel({ expiresAt: now.getTime() - 1 }, now)).toContain('acesso expirado');
  });
});
