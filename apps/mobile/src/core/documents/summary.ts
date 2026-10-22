import {
  DEFAULT_DOCUMENT_NOTIFY_DAYS,
  documentStatus,
  type DocumentRecord,
  type DocumentStatus,
} from '@ta-em-dia/shared';

/** "Perto de vencer": dentro do primeiro aviso do prazo (sem avisos, o padrão de 30 dias). */
export function documentSoonDays(document: Pick<DocumentRecord, 'notifyDays'>): number {
  return Math.max(
    ...(document.notifyDays.length > 0 ? document.notifyDays : DEFAULT_DOCUMENT_NOTIFY_DAYS),
  );
}

/** Situação de um prazo, com o limite de "perto" do próprio prazo. */
export function statusOfDocument(
  document: DocumentRecord,
  today: Date = new Date(),
): DocumentStatus {
  return documentStatus(document.dueDate, today, documentSoonDays(document));
}

export interface DocumentCounts {
  overdue: number;
  soon: number;
}

/** Quantos prazos estão vencidos e quantos perto de vencer. */
export function countDocuments(
  documents: DocumentRecord[],
  today: Date = new Date(),
): DocumentCounts {
  const counts: DocumentCounts = { overdue: 0, soon: 0 };
  for (const document of documents) {
    const { tone } = statusOfDocument(document, today);
    if (tone === 'overdue') counts.overdue++;
    else if (tone === 'soon') counts.soon++;
  }
  return counts;
}
