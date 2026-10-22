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
  sort_order: number;
};

const COLUMNS = 'id, name, type, brand, model, year, plate, initial_km, sort_order';

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
    sortOrder: row.sort_order,
  };
}

/** Valida, grava no SQLite e enfileira para o sync, tudo na mesma transação. */
export async function createVehicle(
  db: Db,
  input: NewVehicle,
  ctx: { id?: string; now?: Date } = {},
): Promise<Vehicle> {
  const base = vehicleSchema.parse({ ...input, id: ctx.id ?? newId() });
  const now = (ctx.now ?? new Date()).toISOString();
  let vehicle: Vehicle = base;

  await db.withTransactionAsync(async () => {
    // O veículo novo vai para o fim de "Meus veículos".
    const last = await db.getFirstAsync<{ next: number }>(
      'SELECT COALESCE(MAX(sort_order) + 1, 0) AS next FROM vehicles WHERE deleted_at IS NULL',
    );
    vehicle = { ...base, sortOrder: last?.next ?? 0 };
    await db.runAsync(
      `INSERT INTO vehicles
         (id, name, type, brand, model, year, plate, initial_km, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      vehicle.id,
      vehicle.name,
      vehicle.type,
      vehicle.brand ?? null,
      vehicle.model ?? null,
      vehicle.year ?? null,
      vehicle.plate ?? null,
      vehicle.initialKm,
      vehicle.sortOrder ?? 0,
      now,
      now,
    );
    await enqueue(db, 'vehicles', vehicle.id, 'upsert', vehicle, now);
  });

  return vehicle;
}

/** Veículos ativos (não excluídos nem arquivados), na ordem de "Meus veículos". */
export async function listVehicles(db: Db): Promise<Vehicle[]> {
  const rows = await db.getAllAsync<VehicleRow>(
    `SELECT ${COLUMNS}
       FROM vehicles
      WHERE deleted_at IS NULL AND archived = 0
      ORDER BY sort_order, created_at, id`,
  );
  return rows.map(toVehicle);
}

/**
 * Grava a nova ordem dos veículos (`ids`, o primeiro é o ativo). Só os que mudaram de posição
 * são atualizados e enfileirados; ids que não são de veículo ativo são ignorados.
 */
export async function reorderVehicles(
  db: Db,
  ids: string[],
  now: Date = new Date(),
): Promise<void> {
  const at = now.toISOString();
  await db.withTransactionAsync(async () => {
    const current = new Map((await listVehicles(db)).map((vehicle) => [vehicle.id, vehicle]));
    let position = 0;
    for (const id of ids) {
      const vehicle = current.get(id);
      if (!vehicle) continue;
      const sortOrder = position++;
      if (vehicle.sortOrder === sortOrder) continue;
      await db.runAsync(
        'UPDATE vehicles SET sort_order = ?, updated_at = ? WHERE id = ?',
        sortOrder,
        at,
        id,
      );
      await enqueue(db, 'vehicles', id, 'upsert', { ...vehicle, sortOrder }, at);
    }
  });
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
