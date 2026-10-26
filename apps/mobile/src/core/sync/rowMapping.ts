import { SYNC_UPSERT_SCHEMAS, type SyncTable } from '@ta-em-dia/shared';

export type Column = string | number | null;

const flag = (value: boolean | undefined, otherwise: number) =>
  value === undefined ? otherwise : value ? 1 : 0;

/**
 * Payload que veio do servidor (no schema do app) em colunas do SQLite local, sem `id`, datas de
 * controle (`created_at`, `updated_at`, `deleted_at`), `version` nem `user_id`. `null` se o payload
 * não cabe no schema da tabela: a linha é ignorada em vez de quebrar o pull.
 */
export function toColumns(table: SyncTable, payload: unknown): Record<string, Column> | null {
  switch (table) {
    case 'vehicles': {
      const parsed = SYNC_UPSERT_SCHEMAS.vehicles.safeParse(payload);
      if (!parsed.success) return null;
      const p = parsed.data;
      return {
        name: p.name,
        type: p.type,
        brand: p.brand ?? null,
        model: p.model ?? null,
        year: p.year ?? null,
        plate: p.plate ?? null,
        initial_km: p.initialKm,
        archived: flag(p.archived, 0),
        sort_order: p.sortOrder ?? 0,
      };
    }
    case 'odometer_readings': {
      const parsed = SYNC_UPSERT_SCHEMAS.odometer_readings.safeParse(payload);
      if (!parsed.success) return null;
      const p = parsed.data;
      return {
        vehicle_id: p.vehicleId,
        km: p.km,
        read_at: p.readAt.toISOString(),
        source: p.source,
      };
    }
    case 'fuel_entries': {
      const parsed = SYNC_UPSERT_SCHEMAS.fuel_entries.safeParse(payload);
      if (!parsed.success) return null;
      const p = parsed.data;
      return {
        vehicle_id: p.vehicleId,
        date: p.date.toISOString(),
        status: 'status' in p ? p.status : 'complete',
        km: p.km ?? null,
        fuel_type: p.fuelType ?? null,
        liters: p.liters ?? null,
        price_per_liter: p.pricePerLiter ?? null,
        total: p.total ?? null,
        full_tank: p.fullTank === undefined ? null : flag(p.fullTank, 0),
        station_name: p.stationName ?? null,
        note: p.note ?? null,
      };
    }
    case 'maintenance_plans': {
      const parsed = SYNC_UPSERT_SCHEMAS.maintenance_plans.safeParse(payload);
      if (!parsed.success) return null;
      const p = parsed.data;
      return {
        vehicle_id: p.vehicleId,
        type: p.type,
        interval_km: p.intervalKm ?? null,
        interval_months: p.intervalMonths ?? null,
        last_done_km: p.lastDoneKm,
        last_done_at: p.lastDoneAt.toISOString(),
        enabled: flag(p.enabled, 1),
        notify_before_km: p.notifyBeforeKm ?? null,
        notify_before_days: p.notifyBeforeDays ?? null,
      };
    }
    case 'maintenance_records': {
      const parsed = SYNC_UPSERT_SCHEMAS.maintenance_records.safeParse(payload);
      if (!parsed.success) return null;
      const p = parsed.data;
      return {
        vehicle_id: p.vehicleId,
        plan_id: p.planId ?? null,
        type: p.type,
        date: p.date.toISOString(),
        km: p.km,
        cost: p.cost ?? null,
        shop: p.shop ?? null,
        note: p.note ?? null,
      };
    }
    case 'documents': {
      const parsed = SYNC_UPSERT_SCHEMAS.documents.safeParse(payload);
      if (!parsed.success) return null;
      const p = parsed.data;
      return {
        vehicle_id: p.vehicleId ?? null,
        kind: p.kind,
        due_date: p.dueDate,
        notify_days: JSON.stringify(p.notifyDays),
        note: p.note ?? null,
      };
    }
  }
}
