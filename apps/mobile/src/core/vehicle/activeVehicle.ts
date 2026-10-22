import type { Db } from '../db';

export interface ActiveVehicleRow {
  id: string;
  name: string;
  initial_km: number;
}

/** Veículo ativo mais antigo (o do Início, por enquanto), ou `null` se não há veículo. */
export async function findActiveVehicle(db: Db): Promise<ActiveVehicleRow | null> {
  return db.getFirstAsync<ActiveVehicleRow>(
    `SELECT id, name, initial_km
       FROM vehicles
      WHERE deleted_at IS NULL AND archived = 0
      ORDER BY created_at, id
      LIMIT 1`,
  );
}
