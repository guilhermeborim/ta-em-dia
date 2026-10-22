import type { Vehicle } from '@ta-em-dia/shared';
import type { Db } from '../../../core/db';

export interface HomeState {
  /** Veículo mostrado no topo (por enquanto, o mais antigo). `null` se não há veículo. */
  vehicle: Pick<Vehicle, 'id' | 'name' | 'brand' | 'model' | 'year' | 'initialKm'> | null;
  hasFuelEntries: boolean;
}

interface VehicleRow {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  initial_km: number;
}

/** Lê do SQLite o que o Início precisa para escolher entre o estado vazio e o com dados. */
export async function loadHomeState(db: Db): Promise<HomeState> {
  const row = await db.getFirstAsync<VehicleRow>(
    `SELECT id, name, brand, model, year, initial_km
       FROM vehicles
      WHERE deleted_at IS NULL AND archived = 0
      ORDER BY created_at, id
      LIMIT 1`,
  );
  if (!row) return { vehicle: null, hasFuelEntries: false };

  const count = await db.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) AS total FROM fuel_entries WHERE vehicle_id = ? AND deleted_at IS NULL',
    row.id,
  );

  return {
    vehicle: {
      id: row.id,
      name: row.name,
      brand: row.brand ?? undefined,
      model: row.model ?? undefined,
      year: row.year ?? undefined,
      initialKm: row.initial_km,
    },
    hasFuelEntries: (count?.total ?? 0) > 0,
  };
}
