import {
  DEFAULT_NOTIFY_BEFORE_DAYS,
  DEFAULT_NOTIFY_BEFORE_KM,
  dailyAverageKm,
  maintenancePlanSchema,
  type MaintenancePlan,
  type MaintenanceRecord,
} from '@ta-em-dia/shared';
import { enqueue, newId, type Db } from '../../../core/db';
import { listFuelEntries } from '../../../core/fuel';
import { listPlans, PLAN_COLUMNS, toPlan, type PlanRow } from '../../../core/maintenance';
import { findActiveVehicle } from '../../../core/vehicle';

export { listPlans };
import { latestRecord, listRecords, maxRecordKm } from './records.repository';

/** O plano de um tipo no veículo (ativo ou não), ou `null`. */
export async function findPlanByType(
  db: Db,
  vehicleId: string,
  type: string,
): Promise<MaintenancePlan | null> {
  const row = await db.getFirstAsync<PlanRow>(
    `SELECT ${PLAN_COLUMNS}
       FROM maintenance_plans
      WHERE vehicle_id = ? AND type = ? AND deleted_at IS NULL`,
    vehicleId,
    type,
  );
  return row ? toPlan(row) : null;
}

/** Grava um plano novo e enfileira o upsert. Chame dentro de uma transação. */
export async function insertPlan(db: Db, plan: MaintenancePlan, at: string): Promise<void> {
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
    plan.enabled ? 1 : 0,
    plan.notifyBeforeKm ?? null,
    plan.notifyBeforeDays ?? null,
    at,
    at,
  );
  await enqueue(db, 'maintenance_plans', plan.id, 'upsert', plan, at);
}

export interface ActivatePlanInput {
  vehicleId: string;
  /** Código da lista pronta ou nome digitado em "Outro". */
  type: string;
  intervalKm?: number;
  intervalMonths?: number;
  /** Km atual do veículo: o ciclo começa daqui (se não houver serviço registrado desse tipo). */
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

  const existing = await findPlanByType(db, input.vehicleId, input.type);

  if (existing) {
    const plan = maintenancePlanSchema.parse({ ...existing, enabled: true });
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

  // Se a pessoa já registrou esse serviço, o ciclo começa dele; senão, de agora.
  const last = await latestRecord(db, input.vehicleId, input.type);
  const plan = maintenancePlanSchema.parse({
    id: ctx.id ?? newId(),
    vehicleId: input.vehicleId,
    type: input.type,
    intervalKm: input.intervalKm,
    intervalMonths: input.intervalMonths,
    lastDoneKm: last?.km ?? input.currentKm,
    lastDoneAt: last?.date ?? now,
    enabled: true,
    notifyBeforeKm: DEFAULT_NOTIFY_BEFORE_KM,
    notifyBeforeDays: DEFAULT_NOTIFY_BEFORE_DAYS,
  });

  await db.withTransactionAsync(async () => insertPlan(db, plan, at));
  return plan;
}

export interface MaintenanceData {
  vehicle: { id: string; name: string } | null;
  /** O maior entre o km inicial e o do último abastecimento ou serviço. */
  currentKm: number;
  /** Média de km por dia, pelos abastecimentos (30 km/dia sem histórico). */
  dailyKm: number;
  plans: MaintenancePlan[];
  /** Serviços feitos, do mais recente ao mais antigo. */
  records: MaintenanceRecord[];
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

/** Lê do SQLite o que a aba Manutenção precisa: veículo, km atual, média diária e planos. */
export async function loadMaintenance(db: Db): Promise<MaintenanceData> {
  const vehicle = await findActiveVehicle(db);
  if (!vehicle)
    return {
      vehicle: null,
      currentKm: 0,
      dailyKm: dailyAverageKm([]),
      plans: [],
      records: [],
    };

  return {
    vehicle: { id: vehicle.id, name: vehicle.name },
    ...(await loadVehicleKm(db, vehicle.id, vehicle.initial_km)),
    plans: await listPlans(db, vehicle.id),
    records: await listRecords(db, vehicle.id),
  };
}

export interface PlanDetailData {
  plan: MaintenancePlan;
  currentKm: number;
  dailyKm: number;
}

/** Um plano (não excluído) com o km atual e a média diária do veículo dele. `null` se não existe. */
export async function loadPlanDetail(db: Db, planId: string): Promise<PlanDetailData | null> {
  const row = await db.getFirstAsync<PlanRow>(
    `SELECT ${PLAN_COLUMNS} FROM maintenance_plans WHERE id = ? AND deleted_at IS NULL`,
    planId,
  );
  if (!row) return null;
  const vehicle = await db.getFirstAsync<{ initial_km: number }>(
    'SELECT initial_km FROM vehicles WHERE id = ?',
    row.vehicle_id,
  );
  return {
    plan: toPlan(row),
    ...(await loadVehicleKm(db, row.vehicle_id, vehicle?.initial_km ?? 0)),
  };
}

/** Aplica a mudança, relê o plano e enfileira o upsert. Chame dentro de uma transação. */
export async function applyPlanUpdate(
  db: Db,
  planId: string,
  sql: string,
  params: (string | number | null)[],
  at: string,
): Promise<MaintenancePlan> {
  await db.runAsync(
    `UPDATE maintenance_plans SET ${sql}, updated_at = ? WHERE id = ? AND deleted_at IS NULL`,
    ...params,
    at,
    planId,
  );
  const row = await db.getFirstAsync<PlanRow>(
    `SELECT ${PLAN_COLUMNS} FROM maintenance_plans WHERE id = ? AND deleted_at IS NULL`,
    planId,
  );
  if (!row) throw new Error('Plano não encontrado');
  const plan = maintenancePlanSchema.parse(toPlan(row));
  await enqueue(db, 'maintenance_plans', planId, 'upsert', plan, at);
  return plan;
}

/** `applyPlanUpdate` em uma transação própria. */
async function updatePlan(
  db: Db,
  planId: string,
  sql: string,
  params: (string | number | null)[],
  now: Date,
): Promise<MaintenancePlan> {
  let updated: MaintenancePlan | undefined;
  await db.withTransactionAsync(async () => {
    updated = await applyPlanUpdate(db, planId, sql, params, now.toISOString());
  });
  return updated!;
}

/** Liga ou desliga o lembrete. O plano e a última vez continuam guardados. */
export function setPlanEnabled(
  db: Db,
  planId: string,
  enabled: boolean,
  now: Date = new Date(),
): Promise<MaintenancePlan> {
  return updatePlan(db, planId, 'enabled = ?', [enabled ? 1 : 0], now);
}

/** Muda o intervalo. Os dois vazios deixam o item só como histórico (sem alerta). */
export async function updatePlanInterval(
  db: Db,
  planId: string,
  interval: { intervalKm?: number; intervalMonths?: number },
  now: Date = new Date(),
): Promise<MaintenancePlan> {
  // Valida antes de gravar (valor fora do schema não chega ao banco).
  maintenancePlanSchema
    .pick({ intervalKm: true, intervalMonths: true })
    .parse({ intervalKm: interval.intervalKm, intervalMonths: interval.intervalMonths });
  return await updatePlan(
    db,
    planId,
    'interval_km = ?, interval_months = ?',
    [interval.intervalKm ?? null, interval.intervalMonths ?? null],
    now,
  );
}
