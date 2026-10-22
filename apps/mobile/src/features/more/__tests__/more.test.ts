import { migrate } from '../../../core/db/migrations';
import { createTestDb } from '../../../core/db/testing/testDb';
import { addDocument } from '../../../core/documents';
import { documentsBadge } from '../models/documentsBadge';
import { loadMoreSummary } from '../models/more.repository';

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

describe('loadMoreSummary', () => {
  const NOW = '2026-10-01T12:00:00.000Z';

  async function setup() {
    const db = createTestDb();
    await migrate(db);
    return db;
  }
  const addVehicle = (db: Awaited<ReturnType<typeof setup>>, id: string, extra = '') =>
    db.runAsync(
      `INSERT INTO vehicles (id, name, type, initial_km, created_at, updated_at ${extra ? ', ' + extra.split('=')[0] : ''})
       VALUES (?, 'V', 'flex', 0, ?, ? ${extra ? ', ' + extra.split('=')[1] : ''})`,
      id,
      NOW,
      NOW,
    );

  it('sem veículos: zero, e a CNH conta mesmo assim', async () => {
    const db = await setup();
    await addDocument(db, { kind: 'cnh', dueDate: '2026-10-01' });
    expect(await loadMoreSummary(db, new Date(2026, 9, 21))).toEqual({
      vehicleCount: 0,
      documents: { overdue: 1, soon: 0 },
    });
  });

  it('conta só os veículos ativos: arquivado e excluído ficam de fora', async () => {
    const db = await setup();
    await addVehicle(db, '018bcfe5-6800-7000-8000-000000000001');
    await addVehicle(db, '018bcfe5-6800-7000-8000-000000000002');
    await addVehicle(db, '018bcfe5-6800-7000-8000-000000000003', 'archived=1');
    await addVehicle(db, '018bcfe5-6800-7000-8000-000000000004', "deleted_at='2026-10-02'");
    expect((await loadMoreSummary(db)).vehicleCount).toBe(2);
  });
});
