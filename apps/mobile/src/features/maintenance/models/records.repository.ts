import { isCustomMaintenanceType, type MaintenanceRecord } from '@ta-em-dia/shared';
import type { Db } from '../../../core/db';

type RecordRow = {
  id: string;
  vehicle_id: string;
  plan_id: string | null;
  type: string;
  date: string;
  km: number;
  cost: number | null;
  shop: string | null;
  note: string | null;
};

const COLUMNS = 'id, vehicle_id, plan_id, type, date, km, cost, shop, note';

function toRecord(row: RecordRow): MaintenanceRecord {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    planId: row.plan_id ?? undefined,
    type: row.type,
    date: new Date(row.date),
    km: row.km,
    cost: row.cost ?? undefined,
    shop: row.shop ?? undefined,
    note: row.note ?? undefined,
  };
}

/** Serviços do veículo (não excluídos), do mais recente ao mais antigo. */
export async function listRecords(db: Db, vehicleId: string): Promise<MaintenanceRecord[]> {
  const rows = await db.getAllAsync<RecordRow>(
    `SELECT ${COLUMNS}
       FROM maintenance_records
      WHERE vehicle_id = ? AND deleted_at IS NULL
      ORDER BY date DESC, km DESC`,
    vehicleId,
  );
  return rows.map(toRecord);
}

/** O serviço mais recente de um tipo, ou `null`. */
export async function latestRecord(
  db: Db,
  vehicleId: string,
  type: string,
): Promise<MaintenanceRecord | null> {
  const row = await db.getFirstAsync<RecordRow>(
    `SELECT ${COLUMNS}
       FROM maintenance_records
      WHERE vehicle_id = ? AND type = ? AND deleted_at IS NULL
      ORDER BY date DESC, km DESC
      LIMIT 1`,
    vehicleId,
    type,
  );
  return row ? toRecord(row) : null;
}

/** Maior km entre os serviços do veículo (conta como leitura do hodômetro), ou 0. */
export async function maxRecordKm(db: Db, vehicleId: string): Promise<number> {
  const row = await db.getFirstAsync<{ km: number | null }>(
    'SELECT MAX(km) AS km FROM maintenance_records WHERE vehicle_id = ? AND deleted_at IS NULL',
    vehicleId,
  );
  return row?.km ?? 0;
}

/**
 * Atalhos "Seu": os nomes distintos digitados em "Outro" que já aparecem nos planos e
 * serviços da pessoa. Não há tabela própria (ver docs/03-arquitetura.md).
 */
export async function listCustomTypes(db: Db): Promise<string[]> {
  const rows = await db.getAllAsync<{ type: string }>(
    `SELECT type FROM maintenance_plans WHERE deleted_at IS NULL
     UNION
     SELECT type FROM maintenance_records WHERE deleted_at IS NULL`,
  );
  return rows
    .map((row) => row.type)
    .filter(isCustomMaintenanceType)
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
