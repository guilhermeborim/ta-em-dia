import { saveAccount } from '../../../core/auth';
import { migrate } from '../../../core/db/migrations';
import { createTestDb } from '../../../core/db/testing/testDb';
import { buildExport, exportFileName, exportRow } from '../models/exportData';
import { loadExport } from '../models/exportData.repository';

const NOW = '2026-10-01T12:00:00.000Z';

describe('exportRow', () => {
  it('camelCase, booleanos, notify_days como lista e sem version', () => {
    expect(
      exportRow({
        vehicle_id: 'v1',
        full_tank: 1,
        archived: 0,
        enabled: null,
        notify_days: '[30,7]',
        version: 4,
      }),
    ).toEqual({
      vehicleId: 'v1',
      fullTank: true,
      archived: false,
      enabled: null,
      notifyDays: [30, 7],
    });
  });
});

describe('exportFileName', () => {
  it('data do aparelho no nome', () => {
    expect(exportFileName(new Date(2026, 0, 5, 23, 59))).toBe('ta-em-dia-dados-2026-01-05.json');
  });
});

describe('buildExport', () => {
  it('sem login: conta nula e todas as listas presentes', () => {
    const doc = buildExport({
      exportedAt: NOW,
      appVersion: '0.1.0',
      account: null,
      settings: {
        notifyMaintenance: true,
        notifyDocuments: true,
        notifyOdometer: false,
        documentNotifyDays: [30, 7],
        voiceAutoSave: false,
        stationArrival: false,
      },
      tables: {
        vehicles: [],
        fuel_entries: [],
        stations: [],
        odometer_readings: [],
        maintenance_plans: [],
        maintenance_records: [],
        documents: [],
      },
    });
    expect(doc).toMatchObject({ app: 'Tá em Dia', format: 1, account: null, vehicles: [] });
    expect(Object.keys(doc)).toEqual(
      expect.arrayContaining([
        'fuelEntries',
        'stations',
        'odometerReadings',
        'maintenancePlans',
        'maintenanceRecords',
        'documents',
      ]),
    );
  });
});

describe('loadExport', () => {
  async function setup() {
    const db = createTestDb();
    await migrate(db);
    await db.runAsync(
      `INSERT INTO vehicles (id, name, type, initial_km, created_at, updated_at, plate)
       VALUES ('v1', 'Gol', 'flex', 1000, ?, ?, 'ABC1D23')`,
      NOW,
      NOW,
    );
    await db.runAsync(
      `INSERT INTO fuel_entries (id, vehicle_id, date, km, fuel_type, liters, price_per_liter, total,
         full_tank, station_name, created_at, updated_at, deleted_at)
       VALUES ('f1', 'v1', ?, 1200, 'gasoline', 40, 6.29, 251.6, 1, 'Shell', ?, ?, NULL),
              ('f2', 'v1', ?, 1500, 'ethanol', 30, 4.5, 135, 0, NULL, ?, ?, ?)`,
      NOW,
      NOW,
      NOW,
      NOW,
      NOW,
      NOW,
      NOW,
    );
    return db;
  }

  it('leva os dados do aparelho, inclusive os excluídos, e a conta', async () => {
    const db = await setup();
    await saveAccount(db, { provider: 'google', name: 'Ana', email: 'ana@exemplo.com' });
    const doc = await loadExport(db, { now: new Date(NOW), appVersion: '0.1.0' });

    expect(doc.exportedAt).toBe(NOW);
    expect(doc.account).toEqual({ provider: 'google', name: 'Ana', email: 'ana@exemplo.com' });
    expect(doc.vehicles).toEqual([
      expect.objectContaining({ id: 'v1', plate: 'ABC1D23', archived: false }),
    ]);
    expect(doc.fuelEntries).toEqual([
      expect.objectContaining({ id: 'f1', fullTank: true, stationName: 'Shell', deletedAt: null }),
      expect.objectContaining({ id: 'f2', fullTank: false, deletedAt: NOW }),
    ]);
    expect(doc.settings).toMatchObject({ notifyMaintenance: true, documentNotifyDays: [30, 7] });
  });

  it('fila do sync e preferências internas ficam fora', async () => {
    const db = await setup();
    const text = JSON.stringify(await loadExport(db, { now: new Date(NOW), appVersion: '0.1.0' }));
    expect(text).not.toContain('outbox');
    expect(text).not.toContain('regionPlaces');
    expect(text).not.toContain('"version"');
  });
});
