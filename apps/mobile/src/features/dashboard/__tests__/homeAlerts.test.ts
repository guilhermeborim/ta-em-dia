import type { DocumentRecord, FuelEntry, MaintenancePlan } from '@ta-em-dia/shared';
import type { HomeState } from '../models/home.repository';
import { buildHomeAlerts, HOME_ALERTS_LIMIT } from '../models/homeAlerts';

const VEHICLE_ID = '018bcfe5-6800-7000-8000-000000000001';
const TODAY = new Date(2026, 9, 21);

let n = 0;
const id = () => `018bcfe5-6800-7000-8000-${String(++n).padStart(12, '0')}`;

const plan = (patch: Partial<MaintenancePlan>): MaintenancePlan => ({
  id: id(),
  vehicleId: VEHICLE_ID,
  type: 'oil',
  intervalKm: 10000,
  lastDoneKm: 40000,
  lastDoneAt: new Date(2026, 0, 12),
  enabled: true,
  ...patch,
});

const state = (plans: MaintenancePlan[], currentKm = 48600): HomeState => ({
  vehicle: { id: VEHICLE_ID, name: 'Gol', initialKm: 40000, currentKm },
  entries: [] as FuelEntry[],
  dailyKm: 30,
  plans,
  documents: [],
});

// Com o km atual em 48.600 (média diária padrão de 30 km/dia):
const soon = (type: string, patch = {}) => plan({ type, lastDoneKm: 40000, ...patch }); // 86%: perto
const ok = (type: string) => plan({ type, lastDoneKm: 45100 }); // 35%: em dia
const overdue = (type: string) => plan({ type, lastDoneKm: 38000 }); // 106%: vencido

describe('buildHomeAlerts', () => {
  it('mostra só o que está perto de vencer ou vencido, o mais urgente primeiro', () => {
    const { cards, hasReminders } = buildHomeAlerts(
      state([ok('alignment'), soon('oil'), overdue('brake_pads')]),
      TODAY,
    );
    expect(hasReminders).toBe(true);
    expect(cards.map((c) => [c.title, c.tone])).toEqual([
      ['Pastilhas de freio', 'danger'],
      ['Troca de óleo', 'warning'],
    ]);
  });

  it(`mostra no máximo ${HOME_ALERTS_LIMIT} alertas`, () => {
    const { cards } = buildHomeAlerts(
      state([soon('oil'), soon('alignment'), overdue('brake_pads'), soon('tire_rotation')]),
      TODAY,
    );
    expect(cards).toHaveLength(HOME_ALERTS_LIMIT);
    expect(cards[0].tone).toBe('danger');
  });

  it('tudo em dia: sem alertas, mas com lembretes ativos', () => {
    expect(buildHomeAlerts(state([ok('oil'), ok('alignment')]), TODAY)).toEqual({
      cards: [],
      hasReminders: true,
    });
  });

  it('sem planos, ou só histórico, ou desativados: sem lembretes ativos', () => {
    expect(buildHomeAlerts(state([]), TODAY)).toEqual({ cards: [], hasReminders: false });
    const historyOnly = plan({ type: 'Troca de bateria', intervalKm: undefined });
    const off = overdue('oil');
    expect(buildHomeAlerts(state([historyOnly, { ...off, enabled: false }]), TODAY)).toEqual({
      cards: [],
      hasReminders: false,
    });
  });

  it('item vencido por tempo também aparece', () => {
    const byTime = plan({
      type: 'brake_fluid',
      intervalKm: undefined,
      intervalMonths: 12,
      lastDoneAt: new Date(2025, 8, 1),
    });
    const { cards } = buildHomeAlerts(state([byTime]), TODAY);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ tone: 'danger', status: 'Vencido' });
  });

  it('sem veículo, nada', () => {
    expect(
      buildHomeAlerts({ vehicle: null, entries: [], dailyKm: 30, plans: [], documents: [] }, TODAY),
    ).toEqual({
      cards: [],
      hasReminders: false,
    });
  });
});

describe('buildHomeAlerts: documentos', () => {
  const document = (kind: DocumentRecord['kind'], dueDate: string): DocumentRecord => ({
    id: id(),
    kind,
    dueDate,
    notifyDays: [30, 7],
  });
  const withDocuments = (plans: MaintenancePlan[], documents: DocumentRecord[]): HomeState => ({
    ...state(plans),
    documents,
  });

  it('prazo vencido ou perto de vencer entra com ícone, data e dicas', () => {
    const { cards } = buildHomeAlerts(
      withDocuments([], [document('ipva', '2026-10-15'), document('insurance', '2026-11-13')]),
      TODAY,
    );
    expect(cards.map((c) => [c.kind, c.icon, c.title, c.subtitle, c.tone, c.status])).toEqual([
      ['document', 'file', 'IPVA', 'Venceu em 15/10/2026', 'danger', 'Vencido'],
      ['document', 'shield', 'Seguro', 'Vence em 13/11/2026', 'warning', '23 dias'],
    ]);
    expect(cards[0]).toMatchObject({
      progress: 1,
      progressLabel: 'Venceu há 6 dias',
      hint: 'Toque para resolver',
    });
    expect(cards[1]).toMatchObject({ progressLabel: 'Faltam 23 dias', hint: 'Toque para ver' });
    expect(cards[1].progress).toBeCloseTo(7 / 30);
  });

  it('prazo em dia não entra; documentos não ativam o convite aos lembretes de manutenção', () => {
    const alerts = buildHomeAlerts(withDocuments([], [document('licensing', '2027-09-30')]), TODAY);
    expect(alerts).toEqual({ cards: [], hasReminders: false });
  });

  it('vencido vem antes de perto, venha de onde vier, e o limite vale para tudo', () => {
    const { cards } = buildHomeAlerts(
      withDocuments([soon('oil'), soon('alignment')], [document('cnh', '2026-10-01')]),
      TODAY,
    );
    expect(cards.map((c) => [c.kind, c.tone])).toEqual([
      ['document', 'danger'],
      ['plan', 'warning'],
    ]);
  });

  it('a CNH aparece mesmo sem veículo', () => {
    const alerts = buildHomeAlerts(
      {
        vehicle: null,
        entries: [],
        dailyKm: 30,
        plans: [],
        documents: [document('cnh', '2026-11-20')],
      },
      TODAY,
    );
    expect(alerts.cards.map((c) => c.title)).toEqual(['CNH']);
  });
});
