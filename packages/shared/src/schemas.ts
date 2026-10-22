import { z } from 'zod';
import { parseDueDate } from './documents';

/** Schemas compartilhados: validam formulários no app e DTOs na API. */

export const vehicleTypeSchema = z.enum(['combustion', 'flex', 'electric']);
export const fuelTypeSchema = z.enum(['gasoline', 'ethanol', 'diesel', 'gnv']);

export const vehicleSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(40),
  type: vehicleTypeSchema,
  brand: z.string().max(40).optional(),
  model: z.string().max(60).optional(),
  year: z.number().int().min(1950).max(2100).optional(),
  plate: z.string().max(10).optional(),
  initialKm: z.number().int().nonnegative(),
  /** Posição em "Meus veículos" (0 é o primeiro, o veículo ativo). */
  sortOrder: z.number().int().nonnegative().optional(),
  /** Arquivado: some das listas e dos avisos, mas guarda o histórico. */
  archived: z.boolean().optional(),
});

export const fuelEntrySchema = z.object({
  id: z.uuid(),
  vehicleId: z.uuid(),
  date: z.coerce.date(),
  km: z.number().int().nonnegative(),
  fuelType: fuelTypeSchema,
  liters: z.number().positive(),
  pricePerLiter: z.number().positive(),
  total: z.number().positive(),
  fullTank: z.boolean(),
  stationName: z.string().max(80).optional(),
  note: z.string().max(500).optional(),
});

export const maintenancePlanSchema = z.object({
  id: z.uuid(),
  vehicleId: z.uuid(),
  /** Código da lista pronta (ver `MAINTENANCE_CATALOG`) ou o nome digitado em "Outro". */
  type: z.string().min(1).max(60),
  intervalKm: z.number().int().positive().optional(),
  intervalMonths: z.number().int().positive().optional(),
  lastDoneKm: z.number().int().nonnegative(),
  lastDoneAt: z.coerce.date(),
  enabled: z.boolean(),
  notifyBeforeKm: z.number().int().nonnegative().optional(),
  notifyBeforeDays: z.number().int().nonnegative().optional(),
});

export const maintenanceRecordSchema = z.object({
  id: z.uuid(),
  vehicleId: z.uuid(),
  /** Plano que este serviço reiniciou, se houver. */
  planId: z.uuid().optional(),
  /** Código da lista pronta ou nome digitado em "Outro". */
  type: z.string().min(1).max(60),
  date: z.coerce.date(),
  km: z.number().int().nonnegative(),
  cost: z.number().nonnegative().optional(),
  shop: z.string().max(80).optional(),
  note: z.string().max(500).optional(),
});

export const documentKindSchema = z.enum(['ipva', 'licensing', 'insurance', 'cnh']);

export const documentSchema = z.object({
  id: z.uuid(),
  /** Nulo para CNH, que é da pessoa. */
  vehicleId: z.uuid().optional(),
  kind: documentKindSchema,
  /** "aaaa-mm-dd". */
  dueDate: z.string().refine((value) => parseDueDate(value) !== null, 'Data inválida'),
  /** Dias de antecedência dos avisos. */
  notifyDays: z.array(z.number().int().positive()),
  note: z.string().max(500).optional(),
});

export const odometerSourceSchema = z.enum(['manual', 'fuel', 'maintenance']);

export const odometerReadingSchema = z.object({
  id: z.uuid(),
  vehicleId: z.uuid(),
  km: z.number().int().nonnegative(),
  readAt: z.coerce.date(),
  source: odometerSourceSchema,
});

export type Vehicle = z.infer<typeof vehicleSchema>;
export type FuelEntry = z.infer<typeof fuelEntrySchema>;
export type MaintenancePlan = z.infer<typeof maintenancePlanSchema>;
export type MaintenanceRecord = z.infer<typeof maintenanceRecordSchema>;
export type DocumentRecord = z.infer<typeof documentSchema>;
export type OdometerReadingRecord = z.infer<typeof odometerReadingSchema>;
