import type { z } from 'zod';
import { SYNC_UPSERT_SCHEMAS, type SyncTable } from '@ta-em-dia/shared';

/** Colunas de uma linha (sem id, dono, datas de controle nem `version`). */
export type RowData = Record<string, unknown>;

/** Um valor `Decimal` do Prisma, só o que a conversão usa. */
interface DecimalLike {
  toNumber(): number;
}

/** A referência de uma linha a outra do mesmo usuário (veículo ou plano), que precisa existir. */
export interface RowParents {
  vehicleId?: string;
  planId?: string;
}

interface TableSpec<S extends z.ZodType> {
  /** Nome do model no Prisma (`prisma.<model>`). */
  model:
    | 'vehicle'
    | 'odometerReading'
    | 'fuelEntry'
    | 'maintenancePlan'
    | 'maintenanceRecord'
    | 'document'
    | 'station';
  /** `userId` na própria linha (veículo, documento e posto); as outras tabelas chegam ao dono pelo veículo. */
  ownedDirectly: boolean;
  schema: S;
  parents(payload: z.infer<S>): RowParents;
  /** Payload do app em colunas do banco. O que não veio vira `null` (a linha inteira é substituída). */
  toData(payload: z.infer<S>): RowData;
  /** Linha do banco em payload do app (o mesmo schema, com datas em ISO e campos nulos omitidos). */
  toPayload(row: Record<string, unknown>): Record<string, unknown>;
}

const iso = (value: unknown) => (value as Date).toISOString();
const num = (value: unknown) => (value as DecimalLike).toNumber();

/** Só põe o campo se houver valor: nulo do banco = campo ausente no schema do app. */
function optional(key: string, value: unknown, convert: (v: unknown) => unknown = (v) => v) {
  return value === null || value === undefined ? {} : { [key]: convert(value) };
}

/** "aaaa-mm-dd" ↔ coluna `DATE` (meia-noite UTC, sem fuso para o dia não mudar). */
const toDateColumn = (dueDate: string) => new Date(`${dueDate}T00:00:00.000Z`);
const fromDateColumn = (value: unknown) => iso(value).slice(0, 10);

type Specs = { [T in SyncTable]: TableSpec<(typeof SYNC_UPSERT_SCHEMAS)[T]> };

export const SYNC_SPECS: Specs = {
  vehicles: {
    model: 'vehicle',
    ownedDirectly: true,
    schema: SYNC_UPSERT_SCHEMAS.vehicles,
    parents: () => ({}),
    toData: (p) => ({
      name: p.name,
      type: p.type,
      brand: p.brand ?? null,
      model: p.model ?? null,
      year: p.year ?? null,
      plate: p.plate ?? null,
      initialKm: p.initialKm,
      archived: p.archived ?? false,
      sortOrder: p.sortOrder ?? 0,
    }),
    toPayload: (row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      ...optional('brand', row.brand),
      ...optional('model', row.model),
      ...optional('year', row.year),
      ...optional('plate', row.plate),
      initialKm: row.initialKm,
      sortOrder: row.sortOrder,
      archived: row.archived,
    }),
  },
  odometer_readings: {
    model: 'odometerReading',
    ownedDirectly: false,
    schema: SYNC_UPSERT_SCHEMAS.odometer_readings,
    parents: (p) => ({ vehicleId: p.vehicleId }),
    toData: (p) => ({ vehicleId: p.vehicleId, km: p.km, readAt: p.readAt, source: p.source }),
    toPayload: (row) => ({
      id: row.id,
      vehicleId: row.vehicleId,
      km: row.km,
      readAt: iso(row.readAt),
      source: row.source,
    }),
  },
  fuel_entries: {
    model: 'fuelEntry',
    ownedDirectly: false,
    schema: SYNC_UPSERT_SCHEMAS.fuel_entries,
    parents: (p) => ({ vehicleId: p.vehicleId }),
    // Rascunho (`status: 'draft'`) guarda só o que se sabe; o completo não traz `status`.
    toData: (p) => ({
      vehicleId: p.vehicleId,
      date: p.date,
      status: 'status' in p ? p.status : 'complete',
      km: p.km ?? null,
      fuelType: p.fuelType ?? null,
      liters: p.liters ?? null,
      pricePerLiter: p.pricePerLiter ?? null,
      total: p.total ?? null,
      fullTank: p.fullTank ?? null,
      stationName: p.stationName ?? null,
      stationId: 'stationId' in p ? (p.stationId ?? null) : null,
      note: p.note ?? null,
    }),
    toPayload: (row) => ({
      id: row.id,
      vehicleId: row.vehicleId,
      ...(row.status === 'draft' ? { status: 'draft' } : {}),
      date: iso(row.date),
      ...optional('km', row.km),
      ...optional('fuelType', row.fuelType),
      ...optional('liters', row.liters, num),
      ...optional('pricePerLiter', row.pricePerLiter, num),
      ...optional('total', row.total, num),
      ...optional('fullTank', row.fullTank),
      ...optional('stationName', row.stationName),
      ...optional('stationId', row.stationId),
      ...optional('note', row.note),
    }),
  },
  maintenance_plans: {
    model: 'maintenancePlan',
    ownedDirectly: false,
    schema: SYNC_UPSERT_SCHEMAS.maintenance_plans,
    parents: (p) => ({ vehicleId: p.vehicleId }),
    toData: (p) => ({
      vehicleId: p.vehicleId,
      type: p.type,
      intervalKm: p.intervalKm ?? null,
      intervalMonths: p.intervalMonths ?? null,
      lastDoneKm: p.lastDoneKm,
      lastDoneAt: p.lastDoneAt,
      enabled: p.enabled,
      notifyBeforeKm: p.notifyBeforeKm ?? null,
      notifyBeforeDays: p.notifyBeforeDays ?? null,
    }),
    toPayload: (row) => ({
      id: row.id,
      vehicleId: row.vehicleId,
      type: row.type,
      ...optional('intervalKm', row.intervalKm),
      ...optional('intervalMonths', row.intervalMonths),
      lastDoneKm: row.lastDoneKm,
      lastDoneAt: iso(row.lastDoneAt),
      enabled: row.enabled,
      ...optional('notifyBeforeKm', row.notifyBeforeKm),
      ...optional('notifyBeforeDays', row.notifyBeforeDays),
    }),
  },
  maintenance_records: {
    model: 'maintenanceRecord',
    ownedDirectly: false,
    schema: SYNC_UPSERT_SCHEMAS.maintenance_records,
    parents: (p) => ({ vehicleId: p.vehicleId, planId: p.planId }),
    toData: (p) => ({
      vehicleId: p.vehicleId,
      planId: p.planId ?? null,
      type: p.type,
      date: p.date,
      km: p.km,
      cost: p.cost ?? null,
      shop: p.shop ?? null,
      note: p.note ?? null,
    }),
    toPayload: (row) => ({
      id: row.id,
      vehicleId: row.vehicleId,
      ...optional('planId', row.planId),
      type: row.type,
      date: iso(row.date),
      km: row.km,
      ...optional('cost', row.cost, num),
      ...optional('shop', row.shop),
      ...optional('note', row.note),
    }),
  },
  documents: {
    model: 'document',
    ownedDirectly: true,
    schema: SYNC_UPSERT_SCHEMAS.documents,
    parents: (p) => ({ vehicleId: p.vehicleId }),
    toData: (p) => ({
      vehicleId: p.vehicleId ?? null,
      kind: p.kind,
      dueDate: toDateColumn(p.dueDate),
      notifyDays: p.notifyDays,
      note: p.note ?? null,
    }),
    toPayload: (row) => ({
      id: row.id,
      ...optional('vehicleId', row.vehicleId),
      kind: row.kind,
      dueDate: fromDateColumn(row.dueDate),
      notifyDays: row.notifyDays,
      ...optional('note', row.note),
    }),
  },
  stations: {
    model: 'station',
    ownedDirectly: true,
    schema: SYNC_UPSERT_SCHEMAS.stations,
    parents: () => ({}),
    // Posto local (sem `osmId`) nunca guarda coordenada, mesmo que um app a mande (docs/05).
    toData: (p) => ({
      osmId: p.osmId ?? null,
      name: p.name ?? null,
      brand: p.brand ?? null,
      street: p.street ?? null,
      lat: p.osmId ? (p.lat ?? null) : null,
      lng: p.osmId ? (p.lng ?? null) : null,
    }),
    toPayload: (row) => ({
      id: row.id,
      ...optional('osmId', row.osmId),
      ...optional('name', row.name),
      ...optional('brand', row.brand),
      ...optional('street', row.street),
      ...(row.osmId && row.lat !== null && row.lng !== null ? { lat: row.lat, lng: row.lng } : {}),
    }),
  },
};
