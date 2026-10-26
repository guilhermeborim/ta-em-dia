import { migrate } from '../../db/migrations';
import { createTestDb } from '../../db/testing/testDb';
import { loadSettings, parseNotifyDays, saveDocumentNotifyDays, saveToggle } from '../settings';

async function setup() {
  const db = createTestDb();
  await migrate(db);
  return db;
}

describe('loadSettings', () => {
  it('sem nada guardado: avisos de manutenção e documentos ligados, km desligado, 30 e 7 dias', async () => {
    expect(await loadSettings(await setup())).toEqual({
      notifyMaintenance: true,
      notifyDocuments: true,
      notifyOdometer: false,
      documentNotifyDays: [30, 7],
      voiceAutoSave: false,
      stationArrival: false,
    });
  });

  it('guarda cada interruptor', async () => {
    const db = await setup();
    await saveToggle(db, 'notifyMaintenance', false);
    await saveToggle(db, 'notifyOdometer', true);
    expect(await loadSettings(db)).toMatchObject({
      notifyMaintenance: false,
      notifyDocuments: true,
      notifyOdometer: true,
    });
    await saveToggle(db, 'notifyMaintenance', true);
    expect((await loadSettings(db)).notifyMaintenance).toBe(true);
  });

  it('salvar pela fala vem desligado e guarda a escolha', async () => {
    const db = await setup();
    expect((await loadSettings(db)).voiceAutoSave).toBe(false);
    await saveToggle(db, 'voiceAutoSave', true);
    expect((await loadSettings(db)).voiceAutoSave).toBe(true);
    await saveToggle(db, 'voiceAutoSave', false);
    expect((await loadSettings(db)).voiceAutoSave).toBe(false);
  });

  it('aviso ao chegar no posto vem desligado e guarda a escolha', async () => {
    const db = await setup();
    expect((await loadSettings(db)).stationArrival).toBe(false);
    await saveToggle(db, 'stationArrival', true);
    expect((await loadSettings(db)).stationArrival).toBe(true);
  });

  it('guarda a antecedência do maior para o menor, sem repetir', async () => {
    const db = await setup();
    await saveDocumentNotifyDays(db, [3, 15, 3, 30]);
    expect((await loadSettings(db)).documentNotifyDays).toEqual([30, 15, 3]);
  });

  it('não sai do banco de dados nem entra na outbox', async () => {
    const db = await setup();
    await saveToggle(db, 'notifyDocuments', false);
    const row = await db.getFirstAsync<{ total: number }>('SELECT COUNT(*) AS total FROM outbox');
    expect(row?.total).toBe(0);
  });
});

describe('parseNotifyDays', () => {
  it('ignora o que não é opção e ordena', () => {
    expect(parseNotifyDays('7,abc,30,99')).toEqual([30, 7]);
  });

  it('vazio ou inválido volta ao padrão', () => {
    expect(parseNotifyDays(null)).toEqual([30, 7]);
    expect(parseNotifyDays('')).toEqual([30, 7]);
    expect(parseNotifyDays('0,2')).toEqual([30, 7]);
  });
});
