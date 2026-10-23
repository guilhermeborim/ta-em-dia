import type { SyncChange, SyncPulledChange } from '@ta-em-dia/shared';

interface StoredChange {
  version: number;
  change: SyncChange;
}

const json = (status: number, body: unknown) =>
  ({ ok: status < 300, status, json: async () => body }) as Response;

/**
 * API de mentira com a mesma regra da real: guarda a última mudança de cada linha, com uma versão
 * nova a cada mudança aceita, e devolve em páginas a partir de `since`. Mais velha que a guardada
 * é rejeitada como `STALE`.
 */
export function createFakeServer() {
  const stored = new Map<string, StoredChange>();
  let version = 0;
  const calls: { method: string; path: string; token?: string }[] = [];
  const state = { down: false, unauthorized: false, malformedPush: false };

  const fetchFn = (async (url: string, init: RequestInit) => {
    const parsed = new URL(url);
    const headers = init.headers as Record<string, string>;
    calls.push({
      method: init.method ?? 'GET',
      path: parsed.pathname,
      token: headers.authorization?.replace('Bearer ', ''),
    });
    if (state.down) throw new Error('sem rede');
    if (state.unauthorized) return json(401, { code: 'UNAUTHORIZED' });

    if (init.method === 'POST') {
      const { changes } = JSON.parse(init.body as string) as { changes: SyncChange[] };
      if (state.malformedPush) return json(200, { protocol: 1, results: [] });
      const results = changes.map((change) => {
        const key = `${change.table}:${change.id}`;
        const existing = stored.get(key);
        if (existing && existing.change.updatedAt > change.updatedAt) {
          return { table: change.table, id: change.id, status: 'rejected', reason: 'STALE' };
        }
        stored.set(key, { version: ++version, change });
        return { table: change.table, id: change.id, status: 'accepted' };
      });
      return json(200, { protocol: 1, results });
    }

    const since = Number(parsed.searchParams.get('since'));
    const limit = Number(parsed.searchParams.get('limit'));
    const rows = [...stored.values()]
      .filter((row) => row.version > since)
      .sort((a, b) => a.version - b.version);
    const page = rows.slice(0, limit);
    const changes: SyncPulledChange[] = page.map(({ version: v, change }) => ({
      table: change.table,
      id: change.id,
      op: change.op,
      version: String(v),
      updatedAt: change.updatedAt,
      payload: change.payload,
    }));
    return json(200, {
      protocol: 1,
      changes,
      nextSince: String(page.at(-1)?.version ?? since),
      hasMore: rows.length > limit,
    });
  }) as unknown as typeof fetch;

  return { fetchFn, calls, state, stored };
}
