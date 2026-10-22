import type { Db } from '../../../core/db';
import { countDocuments, listDocuments, type DocumentCounts } from '../../../core/documents';
import { findActiveVehicle } from '../../../core/vehicle';

export interface MoreSummary {
  /** Veículos ativos (não arquivados nem excluídos). */
  vehicleCount: number;
  documents: DocumentCounts;
}

/** Lê do SQLite o que a aba Mais mostra ao lado dos itens: nº de veículos e prazos vencidos ou perto. */
export async function loadMoreSummary(db: Db, today: Date = new Date()): Promise<MoreSummary> {
  const vehicle = await findActiveVehicle(db);
  const row = await db.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) AS total FROM vehicles WHERE deleted_at IS NULL AND archived = 0',
  );
  return {
    vehicleCount: row?.total ?? 0,
    documents: countDocuments(await listDocuments(db, vehicle?.id), today),
  };
}
