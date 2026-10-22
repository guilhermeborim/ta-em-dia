import { dailyAverageKm, type MaintenancePlan } from '@ta-em-dia/shared';
import type { Db } from '../db';
import { listFuelEntries } from '../fuel';

export type PlanRow = {
  id: string;
  vehicle_id: string;
  type: string;
  interval_km: number | null;
  interval_months: number | null;
  last_done_km: number;
  last_done_at: string;
  enabled: number;
  notify_before_km: number | null;
  notify_before_days: number | null;
};

export const PLAN_COLUMNS = `id, vehicle_id, type, interval_km, interval_months, last_done_km, last_done_at,
                 enabled, notify_before_km, notify_before_days`;

export function toPlan(row: PlanRow): MaintenancePlan {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    type: row.type,
    intervalKm: row.interval_km ?? undefined,
    intervalMonths: row.interval_months ?? undefined,
    lastDoneKm: row.last_done_km,
    lastDoneAt: new Date(row.last_done_at),
    enabled: row.enabled === 1,
    notifyBeforeKm: row.notify_before_km ?? undefined,
    notifyBeforeDays: row.notify_before_days ?? undefined,
  };
}

/** Planos do veículo (ativos e desativados, não excluídos), do mais antigo ao mais novo. */
export async function listPlans(db: Db, vehicleId: string): Promise<MaintenancePlan[]> {
  const rows = await db.getAllAsync<PlanRow>(
    `SELECT ${PLAN_COLUMNS}
       FROM maintenance_plans
      WHERE vehicle_id = ? AND deleted_at IS NULL
      ORDER BY created_at, id`,
    vehicleId,
  );
  return rows.map(toPlan);
}

/** Maior km entre os serviços do veículo (conta como leitura do hodômetro), ou 0. */
export async function maxRecordKm(db: Db, vehicleId: string): Promise<number> {
  const row = await db.getFirstAsync<{ km: number | null }>(
    'SELECT MAX(km) AS km FROM maintenance_records WHERE vehicle_id = ? AND deleted_at IS NULL',
    vehicleId,
  );
  return row?.km ?? 0;
}

/** Km atual e média diária do veículo, pelo km inicial e pelos abastecimentos. */
export async function loadVehicleKm(
  db: Db,
  vehicleId: string,
  initialKm: number,
): Promise<{ currentKm: number; dailyKm: number }> {
  const entries = await listFuelEntries(db, vehicleId);
  return {
    currentKm: Math.max(initialKm, ...entries.map((e) => e.km), await maxRecordKm(db, vehicleId)),
    dailyKm: dailyAverageKm(entries.map((e) => ({ km: e.km, readAt: e.date }))),
  };
}
