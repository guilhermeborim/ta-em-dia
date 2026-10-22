import { isCustomMaintenanceType, type MaintenanceRecord } from '@ta-em-dia/shared';
import type { Db } from '../../../core/db';
import { RECORD_COLUMNS, toRecord, type RecordRow } from '../../../core/maintenance';

export { listRecords, maxRecordKm } from '../../../core/maintenance';

/** O serviço mais recente de um tipo, ou `null`. */
export async function latestRecord(
  db: Db,
  vehicleId: string,
  type: string,
): Promise<MaintenanceRecord | null> {
  const row = await db.getFirstAsync<RecordRow>(
    `SELECT ${RECORD_COLUMNS}
       FROM maintenance_records
      WHERE vehicle_id = ? AND type = ? AND deleted_at IS NULL
      ORDER BY date DESC, km DESC
      LIMIT 1`,
    vehicleId,
    type,
  );
  return row ? toRecord(row) : null;
}

/**
 * Atalhos "Seu": os nomes distintos digitados em "Outro" que já aparecem nos planos e
 * serviços da pessoa. Não há tabela própria (ver docs/03-arquitetura.md).
 */
export async function listCustomTypes(db: Db): Promise<string[]> {
  const rows = await db.getAllAsync<{ type: string }>(
    `SELECT type FROM maintenance_plans WHERE deleted_at IS NULL
     UNION
     SELECT type FROM maintenance_records WHERE deleted_at IS NULL`,
  );
  return rows
    .map((row) => row.type)
    .filter(isCustomMaintenanceType)
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
