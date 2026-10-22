import { postJson } from '../postJson';

const response = (status: number, body: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (body === undefined) throw new Error('sem corpo');
      return body;
    },
  }) as Response;

const post = (fetchFn: typeof fetch) => postJson('https://api.test', '/v1/x', { a: 1 }, fetchFn);

describe('postJson', () => {
  it('2xx: devolve o corpo e manda JSON para a URL certa', async () => {
    const fetchFn = jest.fn(async () => response(200, { ok: true }));
    expect(await post(fetchFn as unknown as typeof fetch)).toEqual({
      kind: 'ok',
      body: { ok: true },
    });
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.test/v1/x');
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"a":1}');
    expect(init.headers).toEqual({ 'content-type': 'application/json' });
  });

  it('4xx: recusado, com o código estável da API', async () => {
    const fetchFn = jest.fn(async () =>
      response(401, { code: 'INVALID_CREDENTIALS', message: 'x' }),
    );
    expect(await post(fetchFn as unknown as typeof fetch)).toEqual({
      kind: 'rejected',
      status: 401,
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('4xx sem corpo JSON: recusado, sem código', async () => {
    const fetchFn = jest.fn(async () => response(400, undefined));
    expect(await post(fetchFn as unknown as typeof fetch)).toEqual({
      kind: 'rejected',
      status: 400,
      code: undefined,
    });
  });

  it('5xx e falha de rede: inalcançável (vale tentar de novo)', async () => {
    const serverError = jest.fn(async () => response(503, undefined));
    expect(await post(serverError as unknown as typeof fetch)).toEqual({ kind: 'unreachable' });
    const offline = jest.fn(async () => {
      throw new TypeError('Network request failed');
    });
    expect(await post(offline as unknown as typeof fetch)).toEqual({ kind: 'unreachable' });
  });

  it('timeout aborta a chamada e vira inalcançável', async () => {
    jest.useFakeTimers();
    try {
      const hanging = jest.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(new Error('abortado')));
          }),
      );
      const pending = post(hanging as unknown as typeof fetch);
      await jest.advanceTimersByTimeAsync(60_000);
      expect(await pending).toEqual({ kind: 'unreachable' });
    } finally {
      jest.useRealTimers();
    }
  });
});
