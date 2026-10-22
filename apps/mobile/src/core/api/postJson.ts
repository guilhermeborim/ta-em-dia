/** Resultado de uma chamada à API. Nunca lança: o app funciona sem a API. */
export type ApiResult =
  | { kind: 'ok'; body: unknown }
  /** A API respondeu que o pedido está errado (4xx). Tentar de novo igual não adianta. */
  | { kind: 'rejected'; status: number; code?: string }
  /** Sem internet, timeout ou erro do servidor (5xx). Vale tentar de novo mais tarde. */
  | { kind: 'unreachable' };

/** O serviço grátis da API dorme sem uso e leva cerca de 1 minuto para acordar. */
export const API_TIMEOUT_MS = 60_000;

/**
 * POST com corpo JSON. Nada do corpo nem da resposta vai para log ou erro (tem segredo e token).
 */
export async function postJson(
  apiUrl: string,
  path: string,
  body: unknown,
  fetchFn: typeof fetch = fetch,
): Promise<ApiResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const res = await fetchFn(`${apiUrl}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (res.ok) return { kind: 'ok', body: await res.json() };
    if (res.status >= 500) return { kind: 'unreachable' };
    const error = (await res.json().catch(() => null)) as { code?: unknown } | null;
    return {
      kind: 'rejected',
      status: res.status,
      code: typeof error?.code === 'string' ? error.code : undefined,
    };
  } catch {
    return { kind: 'unreachable' };
  } finally {
    clearTimeout(timer);
  }
}
