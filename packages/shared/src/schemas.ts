import { z } from 'zod';
import { parseDueDate } from './documents';

/** Schemas compartilhados: validam formulários no app e DTOs na API. */

export const vehicleTypeSchema = z.enum(['combustion', 'flex', 'electric', 'motorcycle']);
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
  /** Texto do posto ("Shell · Av. da Pista"); continua para os registros antigos e as listas. */
  stationName: z.string().max(80).optional(),
  /** Posto em `stations` (Fase C). Registros antigos ou de versões anteriores do app não têm. */
  stationId: z.uuid().optional(),
  note: z.string().max(500).optional(),
});

/**
 * Posto do usuário (Fase C): do OpenStreetMap (`osmId`) ou local, criado ao digitar um posto
 * novo. Posto local não leva coordenada no sync: `lat`/`lng` dele ficam só no aparelho
 * (docs/05-privacidade-lgpd.md). Coordenada vem sempre em par.
 */
export const stationSchema = z
  .object({
    id: z.uuid(),
    osmId: z
      .string()
      .regex(/^(node|way|relation)\/\d+$/)
      .optional(),
    /** Sem nome e sem bandeira no OpenStreetMap, fica vazio e aparece como "Posto". */
    name: z.string().min(1).max(80).optional(),
    brand: z.string().max(80).optional(),
    street: z.string().max(120).optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
  })
  .refine((s) => (s.lat === undefined) === (s.lng === undefined), {
    message: 'Coordenada incompleta',
    path: ['lat'],
  });

/**
 * Linha antiga de rascunho (`status: 'draft'`). O app não cria mais rascunho; o schema fica só para
 * o sync continuar entendendo linhas que já existem na API ou em versões anteriores do app.
 */
export const fuelDraftSchema = z.object({
  id: z.uuid(),
  vehicleId: z.uuid(),
  status: z.literal('draft'),
  date: z.coerce.date(),
  km: z.number().int().nonnegative().optional(),
  fuelType: fuelTypeSchema.optional(),
  liters: z.number().positive().optional(),
  pricePerLiter: z.number().positive().optional(),
  total: z.number().positive().optional(),
  fullTank: z.boolean().optional(),
  stationName: z.string().max(80).optional(),
  note: z.string().max(500).optional(),
});

/** O que o sync leva em `fuel_entries`: o abastecimento completo ou uma linha legada de rascunho. */
export const fuelEntrySyncSchema = z.union([fuelDraftSchema, fuelEntrySchema]);

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
export type FuelDraft = z.infer<typeof fuelDraftSchema>;
export type StationRecord = z.infer<typeof stationSchema>;
export type MaintenancePlan = z.infer<typeof maintenancePlanSchema>;
export type MaintenanceRecord = z.infer<typeof maintenanceRecordSchema>;
export type DocumentRecord = z.infer<typeof documentSchema>;
export type OdometerReadingRecord = z.infer<typeof odometerReadingSchema>;
