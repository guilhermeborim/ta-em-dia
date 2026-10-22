import type { Db } from '../db';

/**
 * Quando o km do veículo foi atualizado pela última vez: o mais recente entre leitura manual,
 * abastecimento e serviço (todos contam como leitura do hodômetro). Sem nenhum, a data em que o
 * veículo foi cadastrado.
 */
export async function lastKmUpdateAt(db: Db, vehicleId: string): Promise<Date | null> {
  const row = await db.getFirstAsync<{ at: string | null }>(
    `SELECT MAX(at) AS at FROM (
       SELECT read_at AS at FROM odometer_readings
        WHERE vehicle_id = ?1 AND deleted_at IS NULL
       UNION ALL
       SELECT date FROM fuel_entries WHERE vehicle_id = ?1 AND deleted_at IS NULL
       UNION ALL
       SELECT date FROM maintenance_records WHERE vehicle_id = ?1 AND deleted_at IS NULL
     )`,
    vehicleId,
  );
  if (row?.at) return new Date(row.at);
  const vehicle = await db.getFirstAsync<{ created_at: string }>(
    'SELECT created_at FROM vehicles WHERE id = ?',
    vehicleId,
  );
  return vehicle ? new Date(vehicle.created_at) : null;
}
