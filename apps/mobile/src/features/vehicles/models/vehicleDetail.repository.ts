import type { Db } from '../../../core/db';
import { listFuelEntries } from '../../../core/fuel';
import { listRecords, loadVehicleKm } from '../../../core/maintenance';
import { listManualReadings } from '../../../core/odometer';
import type { VehicleDetailData } from './vehicleDetail';
import { findVehicle } from './vehicles.repository';

/** Lê do SQLite o veículo com km, média diária, gasto com combustível e a última leitura. `null` se não existe. */
export async function loadVehicleDetail(db: Db, id: string): Promise<VehicleDetailData | null> {
  const vehicle = await findVehicle(db, id);
  if (!vehicle) return null;

  const entries = await listFuelEntries(db, id);
  const records = await listRecords(db, id);
  const manual = await listManualReadings(db, id);
  const dates = [
    ...entries.map((e) => e.date),
    ...records.map((r) => r.date),
    ...manual.map((r) => r.readAt),
  ];

  return {
    vehicle,
    ...(await loadVehicleKm(db, id, vehicle.initialKm)),
    fuelTotal: entries.reduce((sum, entry) => sum + entry.total, 0),
    lastReadingAt: dates.length > 0 ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null,
  };
}
