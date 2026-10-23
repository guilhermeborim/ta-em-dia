import { getJson, postJson } from '../postJson';

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

  it('429 (rate limit da API): inalcançável, para tentar depois e não desistir', async () => {
    const fetchFn = jest.fn(async () => response(429, { code: 'RATE_LIMITED' }));
    expect(await post(fetchFn as unknown as typeof fetch)).toEqual({ kind: 'unreachable' });
  });

  it('4xx: recusado, com o código estável da API', async () => {
    const fetchFn = jest.fn(async () =>
      response(401, { code: 'INVALID_CREDENTIALS', message: 'x' }),
    );
    expect(await post(fetchFn as unknown as typeof fetch)).toEqual({
      kind: 'rejected',
      status: 401,
      code: 'INVALID_CREDENTIALS',
      body: { code: 'INVALID_CREDENTIALS', message: 'x' },
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

describe('token e GET', () => {
  it('com accessToken, manda Authorization: Bearer; sem ele, não manda', async () => {
    const fetchFn = jest.fn(async () => response(200, {}));
    await postJson('https://api.test', '/v1/x', {}, fetchFn as unknown as typeof fetch, 'abc');
    await postJson('https://api.test', '/v1/x', {}, fetchFn as unknown as typeof fetch);
    const calls = fetchFn.mock.calls as unknown as [string, RequestInit][];
    expect(calls[0][1].headers).toEqual({
      'content-type': 'application/json',
      authorization: 'Bearer abc',
    });
    expect(calls[1][1].headers).toEqual({ 'content-type': 'application/json' });
  });

  it('getJson: GET sem corpo, com o mesmo tratamento de erros', async () => {
    const ok = jest.fn(async () => response(200, { n: 1 }));
    expect(
      await getJson('https://api.test', '/v1/y?a=1', ok as unknown as typeof fetch, 'abc'),
    ).toEqual({ kind: 'ok', body: { n: 1 } });
    const [url, init] = ok.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.test/v1/y?a=1');
    expect(init.method).toBe('GET');
    expect(init.body).toBeUndefined();

    const down = jest.fn(async () => response(503, {}));
    expect(await getJson('https://api.test', '/v1/y', down as unknown as typeof fetch)).toEqual({
      kind: 'unreachable',
    });
    const denied = jest.fn(async () => response(401, { code: 'UNAUTHORIZED' }));
    expect(await getJson('https://api.test', '/v1/y', denied as unknown as typeof fetch)).toEqual({
      kind: 'rejected',
      status: 401,
      code: 'UNAUTHORIZED',
      body: { code: 'UNAUTHORIZED' },
    });
  });
});
