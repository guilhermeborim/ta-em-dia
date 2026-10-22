import {
  DEFAULT_NOTIFY_BEFORE_DAYS,
  DEFAULT_NOTIFY_BEFORE_KM,
  isCustomMaintenanceType,
  maintenancePlanSchema,
  maintenanceRecordSchema,
  type MaintenancePlan,
  type MaintenanceRecord,
} from '@ta-em-dia/shared';
import { enqueue, newId, type Db } from '../../../core/db';
import { findActiveVehicle } from '../../../core/vehicle';
import { applyPlanUpdate, findPlanByType, insertPlan, loadVehicleKm } from './plans.repository';
import { listCustomTypes } from './records.repository';

export interface RegisterMaintenanceInput {
  vehicleId: string;
  /** Código da lista pronta ou nome digitado em "Outro". */
  type: string;
  date: Date;
  km: number;
  cost?: number;
  shop?: string;
}

/**
 * Registra um serviço feito. Na mesma transação:
 * - se o veículo já tem um plano desse tipo, o ciclo reinicia (última vez = este serviço), a
 *   menos que a data seja mais antiga que a última vez já guardada;
 * - se não tem e o tipo é um nome criado em "Outro", cria um plano só de histórico (sem
 *   intervalo, sem alerta), que também vira o atalho "Seu";
 * - tipo da lista pronta sem plano só grava o serviço (o lembrete é ativado na aba Manutenção).
 */
export async function registerMaintenance(
  db: Db,
  input: RegisterMaintenanceInput,
  ctx: { id?: string; planId?: string; now?: Date } = {},
): Promise<{ record: MaintenanceRecord; plan: MaintenancePlan | null }> {
  const at = (ctx.now ?? new Date()).toISOString();
  let result: { record: MaintenanceRecord; plan: MaintenancePlan | null } | undefined;

  await db.withTransactionAsync(async () => {
    let plan = await findPlanByType(db, input.vehicleId, input.type);

    if (!plan && isCustomMaintenanceType(input.type)) {
      plan = maintenancePlanSchema.parse({
        id: ctx.planId ?? newId(),
        vehicleId: input.vehicleId,
        type: input.type,
        lastDoneKm: input.km,
        lastDoneAt: input.date,
        enabled: true,
        notifyBeforeKm: DEFAULT_NOTIFY_BEFORE_KM,
        notifyBeforeDays: DEFAULT_NOTIFY_BEFORE_DAYS,
      });
      await insertPlan(db, plan, at);
    } else if (plan && input.date >= plan.lastDoneAt) {
      plan = await applyPlanUpdate(
        db,
        plan.id,
        'last_done_km = ?, last_done_at = ?',
        [input.km, input.date.toISOString()],
        at,
      );
    }

    const record = maintenanceRecordSchema.parse({
      id: ctx.id ?? newId(),
      vehicleId: input.vehicleId,
      planId: plan?.id,
      type: input.type,
      date: input.date,
      km: input.km,
      cost: input.cost,
      shop: input.shop,
    });
    await db.runAsync(
      `INSERT INTO maintenance_records
         (id, vehicle_id, plan_id, type, date, km, cost, shop, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      record.id,
      record.vehicleId,
      record.planId ?? null,
      record.type,
      record.date.toISOString(),
      record.km,
      record.cost ?? null,
      record.shop ?? null,
      record.note ?? null,
      at,
      at,
    );
    await enqueue(db, 'maintenance_records', record.id, 'upsert', record, at);
    result = { record, plan };
  });

  return result!;
}

export interface RegisterContext {
  vehicle: { id: string; name: string } | null;
  /** Km sugerido: o maior entre o km inicial e o último abastecimento ou serviço. */
  currentKm: number;
  /** Atalhos "Seu" já usados. */
  customTypes: string[];
  /** Tipo do plano de onde a pessoa veio ("Marcar como feita"), para já vir escolhido. */
  planType: string | null;
}

/** Lê do SQLite o que o formulário sugere: veículo, km, atalhos "Seu" e o tipo do plano de origem. */
export async function loadRegisterContext(db: Db, planId?: string): Promise<RegisterContext> {
  const vehicle = await findActiveVehicle(db);
  const customTypes = await listCustomTypes(db);
  if (!vehicle) return { vehicle: null, currentKm: 0, customTypes, planType: null };

  const plan = planId
    ? await db.getFirstAsync<{ type: string }>(
        'SELECT type FROM maintenance_plans WHERE id = ? AND deleted_at IS NULL',
        planId,
      )
    : null;
  const { currentKm } = await loadVehicleKm(db, vehicle.id, vehicle.initial_km);
  return {
    vehicle: { id: vehicle.id, name: vehicle.name },
    currentKm,
    customTypes,
    planType: plan?.type ?? null,
  };
}
