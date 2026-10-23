import type { Db } from '../../../core/db';
import { listDocumentHistory, listDocuments } from '../../../core/documents';
import { findActiveVehicle } from '../../../core/vehicle';
import type { DocumentsData } from './documentsList';

/**
 * Lê do SQLite o veículo (com a placa) e os prazos dele, mais a CNH. Sem `vehicleId`, ou se ele não
 * é mais um veículo ativo, vale o veículo ativo do Início. `vehicleId` vem do toque num aviso.
 */
export async function loadDocuments(db: Db, vehicleId?: string): Promise<DocumentsData> {
  const requested = vehicleId
    ? await db.getFirstAsync<{ id: string; name: string }>(
        'SELECT id, name FROM vehicles WHERE id = ? AND deleted_at IS NULL AND archived = 0',
        vehicleId,
      )
    : null;
  const vehicle = requested ?? (await findActiveVehicle(db));
  if (!vehicle) {
    return {
      vehicle: null,
      documents: await listDocuments(db),
      history: await listDocumentHistory(db),
    };
  }

  const row = await db.getFirstAsync<{ plate: string | null }>(
    'SELECT plate FROM vehicles WHERE id = ?',
    vehicle.id,
  );
  return {
    vehicle: { id: vehicle.id, name: vehicle.name, plate: row?.plate ?? undefined },
    documents: await listDocuments(db, vehicle.id),
    history: await listDocumentHistory(db, vehicle.id),
  };
}
