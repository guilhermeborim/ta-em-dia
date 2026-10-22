import type { MaintenanceRecord } from '@ta-em-dia/shared';
import type { Db } from '../db';

export type RecordRow = {
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

export const RECORD_COLUMNS = 'id, vehicle_id, plan_id, type, date, km, cost, shop, note';

export function toRecord(row: RecordRow): MaintenanceRecord {
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
    `SELECT ${RECORD_COLUMNS}
       FROM maintenance_records
      WHERE vehicle_id = ? AND deleted_at IS NULL
      ORDER BY date DESC, km DESC`,
    vehicleId,
  );
  return rows.map(toRecord);
}
