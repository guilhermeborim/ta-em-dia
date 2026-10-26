import {
  fuelDraftSchema,
  fuelEntrySchema,
  type FuelDraft,
  type FuelEntry,
} from '@ta-em-dia/shared';
import { enqueue, newId, type Db } from '../db';

type FuelEntryRow = {
  id: string;
  vehicle_id: string;
  date: string;
  status: 'complete' | 'draft';
  km: number | null;
  fuel_type: FuelEntry['fuelType'] | null;
  liters: number | null;
  price_per_liter: number | null;
  total: number | null;
  full_tank: number | null;
  station_name: string | null;
  note: string | null;
};

const COLUMNS = `id, vehicle_id, date, status, km, fuel_type, liters, price_per_liter, total,
            full_tank, station_name, note`;

export type NewFuelEntry = Omit<FuelEntry, 'id'>;
export type NewFuelDraft = Omit<FuelDraft, 'id' | 'status'>;

/** Linha completa (a regra do banco garante que não há nulo onde o schema não aceita). */
function toFuelEntry(row: FuelEntryRow): FuelEntry {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    date: new Date(row.date),
    km: row.km!,
    fuelType: row.fuel_type!,
    liters: row.liters!,
    pricePerLiter: row.price_per_liter!,
    total: row.total!,
    fullTank: row.full_tank === 1,
    stationName: row.station_name ?? undefined,
    note: row.note ?? undefined,
  };
}

function toFuelDraft(row: FuelEntryRow): FuelDraft {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    status: 'draft',
    date: new Date(row.date),
    km: row.km ?? undefined,
    fuelType: row.fuel_type ?? undefined,
    liters: row.liters ?? undefined,
    pricePerLiter: row.price_per_liter ?? undefined,
    total: row.total ?? undefined,
    fullTank: row.full_tank === null ? undefined : row.full_tank === 1,
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
         (id, vehicle_id, date, status, km, fuel_type, liters, price_per_liter, total,
          full_tank, station_name, note, created_at, updated_at)
       VALUES (?, ?, ?, 'complete', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

/**
 * Abastecimentos completos e ativos do veículo, do mais recente ao mais antigo. Rascunho fica de
 * fora: km/l, custo por km, médias, projeção e relatórios só enxergam o que é completo.
 */
export async function listFuelEntries(db: Db, vehicleId: string): Promise<FuelEntry[]> {
  const rows = await db.getAllAsync<FuelEntryRow>(
    `SELECT ${COLUMNS}
       FROM fuel_entries
      WHERE vehicle_id = ? AND deleted_at IS NULL AND status = 'complete'
      ORDER BY date DESC, km DESC`,
    vehicleId,
  );
  return rows.map(toFuelEntry);
}

/** Rascunhos ativos do veículo, do mais recente ao mais antigo. */
export async function listFuelDrafts(db: Db, vehicleId: string): Promise<FuelDraft[]> {
  const rows = await db.getAllAsync<FuelEntryRow>(
    `SELECT ${COLUMNS}
       FROM fuel_entries
      WHERE vehicle_id = ? AND deleted_at IS NULL AND status = 'draft'
      ORDER BY date DESC, created_at DESC`,
    vehicleId,
  );
  return rows.map(toFuelDraft);
}

/** Um abastecimento ativo (completo ou rascunho), ou `null`. */
export async function getFuelRecord(db: Db, id: string): Promise<FuelEntry | FuelDraft | null> {
  const row = await db.getFirstAsync<FuelEntryRow>(
    `SELECT ${COLUMNS} FROM fuel_entries WHERE id = ? AND deleted_at IS NULL`,
    id,
  );
  if (!row) return null;
  return row.status === 'draft' ? toFuelDraft(row) : toFuelEntry(row);
}

/** Grava o rascunho no SQLite e enfileira para o sync, na mesma transação. */
export async function addFuelDraft(
  db: Db,
  input: NewFuelDraft,
  ctx: { id?: string; now?: Date } = {},
): Promise<FuelDraft> {
  const draft = fuelDraftSchema.parse({ ...input, status: 'draft', id: ctx.id ?? newId() });
  const now = (ctx.now ?? new Date()).toISOString();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO fuel_entries
         (id, vehicle_id, date, status, km, fuel_type, liters, price_per_liter, total,
          full_tank, station_name, note, created_at, updated_at)
       VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      draft.id,
      draft.vehicleId,
      draft.date.toISOString(),
      draft.km ?? null,
      draft.fuelType ?? null,
      draft.liters ?? null,
      draft.pricePerLiter ?? null,
      draft.total ?? null,
      draft.fullTank === undefined ? null : draft.fullTank ? 1 : 0,
      draft.stationName ?? null,
      draft.note ?? null,
      now,
      now,
    );
    await enqueue(db, 'fuel_entries', draft.id, 'upsert', draft, now);
  });

  return draft;
}

/**
 * Troca o que está gravado pelo abastecimento ou rascunho informado (mesmo `id`): é assim que o
 * rascunho vira completo, ou que um rascunho ganha mais dados. Devolve `false` se o registro não
 * existe mais (excluído).
 */
export async function updateFuelRecord(
  db: Db,
  record: FuelEntry | FuelDraft,
  now: Date = new Date(),
): Promise<boolean> {
  const draft = 'status' in record ? fuelDraftSchema.parse(record) : null;
  const entry = draft ? null : fuelEntrySchema.parse(record);
  const value = (draft ?? entry)!;
  const at = now.toISOString();
  let updated = false;

  await db.withTransactionAsync(async () => {
    const exists = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM fuel_entries WHERE id = ? AND deleted_at IS NULL',
      value.id,
    );
    if (!exists) return;
    await db.runAsync(
      `UPDATE fuel_entries
          SET date = ?, status = ?, km = ?, fuel_type = ?, liters = ?, price_per_liter = ?,
              total = ?, full_tank = ?, station_name = ?, note = ?, updated_at = ?
        WHERE id = ?`,
      value.date.toISOString(),
      draft ? 'draft' : 'complete',
      value.km ?? null,
      value.fuelType ?? null,
      value.liters ?? null,
      value.pricePerLiter ?? null,
      value.total ?? null,
      value.fullTank === undefined ? null : value.fullTank ? 1 : 0,
      value.stationName ?? null,
      value.note ?? null,
      at,
      value.id,
    );
    updated = true;
    await enqueue(db, 'fuel_entries', value.id, 'upsert', value, at);
  });

  return updated;
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

/** Nomes de posto já usados (qualquer veículo), do mais usado ao menos; empate: o mais recente. */
export async function listStationNames(db: Db): Promise<string[]> {
  const rows = await db.getAllAsync<{ station_name: string }>(
    `SELECT station_name
       FROM fuel_entries
      WHERE deleted_at IS NULL AND station_name IS NOT NULL AND station_name <> ''
      GROUP BY station_name
      ORDER BY COUNT(*) DESC, MAX(date) DESC`,
  );
  return rows.map((row) => row.station_name);
}
