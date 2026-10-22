import type { Db } from '../../../core/db';
import { listPlans, loadVehicleKm } from '../../../core/maintenance';
import type { VehicleListEntry } from './vehicleList';
import { listVehicles } from './vehicles.repository';

/** Lê do SQLite os veículos ativos, na ordem de "Meus veículos", com km e lembretes de cada um. */
export async function loadVehicleList(db: Db): Promise<VehicleListEntry[]> {
  const entries: VehicleListEntry[] = [];
  for (const vehicle of await listVehicles(db)) {
    entries.push({
      vehicle,
      ...(await loadVehicleKm(db, vehicle.id, vehicle.initialKm)),
      plans: await listPlans(db, vehicle.id),
    });
  }
  return entries;
}
