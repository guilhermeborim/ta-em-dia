import type { FuelEntry, MaintenancePlan, Vehicle } from '@ta-em-dia/shared';
import type { Db } from '../../../core/db';
import { listFuelEntries } from '../../../core/fuel';
import { listPlans } from '../../../core/maintenance';

export interface HomeState {
  /** Veículo mostrado no topo (por enquanto, o mais antigo). `null` se não há veículo. */
  vehicle:
    | (Pick<Vehicle, 'id' | 'name' | 'brand' | 'model' | 'year' | 'initialKm'> & {
        /** O maior entre o km inicial e o do último abastecimento ou serviço de manutenção. */
        currentKm: number;
      })
    | null;
  /** Abastecimentos do veículo, do mais recente ao mais antigo. */
  entries: FuelEntry[];
  /** Planos de manutenção do veículo (ativos e desativados). */
  plans: MaintenancePlan[];
}

interface VehicleRow {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  initial_km: number;
}

/** Lê do SQLite o que o Início precisa: o veículo e seus abastecimentos. */
export async function loadHomeState(db: Db): Promise<HomeState> {
  const row = await db.getFirstAsync<VehicleRow>(
    `SELECT id, name, brand, model, year, initial_km
       FROM vehicles
      WHERE deleted_at IS NULL AND archived = 0
      ORDER BY created_at, id
      LIMIT 1`,
  );
  if (!row) return { vehicle: null, entries: [], plans: [] };

  const entries = await listFuelEntries(db, row.id);
  const recordKm = await db.getFirstAsync<{ km: number | null }>(
    'SELECT MAX(km) AS km FROM maintenance_records WHERE vehicle_id = ? AND deleted_at IS NULL',
    row.id,
  );
  const lastKm = Math.max(0, recordKm?.km ?? 0, ...entries.map((e) => e.km));

  return {
    vehicle: {
      id: row.id,
      name: row.name,
      brand: row.brand ?? undefined,
      model: row.model ?? undefined,
      year: row.year ?? undefined,
      initialKm: row.initial_km,
      currentKm: Math.max(row.initial_km, lastKm),
    },
    entries,
    plans: await listPlans(db, row.id),
  };
}
