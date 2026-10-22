import { migrate } from '../../../core/db/migrations';
import { createTestDb } from '../../../core/db/testing/testDb';
import { addDocument } from '../../../core/documents';
import { documentsBadge } from '../models/documentsBadge';
import { loadDocumentCounts } from '../models/documents.repository';

describe('documentsBadge', () => {
  it('vencidos em vermelho, com plural', () => {
    expect(documentsBadge({ overdue: 1, soon: 3 })).toEqual({ text: '1 vencido', tone: 'danger' });
    expect(documentsBadge({ overdue: 2, soon: 0 })).toEqual({ text: '2 vencidos', tone: 'danger' });
  });

  it('sem vencidos, perto de vencer em âmbar; sem nada, sem valor', () => {
    expect(documentsBadge({ overdue: 0, soon: 2 })).toEqual({
      text: '2 perto de vencer',
      tone: 'warning',
    });
    expect(documentsBadge({ overdue: 0, soon: 0 })).toBeNull();
  });
});

describe('loadDocumentCounts', () => {
  it('conta a CNH mesmo sem veículo', async () => {
    const db = createTestDb();
    await migrate(db);
    await addDocument(db, { kind: 'cnh', dueDate: '2026-10-01' });
    expect(await loadDocumentCounts(db, new Date(2026, 9, 21))).toEqual({ overdue: 1, soon: 0 });
  });
});
