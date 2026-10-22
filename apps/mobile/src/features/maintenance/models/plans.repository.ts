import {
  DEFAULT_NOTIFY_BEFORE_DAYS,
  DEFAULT_NOTIFY_BEFORE_KM,
  dailyAverageKm,
  maintenancePlanSchema,
  type MaintenancePlan,
} from '@ta-em-dia/shared';
import { enqueue, newId, type Db } from '../../../core/db';
import { listFuelEntries } from '../../../core/fuel';
import { findActiveVehicle } from '../../../core/vehicle';

type PlanRow = {
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

const COLUMNS = `id, vehicle_id, type, interval_km, interval_months, last_done_km, last_done_at,
                 enabled, notify_before_km, notify_before_days`;

function toPlan(row: PlanRow): MaintenancePlan {
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
    `SELECT ${COLUMNS}
       FROM maintenance_plans
      WHERE vehicle_id = ? AND deleted_at IS NULL
      ORDER BY created_at, id`,
    vehicleId,
  );
  return rows.map(toPlan);
}

export interface ActivatePlanInput {
  vehicleId: string;
  /** Código da lista pronta ou nome digitado em "Outro". */
  type: string;
  intervalKm?: number;
  intervalMonths?: number;
  /** Km atual do veículo: o ciclo começa daqui. */
  currentKm: number;
}

/**
 * Ativa o lembrete de um tipo. Se o veículo já tem um plano desse tipo (desativado),
 * só o reativa; senão cria um novo contando a partir de agora (km atual e data de hoje).
 * Valida, grava no SQLite e enfileira para o sync, tudo na mesma transação.
 */
export async function activatePlan(
  db: Db,
  input: ActivatePlanInput,
  ctx: { id?: string; now?: Date } = {},
): Promise<MaintenancePlan> {
  const now = ctx.now ?? new Date();
  const at = now.toISOString();

  const existing = await db.getFirstAsync<PlanRow>(
    `SELECT ${COLUMNS}
       FROM maintenance_plans
      WHERE vehicle_id = ? AND type = ? AND deleted_at IS NULL`,
    input.vehicleId,
    input.type,
  );

  if (existing) {
    const plan = maintenancePlanSchema.parse({ ...toPlan(existing), enabled: true });
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        'UPDATE maintenance_plans SET enabled = 1, updated_at = ? WHERE id = ?',
        at,
        plan.id,
      );
      await enqueue(db, 'maintenance_plans', plan.id, 'upsert', plan, at);
    });
    return plan;
  }

  const plan = maintenancePlanSchema.parse({
    id: ctx.id ?? newId(),
    vehicleId: input.vehicleId,
    type: input.type,
    intervalKm: input.intervalKm,
    intervalMonths: input.intervalMonths,
    lastDoneKm: input.currentKm,
    lastDoneAt: now,
    enabled: true,
    notifyBeforeKm: DEFAULT_NOTIFY_BEFORE_KM,
    notifyBeforeDays: DEFAULT_NOTIFY_BEFORE_DAYS,
  });

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO maintenance_plans
         (id, vehicle_id, type, interval_km, interval_months, last_done_km, last_done_at,
          enabled, notify_before_km, notify_before_days, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      plan.id,
      plan.vehicleId,
      plan.type,
      plan.intervalKm ?? null,
      plan.intervalMonths ?? null,
      plan.lastDoneKm,
      plan.lastDoneAt.toISOString(),
      1,
      plan.notifyBeforeKm ?? null,
      plan.notifyBeforeDays ?? null,
      at,
      at,
    );
    await enqueue(db, 'maintenance_plans', plan.id, 'upsert', plan, at);
  });

  return plan;
}

export interface MaintenanceData {
  vehicle: { id: string; name: string } | null;
  /** O maior entre o km inicial e o do último abastecimento. */
  currentKm: number;
  /** Média de km por dia, pelos abastecimentos (30 km/dia sem histórico). */
  dailyKm: number;
  plans: MaintenancePlan[];
}

/** Lê do SQLite o que a aba Manutenção precisa: veículo, km atual, média diária e planos. */
export async function loadMaintenance(db: Db): Promise<MaintenanceData> {
  const vehicle = await findActiveVehicle(db);
  if (!vehicle) return { vehicle: null, currentKm: 0, dailyKm: dailyAverageKm([]), plans: [] };

  const entries = await listFuelEntries(db, vehicle.id);
  const currentKm = Math.max(vehicle.initial_km, ...entries.map((e) => e.km));
  const dailyKm = dailyAverageKm(entries.map((e) => ({ km: e.km, readAt: e.date })));

  return {
    vehicle: { id: vehicle.id, name: vehicle.name },
    currentKm,
    dailyKm,
    plans: await listPlans(db, vehicle.id),
  };
}
