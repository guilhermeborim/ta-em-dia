import type { Db } from '../db';
import { syncNow, type SyncEngineDeps, type SyncOutcome } from './syncEngine';

/**
 * As tabelas de dados do usuário (filhas antes de `vehicles`, por causa da chave estrangeira). Os
 * postos baixados da região (`region_cells`, `region_places`) são dado público e ficam.
 */
const DATA_TABLES = [
  'fuel_entries',
  'odometer_readings',
  'documents',
  'maintenance_records',
  'maintenance_plans',
  'vehicles',
  'stations',
] as const;

/** Quantas mudanças esperam na fila para ir à API. */
export async function countPending(db: Db): Promise<number> {
  const row = await db.getFirstAsync<{ total: number }>('SELECT COUNT(*) AS total FROM outbox');
  return row?.total ?? 0;
}

/**
 * Apaga de verdade os dados deste aparelho (veículos, registros, prazos), a fila e o ponto do sync,
 * e deixa as preferências. Serve para "Usar só os da conta" e "Sair da conta", quando a cópia que
 * vale está na API; por isso é exclusão física, ao contrário da exclusão lógica do dia a dia.
 */
export async function wipeLocalData(db: Db): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const table of [...DATA_TABLES, 'outbox', 'sync_state']) {
      await db.runAsync(`DELETE FROM ${table}`);
    }
  });
}

export interface TransferProgress {
  done: number;
  total: number;
}

/**
 * Envia tudo o que está na fila (e já traz o que a conta tem), contando o que saiu para a tela
 * "Enviando seus dados". O `total` é o tamanho da fila no começo.
 */
export async function uploadPending(
  deps: SyncEngineDeps,
  onProgress?: (progress: TransferProgress) => void,
): Promise<{ outcome: SyncOutcome; applied: number }> {
  const total = await countPending(deps.db);
  let done = 0;
  onProgress?.({ done, total });
  return syncNow({
    ...deps,
    onPushed: (count) => {
      done += count;
      onProgress?.({ done: Math.min(done, total), total });
    },
  });
}
