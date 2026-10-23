import { SYNC_UPSERT_SCHEMAS, SYNC_TABLES } from '@ta-em-dia/shared';
import { SYNC_SPECS } from './sync.tables';

const VEHICLE = '018bcfe5-6800-7000-8000-000000000001';
const ROW = '018bcfe5-6800-7000-8000-000000000002';
const PLAN = '018bcfe5-6800-7000-8000-000000000003';
const at = new Date('2026-10-20T15:30:00.000Z');
const decimal = (value: number) => ({ toNumber: () => value });

describe('SYNC_SPECS', () => {
  it('cobre todas as tabelas, cada uma com o schema do app', () => {
    expect(Object.keys(SYNC_SPECS).sort()).toEqual([...SYNC_TABLES].sort());
    for (const table of SYNC_TABLES) {
      expect(SYNC_SPECS[table].schema).toBe(SYNC_UPSERT_SCHEMAS[table]);
    }
  });

  it('veículo: campos que faltam viram nulos e padrões', () => {
    const payload = SYNC_SPECS.vehicles.schema.parse({
      id: VEHICLE,
      name: 'Gol',
      type: 'flex',
      initialKm: 1000,
    });
    expect(SYNC_SPECS.vehicles.toData(payload)).toEqual({
      name: 'Gol',
      type: 'flex',
      brand: null,
      model: null,
      year: null,
      plate: null,
      initialKm: 1000,
      archived: false,
      sortOrder: 0,
    });
  });

  it('veículo: do banco volta no schema do app, sem os campos nulos', () => {
    const payload = SYNC_SPECS.vehicles.toPayload({
      id: VEHICLE,
      name: 'Gol',
      type: 'flex',
      brand: 'VW',
      model: null,
      year: null,
      plate: 'BRA2E19',
      initialKm: 1000,
      archived: true,
      sortOrder: 2,
    });
    expect(payload).toEqual({
      id: VEHICLE,
      name: 'Gol',
      type: 'flex',
      brand: 'VW',
      plate: 'BRA2E19',
      initialKm: 1000,
      archived: true,
      sortOrder: 2,
    });
    expect(SYNC_SPECS.vehicles.schema.safeParse(payload).success).toBe(true);
  });

  it('abastecimento: decimais viram número e a data, ISO', () => {
    const payload = SYNC_SPECS.fuel_entries.toPayload({
      id: ROW,
      vehicleId: VEHICLE,
      date: at,
      km: 48910,
      fuelType: 'ethanol',
      liters: decimal(32.456),
      pricePerLiter: decimal(4.299),
      total: decimal(139.54),
      fullTank: true,
      stationName: null,
      note: 'Posto da esquina',
    });
    expect(payload).toEqual({
      id: ROW,
      vehicleId: VEHICLE,
      date: '2026-10-20T15:30:00.000Z',
      km: 48910,
      fuelType: 'ethanol',
      liters: 32.456,
      pricePerLiter: 4.299,
      total: 139.54,
      fullTank: true,
      note: 'Posto da esquina',
    });
    expect(SYNC_SPECS.fuel_entries.schema.safeParse(payload).success).toBe(true);
  });

  it('serviço: plano e custo são opcionais; parents devolve veículo e plano', () => {
    const payload = SYNC_SPECS.maintenance_records.schema.parse({
      id: ROW,
      vehicleId: VEHICLE,
      planId: PLAN,
      type: 'oil',
      date: at.toISOString(),
      km: 50000,
      cost: 320.5,
    });
    expect(SYNC_SPECS.maintenance_records.parents(payload)).toEqual({
      vehicleId: VEHICLE,
      planId: PLAN,
    });
    expect(SYNC_SPECS.maintenance_records.toData(payload)).toMatchObject({
      planId: PLAN,
      cost: 320.5,
      shop: null,
      note: null,
    });
    expect(
      SYNC_SPECS.maintenance_records.toPayload({
        id: ROW,
        vehicleId: VEHICLE,
        planId: null,
        type: 'oil',
        date: at,
        km: 50000,
        cost: decimal(320.5),
        shop: null,
        note: null,
      }),
    ).toEqual({
      id: ROW,
      vehicleId: VEHICLE,
      type: 'oil',
      date: at.toISOString(),
      km: 50000,
      cost: 320.5,
    });
  });

  it('plano e leitura de km: ida e volta', () => {
    const plan = SYNC_SPECS.maintenance_plans.schema.parse({
      id: PLAN,
      vehicleId: VEHICLE,
      type: 'oil',
      intervalKm: 10000,
      lastDoneKm: 40000,
      lastDoneAt: at.toISOString(),
      enabled: true,
    });
    expect(SYNC_SPECS.maintenance_plans.toData(plan)).toMatchObject({
      intervalKm: 10000,
      intervalMonths: null,
      notifyBeforeKm: null,
    });
    expect(
      SYNC_SPECS.odometer_readings.toPayload({
        id: ROW,
        vehicleId: VEHICLE,
        km: 51000,
        readAt: at,
        source: 'manual',
      }),
    ).toEqual({
      id: ROW,
      vehicleId: VEHICLE,
      km: 51000,
      readAt: at.toISOString(),
      source: 'manual',
    });
  });

  it('prazo: o dia vai e volta sem mudar com o fuso; a CNH não tem veículo', () => {
    const payload = SYNC_SPECS.documents.schema.parse({
      id: ROW,
      kind: 'cnh',
      dueDate: '2026-11-30',
      notifyDays: [30, 7],
    });
    const data = SYNC_SPECS.documents.toData(payload);
    expect(data).toEqual({
      vehicleId: null,
      kind: 'cnh',
      dueDate: new Date('2026-11-30T00:00:00.000Z'),
      notifyDays: [30, 7],
      note: null,
    });
    expect(
      SYNC_SPECS.documents.toPayload({ id: ROW, ...data, vehicleId: null } as Record<
        string,
        unknown
      >),
    ).toEqual({ id: ROW, kind: 'cnh', dueDate: '2026-11-30', notifyDays: [30, 7] });
  });
});
