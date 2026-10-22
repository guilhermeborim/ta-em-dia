import type { FuelEntry } from '@ta-em-dia/shared';
import { buildHomeSummary, buildLastEntry, buildSavedToast } from '../models/homeSummary';

const VEHICLE_ID = '018bcfe5-6800-7000-8000-000000000001';
const TODAY = new Date(2026, 9, 21);

let n = 0;
const entry = (patch: Partial<FuelEntry> & Pick<FuelEntry, 'date' | 'km'>): FuelEntry => ({
  id: `018bcfe5-6800-7000-8000-${String(++n).padStart(12, '0')}`,
  vehicleId: VEHICLE_ID,
  fuelType: 'gasoline',
  liters: 40,
  pricePerLiter: 6,
  total: 240,
  fullTank: true,
  ...patch,
});

// Do mais recente ao mais antigo, como o repositório devolve.
const entries: FuelEntry[] = [
  entry({
    date: new Date(2026, 9, 18),
    km: 11800,
    liters: 38.25,
    total: 229.1,
    stationName: 'Posto Ipiranga',
  }),
  entry({ date: new Date(2026, 9, 9), km: 11400, liters: 30, total: 180 }),
  entry({ date: new Date(2026, 8, 24), km: 11000, liters: 40, total: 300 }),
];

describe('buildHomeSummary', () => {
  it('monta o cartão do mês: gasto, variação, projeção e três números', () => {
    const summary = buildHomeSummary(entries, TODAY);
    expect(summary).toEqual({
      title: 'Gasto em outubro',
      amount: '409,10',
      // 409,10 contra 300,00 em setembro.
      variation: { label: '36% vs set', trend: 'up' },
      // 409,10 ÷ 21 dias × 31 dias.
      projection: 'Projeção do mês: R$ 604',
      stats: [
        { label: 'Abastecimentos', value: '2 no mês' },
        // 409,10 ÷ 800 km rodados desde o último abastecimento de setembro.
        { label: 'Custo por km', value: 'R$ 0,51' },
        { label: 'Rodou', value: '800 km' },
      ],
    });
  });

  it('gastou menos que no mês anterior: seta para baixo', () => {
    const summary = buildHomeSummary(
      [entry({ date: new Date(2026, 9, 2), km: 12000, total: 100 }), ...entries.slice(2)],
      TODAY,
    );
    expect(summary.variation).toEqual({ label: '67% vs set', trend: 'down' });
  });

  it('sem mês anterior, não mostra variação', () => {
    expect(buildHomeSummary(entries.slice(0, 2), TODAY).variation).toBeUndefined();
  });

  it('um abastecimento só: custo por km e km rodados ficam em traço', () => {
    const summary = buildHomeSummary(entries.slice(0, 1), TODAY);
    expect(summary.stats).toEqual([
      { label: 'Abastecimentos', value: '1 no mês' },
      { label: 'Custo por km', value: '—' },
      { label: 'Rodou', value: '—' },
    ]);
  });

  it('mês sem abastecimentos: gasto zerado e sem projeção', () => {
    const summary = buildHomeSummary(entries.slice(2), TODAY);
    expect(summary).toMatchObject({
      amount: '0,00',
      projection: undefined,
      variation: { label: '100% vs set', trend: 'down' },
    });
  });
});

describe('buildLastEntry', () => {
  it('formata o mais recente, com "tanque cheio" e o km/l do trecho', () => {
    expect(buildLastEntry(entries)).toEqual({
      id: entries[0].id,
      title: '18 out · Posto Ipiranga',
      details: '38,25 L · Gasolina · tanque cheio',
      total: 'R$ 229,10',
      // 400 km (11400 → 11800) ÷ 38,25 L.
      kmPerLiter: '10,5 km/l',
    });
  });

  it('sem abastecimentos, nada', () => {
    expect(buildLastEntry([])).toBeNull();
  });
});

describe('buildSavedToast', () => {
  it('mostra o km/l do trecho e a comparação com a média', () => {
    // Trecho: 400 km ÷ 38,25 L = 10,5 km/l. Média do período: 800 km ÷ 68,25 L = 11,7 km/l.
    expect(buildSavedToast(entries, entries[0].id)).toEqual({
      title: 'Abastecimento salvo',
      message: 'Esse trecho fez 10,5 km/l · −11% vs média',
    });
  });

  it('parcial não tem trecho: só o título', () => {
    const partial = [entry({ date: TODAY, km: 12000, fullTank: false }), ...entries];
    expect(buildSavedToast(partial, partial[0].id)).toEqual({ title: 'Abastecimento salvo' });
  });

  it('id que não está na lista: nenhum aviso', () => {
    expect(buildSavedToast(entries, 'outro')).toBeNull();
  });
});
