import type { Vehicle } from '@ta-em-dia/shared';
import type { Db } from '../../../core/db';
import { listFuelEntries } from '../../../core/fuel';
import { listRecords } from '../../../core/maintenance';
import { findActiveVehicle } from '../../../core/vehicle';
import type { HistoryData } from './history';

export interface HistoryLoad extends HistoryData {
  vehicle: Pick<Vehicle, 'id' | 'name'> | null;
}

/** Lê do SQLite o veículo ativo, seus abastecimentos e seus serviços de manutenção. */
export async function loadHistory(db: Db): Promise<HistoryLoad> {
  const vehicle = await findActiveVehicle(db);
  if (!vehicle) return { vehicle: null, entries: [], records: [] };
  return {
    vehicle: { id: vehicle.id, name: vehicle.name },
    entries: await listFuelEntries(db, vehicle.id),
    records: await listRecords(db, vehicle.id),
  };
}
