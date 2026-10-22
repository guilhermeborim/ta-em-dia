import {
  odometerReadingSchema,
  type OdometerReading,
  type OdometerReadingRecord,
} from '@ta-em-dia/shared';
import { enqueue, newId, type Db } from '../db';

/** Leituras manuais do veículo (não excluídas), da mais recente à mais antiga. */
export async function listManualReadings(db: Db, vehicleId: string): Promise<OdometerReading[]> {
  const rows = await db.getAllAsync<{ km: number; read_at: string }>(
    `SELECT km, read_at
       FROM odometer_readings
      WHERE vehicle_id = ? AND source = 'manual' AND deleted_at IS NULL
      ORDER BY read_at DESC, km DESC`,
    vehicleId,
  );
  return rows.map((row) => ({ km: row.km, readAt: new Date(row.read_at) }));
}

/** Valida, grava a leitura manual e enfileira para o sync, tudo na mesma transação. */
export async function addManualReading(
  db: Db,
  input: { vehicleId: string; km: number },
  ctx: { id?: string; now?: Date } = {},
): Promise<OdometerReadingRecord> {
  const now = ctx.now ?? new Date();
  const reading = odometerReadingSchema.parse({
    id: ctx.id ?? newId(),
    vehicleId: input.vehicleId,
    km: input.km,
    readAt: now,
    source: 'manual',
  });
  const at = now.toISOString();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO odometer_readings
         (id, vehicle_id, km, read_at, source, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      reading.id,
      reading.vehicleId,
      reading.km,
      at,
      reading.source,
      at,
      at,
    );
    await enqueue(db, 'odometer_readings', reading.id, 'upsert', reading, at);
  });

  return reading;
}
