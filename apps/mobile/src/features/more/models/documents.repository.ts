import type { Db } from '../../../core/db';
import { countDocuments, listDocuments, type DocumentCounts } from '../../../core/documents';
import { findActiveVehicle } from '../../../core/vehicle';

/** Quantos prazos do veículo ativo (e da CNH) estão vencidos ou perto de vencer. */
export async function loadDocumentCounts(
  db: Db,
  today: Date = new Date(),
): Promise<DocumentCounts> {
  const vehicle = await findActiveVehicle(db);
  return countDocuments(await listDocuments(db, vehicle?.id), today);
}
