import type { Vehicle } from '@ta-em-dia/shared';
import type { Db } from '../../../core/db';
import { loadVehicleKm } from '../../../core/maintenance';
import { findActiveVehicle } from '../../../core/vehicle';
import type { FuelType } from '../../../core/fuel';

export interface FuelFormContext {
  /** Veículo do abastecimento (por enquanto, o mais antigo). `null` se não há veículo. */
  vehicle: Pick<Vehicle, 'id' | 'name'> | null;
  /** Último combustível usado, ou `null` sem abastecimentos. */
  lastFuelType: FuelType | null;
  /** Km sugerido: o km atual do veículo (maior entre inicial, abastecimentos, serviços e leituras). */
  suggestedKm: number | null;
}

/** Lê do SQLite o que o formulário sugere: veículo, último combustível e km. */
export async function loadFuelFormContext(db: Db): Promise<FuelFormContext> {
  const vehicle = await findActiveVehicle(db);
  if (!vehicle) return { vehicle: null, lastFuelType: null, suggestedKm: null };

  const last = await db.getFirstAsync<{ fuel_type: FuelType }>(
    `SELECT fuel_type
       FROM fuel_entries
      WHERE vehicle_id = ? AND deleted_at IS NULL AND status = 'complete'
      ORDER BY date DESC, km DESC
      LIMIT 1`,
    vehicle.id,
  );

  return {
    vehicle: { id: vehicle.id, name: vehicle.name },
    lastFuelType: last?.fuel_type ?? null,
    suggestedKm: (await loadVehicleKm(db, vehicle.id, vehicle.initial_km)).currentKm,
  };
}
