import { vehicleSchema, type Vehicle } from '@ta-em-dia/shared';
import { enqueue, newId, type Db } from '../../../core/db';

type VehicleRow = {
  id: string;
  name: string;
  type: Vehicle['type'];
  brand: string | null;
  model: string | null;
  year: number | null;
  plate: string | null;
  initial_km: number;
};

export type NewVehicle = Omit<Vehicle, 'id'>;

function toVehicle(row: VehicleRow): Vehicle {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    brand: row.brand ?? undefined,
    model: row.model ?? undefined,
    year: row.year ?? undefined,
    plate: row.plate ?? undefined,
    initialKm: row.initial_km,
  };
}

/** Valida, grava no SQLite e enfileira para o sync, tudo na mesma transação. */
export async function createVehicle(
  db: Db,
  input: NewVehicle,
  ctx: { id?: string; now?: Date } = {},
): Promise<Vehicle> {
  const vehicle = vehicleSchema.parse({ ...input, id: ctx.id ?? newId() });
  const now = (ctx.now ?? new Date()).toISOString();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO vehicles
         (id, name, type, brand, model, year, plate, initial_km, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      vehicle.id,
      vehicle.name,
      vehicle.type,
      vehicle.brand ?? null,
      vehicle.model ?? null,
      vehicle.year ?? null,
      vehicle.plate ?? null,
      vehicle.initialKm,
      now,
      now,
    );
    await enqueue(db, 'vehicles', vehicle.id, 'upsert', vehicle, now);
  });

  return vehicle;
}

/** Veículos ativos (não excluídos nem arquivados), do mais antigo ao mais novo. */
export async function listVehicles(db: Db): Promise<Vehicle[]> {
  const rows = await db.getAllAsync<VehicleRow>(
    `SELECT id, name, type, brand, model, year, plate, initial_km
       FROM vehicles
      WHERE deleted_at IS NULL AND archived = 0
      ORDER BY created_at, id`,
  );
  return rows.map(toVehicle);
}

/** Exclusão lógica: a linha fica com deleted_at para o sync propagar. */
export async function deleteVehicle(db: Db, id: string, now: Date = new Date()): Promise<void> {
  const at = now.toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE vehicles SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
      at,
      at,
      id,
    );
    await enqueue(db, 'vehicles', id, 'delete', { id, deletedAt: at }, at);
  });
}
