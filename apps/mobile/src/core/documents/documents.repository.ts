import {
  DEFAULT_DOCUMENT_NOTIFY_DAYS,
  documentSchema,
  isVehicleDocument,
  type DocumentKind,
  type DocumentRecord,
} from '@ta-em-dia/shared';
import { enqueue, newId, type Db } from '../db';

type DocumentRow = {
  id: string;
  vehicle_id: string | null;
  kind: DocumentKind;
  due_date: string;
  notify_days: string;
  note: string | null;
};

const COLUMNS = 'id, vehicle_id, kind, due_date, notify_days, note';

function toDocument(row: DocumentRow): DocumentRecord {
  return {
    id: row.id,
    vehicleId: row.vehicle_id ?? undefined,
    kind: row.kind,
    dueDate: row.due_date,
    notifyDays: JSON.parse(row.notify_days) as number[],
    note: row.note ?? undefined,
  };
}

/**
 * Prazos do veículo e a CNH (que é da pessoa), em ordem de vencimento. Sem veículo, só a CNH.
 * Não traz os excluídos.
 */
export async function listDocuments(db: Db, vehicleId?: string): Promise<DocumentRecord[]> {
  const rows = await db.getAllAsync<DocumentRow>(
    `SELECT ${COLUMNS}
       FROM documents
      WHERE deleted_at IS NULL AND (vehicle_id = ? OR vehicle_id IS NULL)
      ORDER BY due_date, kind`,
    vehicleId ?? null,
  );
  return rows.map(toDocument);
}

/** Um prazo (não excluído), ou `null`. */
export async function findDocument(db: Db, id: string): Promise<DocumentRecord | null> {
  const row = await db.getFirstAsync<DocumentRow>(
    `SELECT ${COLUMNS} FROM documents WHERE id = ? AND deleted_at IS NULL`,
    id,
  );
  return row ? toDocument(row) : null;
}

export interface NewDocument {
  /** Ignorado para a CNH. */
  vehicleId?: string;
  kind: DocumentKind;
  /** "aaaa-mm-dd". */
  dueDate: string;
}

/**
 * Valida, grava e enfileira o prazo, na mesma transação. Cada tipo tem um prazo só por
 * veículo (a CNH, um só por pessoa): o próximo vencimento. Repetir o tipo lança erro.
 */
export async function addDocument(
  db: Db,
  input: NewDocument,
  ctx: { id?: string; now?: Date } = {},
): Promise<DocumentRecord> {
  const document = documentSchema.parse({
    id: ctx.id ?? newId(),
    vehicleId: isVehicleDocument(input.kind) ? input.vehicleId : undefined,
    kind: input.kind,
    dueDate: input.dueDate,
    notifyDays: DEFAULT_DOCUMENT_NOTIFY_DAYS,
  });
  if (isVehicleDocument(document.kind) && !document.vehicleId) {
    throw new Error('Documento do veículo precisa de um veículo');
  }
  const at = (ctx.now ?? new Date()).toISOString();

  await db.withTransactionAsync(async () => {
    const duplicate = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM documents
        WHERE kind = ? AND deleted_at IS NULL AND vehicle_id IS ?`,
      document.kind,
      document.vehicleId ?? null,
    );
    if (duplicate) throw new Error('Esse prazo já está cadastrado');

    await db.runAsync(
      `INSERT INTO documents
         (id, vehicle_id, kind, due_date, notify_days, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      document.id,
      document.vehicleId ?? null,
      document.kind,
      document.dueDate,
      JSON.stringify(document.notifyDays),
      document.note ?? null,
      at,
      at,
    );
    await enqueue(db, 'documents', document.id, 'upsert', document, at);
  });

  return document;
}

/** Troca a data de vencimento e enfileira o upsert. `null` se o prazo não existe. */
export async function updateDocumentDueDate(
  db: Db,
  id: string,
  dueDate: string,
  now: Date = new Date(),
): Promise<DocumentRecord | null> {
  const at = now.toISOString();
  let updated: DocumentRecord | null = null;

  await db.withTransactionAsync(async () => {
    const current = await findDocument(db, id);
    if (!current) return;
    updated = documentSchema.parse({ ...current, dueDate });
    await db.runAsync(
      'UPDATE documents SET due_date = ?, updated_at = ? WHERE id = ?',
      updated.dueDate,
      at,
      id,
    );
    await enqueue(db, 'documents', id, 'upsert', updated, at);
  });

  return updated;
}

/** Exclusão lógica: a linha fica com deleted_at para o sync propagar. */
export async function deleteDocument(db: Db, id: string, now: Date = new Date()): Promise<void> {
  const at = now.toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE documents SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
      at,
      at,
      id,
    );
    await enqueue(db, 'documents', id, 'delete', { id, deletedAt: at }, at);
  });
}
