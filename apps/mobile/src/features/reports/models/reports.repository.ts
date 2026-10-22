import type { Db } from '../../../core/db';
import { listFuelEntries } from '../../../core/fuel';
import { listRecords } from '../../../core/maintenance';
import { findActiveVehicle } from '../../../core/vehicle';
import type { ReportData } from './reports';

/** Lê do SQLite o veículo ativo, seus abastecimentos e seus serviços de manutenção. */
export async function loadReportData(db: Db): Promise<ReportData> {
  const vehicle = await findActiveVehicle(db);
  if (!vehicle) return { vehicle: null, entries: [], records: [] };
  return {
    vehicle: { id: vehicle.id, name: vehicle.name },
    entries: await listFuelEntries(db, vehicle.id),
    records: await listRecords(db, vehicle.id),
  };
}
