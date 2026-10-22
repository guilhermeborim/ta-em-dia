import { fuelEntrySchema, type FuelEntry } from '@ta-em-dia/shared';
import { enqueue, newId, type Db } from '../../../core/db';

type FuelEntryRow = {
  id: string;
  vehicle_id: string;
  date: string;
  km: number;
  fuel_type: FuelEntry['fuelType'];
  liters: number;
  price_per_liter: number;
  total: number;
  full_tank: number;
  station_name: string | null;
  note: string | null;
};

export type NewFuelEntry = Omit<FuelEntry, 'id'>;

function toFuelEntry(row: FuelEntryRow): FuelEntry {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    date: new Date(row.date),
    km: row.km,
    fuelType: row.fuel_type,
    liters: row.liters,
    pricePerLiter: row.price_per_liter,
    total: row.total,
    fullTank: row.full_tank === 1,
    stationName: row.station_name ?? undefined,
    note: row.note ?? undefined,
  };
}

/** Valida, grava no SQLite e enfileira para o sync, tudo na mesma transação. */
export async function addFuelEntry(
  db: Db,
  input: NewFuelEntry,
  ctx: { id?: string; now?: Date } = {},
): Promise<FuelEntry> {
  const entry = fuelEntrySchema.parse({ ...input, id: ctx.id ?? newId() });
  const now = (ctx.now ?? new Date()).toISOString();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO fuel_entries
         (id, vehicle_id, date, km, fuel_type, liters, price_per_liter, total,
          full_tank, station_name, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      entry.id,
      entry.vehicleId,
      entry.date.toISOString(),
      entry.km,
      entry.fuelType,
      entry.liters,
      entry.pricePerLiter,
      entry.total,
      entry.fullTank ? 1 : 0,
      entry.stationName ?? null,
      entry.note ?? null,
      now,
      now,
    );
    await enqueue(db, 'fuel_entries', entry.id, 'upsert', entry, now);
  });

  return entry;
}

/** Abastecimentos ativos do veículo, do mais recente ao mais antigo. */
export async function listFuelEntries(db: Db, vehicleId: string): Promise<FuelEntry[]> {
  const rows = await db.getAllAsync<FuelEntryRow>(
    `SELECT id, vehicle_id, date, km, fuel_type, liters, price_per_liter, total,
            full_tank, station_name, note
       FROM fuel_entries
      WHERE vehicle_id = ? AND deleted_at IS NULL
      ORDER BY date DESC, km DESC`,
    vehicleId,
  );
  return rows.map(toFuelEntry);
}

/** Exclusão lógica: a linha fica com deleted_at para o sync propagar. */
export async function deleteFuelEntry(db: Db, id: string, now: Date = new Date()): Promise<void> {
  const at = now.toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE fuel_entries SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
      at,
      at,
      id,
    );
    await enqueue(db, 'fuel_entries', id, 'delete', { id, deletedAt: at }, at);
  });
}
