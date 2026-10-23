/** Resultado de uma chamada à API. Nunca lança: o app funciona sem a API. */
export type ApiResult =
  | { kind: 'ok'; body: unknown }
  /** A API respondeu que o pedido está errado (4xx, menos 429). Tentar de novo igual não adianta. */
  | { kind: 'rejected'; status: number; code?: string; body?: unknown }
  /** Sem internet, timeout, erro do servidor (5xx) ou limite de chamadas (429). Tentar mais tarde. */
  | { kind: 'unreachable' };

/** O serviço grátis da API dorme sem uso e leva cerca de 1 minuto para acordar. */
export const API_TIMEOUT_MS = 60_000;

async function requestJson(
  apiUrl: string,
  path: string,
  init: { method: 'GET' | 'POST' | 'DELETE'; body?: unknown },
  fetchFn: typeof fetch,
  accessToken?: string,
): Promise<ApiResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (accessToken) headers.authorization = `Bearer ${accessToken}`;
    const res = await fetchFn(`${apiUrl}${path}`, {
      method: init.method,
      headers,
      ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
      signal: controller.signal,
    });
    if (res.ok) return { kind: 'ok', body: await res.json() };
    // 429 é o rate limit da API: passa se esperar, então não é recusa definitiva.
    if (res.status >= 500 || res.status === 429) return { kind: 'unreachable' };
    const error = (await res.json().catch(() => null)) as { code?: unknown } | null;
    return {
      kind: 'rejected',
      status: res.status,
      code: typeof error?.code === 'string' ? error.code : undefined,
      // O corpo do erro serve a quem precisa de mais que o código (ex.: `ACCOUNT_EXISTS`).
      body: error ?? undefined,
    };
  } catch {
    return { kind: 'unreachable' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * POST com corpo JSON. Nada do corpo nem da resposta vai para log ou erro (tem segredo e token).
 * Com `accessToken`, manda `Authorization: Bearer`.
 */
export function postJson(
  apiUrl: string,
  path: string,
  body: unknown,
  fetchFn: typeof fetch = fetch,
  accessToken?: string,
): Promise<ApiResult> {
  return requestJson(apiUrl, path, { method: 'POST', body }, fetchFn, accessToken);
}

/** GET com resposta JSON; mesmas regras de `postJson` (nunca lança, nada vai para log). */
export function getJson(
  apiUrl: string,
  path: string,
  fetchFn: typeof fetch = fetch,
  accessToken?: string,
): Promise<ApiResult> {
  return requestJson(apiUrl, path, { method: 'GET' }, fetchFn, accessToken);
}

/** DELETE com resposta JSON; mesmas regras de `postJson` (nunca lança, nada vai para log). */
export function deleteJson(
  apiUrl: string,
  path: string,
  fetchFn: typeof fetch = fetch,
  accessToken?: string,
): Promise<ApiResult> {
  return requestJson(apiUrl, path, { method: 'DELETE' }, fetchFn, accessToken);
}
