import type { Vehicle } from '@ta-em-dia/shared';
import type { Db } from '../../../core/db';
import type { FuelType } from '../../../core/fuel';

export interface FuelFormContext {
  /** Veículo do abastecimento (por enquanto, o mais antigo). `null` se não há veículo. */
  vehicle: Pick<Vehicle, 'id' | 'name'> | null;
  /** Último combustível usado, ou `null` sem abastecimentos. */
  lastFuelType: FuelType | null;
  /** Km sugerido: o maior entre o último abastecimento e o km inicial do veículo. */
  suggestedKm: number | null;
}

/** Veículo ativo mais antigo (o do Início, por enquanto), ou `null` se não há veículo. */
export async function findActiveVehicle(
  db: Db,
): Promise<{ id: string; name: string; initial_km: number } | null> {
  return db.getFirstAsync<{ id: string; name: string; initial_km: number }>(
    `SELECT id, name, initial_km
       FROM vehicles
      WHERE deleted_at IS NULL AND archived = 0
      ORDER BY created_at, id
      LIMIT 1`,
  );
}

/** Lê do SQLite o que o formulário sugere: veículo, último combustível e km. */
export async function loadFuelFormContext(db: Db): Promise<FuelFormContext> {
  const vehicle = await findActiveVehicle(db);
  if (!vehicle) return { vehicle: null, lastFuelType: null, suggestedKm: null };

  const last = await db.getFirstAsync<{ fuel_type: FuelType }>(
    `SELECT fuel_type
       FROM fuel_entries
      WHERE vehicle_id = ? AND deleted_at IS NULL
      ORDER BY date DESC, km DESC
      LIMIT 1`,
    vehicle.id,
  );
  const maxKm = await db.getFirstAsync<{ km: number | null }>(
    'SELECT MAX(km) AS km FROM fuel_entries WHERE vehicle_id = ? AND deleted_at IS NULL',
    vehicle.id,
  );

  return {
    vehicle: { id: vehicle.id, name: vehicle.name },
    lastFuelType: last?.fuel_type ?? null,
    suggestedKm: Math.max(vehicle.initial_km, maxKm?.km ?? 0),
  };
}
