import type { MaintenancePlan } from '@ta-em-dia/shared';
import { buildMaintenanceList, buildRecordItems, intervalText } from '../models/maintenanceList';
import type { MaintenanceData } from '../models/plans.repository';

const VEHICLE_ID = '018bcfe5-6800-7000-8000-000000000001';
const TODAY = new Date(2026, 9, 21);

let n = 0;
const plan = (patch: Partial<MaintenancePlan>): MaintenancePlan => ({
  id: `018bcfe5-6800-7000-8000-${String(++n).padStart(12, '0')}`,
  vehicleId: VEHICLE_ID,
  type: 'oil',
  lastDoneKm: 40000,
  lastDoneAt: new Date(2026, 0, 12),
  enabled: true,
  ...patch,
});

const data = (plans: MaintenancePlan[], currentKm = 48600): MaintenanceData => ({
  vehicle: { id: VEHICLE_ID, name: 'Gol' },
  currentKm,
  dailyKm: 42,
  plans,
  records: [],
});

describe('intervalText', () => {
  it('km e meses, só km, só meses', () => {
    expect(intervalText(10000, 12)).toBe('10.000 km ou 12 meses');
    expect(intervalText(10000)).toBe('A cada 10.000 km');
    expect(intervalText(undefined, 24)).toBe('A cada 24 meses');
    expect(intervalText(undefined, 1)).toBe('A cada 1 mês');
    expect(intervalText()).toBe('Sem intervalo');
  });
});

describe('buildMaintenanceList', () => {
  const oil = plan({ type: 'oil', intervalKm: 10000 });
  // 8.600 de 10.000 km: perto de vencer, ~34 dias pela média de 42 km/dia.
  const alignment = plan({ type: 'alignment', intervalKm: 10000, lastDoneKm: 45100 });
  // 3.500 de 10.000 km: em dia.

  it('ordena pelo que vence primeiro e monta textos de cada cartão', () => {
    const view = buildMaintenanceList(data([alignment, oil]), TODAY);
    expect(view.alerts).toEqual([
      {
        id: oil.id,
        title: 'Troca de óleo',
        subtitle: 'A cada 10.000 km',
        tone: 'warning',
        status: 'Vence em 34 dias',
        progress: expect.closeTo(0.86),
        progressLabel: '8.600 de 10.000 km',
        hint: '≈ 1.400 km · 34 dias',
      },
      {
        id: alignment.id,
        title: 'Alinhamento',
        subtitle: 'A cada 10.000 km',
        tone: 'ok',
        status: 'Em dia',
        progress: expect.closeTo(0.35),
        progressLabel: '3.500 de 10.000 km',
        hint: '≈ 5 meses',
      },
    ]);
  });

  it('vencido por km: mostra o quanto passou', () => {
    const [card] = buildMaintenanceList(data([oil], 50300), TODAY).alerts;
    expect(card).toMatchObject({
      tone: 'danger',
      status: 'Vencido',
      progressLabel: '10.300 de 10.000 km',
      hint: 'Passou 300 km',
    });
  });

  it('vence pelo tempo: 31/12/2025 + 12 meses = 31/12/2026 (~71 dias)', () => {
    const byTime = plan({
      type: 'brake_fluid',
      intervalMonths: 12,
      lastDoneAt: new Date(2025, 11, 31),
    });
    const [card] = buildMaintenanceList(data([byTime]), TODAY).alerts;
    expect(card).toMatchObject({
      subtitle: 'A cada 12 meses',
      tone: 'warning',
      status: 'Vence em 71 dias',
      progressLabel: '9 de 12 meses',
      hint: '≈ 2 meses',
    });
  });

  it('item sem intervalo vai para só histórico, com "Seu" quando criado em "Outro"', () => {
    const battery = plan({
      type: 'Troca de bateria',
      lastDoneAt: new Date(2026, 9, 12),
      lastDoneKm: 50110,
    });
    const view = buildMaintenanceList(data([battery]), TODAY);
    expect(view.alerts).toEqual([]);
    expect(view.noInterval).toEqual([
      {
        id: battery.id,
        title: 'Troca de bateria',
        own: true,
        lastDone: 'Última vez: 12 out · 50.110 km',
      },
    ]);
  });

  it('sugere só os tipos sem lembrete ativo; desativado volta para as sugeridas', () => {
    const off = plan({ type: 'alignment', intervalKm: 10000, enabled: false });
    const view = buildMaintenanceList(data([oil, off]), TODAY);
    const titles = view.suggestions.map((s) => s.title);
    expect(titles).not.toContain('Troca de óleo');
    expect(titles).toContain('Alinhamento');
    expect(view.suggestions.find((s) => s.code === 'timing_belt')).toEqual({
      code: 'timing_belt',
      title: 'Correia dentada',
      subtitle: 'A cada 60.000 km',
    });
  });

  it('sem planos: tudo vem como sugestão', () => {
    const view = buildMaintenanceList(data([]), TODAY);
    expect(view.alerts).toEqual([]);
    expect(view.noInterval).toEqual([]);
    expect(view.suggestions.length).toBeGreaterThan(0);
  });
});

describe('buildRecordItems', () => {
  it('formata título, detalhes e custo (sem custo, fica sem valor)', () => {
    const record = (patch = {}) => ({
      id: `018bcfe5-6800-7000-8000-${String(++n).padStart(12, '0')}`,
      vehicleId: VEHICLE_ID,
      type: 'oil',
      date: new Date(2026, 0, 12, 12),
      km: 40320,
      ...patch,
    });
    const [full, bare] = buildRecordItems([
      record({ cost: 289, shop: 'Auto Center do Zé' }),
      record({ type: 'Troca de bateria' }),
    ]);
    expect(full).toMatchObject({
      title: 'Troca de óleo',
      details: '12 jan 2026 · 40.320 km · Auto Center do Zé',
      cost: 'R$ 289,00',
    });
    expect(bare).toMatchObject({ title: 'Troca de bateria', details: '12 jan 2026 · 40.320 km' });
    expect(bare.cost).toBeUndefined();
  });
});
