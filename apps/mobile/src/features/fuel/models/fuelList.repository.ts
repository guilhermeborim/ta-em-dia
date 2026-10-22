import type { FuelEntry, Vehicle } from '@ta-em-dia/shared';
import type { Db } from '../../../core/db';
import { findActiveVehicle } from '../../../core/vehicle';
import { listFuelEntries } from '../../../core/fuel';

export interface FuelListData {
  vehicle: Pick<Vehicle, 'id' | 'name'> | null;
  /** Do mais recente ao mais antigo. */
  entries: FuelEntry[];
}

/** Lê do SQLite o veículo ativo e seus abastecimentos. */
export async function loadFuelList(db: Db): Promise<FuelListData> {
  const vehicle = await findActiveVehicle(db);
  if (!vehicle) return { vehicle: null, entries: [] };
  return {
    vehicle: { id: vehicle.id, name: vehicle.name },
    entries: await listFuelEntries(db, vehicle.id),
  };
}
