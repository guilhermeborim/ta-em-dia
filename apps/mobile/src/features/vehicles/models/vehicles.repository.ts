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
  archived: number;
};

const COLUMNS = 'id, name, type, brand, model, year, plate, initial_km, sort_order, archived';

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
    archived: row.archived === 1,
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
    vehicle = { ...base, sortOrder: last?.next ?? 0, archived: false };
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

/** Um veículo não excluído (arquivado também), ou `null`. */
export async function findVehicle(db: Db, id: string): Promise<Vehicle | null> {
  const row = await db.getFirstAsync<VehicleRow>(
    `SELECT ${COLUMNS} FROM vehicles WHERE id = ? AND deleted_at IS NULL`,
    id,
  );
  return row ? toVehicle(row) : null;
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

/** Veículos arquivados (não excluídos), na ordem de "Meus veículos". */
export async function listArchivedVehicles(db: Db): Promise<Vehicle[]> {
  const rows = await db.getAllAsync<VehicleRow>(
    `SELECT ${COLUMNS}
       FROM vehicles
      WHERE deleted_at IS NULL AND archived = 1
      ORDER BY sort_order, created_at, id`,
  );
  return rows.map(toVehicle);
}

/** Dados que a edição pode mudar. Campo opcional sem valor (`undefined`) é removido. */
export type VehiclePatch = Pick<Vehicle, 'name' | 'brand' | 'model' | 'year' | 'plate'>;

/** Valida, grava a edição e enfileira o upsert. `null` se o veículo não existe. */
export async function updateVehicle(
  db: Db,
  id: string,
  patch: VehiclePatch,
  now: Date = new Date(),
): Promise<Vehicle | null> {
  const at = now.toISOString();
  let updated: Vehicle | null = null;

  await db.withTransactionAsync(async () => {
    const current = await findVehicle(db, id);
    if (!current) return;
    updated = vehicleSchema.parse({
      ...current,
      name: patch.name,
      brand: patch.brand,
      model: patch.model,
      year: patch.year,
      plate: patch.plate,
    });
    await db.runAsync(
      `UPDATE vehicles
          SET name = ?, brand = ?, model = ?, year = ?, plate = ?, updated_at = ?
        WHERE id = ?`,
      updated.name,
      updated.brand ?? null,
      updated.model ?? null,
      updated.year ?? null,
      updated.plate ?? null,
      at,
      id,
    );
    await enqueue(db, 'vehicles', id, 'upsert', updated, at);
  });

  return updated;
}

/** Resultado de arquivar ou restaurar. */
export type ArchiveResult = 'ok' | 'not_found' | 'last_active';

/** Aviso quando o único veículo ativo não pode ser arquivado. */
export const LAST_ACTIVE_MESSAGE = 'Você precisa de outro veículo ativo para arquivar este.';

/**
 * Arquiva ou restaura. Arquivar tira o veículo das listas e dos avisos; restaurar o põe no fim
 * de "Meus veículos". Arquivar o único veículo ativo é bloqueado (`last_active`): o app nunca
 * fica sem veículo ativo por causa disso.
 */
export async function setVehicleArchived(
  db: Db,
  id: string,
  archived: boolean,
  now: Date = new Date(),
): Promise<ArchiveResult> {
  const at = now.toISOString();
  let result: ArchiveResult = 'not_found';

  await db.withTransactionAsync(async () => {
    const current = await findVehicle(db, id);
    if (!current) return;
    if (archived && !current.archived) {
      const others = await db.getFirstAsync<{ total: number }>(
        'SELECT COUNT(*) AS total FROM vehicles WHERE deleted_at IS NULL AND archived = 0 AND id <> ?',
        id,
      );
      if ((others?.total ?? 0) === 0) {
        result = 'last_active';
        return;
      }
    }
    result = 'ok';
    const last = await db.getFirstAsync<{ next: number }>(
      'SELECT COALESCE(MAX(sort_order) + 1, 0) AS next FROM vehicles WHERE deleted_at IS NULL',
    );
    const sortOrder = archived ? (current.sortOrder ?? 0) : (last?.next ?? 0);
    await db.runAsync(
      'UPDATE vehicles SET archived = ?, sort_order = ?, updated_at = ? WHERE id = ?',
      archived ? 1 : 0,
      sortOrder,
      at,
      id,
    );
    await enqueue(db, 'vehicles', id, 'upsert', { ...current, archived, sortOrder }, at);
  });

  return result;
}

/** Tabelas que dependem do veículo e saem junto com ele. */
const DEPENDENTS = [
  'maintenance_records',
  'maintenance_plans',
  'fuel_entries',
  'odometer_readings',
  'documents',
] as const;

/**
 * Exclusão lógica do veículo e de tudo que depende dele (abastecimentos, planos, serviços e
 * leituras de km): as linhas ficam com deleted_at para o sync propagar, tudo na mesma transação.
 */
export async function deleteVehicle(db: Db, id: string, now: Date = new Date()): Promise<void> {
  const at = now.toISOString();
  await db.withTransactionAsync(async () => {
    for (const table of DEPENDENTS) {
      const rows = await db.getAllAsync<{ id: string }>(
        `SELECT id FROM ${table} WHERE vehicle_id = ? AND deleted_at IS NULL`,
        id,
      );
      for (const row of rows) {
        await db.runAsync(
          `UPDATE ${table} SET deleted_at = ?, updated_at = ? WHERE id = ?`,
          at,
          at,
          row.id,
        );
        await enqueue(db, table, row.id, 'delete', { id: row.id, deletedAt: at }, at);
      }
    }
    await db.runAsync(
      'UPDATE vehicles SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
      at,
      at,
      id,
    );
    await enqueue(db, 'vehicles', id, 'delete', { id, deletedAt: at }, at);
  });
}
