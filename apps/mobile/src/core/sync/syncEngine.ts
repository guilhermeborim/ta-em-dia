import {
  SYNC_PROTOCOL_VERSION,
  SYNC_PULL_MAX_LIMIT,
  syncPullResponseSchema,
  syncPushResponseSchema,
} from '@ta-em-dia/shared';
import { getJson, postJson } from '../api';
import type { Db } from '../db';
import { applyPulledChanges } from './pullApply';
import { readOutboxBatch, removeFromOutbox } from './outboxQueue';
import { getSyncSince, setLastSyncedAt } from './syncState';

export type SyncOutcome =
  /** Tudo enviado e recebido. */
  | 'done'
  /** Sem rede, timeout, erro do servidor ou limite de chamadas (429): tentar de novo depois. */
  | 'retry'
  /** A API recusou o pedido (4xx, menos 401): tentar igual não adianta. */
  | 'rejected'
  /** A API recusou o access token (401): renovar a sessão e tentar de novo. */
  | 'unauthorized';

export interface SyncEngineDeps {
  db: Db;
  apiUrl: string;
  accessToken: string;
  fetchFn?: typeof fetch;
  /** Linhas por pull (padrão: o máximo da API). */
  pullLimit?: number;
  /** Chamado a cada lote enviado, com quantas mudanças saíram da fila (para a barra de progresso). */
  onPushed?: (count: number) => void;
}

export interface SyncResult {
  outcome: SyncOutcome;
  /** Linhas do servidor que mudaram o SQLite local. */
  applied: number;
}

/** Trava de segurança: um sync nunca passa de tantos lotes (a fila ou o servidor seguem no próximo). */
const MAX_ROUNDS = 100;

/**
 * Um ciclo de sync: envia a `outbox` em lotes e depois traz o que mudou no servidor, em páginas.
 * Enviar vem antes de receber, para a cópia do servidor não passar por cima de mudança local que
 * ainda não saiu. Para na primeira falha (a fila e o `since` ficam como estavam) e nunca lança erro.
 */
export async function syncNow(deps: SyncEngineDeps): Promise<SyncResult> {
  const { db, apiUrl, accessToken, fetchFn } = deps;
  let applied = 0;

  try {
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const batch = await readOutboxBatch(db);
      await removeFromOutbox(db, batch.invalid);
      if (batch.changes.length === 0) {
        if (batch.invalid.length === 0) break;
        continue;
      }

      const result = await postJson(
        apiUrl,
        '/v1/sync/push',
        { protocol: SYNC_PROTOCOL_VERSION, changes: batch.changes },
        fetchFn,
        accessToken,
      );
      if (result.kind === 'unreachable') return { outcome: 'retry', applied };
      if (result.kind === 'rejected') {
        return { outcome: result.status === 401 ? 'unauthorized' : 'rejected', applied };
      }
      const response = syncPushResponseSchema.safeParse(result.body);
      // Resposta fora do contrato (API de outra versão) ou de outro tamanho: não dá para saber o
      // que foi aceito, então a fila fica como está.
      if (!response.success || response.data.results.length !== batch.changes.length) {
        return { outcome: 'retry', applied };
      }
      // Aceitas e rejeitadas saem da fila: a rejeitada perdeu para o servidor e volta no pull.
      await removeFromOutbox(db, batch.ids);
      deps.onPushed?.(batch.ids.length);
    }

    const limit = deps.pullLimit ?? SYNC_PULL_MAX_LIMIT;
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const since = await getSyncSince(db);
      const result = await getJson(
        apiUrl,
        `/v1/sync/pull?protocol=${SYNC_PROTOCOL_VERSION}&since=${since}&limit=${limit}`,
        fetchFn,
        accessToken,
      );
      if (result.kind === 'unreachable') return { outcome: 'retry', applied };
      if (result.kind === 'rejected') {
        return { outcome: result.status === 401 ? 'unauthorized' : 'rejected', applied };
      }
      const page = syncPullResponseSchema.safeParse(result.body);
      if (!page.success) return { outcome: 'retry', applied };

      applied += await applyPulledChanges(db, page.data.changes, page.data.nextSince);
      if (!page.data.hasMore) break;
    }
    await setLastSyncedAt(db, new Date());
    return { outcome: 'done', applied };
  } catch {
    // Erro do banco local ou algo inesperado: tenta de novo mais tarde, sem derrubar o app.
    return { outcome: 'retry', applied };
  }
}
