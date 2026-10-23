import {
  currentDocuments,
  DEFAULT_DOCUMENT_NOTIFY_DAYS,
  documentHistory,
  documentSchema,
  documentYear,
  isVehicleDocument,
  nextYearDueDate,
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

/** Um prazo por ano (IPVA 2026, IPVA 2027...) e o mesmo ano não se repete no tipo. */
export class DuplicateDocumentError extends Error {
  constructor(
    readonly kind: DocumentKind,
    readonly year: number,
  ) {
    super('Esse prazo já está cadastrado');
  }
}

/** Todos os prazos do veículo e a CNH, dos anos atuais e anteriores, por vencimento. */
async function queryDocuments(db: Db, vehicleId?: string): Promise<DocumentRecord[]> {
  const rows = await db.getAllAsync<DocumentRow>(
    `SELECT ${COLUMNS}
       FROM documents
      WHERE deleted_at IS NULL AND (vehicle_id = ? OR vehicle_id IS NULL)
      ORDER BY due_date, kind`,
    vehicleId ?? null,
  );
  return rows.map(toDocument);
}

/**
 * Os prazos atuais do veículo e a CNH (que é da pessoa), em ordem de vencimento: de cada tipo, o
 * de vencimento mais recente (`currentDocuments`). Sem veículo, só a CNH. Não traz os excluídos
 * nem os de anos anteriores (ver `listDocumentHistory`).
 */
export async function listDocuments(db: Db, vehicleId?: string): Promise<DocumentRecord[]> {
  return currentDocuments(await queryDocuments(db, vehicleId));
}

/** Os prazos de anos anteriores do veículo e da CNH, do mais novo ao mais antigo. */
export async function listDocumentHistory(db: Db, vehicleId?: string): Promise<DocumentRecord[]> {
  return documentHistory(await queryDocuments(db, vehicleId));
}

/** Um prazo com o nome do veículo (a CNH não tem). */
export type DocumentWithVehicle = DocumentRecord & { vehicleName?: string };

/**
 * Os prazos atuais de todos os veículos ativos (não arquivados nem excluídos) e a CNH, em ordem
 * de vencimento. É o que os avisos usam: arquivar um veículo cala os avisos dele, e prazos de anos
 * anteriores não avisam.
 */
export async function listAllDocuments(db: Db): Promise<DocumentWithVehicle[]> {
  const rows = await db.getAllAsync<DocumentRow & { vehicle_name: string | null }>(
    `SELECT d.id, d.vehicle_id, d.kind, d.due_date, d.notify_days, d.note, v.name AS vehicle_name
       FROM documents d
       LEFT JOIN vehicles v ON v.id = d.vehicle_id
      WHERE d.deleted_at IS NULL
        AND (d.vehicle_id IS NULL OR (v.deleted_at IS NULL AND v.archived = 0))
      ORDER BY d.due_date, d.kind`,
  );
  return currentDocuments(
    rows.map((row) => ({ ...toDocument(row), vehicleName: row.vehicle_name ?? undefined })),
  );
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
  /** Dias de aviso. Sem isso, os padrões (30 e 7). */
  notifyDays?: number[];
}

/** Já existe outro prazo do tipo, do mesmo dono, que vence no mesmo ano? `exceptId` é o que está sendo editado. */
async function hasSameYear(
  db: Db,
  document: Pick<DocumentRecord, 'kind' | 'vehicleId' | 'dueDate'>,
  exceptId?: string,
): Promise<boolean> {
  const duplicate = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM documents
      WHERE kind = ? AND deleted_at IS NULL AND vehicle_id IS ?
        AND substr(due_date, 1, 4) = ? AND id IS NOT ?`,
    document.kind,
    document.vehicleId ?? null,
    String(documentYear(document.dueDate)),
    exceptId ?? null,
  );
  return duplicate !== null;
}

/**
 * Valida, grava e enfileira o prazo, na mesma transação. Cada tipo tem um prazo por ano e por
 * veículo (a CNH, por pessoa); o ano é o do vencimento. Repetir o ano lança `DuplicateDocumentError`.
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
    notifyDays: input.notifyDays ?? DEFAULT_DOCUMENT_NOTIFY_DAYS,
  });
  if (isVehicleDocument(document.kind) && !document.vehicleId) {
    throw new Error('Documento do veículo precisa de um veículo');
  }
  const at = (ctx.now ?? new Date()).toISOString();

  await db.withTransactionAsync(async () => {
    if (await hasSameYear(db, document)) {
      throw new DuplicateDocumentError(document.kind, documentYear(document.dueDate));
    }

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

/** O que dá para mudar num prazo: a data e os dias de aviso (vazio = sem aviso). */
export interface DocumentPatch {
  /** "aaaa-mm-dd". */
  dueDate: string;
  notifyDays: number[];
}

/** Grava a edição e enfileira o upsert. `null` se o prazo não existe; ano já cadastrado lança `DuplicateDocumentError`. */
export async function updateDocument(
  db: Db,
  id: string,
  patch: DocumentPatch,
  now: Date = new Date(),
): Promise<DocumentRecord | null> {
  const at = now.toISOString();
  let updated: DocumentRecord | null = null;

  await db.withTransactionAsync(async () => {
    const current = await findDocument(db, id);
    if (!current) return;
    updated = documentSchema.parse({ ...current, ...patch });
    if (await hasSameYear(db, updated, id)) {
      throw new DuplicateDocumentError(updated.kind, documentYear(updated.dueDate));
    }
    await db.runAsync(
      'UPDATE documents SET due_date = ?, notify_days = ?, updated_at = ? WHERE id = ?',
      updated.dueDate,
      JSON.stringify(updated.notifyDays),
      at,
      id,
    );
    await enqueue(db, 'documents', id, 'upsert', updated, at);
  });

  return updated;
}

/**
 * Renova o prazo: um novo para o ano seguinte, no mesmo dia e com os mesmos avisos. O de agora
 * fica no histórico. `null` se o prazo não existe; se o ano seguinte já existe, lança
 * `DuplicateDocumentError`.
 */
export async function renewDocument(
  db: Db,
  id: string,
  ctx: { id?: string; now?: Date } = {},
): Promise<DocumentRecord | null> {
  const current = await findDocument(db, id);
  if (!current) return null;
  return addDocument(
    db,
    {
      vehicleId: current.vehicleId,
      kind: current.kind,
      dueDate: nextYearDueDate(current.dueDate),
      notifyDays: current.notifyDays,
    },
    ctx,
  );
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
