import { fuelEntrySchema, type FuelEntry, type StationPriceRow } from '@ta-em-dia/shared';
import { enqueue, newId, type Db } from '../db';
import { ensureStation, type StationInput } from '../stations';

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
  station_id: string | null;
  note: string | null;
};

const COLUMNS = `id, vehicle_id, date, status, km, fuel_type, liters, price_per_liter, total,
            full_tank, station_name, station_id, note`;

export type NewFuelEntry = Omit<FuelEntry, 'id'>;

/**
 * Linha completa. As colunas aceitam nulo só por causa de rascunhos antigos (o app não cria mais,
 * e as listas só leem `status = 'complete'`), então nas linhas completas não há nulo.
 */
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
    ...(row.station_id ? { stationId: row.station_id } : {}),
    note: row.note ?? undefined,
  };
}

/**
 * Valida, grava no SQLite e enfileira para o sync, tudo na mesma transação. Com `station`, liga o
 * abastecimento a um posto de `stations` (criando o posto, se for novo, na mesma transação).
 */
export async function addFuelEntry(
  db: Db,
  input: NewFuelEntry,
  ctx: { id?: string; now?: Date; station?: StationInput } = {},
): Promise<FuelEntry> {
  let entry = fuelEntrySchema.parse({ ...input, id: ctx.id ?? newId() });
  const now = (ctx.now ?? new Date()).toISOString();

  await db.withTransactionAsync(async () => {
    const stationId = ctx.station ? await ensureStation(db, ctx.station, now) : null;
    if (stationId) entry = { ...entry, stationId };
    await db.runAsync(
      `INSERT INTO fuel_entries
         (id, vehicle_id, date, status, km, fuel_type, liters, price_per_liter, total,
          full_tank, station_name, station_id, note, created_at, updated_at)
       VALUES (?, ?, ?, 'complete', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      entry.stationId ?? null,
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

/** Um abastecimento completo e ativo, ou `null`. */
export async function getFuelRecord(db: Db, id: string): Promise<FuelEntry | null> {
  const row = await db.getFirstAsync<FuelEntryRow>(
    `SELECT ${COLUMNS} FROM fuel_entries WHERE id = ? AND deleted_at IS NULL AND status = 'complete'`,
    id,
  );
  return row ? toFuelEntry(row) : null;
}

/**
 * Troca os dados do abastecimento (mesmo `id`): é a edição. Grava no SQLite e enfileira o envio na
 * mesma transação. Com `station`, troca o posto (criando-o, se for novo). Devolve `false` se o
 * registro não existe mais (excluído, por exemplo pelo sync).
 */
export async function updateFuelRecord(
  db: Db,
  record: FuelEntry,
  now: Date = new Date(),
  station?: StationInput,
): Promise<boolean> {
  let entry = fuelEntrySchema.parse(record);
  const at = now.toISOString();
  let updated = false;

  await db.withTransactionAsync(async () => {
    const exists = await db.getFirstAsync<{ id: string }>(
      "SELECT id FROM fuel_entries WHERE id = ? AND deleted_at IS NULL AND status = 'complete'",
      entry.id,
    );
    if (!exists) return;
    const stationId = station ? await ensureStation(db, station, at) : null;
    if (stationId) entry = { ...entry, stationId };
    await db.runAsync(
      `UPDATE fuel_entries
          SET date = ?, km = ?, fuel_type = ?, liters = ?, price_per_liter = ?,
              total = ?, full_tank = ?, station_name = ?, station_id = ?, note = ?, updated_at = ?
        WHERE id = ?`,
      entry.date.toISOString(),
      entry.km,
      entry.fuelType,
      entry.liters,
      entry.pricePerLiter,
      entry.total,
      entry.fullTank ? 1 : 0,
      entry.stationName ?? null,
      entry.stationId ?? null,
      entry.note ?? null,
      at,
      entry.id,
    );
    updated = true;
    await enqueue(db, 'fuel_entries', entry.id, 'upsert', entry, at);
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

/**
 * Abastecimentos completos de todos os veículos, só com o que a média de preço por posto usa
 * (`stationPriceAverage`, em `shared`).
 */
export async function listFuelPriceRows(db: Db): Promise<StationPriceRow[]> {
  const rows = await db.getAllAsync<{
    station_id: string | null;
    station_name: string | null;
    fuel_type: string;
    liters: number;
    total: number;
  }>(
    `SELECT station_id, station_name, fuel_type, liters, total
       FROM fuel_entries
      WHERE deleted_at IS NULL AND status = 'complete'`,
  );
  return rows.map((row) => ({
    stationId: row.station_id,
    stationName: row.station_name,
    fuelType: row.fuel_type,
    liters: row.liters,
    total: row.total,
  }));
}
