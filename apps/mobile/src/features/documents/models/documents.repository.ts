import type { Db } from '../../../core/db';
import { listDocuments } from '../../../core/documents';
import { findActiveVehicle } from '../../../core/vehicle';
import type { DocumentsData } from './documentsList';

/** Lê do SQLite o veículo ativo (com a placa) e os prazos dele, mais a CNH. */
export async function loadDocuments(db: Db): Promise<DocumentsData> {
  const vehicle = await findActiveVehicle(db);
  if (!vehicle) return { vehicle: null, documents: await listDocuments(db) };

  const row = await db.getFirstAsync<{ plate: string | null }>(
    'SELECT plate FROM vehicles WHERE id = ?',
    vehicle.id,
  );
  return {
    vehicle: { id: vehicle.id, name: vehicle.name, plate: row?.plate ?? undefined },
    documents: await listDocuments(db, vehicle.id),
  };
}
