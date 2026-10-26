import { parseFuelSpeech } from '@ta-em-dia/shared';
import { emptyFuelForm, type FuelForm } from '../models/fuelForm';
import {
  answerOptions,
  applyFuelSpeech,
  decideFuelVoice,
  fuelVoiceSummary,
  missingText,
  speechFailureText,
  type FuelVoiceContext,
} from '../models/fuelVoice';

const VEHICLE_ID = '018bcfe5-6800-7000-8000-000000000001';
const DATE = new Date('2026-10-26T12:00:00.000Z');

/** Formulário como a tela abre: combustível do último e km sugerido (não tocado). */
const opened = (patch: Partial<FuelForm> = {}): FuelForm => ({
  ...emptyFuelForm,
  km: '45.000',
  ...patch,
});

const ctx = (patch: Partial<FuelVoiceContext> = {}): FuelVoiceContext => ({
  vehicleId: VEHICLE_ID,
  date: DATE,
  stations: ['Shell'],
  kmTouched: false,
  lastKm: 45000,
  ...patch,
});

/** Interpreta a frase, aplica no formulário e decide, como a tela faz. */
function run(text: string, form: FuelForm = opened(), patch: Partial<FuelVoiceContext> = {}) {
  const result = parseFuelSpeech(text, { lastKm: 45000, lastFuelType: 'gasoline' });
  const applied = applyFuelSpeech(form, result);
  const context = ctx({ ...patch, kmTouched: (patch.kmTouched ?? false) || applied.kmSpoken });
  return { applied, outcome: decideFuelVoice(result, applied.form, context) };
}

describe('applyFuelSpeech', () => {
  it('preenche os valores falados e deixa o terceiro para o formulário calcular', () => {
    const { applied } = run('150 reais, 25 litros, km 45300, encheu');
    expect(applied.form).toMatchObject({
      total: '150,00',
      liters: '25,00',
      pricePerLiter: '',
      amountOrder: ['liters', 'total'],
      km: '45.300',
      fullTank: true,
    });
    expect(applied.kmSpoken).toBe(true);
  });

  it('troca os valores digitados antes pelos falados', () => {
    const { applied } = run(
      '6,29 o litro, 100 reais',
      opened({ liters: '30', amountOrder: ['liters'] }),
    );
    expect(applied.form.liters).toBe('');
    expect(applied.form.amountOrder).toEqual(['pricePerLiter', 'total']);
  });

  it('sem valores falados, mantém os do formulário e o posto', () => {
    const form = opened({ total: '100,00', amountOrder: ['total'], station: 'Shell' });
    const { applied } = run('km 45300', form);
    expect(applied.form.total).toBe('100,00');
    expect(applied.form.station).toBe('Shell');
  });

  it('só troca o combustível quando foi dito', () => {
    expect(run('150 reais', opened({ fuelType: 'ethanol' })).applied.form.fuelType).toBe('ethanol');
    expect(run('150 reais de diesel').applied.form.fuelType).toBe('diesel');
  });
});

describe('decideFuelVoice', () => {
  it('completo e válido: salva sozinho com o resumo', () => {
    const { outcome } = run('150 reais, 25 litros, km 45300', opened({ station: 'Shell' }));
    expect(outcome).toMatchObject({
      kind: 'entry',
      summary: 'Shell · R$ 150,00 · 25 L · 45.300 km',
      value: { total: 150, liters: 25, pricePerLiter: 6, km: 45300, stationName: 'Shell' },
    });
  });

  it('tanque cheio não dito vale como não cheio (o formulário vem desligado)', () => {
    const { outcome } = run('150 reais, 25 litros, km 45300', opened({ station: 'Shell' }));
    expect(outcome.kind === 'entry' && outcome.value.fullTank).toBe(false);
  });

  it('sem posto não salva: diz o que falta e põe o foco no posto', () => {
    const { outcome } = run('150 reais, 25 litros, km 45300');
    expect(outcome).toEqual({
      kind: 'missing',
      message: 'Falta informar o posto',
      focus: 'station',
      errors: { station: 'Informe o posto' },
    });
  });

  it('sem km falado, o sugerido não conta: pede para confirmar e foca o km', () => {
    const { outcome } = run('150 reais, 25 litros', opened({ station: 'Shell' }));
    expect(outcome).toEqual({
      kind: 'missing',
      message: 'Falta informar o km',
      focus: 'km',
      errors: { km: 'Confirme o km do painel' },
    });
  });

  it('sem km nenhum no campo, pede para informar', () => {
    const { outcome } = run('150 reais, 25 litros', opened({ station: 'Shell', km: '' }));
    expect(outcome).toMatchObject({ kind: 'missing', errors: { km: 'Informe o km do painel' } });
  });

  it('só um valor falado: foca o primeiro valor vazio (litros, depois do total)', () => {
    const { outcome } = run('150 reais, km 45300', opened({ station: 'Shell' }));
    expect(outcome).toMatchObject({
      kind: 'missing',
      message: 'Falta informar os valores',
      focus: 'liters',
    });
  });

  it('falta mais de um dado: lista todos e foca o primeiro da tela', () => {
    const { outcome } = run('25 litros');
    expect(outcome).toMatchObject({
      kind: 'missing',
      message: 'Falta informar os valores, o km e o posto',
      focus: 'total',
    });
  });

  it('km digitado antes de falar vale', () => {
    const form = opened({ station: 'Shell', km: '45.300' });
    const { outcome } = run('150 reais, 25 litros', form, { kmTouched: true });
    expect(outcome.kind).toBe('entry');
  });

  it('km menor que o último: campo em vermelho, não salva', () => {
    const { outcome } = run('150 reais, 25 litros, km 44000', opened({ station: 'Shell' }));
    expect(outcome).toEqual({
      kind: 'invalid',
      focus: 'km',
      errors: { km: 'Menor que o km do último abastecimento (45.000 km)' },
    });
  });

  it('km muito acima do último também não salva', () => {
    const { outcome } = run('150 reais, 25 litros, km 48000', opened({ station: 'Shell' }));
    expect(outcome.kind === 'invalid' && outcome.errors.km).toBe(
      'Mais de 2.000 km acima do último abastecimento (45.000 km)',
    );
  });

  it('valor ÷ litros fora de R$ 2 a R$ 12 deixa o preço em vermelho', () => {
    const { outcome } = run('150 reais 4 litros km 45300', opened({ station: 'Shell' }));
    expect(outcome.kind === 'invalid' && outcome.errors.pricePerLiter).toBe(
      'O litro precisa ficar entre R$ 2,00 e R$ 12,00',
    );
  });

  it('três valores que não batem: aviso nos valores', () => {
    const { outcome } = run('150 reais, 25 litros, 7,50 o litro, km 45300');
    expect(outcome.kind === 'invalid' && outcome.errors.amounts).toBe(
      'Valor, litros e preço não batem. Confira os três.',
    );
  });

  it('ambíguo: devolve a pergunta antes de tudo', () => {
    const { outcome } = run('50');
    expect(outcome).toMatchObject({
      kind: 'question',
      question: { text: '50 é o valor ou os litros?' },
    });
  });

  it('a resposta da pergunta resolve', () => {
    const first = parseFuelSpeech('50', { lastKm: 45000 });
    const answered = parseFuelSpeech('50', { lastKm: 45000 }, { [first.question!.id]: 'total' });
    const applied = applyFuelSpeech(opened(), answered);
    const outcome = decideFuelVoice(answered, applied.form, ctx());
    expect(outcome).toMatchObject({ kind: 'missing', focus: 'liters' });
  });

  it('nada entendido (só o combustível do último): não faz nada', () => {
    const { outcome } = run('bom dia');
    expect(outcome).toEqual({ kind: 'nothing' });
  });
});

describe('textos', () => {
  it('resumo só com o que existe', () => {
    expect(fuelVoiceSummary({ liters: 25.5 })).toBe('25,5 L');
    expect(fuelVoiceSummary({})).toBe('');
  });

  it('o que falta, em lista, na ordem da tela', () => {
    expect(missingText({ station: 'x' })).toBe('Falta informar o posto');
    expect(missingText({ station: 'x', km: 'x' })).toBe('Falta informar o km e o posto');
    expect(missingText({ station: 'x', km: 'x', amounts: 'x' })).toBe(
      'Falta informar os valores, o km e o posto',
    );
  });

  it('botões da pergunta', () => {
    const question = parseFuelSpeech('50').question!;
    expect(answerOptions(question).map((option) => option.label)).toEqual(['Valor', 'Litros']);
  });

  it('cada falha explica e manda para o formulário', () => {
    expect(speechFailureText('network')).toBe('Falar precisa de internet. Preencha abaixo.');
    expect(speechFailureText('denied')).toContain('microfone');
  });
});
