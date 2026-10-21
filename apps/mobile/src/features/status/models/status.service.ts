export interface ApiStatus {
  ok: boolean;
  env?: string;
  version?: string;
  error?: string;
}

const TIMEOUT_MS = 10_000;

/** Model: chama GET /health da API. Nunca lança: devolve o erro no resultado. */
export async function fetchApiStatus(apiUrl: string): Promise<ApiStatus> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${apiUrl}/health`, { signal: controller.signal });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const body = (await res.json()) as { status?: string; env?: string; version?: string };
    return { ok: body.status === 'ok', env: body.env, version: body.version };
  } catch (e) {
    const timedOut = e instanceof Error && e.name === 'AbortError';
    return { ok: false, error: timedOut ? 'Sem resposta (timeout)' : 'Sem conexão' };
  } finally {
    clearTimeout(timer);
  }
}
