import { z } from 'zod';
import {
  documentSchema,
  fuelEntrySchema,
  maintenancePlanSchema,
  maintenanceRecordSchema,
  odometerReadingSchema,
  vehicleSchema,
} from './schemas';

/** Contrato de `POST /v1/sync/push` e `GET /v1/sync/pull`; ver docs/03-arquitetura.md ("Sync offline-first"). */

/** Número do protocolo: o app manda o dele e a API recusa um que não conhece. */
export const SYNC_PROTOCOL_VERSION = 1;

/** Mudanças por `push` (o motor do app envia lotes desse tamanho). */
export const SYNC_PUSH_MAX_CHANGES = 100;

/** Linhas por `pull` quando o app não pede um limite, e o máximo que pode pedir. */
export const SYNC_PULL_DEFAULT_LIMIT = 200;
export const SYNC_PULL_MAX_LIMIT = 500;

export const SYNC_TABLES = [
  'vehicles',
  'odometer_readings',
  'fuel_entries',
  'maintenance_plans',
  'maintenance_records',
  'documents',
] as const;
export const syncTableSchema = z.enum(SYNC_TABLES);
export type SyncTable = z.infer<typeof syncTableSchema>;

/** O schema do payload de `upsert` de cada tabela (o mesmo que o app usa nos formulários). */
export const SYNC_UPSERT_SCHEMAS = {
  vehicles: vehicleSchema,
  odometer_readings: odometerReadingSchema,
  fuel_entries: fuelEntrySchema,
  maintenance_plans: maintenancePlanSchema,
  maintenance_records: maintenanceRecordSchema,
  documents: documentSchema,
} as const;

/** Payload de `delete`: exclusão lógica; a linha continua no servidor com `deletedAt`. */
export const syncDeletePayloadSchema = z.object({
  id: z.uuid(),
  deletedAt: z.coerce.date(),
});

export const syncOpSchema = z.enum(['upsert', 'delete']);
export type SyncOp = z.infer<typeof syncOpSchema>;

/**
 * Uma mudança da `outbox`. O payload só é conferido por tabela e operação na API
 * (`SYNC_UPSERT_SCHEMAS`, `syncDeletePayloadSchema`), para uma linha inválida não derrubar o lote.
 */
export const syncChangeSchema = z.object({
  table: syncTableSchema,
  id: z.uuid(),
  op: syncOpSchema,
  /** Quando o app fez a mudança (ISO 8601, UTC). Só desempata: a ordem é a do servidor. */
  updatedAt: z.iso.datetime(),
  payload: z.unknown(),
});
export type SyncChange = z.infer<typeof syncChangeSchema>;

export const syncPushRequestSchema = z.object({
  protocol: z.number().int().positive(),
  changes: z.array(syncChangeSchema).max(SYNC_PUSH_MAX_CHANGES),
});
export type SyncPushRequest = z.infer<typeof syncPushRequestSchema>;

/**
 * Por que uma mudança foi rejeitada (em ambos os casos o app a tira da `outbox`):
 * - `STALE`: o servidor já tem uma versão mais nova da linha; o pull traz ela.
 * - `INVALID`: payload fora do schema, id de outro usuário ou id diferente do payload.
 * - `PARENT_MISSING`: o veículo ou plano a que a linha se refere não existe para o usuário.
 */
export const syncRejectionSchema = z.enum(['STALE', 'INVALID', 'PARENT_MISSING']);
export type SyncRejection = z.infer<typeof syncRejectionSchema>;

export const syncPushResultSchema = z.object({
  table: syncTableSchema,
  id: z.uuid(),
  status: z.enum(['accepted', 'rejected']),
  reason: syncRejectionSchema.optional(),
});
export type SyncPushResult = z.infer<typeof syncPushResultSchema>;

export const syncPushResponseSchema = z.object({
  protocol: z.number().int().positive(),
  /** Na ordem das mudanças enviadas. */
  results: z.array(syncPushResultSchema),
});
export type SyncPushResponse = z.infer<typeof syncPushResponseSchema>;

export const syncPullQuerySchema = z.object({
  protocol: z.coerce.number().int().positive(),
  /** Última `version` que o app já aplicou (0 no primeiro pull). Texto: a versão é um inteiro de 64 bits. */
  since: z
    .string()
    .regex(/^\d{1,18}$/)
    .default('0'),
  limit: z.coerce.number().int().min(1).max(SYNC_PULL_MAX_LIMIT).default(SYNC_PULL_DEFAULT_LIMIT),
});
export type SyncPullQuery = z.infer<typeof syncPullQuerySchema>;

export const syncPulledChangeSchema = z.object({
  table: syncTableSchema,
  id: z.uuid(),
  op: syncOpSchema,
  /** Versão do servidor para esta linha (cresce a cada mudança do usuário). */
  version: z.string(),
  updatedAt: z.iso.datetime(),
  /** `upsert`: a linha inteira, no schema da tabela. `delete`: `{ id, deletedAt }`. */
  payload: z.unknown(),
});
export type SyncPulledChange = z.infer<typeof syncPulledChangeSchema>;

export const syncPullResponseSchema = z.object({
  protocol: z.number().int().positive(),
  /** Do `version` mais antigo ao mais novo. */
  changes: z.array(syncPulledChangeSchema),
  /** O `since` do próximo pull. Com `hasMore`, o app chama de novo na hora. */
  nextSince: z.string(),
  hasMore: z.boolean(),
});
export type SyncPullResponse = z.infer<typeof syncPullResponseSchema>;
