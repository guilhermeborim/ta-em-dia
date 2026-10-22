import type { DocumentRecord } from '@ta-em-dia/shared';
import { migrate } from '../../../core/db/migrations';
import { createTestDb } from '../../../core/db/testing/testDb';
import type { Db } from '../../../core/db';
import {
  addDocument,
  deleteDocument,
  findDocument,
  listDocuments,
  updateDocumentDueDate,
} from '../../../core/documents';
import { createVehicle, deleteVehicle } from '../../vehicles/models/vehicles.repository';
import { buildDocumentInput, dueInputFrom, parseDueInput } from '../models/documentForm';
import { availableKinds, buildDocumentSections, toDocumentItem } from '../models/documentsList';
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
      title: 'IPVA',
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
    const sections = buildDocumentSections({ vehicle, documents }, TODAY);
    expect(sections.map((s) => [s.title, s.items.map((i) => i.title)])).toEqual([
      ['GOLZINHO · BRA2E19', ['IPVA', 'Licenciamento', 'Seguro']],
      ['VOCÊ', ['CNH']],
    ]);
  });

  it('sem placa, só o nome; grupo vazio não aparece; sem veículo, só a CNH', () => {
    const noPlate = buildDocumentSections(
      { vehicle: { id: GOL, name: 'Gol' }, documents: [documents[2]] },
      TODAY,
    );
    expect(noPlate.map((s) => s.title)).toEqual(['GOL']);
    expect(buildDocumentSections({ vehicle: null, documents }, TODAY).map((s) => s.title)).toEqual([
      'VOCÊ',
    ]);
    expect(buildDocumentSections({ vehicle, documents: [] }, TODAY)).toEqual([]);
  });
});

describe('availableKinds', () => {
  const vehicle = { id: GOL, name: 'Gol' };

  it('só os tipos ainda sem prazo', () => {
    const documents = [doc({ kind: 'ipva', dueDate: '2026-10-15' })];
    expect(availableKinds({ vehicle, documents })).toEqual(['licensing', 'insurance', 'cnh']);
  });

  it('sem veículo, só a CNH', () => {
    expect(availableKinds({ vehicle: null, documents: [] })).toEqual(['cnh']);
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
    expect(buildDocumentInput({ kind: null, dueDate: '' }).errors).toEqual({
      kind: 'Escolha o documento',
      dueDate: 'Informe a data (dd/mm/aaaa)',
    });
    expect(buildDocumentInput({ kind: 'ipva', dueDate: '20/11/2026' }).value).toEqual({
      kind: 'ipva',
      dueDate: '2026-11-20',
    });
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
      addDocument(db, { vehicleId: GOL, kind: 'ipva', dueDate: '2027-11-20' }),
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

    expect((await updateDocumentDueDate(db, ipva.id, '2027-10-15'))?.dueDate).toBe('2027-10-15');
    expect((await findDocument(db, ipva.id))?.dueDate).toBe('2027-10-15');
    expect(await outbox()).toEqual([{ table_name: 'documents', op: 'upsert' }]);
    await expect(updateDocumentDueDate(db, ipva.id, 'xx')).rejects.toThrow();
    expect(
      await updateDocumentDueDate(db, '018bcfe5-6800-7000-8000-0000000000ff', '2027-01-01'),
    ).toBeNull();
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
