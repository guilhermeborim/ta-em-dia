import type { MaintenancePlan } from '@ta-em-dia/shared';
import { buildPlanDetail } from '../models/planDetail';

const VEHICLE_ID = '018bcfe5-6800-7000-8000-000000000001';
const TODAY = new Date(2026, 9, 21);

const plan = (patch: Partial<MaintenancePlan> = {}): MaintenancePlan => ({
  id: '018bcfe5-6800-7000-8000-0000000000a1',
  vehicleId: VEHICLE_ID,
  type: 'oil',
  intervalKm: 10000,
  lastDoneKm: 40000,
  lastDoneAt: new Date(2026, 0, 12),
  enabled: true,
  notifyBeforeKm: 500,
  notifyBeforeDays: 7,
  ...patch,
});

const detail = (p: MaintenancePlan, currentKm = 48600) =>
  buildPlanDetail({ plan: p, currentKm, dailyKm: 42 }, TODAY);

describe('buildPlanDetail', () => {
  it('perto de vencer por km: anel, previsão e dados', () => {
    const view = detail(plan());
    expect(view).toMatchObject({
      title: 'Troca de óleo',
      own: false,
      tone: 'warning',
      status: 'Vence em 34 dias',
      forecast: 'Previsão feita com a sua média de 42 km por dia.',
      enabled: true,
    });
    expect(view.ring).toEqual({
      progress: expect.closeTo(0.86),
      value: '~1.400',
      caption: 'km restantes',
    });
    expect(view.rows).toEqual([
      { label: 'Intervalo', value: 'A cada 10.000 km' },
      { label: 'Última vez', value: '12 jan 2026 · 40.000 km' },
      // 1.400 km ÷ 42 km/dia ≈ 33 dias a partir de 21 out.
      { label: 'Próxima prevista', value: '23 nov · 50.000 km', tone: 'warning' },
      { label: 'Avisar antes', value: '500 km e 7 dias' },
    ]);
  });

  it('em dia: a previsão não ganha cor', () => {
    const view = detail(plan(), 43500);
    expect(view.tone).toBe('ok');
    expect(view.rows[2].tone).toBeUndefined();
    expect(view.ring?.value).toBe('~6.500');
  });

  it('vencido por km: mostra o quanto passou e enche o anel', () => {
    const view = detail(plan(), 50300);
    expect(view).toMatchObject({ tone: 'danger', status: 'Vencido' });
    expect(view.ring).toEqual({ progress: 1, value: '300', caption: 'km acima do limite' });
    expect(view.rows[2].tone).toBe('danger');
  });

  it('vence pelo tempo: dias restantes, sem previsão por km e sem km na previsão', () => {
    const view = detail(
      plan({
        type: 'brake_fluid',
        intervalKm: undefined,
        intervalMonths: 12,
        lastDoneAt: new Date(2025, 11, 31),
      }),
    );
    expect(view.ring).toMatchObject({ value: '71', caption: 'dias restantes' });
    expect(view.forecast).toBeUndefined();
    expect(view.rows[0].value).toBe('A cada 12 meses');
    expect(view.rows[2].value).toBe('31 dez');
  });

  it('sem intervalo: só histórico, sem anel e alerta desligado', () => {
    const view = detail(
      plan({
        type: 'Troca de bateria',
        intervalKm: undefined,
        lastDoneAt: new Date(2026, 9, 12),
        lastDoneKm: 50110,
      }),
    );
    expect(view).toMatchObject({
      title: 'Troca de bateria',
      own: true,
      tone: 'none',
      status: 'Sem alerta',
    });
    expect(view.ring).toBeUndefined();
    expect(view.rows).toEqual([
      { label: 'Intervalo', value: 'Sem intervalo' },
      { label: 'Última vez', value: '12 out 2026 · 50.110 km' },
      { label: 'Alerta', value: 'Desligado' },
    ]);
  });

  it('próxima prevista em outro ano mostra o ano', () => {
    const view = detail(
      plan({ intervalKm: undefined, intervalMonths: 24, lastDoneAt: new Date(2026, 5, 3) }),
    );
    expect(view.rows[2].value).toBe('03 jun 2028');
  });
});
