import type { DocumentRecord } from '@ta-em-dia/shared';
import { migrate } from '../../../core/db/migrations';
import { createTestDb } from '../../../core/db/testing/testDb';
import type { Db } from '../../../core/db';
import {
  addDocument,
  deleteDocument,
  DuplicateDocumentError,
  findDocument,
  listAllDocuments,
  listDocumentHistory,
  listDocuments,
  renewDocument,
  updateDocument,
} from '../../../core/documents';
import { createVehicle, deleteVehicle } from '../../vehicles/models/vehicles.repository';
import {
  buildDocumentInput,
  dueInputFrom,
  emptyDocumentForm,
  parseDueInput,
  toggleNotifyDay,
} from '../models/documentForm';
import {
  availableKinds,
  buildDocumentSections,
  buildHistory,
  noticeText,
  toDocumentItem,
} from '../models/documentsList';
import { loadDocuments } from '../models/documents.repository';

const TODAY = new Date(2026, 9, 21, 15);
const GOL = '018bcfe5-6800-7000-8000-000000000001';
const NOW = new Date('2026-10-21T12:00:00.000Z');

let n = 0;
const doc = (
  patch: Partial<DocumentRecord> & Pick<DocumentRecord, 'kind' | 'dueDate'>,
): DocumentRecord => ({
  id: `018bcfe5-6800-7000-8000-${String(++n).padStart(12, '0')}`,
  vehicleId: patch.kind === 'cnh' ? undefined : GOL,
  notifyDays: [30, 7],
  ...patch,
});

describe('toDocumentItem', () => {
  it('vencido: data, selo vermelho e ícone de arquivo', () => {
    expect(toDocumentItem(doc({ kind: 'ipva', dueDate: '2026-10-15' }), TODAY)).toMatchObject({
      title: 'IPVA 2026',
      subtitle: 'Venceu em 15/10/2026',
      icon: 'file',
      tone: 'danger',
      status: 'Vencido',
    });
  });

  it('perto: dias no selo; seguro diz "Renova em"', () => {
    expect(toDocumentItem(doc({ kind: 'insurance', dueDate: '2026-11-13' }), TODAY)).toMatchObject({
      subtitle: 'Renova em 13/11/2026',
      icon: 'shield',
      tone: 'warning',
      status: '23 dias',
    });
    expect(toDocumentItem(doc({ kind: 'cnh', dueDate: '2026-10-22' }), TODAY).status).toBe('1 dia');
    expect(toDocumentItem(doc({ kind: 'cnh', dueDate: '2026-10-21' }), TODAY).status).toBe('Hoje');
  });

  it('em dia: mais de 30 dias', () => {
    expect(toDocumentItem(doc({ kind: 'licensing', dueDate: '2027-09-30' }), TODAY)).toMatchObject({
      subtitle: 'Vence em 30/09/2027',
      tone: 'ok',
      status: 'Em dia',
    });
  });

  it('o limite de "perto" segue o maior aviso do prazo', () => {
    const item = toDocumentItem(
      doc({ kind: 'ipva', dueDate: '2026-11-13', notifyDays: [15, 3] }),
      TODAY,
    );
    expect(item.tone).toBe('ok');
  });
});

describe('buildDocumentSections', () => {
  const vehicle = { id: GOL, name: 'Golzinho', plate: 'bra2e19' };
  const documents = [
    doc({ kind: 'cnh', dueDate: '2026-11-20' }),
    doc({ kind: 'insurance', dueDate: '2026-11-13' }),
    doc({ kind: 'ipva', dueDate: '2026-10-15' }),
    doc({ kind: 'licensing', dueDate: '2027-09-30' }),
  ];

  it('veículo (IPVA, licenciamento, seguro) e "Você" (CNH)', () => {
    const sections = buildDocumentSections({ vehicle, documents, history: [] }, TODAY);
    expect(sections.map((s) => [s.title, s.items.map((i) => i.title)])).toEqual([
      ['GOLZINHO · BRA2E19', ['IPVA 2026', 'Licenciamento 2027', 'Seguro 2026']],
      ['VOCÊ', ['CNH 2026']],
    ]);
  });

  it('sem placa, só o nome; grupo vazio não aparece; sem veículo, só a CNH', () => {
    const noPlate = buildDocumentSections(
      { vehicle: { id: GOL, name: 'Gol' }, documents: [documents[2]], history: [] },
      TODAY,
    );
    expect(noPlate.map((s) => s.title)).toEqual(['GOL']);
    expect(
      buildDocumentSections({ vehicle: null, documents, history: [] }, TODAY).map((s) => s.title),
    ).toEqual(['VOCÊ']);
    expect(buildDocumentSections({ vehicle, documents: [], history: [] }, TODAY)).toEqual([]);
  });
});

describe('availableKinds', () => {
  const vehicle = { id: GOL, name: 'Gol' };

  it('só os tipos ainda sem prazo', () => {
    const documents = [doc({ kind: 'ipva', dueDate: '2026-10-15' })];
    expect(availableKinds({ vehicle, documents, history: [] })).toEqual([
      'licensing',
      'insurance',
      'cnh',
    ]);
  });

  it('sem veículo, só a CNH', () => {
    expect(availableKinds({ vehicle: null, documents: [], history: [] })).toEqual(['cnh']);
  });
});

describe('formulário', () => {
  it('lê dd/mm/aaaa, passada ou futura', () => {
    expect(parseDueInput('20/11/2026')).toEqual({ dueDate: '2026-11-20' });
    expect(parseDueInput('15/10/2025')).toEqual({ dueDate: '2025-10-15' });
  });

  it('recusa incompleta, inexistente e fora de 2000–2100', () => {
    expect(parseDueInput('20/11').error).toBe('Informe a data (dd/mm/aaaa)');
    expect(parseDueInput('30/02/2026').error).toBe('Data inválida');
    expect(parseDueInput('01/01/1999').error).toBe('Data inválida');
    expect(parseDueInput('01/01/2101').error).toBe('Data inválida');
  });

  it('exige tipo e data; devolve a data no formato guardado', () => {
    expect(buildDocumentInput({ ...emptyDocumentForm, dueDate: '' }).errors).toEqual({
      kind: 'Escolha o documento',
      dueDate: 'Informe a data (dd/mm/aaaa)',
    });
    expect(
      buildDocumentInput({ kind: 'ipva', dueDate: '20/11/2026', notifyDays: [30, 7] }).value,
    ).toEqual({ kind: 'ipva', dueDate: '2026-11-20', notifyDays: [30, 7] });
  });

  it('na edição, o campo vem com a data do prazo', () => {
    expect(dueInputFrom('2026-11-05')).toBe('05/11/2026');
  });
});

describe('prazos no SQLite', () => {
  let db: Db;

  beforeEach(async () => {
    db = createTestDb();
    await migrate(db);
    await createVehicle(
      db,
      { name: 'Gol', type: 'flex', initialKm: 1000, plate: 'BRA2E19' },
      { id: GOL, now: NOW },
    );
    await db.runAsync('DELETE FROM outbox');
  });

  const outbox = () =>
    db.getAllAsync<{ table_name: string; op: string }>(
      'SELECT table_name, op FROM outbox ORDER BY id',
    );

  it('grava o prazo com os avisos padrão e enfileira o upsert', async () => {
    const ipva = await addDocument(
      db,
      { vehicleId: GOL, kind: 'ipva', dueDate: '2026-11-20' },
      { now: NOW },
    );

    expect(ipva).toMatchObject({ vehicleId: GOL, kind: 'ipva', notifyDays: [30, 7] });
    expect(await findDocument(db, ipva.id)).toEqual(ipva);
    expect(await outbox()).toEqual([{ table_name: 'documents', op: 'upsert' }]);
  });

  it('a CNH é da pessoa: fica sem veículo e aparece com ou sem veículo', async () => {
    const cnh = await addDocument(db, { vehicleId: GOL, kind: 'cnh', dueDate: '2026-11-20' });
    expect(cnh.vehicleId).toBeUndefined();
    expect((await listDocuments(db)).map((d) => d.kind)).toEqual(['cnh']);
    expect((await listDocuments(db, GOL)).map((d) => d.kind)).toEqual(['cnh']);
  });

  it('prazo do veículo sem veículo, data inválida e tipo repetido: erro, sem gravar', async () => {
    await expect(addDocument(db, { kind: 'ipva', dueDate: '2026-11-20' })).rejects.toThrow();
    await expect(
      addDocument(db, { vehicleId: GOL, kind: 'ipva', dueDate: '2026-02-30' }),
    ).rejects.toThrow();
    await addDocument(db, { vehicleId: GOL, kind: 'ipva', dueDate: '2026-11-20' });
    await expect(
      addDocument(db, { vehicleId: GOL, kind: 'ipva', dueDate: '2026-12-01' }),
    ).rejects.toThrow('já está cadastrado');
    expect(await listDocuments(db, GOL)).toHaveLength(1);
  });

  it('lista por vencimento e traz a placa do veículo ativo', async () => {
    await addDocument(db, { vehicleId: GOL, kind: 'licensing', dueDate: '2027-09-30' });
    await addDocument(db, { vehicleId: GOL, kind: 'ipva', dueDate: '2026-10-15' });

    const loaded = await loadDocuments(db);
    expect(loaded.vehicle).toEqual({ id: GOL, name: 'Gol', plate: 'BRA2E19' });
    expect(loaded.documents.map((d) => d.kind)).toEqual(['ipva', 'licensing']);
  });

  it('sem veículo, só a CNH', async () => {
    const empty = createTestDb();
    await migrate(empty);
    await addDocument(empty, { kind: 'cnh', dueDate: '2026-11-20' });
    expect(await loadDocuments(empty)).toMatchObject({
      vehicle: null,
      documents: [{ kind: 'cnh' }],
    });
  });

  it('troca a data e enfileira o upsert; prazo inexistente volta null', async () => {
    const ipva = await addDocument(db, { vehicleId: GOL, kind: 'ipva', dueDate: '2026-10-15' });
    await db.runAsync('DELETE FROM outbox');

    const patch = { dueDate: '2027-10-15', notifyDays: [15] };
    expect(await updateDocument(db, ipva.id, patch)).toMatchObject(patch);
    expect(await findDocument(db, ipva.id)).toMatchObject(patch);
    expect(await outbox()).toEqual([{ table_name: 'documents', op: 'upsert' }]);
    await expect(
      updateDocument(db, ipva.id, { dueDate: 'xx', notifyDays: [30] }),
    ).rejects.toThrow();
    expect(await updateDocument(db, '018bcfe5-6800-7000-8000-0000000000ff', patch)).toBeNull();
  });

  it('exclusão é lógica e libera o tipo para cadastrar de novo', async () => {
    const ipva = await addDocument(db, { vehicleId: GOL, kind: 'ipva', dueDate: '2026-10-15' });
    await db.runAsync('DELETE FROM outbox');
    await deleteDocument(db, ipva.id, NOW);

    expect(await findDocument(db, ipva.id)).toBeNull();
    const row = await db.getFirstAsync<{ deleted_at: string }>(
      'SELECT deleted_at FROM documents WHERE id = ?',
      ipva.id,
    );
    expect(row?.deleted_at).toBe(NOW.toISOString());
    expect(await outbox()).toEqual([{ table_name: 'documents', op: 'delete' }]);
    await addDocument(db, { vehicleId: GOL, kind: 'ipva', dueDate: '2027-10-15' });
  });

  it('excluir o veículo apaga os prazos dele, mas não a CNH', async () => {
    await addDocument(db, { vehicleId: GOL, kind: 'ipva', dueDate: '2026-10-15' });
    await addDocument(db, { kind: 'cnh', dueDate: '2026-11-20' });
    await deleteVehicle(db, GOL, NOW);

    expect((await listDocuments(db)).map((d) => d.kind)).toEqual(['cnh']);
  });
});

describe('prazos por ano', () => {
  let db: Db;

  beforeEach(async () => {
    db = createTestDb();
    await migrate(db);
    await createVehicle(
      db,
      { name: 'Gol', type: 'flex', initialKm: 1000, plate: 'BRA2E19' },
      { id: GOL, now: NOW },
    );
    await db.runAsync('DELETE FROM outbox');
  });

  const outbox = () =>
    db.getAllAsync<{ table_name: string; op: string }>(
      'SELECT table_name, op FROM outbox ORDER BY id',
    );

  it('o mesmo tipo guarda um prazo por ano; o do ano repetido dá erro com o ano', async () => {
    await addDocument(db, { vehicleId: GOL, kind: 'ipva', dueDate: '2026-11-20' });
    await addDocument(db, { vehicleId: GOL, kind: 'ipva', dueDate: '2027-11-20' });
    await expect(
      addDocument(db, { vehicleId: GOL, kind: 'ipva', dueDate: '2027-01-10' }),
    ).rejects.toMatchObject({ kind: 'ipva', year: 2027 });
    await expect(
      addDocument(db, { vehicleId: GOL, kind: 'ipva', dueDate: '2027-01-10' }),
    ).rejects.toBeInstanceOf(DuplicateDocumentError);
    // Outro tipo, outro veículo e a CNH não entram na conta.
    await addDocument(db, { vehicleId: GOL, kind: 'licensing', dueDate: '2027-11-20' });
    await addDocument(db, { kind: 'cnh', dueDate: '2027-11-20' });
  });

  it('só o prazo mais recente de cada tipo é o atual; o resto é histórico', async () => {
    const old = await addDocument(db, { vehicleId: GOL, kind: 'ipva', dueDate: '2025-11-20' });
    const now = await addDocument(db, { vehicleId: GOL, kind: 'ipva', dueDate: '2026-11-20' });
    const oldest = await addDocument(db, { vehicleId: GOL, kind: 'ipva', dueDate: '2024-11-20' });

    expect((await listDocuments(db, GOL)).map((d) => d.id)).toEqual([now.id]);
    expect((await listDocumentHistory(db, GOL)).map((d) => d.id)).toEqual([old.id, oldest.id]);
    expect((await listAllDocuments(db)).map((d) => d.id)).toEqual([now.id]);

    const loaded = await loadDocuments(db);
    expect(loaded.documents.map((d) => d.id)).toEqual([now.id]);
    expect(loaded.history.map((d) => d.id)).toEqual([old.id, oldest.id]);
  });

  it('o histórico lista os anos anteriores com título, data e "Renovado"', async () => {
    await addDocument(db, { vehicleId: GOL, kind: 'ipva', dueDate: '2025-11-20' });
    await addDocument(db, { vehicleId: GOL, kind: 'ipva', dueDate: '2026-11-20' });

    expect(buildHistory(await loadDocuments(db))).toEqual([
      expect.objectContaining({
        title: 'IPVA 2025',
        subtitle: 'Vencimento em 20/11/2025',
        tone: 'none',
        status: 'Renovado',
      }),
    ]);
    expect(buildHistory({ vehicle: null, documents: [], history: [] })).toEqual([]);
  });

  it('renovar cria o prazo do ano seguinte, com a mesma data e os mesmos avisos', async () => {
    const ipva = await addDocument(db, {
      vehicleId: GOL,
      kind: 'ipva',
      dueDate: '2026-11-20',
      notifyDays: [15, 3],
    });
    await db.runAsync('DELETE FROM outbox');

    const renewed = await renewDocument(db, ipva.id);
    expect(renewed).toMatchObject({
      vehicleId: GOL,
      kind: 'ipva',
      dueDate: '2027-11-20',
      notifyDays: [15, 3],
    });
    expect(renewed?.id).not.toBe(ipva.id);
    expect(await outbox()).toEqual([{ table_name: 'documents', op: 'upsert' }]);

    // O antigo vai para o histórico, sem mudar.
    expect((await listDocuments(db, GOL)).map((d) => d.id)).toEqual([renewed?.id]);
    expect(await findDocument(db, ipva.id)).toEqual(ipva);
    expect((await listDocumentHistory(db, GOL)).map((d) => d.id)).toEqual([ipva.id]);
  });

  it('renovar a CNH não leva veículo; renovar duas vezes ou prazo inexistente', async () => {
    const cnh = await addDocument(db, { kind: 'cnh', dueDate: '2026-05-01' });
    expect(await renewDocument(db, cnh.id)).toMatchObject({ kind: 'cnh', dueDate: '2027-05-01' });
    await expect(renewDocument(db, cnh.id)).rejects.toBeInstanceOf(DuplicateDocumentError);
    expect(await renewDocument(db, '018bcfe5-6800-7000-8000-0000000000ff')).toBeNull();
  });

  it('editar a data para um ano que já existe dá erro; o próprio ano vale', async () => {
    const a = await addDocument(db, { vehicleId: GOL, kind: 'ipva', dueDate: '2026-11-20' });
    await addDocument(db, { vehicleId: GOL, kind: 'ipva', dueDate: '2027-11-20' });

    await expect(
      updateDocument(db, a.id, { dueDate: '2027-01-05', notifyDays: [30] }),
    ).rejects.toBeInstanceOf(DuplicateDocumentError);
    expect(
      await updateDocument(db, a.id, { dueDate: '2026-12-31', notifyDays: [30] }),
    ).toMatchObject({ dueDate: '2026-12-31' });
  });

  it('excluir o prazo atual traz o do ano anterior de volta', async () => {
    const old = await addDocument(db, { vehicleId: GOL, kind: 'ipva', dueDate: '2025-11-20' });
    const now = await addDocument(db, { vehicleId: GOL, kind: 'ipva', dueDate: '2026-11-20' });
    await deleteDocument(db, now.id, NOW);

    expect((await listDocuments(db, GOL)).map((d) => d.id)).toEqual([old.id]);
    expect(await listDocumentHistory(db, GOL)).toEqual([]);
  });

  it('excluir o veículo apaga também o histórico', async () => {
    await addDocument(db, { vehicleId: GOL, kind: 'ipva', dueDate: '2025-11-20' });
    await addDocument(db, { vehicleId: GOL, kind: 'ipva', dueDate: '2026-11-20' });
    await deleteVehicle(db, GOL, NOW);

    expect(await listDocumentHistory(db, GOL)).toEqual([]);
  });
});

describe('avisos do formulário e do pé da tela', () => {
  it('marca e desmarca dias, do maior para o menor', () => {
    expect(toggleNotifyDay([30, 7], 15)).toEqual([30, 15, 7]);
    expect(toggleNotifyDay([30, 7], 30)).toEqual([7]);
    expect(toggleNotifyDay([7], 7)).toEqual([]);
  });

  it('texto do aviso: iguais, "1 dia", diferentes e sem avisos', () => {
    const base = { kind: 'ipva' as const, dueDate: '2026-11-20' };
    const d = (id: string, notifyDays: number[]) => ({ id, ...base, notifyDays });
    expect(noticeText([])).toBeNull();
    expect(noticeText([d('a', [30, 7]), d('b', [7, 30])])).toBe(
      'Avisamos 30 e 7 dias antes de cada vencimento.',
    );
    expect(noticeText([d('a', [30, 15, 7])])).toBe(
      'Avisamos 30, 15 e 7 dias antes de cada vencimento.',
    );
    expect(noticeText([d('a', [1])])).toBe('Avisamos 1 dia antes de cada vencimento.');
    expect(noticeText([d('a', [30, 7]), d('b', [3])])).toBe(
      'Avisamos antes de cada vencimento, nos dias de cada prazo.',
    );
    expect(noticeText([d('a', [])])).toBe(
      'Os prazos estão sem aviso. Toque num deles para escolher.',
    );
  });

  it('"perto de vencer" segue o primeiro aviso do prazo; sem avisos, 30 dias', () => {
    const only7 = toDocumentItem(
      doc({ kind: 'ipva', dueDate: '2026-11-13', notifyDays: [7] }),
      TODAY,
    );
    expect(only7.tone).toBe('ok');
    const none = toDocumentItem(
      doc({ kind: 'ipva', dueDate: '2026-11-13', notifyDays: [] }),
      TODAY,
    );
    expect(none.tone).toBe('warning');
  });
});
