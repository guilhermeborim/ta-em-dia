import { describe, expect, it } from 'vitest';
import {
  parseFuelSpeech,
  type FuelSpeechAnswers,
  type FuelSpeechContext,
  type FuelSpeechFields,
} from '..';

const ctx: FuelSpeechContext = { lastKm: 45000, lastFuelType: 'gasoline' };
const noContext: FuelSpeechContext = {};

type Case = [phrase: string, expected: FuelSpeechFields];

/** Confere só os campos esperados (o resto pode existir). */
function check(cases: Case[], context: FuelSpeechContext = ctx) {
  it.each(cases)('%s', (phrase, expected) => {
    const { fields, question } = parseFuelSpeech(phrase, context);
    expect(question).toBeNull();
    expect(fields).toMatchObject(expected);
  });
}

describe('frases completas', () => {
  check([
    [
      'abasteci 150 reais, 25 litros, km 45300, encheu o tanque',
      { total: 150, liters: 25, pricePerLiter: 6, km: 45300, fullTank: true },
    ],
    [
      'gasolina 38,25 litros, 240 reais, 45.320 km, completei',
      { fuelType: 'gasoline', liters: 38.25, total: 240, km: 45320, fullTank: true },
    ],
    [
      'coloquei 40 litros de etanol, paguei 180 reais, hodômetro 45400',
      { fuelType: 'ethanol', liters: 40, total: 180, pricePerLiter: 4.5, km: 45400 },
    ],
    [
      'Abasteci R$ 200 de diesel, 30 litros, painel marcando 45250, tanque cheio',
      { fuelType: 'diesel', total: 200, liters: 30, km: 45250, fullTank: true },
    ],
    [
      'foram 120 reais em 20 litros, quilometragem 45100, não enchi',
      { total: 120, liters: 20, pricePerLiter: 6, km: 45100, fullTank: false },
    ],
    [
      '45 mil e 300 quilômetros, 35 litros, 210 reais, gasolina',
      { km: 45300, liters: 35, total: 210, pricePerLiter: 6 },
    ],
    [
      'tanque cheio com 42,5 litros a 6,29 o litro no km 45600',
      { fullTank: true, liters: 42.5, pricePerLiter: 6.29, total: 267.32, km: 45600 },
    ],
  ]);
});

describe('frases curtas', () => {
  check([
    ['150 reais', { total: 150 }],
    ['25 litros', { liters: 25 }],
    ['km 45300', { km: 45300 }],
    ['45300 km', { km: 45300 }],
    ['encheu', { fullTank: true }],
    ['tanque cheio', { fullTank: true }],
    ['etanol', { fuelType: 'ethanol' }],
    ['6,29 o litro', { pricePerLiter: 6.29 }],
    ['R$ 200', { total: 200 }],
    ['paguei 180', { total: 180 }],
    ['gastei 95 reais', { total: 95 }],
    ['25 litros 150 reais', { liters: 25, total: 150, pricePerLiter: 6 }],
  ]);
});

describe('fora de ordem', () => {
  check([
    ['45300 km, 25 litros, 150 reais', { km: 45300, liters: 25, total: 150 }],
    ['encheu o tanque, 25 litros por 150 reais', { fullTank: true, liters: 25, total: 150 }],
    ['25 litros a 6,29, km 45300', { liters: 25, pricePerLiter: 6.29, km: 45300, total: 157.25 }],
    [
      'o litro a 6,29, paguei 200, hodômetro em 45100',
      { pricePerLiter: 6.29, total: 200, km: 45100 },
    ],
    ['etanol, 180 reais, o litro a 4,50', { fuelType: 'ethanol', total: 180, pricePerLiter: 4.5 }],
    ['preço do litro 6,29 e o total foi 200', { pricePerLiter: 6.29, total: 200, liters: 31.8 }],
    ['o litro custou 6,29 e paguei 200', { pricePerLiter: 6.29, total: 200 }],
    ['25 litros e paguei 150 reais', { liters: 25, total: 150 }],
  ]);
});

describe('números por extenso', () => {
  check([
    ['cento e cinquenta reais, vinte e cinco litros', { total: 150, liters: 25 }],
    ['trinta e cinco litros e duzentos reais', { liters: 35, total: 200 }],
    ['quarenta e cinco mil e trezentos quilômetros', { km: 45300 }],
    ['quarenta e cinco mil trezentos e vinte km', { km: 45320 }],
    ['km quarenta e cinco mil', { km: 45000 }],
    ['duzentos e cinquenta reais', { total: 250 }],
    ['cem reais, dezesseis litros', { total: 100, liters: 16 }],
    ['quinze litros e noventa reais', { liters: 15, total: 90 }],
    ['mil reais', { total: 1000 }],
    ['seis e vinte e nove o litro', { pricePerLiter: 6.29 }],
    ['seis e noventa e nove o litro', { pricePerLiter: 6.99 }],
    ['quatro e vinte o litro', { pricePerLiter: 4.2 }],
    ['seis vírgula vinte e nove o litro', { pricePerLiter: 6.29 }],
    ['seis vírgula dois nove por litro', { pricePerLiter: 6.29 }],
    ['seis reais e vinte e nove centavos o litro', { pricePerLiter: 6.29 }],
    ['6 reais e 29 o litro', { pricePerLiter: 6.29 }],
    ['6 e 29 o litro', { pricePerLiter: 6.29 }],
    ['6 vírgula 29 o litro', { pricePerLiter: 6.29 }],
    ['45 mil e 300 km', { km: 45300 }],
    ['45 mil km', { km: 45000 }],
  ]);
});

describe('números sem palavra', () => {
  check([
    ['45300', { km: 45300 }],
    ['25 litros 45300', { liters: 25, km: 45300 }],
    ['6,29 25 litros', { pricePerLiter: 6.29, liters: 25 }],
    ['150 reais 6,29', { total: 150, pricePerLiter: 6.29 }],
    ['150 25', { total: 150, liters: 25, pricePerLiter: 6 }],
    ['25 150', { total: 150, liters: 25, pricePerLiter: 6 }],
    ['38,25 240', { liters: 38.25, total: 240 }],
    ['240 38,25', { liters: 38.25, total: 240 }],
    ['40 180', { liters: 40, total: 180, pricePerLiter: 4.5 }],
    ['150 reais e 25', { total: 150, liters: 25 }],
    ['25 litros e 150', { liters: 25, total: 150 }],
    ['25 litros por 150', { liters: 25, total: 150 }],
  ]);

  it('km perto e acima do último, mesmo abaixo de 1.000', () => {
    const { fields } = parseFuelSpeech('500 km', { lastKm: 300 });
    expect(fields.km).toBe(500);
    const loose = parseFuelSpeech('150 reais 520', { lastKm: 480 });
    expect(loose.fields).toMatchObject({ total: 150, km: 520 });
  });

  it('inteiro de 1.000 para cima é km, com ou sem último km', () => {
    expect(parseFuelSpeech('1500', noContext).fields.km).toBe(1500);
    expect(parseFuelSpeech('120000', ctx).fields.km).toBe(120000);
  });

  it('com centavos entre R$ 2 e R$ 12 é o preço do litro', () => {
    expect(parseFuelSpeech('6,29', ctx).fields.pricePerLiter).toBe(6.29);
    expect(parseFuelSpeech('4,599', ctx).fields.pricePerLiter).toBe(4.599);
  });

  it('6.299 sem palavra é o preço; 45.300 é o km', () => {
    expect(parseFuelSpeech('6.299', noContext).fields).toMatchObject({ pricePerLiter: 6.299 });
    expect(parseFuelSpeech('45.300', noContext).fields).toMatchObject({ km: 45300 });
    expect(parseFuelSpeech('6.299 o litro', noContext).fields.pricePerLiter).toBe(6.299);
  });
});

describe('erros de transcrição', () => {
  check([
    ['abasteci 150 real 25 litro km 45300', { total: 150, liters: 25, km: 45300 }],
    ['gazolina 25 lts 150 rais', { fuelType: 'gasoline', liters: 25, total: 150 }],
    ['25l 150 reais', { liters: 25, total: 150 }],
    ['45 300 km 25 litros', { km: 45300, liters: 25 }],
    ['alcool 40 litros 180 reais', { fuelType: 'ethanol', liters: 40, total: 180 }],
    ['disel 30 litros', { fuelType: 'diesel', liters: 30 }],
    ['R$150 25 litros', { total: 150, liters: 25 }],
    ['150,00 reais 25,00 litros', { total: 150, liters: 25 }],
    ['quilômetros 45300 kms', { km: 45300 }],
    ['G N V 12 litros 70 reais', { fuelType: 'gnv', liters: 12, total: 70 }],
    ['gás natural 10 litros', { fuelType: 'gnv', liters: 10 }],
    ['  ABASTECI   150   REAIS!!! ', { total: 150 }],
    ['dia 15 abasteci 150 reais às 10 horas', { total: 150 }],
  ]);
});

describe('combustível', () => {
  it('o falado vale mais que o do último abastecimento', () => {
    const result = parseFuelSpeech('etanol 150 reais', { lastFuelType: 'gasoline' });
    expect(result.fields.fuelType).toBe('ethanol');
    expect(result.fuelTypeFromContext).toBe(false);
  });

  it('sem dizer qual, usa o do último abastecimento', () => {
    const result = parseFuelSpeech('150 reais', { lastFuelType: 'ethanol' });
    expect(result.fields.fuelType).toBe('ethanol');
    expect(result.fuelTypeFromContext).toBe(true);
  });

  it('sem dizer e sem último abastecimento, fica em aberto', () => {
    const result = parseFuelSpeech('150 reais', noContext);
    expect(result.fields.fuelType).toBeUndefined();
    expect(result.fuelTypeFromContext).toBe(false);
  });

  it('gasolina comum e aditivada são gasolina', () => {
    expect(parseFuelSpeech('gasolina aditivada', {}).fields.fuelType).toBe('gasoline');
  });
});

describe('tanque cheio', () => {
  it.each([
    ['encheu o tanque', true],
    ['enchi', true],
    ['completei o tanque', true],
    ['tanque cheio', true],
    ['tanque completo', true],
    ['não enchi o tanque', false],
    ['não encheu', false],
    ['não completei', false],
    ['não foi tanque cheio', false],
    ['abastecimento parcial', false],
    ['sem encher o tanque', false],
  ])('"%s" → %s', (phrase, expected) => {
    expect(parseFuelSpeech(phrase, ctx).fields.fullTank).toBe(expected);
  });

  it('sem falar nada sobre o tanque, fica em aberto', () => {
    expect(parseFuelSpeech('150 reais 25 litros', ctx).fields.fullTank).toBeUndefined();
  });

  it('o "não" de outro assunto não nega o tanque', () => {
    const { fields } = parseFuelSpeech('não lembro o km mas encheu o tanque', ctx);
    expect(fields.fullTank).toBe(true);
  });

  it('se corrigindo, vale o último', () => {
    expect(parseFuelSpeech('encheu, não, não enchi', ctx).fields.fullTank).toBe(false);
  });
});

describe('terceiro valor', () => {
  it('valor e litros calculam o preço', () => {
    const { fields, calculated } = parseFuelSpeech('150 reais 25 litros', ctx);
    expect(fields.pricePerLiter).toBe(6);
    expect(calculated).toBe('pricePerLiter');
  });

  it('preço e litros calculam o valor', () => {
    const { fields, calculated } = parseFuelSpeech('30 litros a 6,29 o litro', ctx);
    expect(fields.total).toBe(188.7);
    expect(calculated).toBe('total');
  });

  it('preço e valor calculam os litros', () => {
    const { fields, calculated } = parseFuelSpeech('200 reais a 6,29 o litro', ctx);
    expect(fields.liters).toBe(31.8);
    expect(calculated).toBe('liters');
  });

  it('com os três, não recalcula', () => {
    const { fields, calculated } = parseFuelSpeech('150 reais 25 litros 6 reais o litro', ctx);
    expect(fields).toMatchObject({ total: 150, liters: 25, pricePerLiter: 6 });
    expect(calculated).toBeNull();
  });

  it('com um só, não calcula nada', () => {
    const { fields, calculated } = parseFuelSpeech('150 reais', ctx);
    expect(fields.liters).toBeUndefined();
    expect(calculated).toBeNull();
  });
});

describe('se corrigindo', () => {
  it('repetiu o campo: vale o último', () => {
    const { fields } = parseFuelSpeech('paguei 100 reais, não, foram 150 reais, 25 litros', ctx);
    expect(fields).toMatchObject({ total: 150, liters: 25 });
  });
});

describe('perguntas', () => {
  it('número só vira pergunta', () => {
    const { question, fields } = parseFuelSpeech('50', ctx);
    expect(question).toEqual({
      id: 0,
      number: 50,
      options: ['total', 'liters'],
      text: '50 é o valor ou os litros?',
    });
    expect(fields.total).toBeUndefined();
    expect(fields.liters).toBeUndefined();
  });

  it('a pergunta usa vírgula nos decimais', () => {
    expect(parseFuelSpeech('38,25', noContext).question?.text).toBe(
      '38,25 é o valor ou os litros?',
    );
  });

  it('dois números que não fecham (valor ÷ litros fora de R$ 2 a R$ 12) viram pergunta', () => {
    const { question } = parseFuelSpeech('150 5', ctx);
    expect(question).toMatchObject({ number: 150, options: ['total', 'liters'] });
  });

  it('com o preço e um número só, pergunta se é o valor ou os litros', () => {
    const { question, fields } = parseFuelSpeech('gasolina a 6,29 o litro 50', ctx);
    expect(fields.pricePerLiter).toBe(6.29);
    expect(question?.text).toBe('50 é o valor ou os litros?');
  });

  it('valor conhecido e um número solto: o número é dos litros, mesmo que a conta não feche', () => {
    // Não há o que perguntar; a validação (fuelEntryIssues) marca o preço de R$ 37,50.
    const { question, fields } = parseFuelSpeech('150 reais 4', ctx);
    expect(question).toBeNull();
    expect(fields).toMatchObject({ total: 150, liters: 4, pricePerLiter: 37.5 });
  });

  it('a resposta preenche o campo e calcula o resto', () => {
    const first = parseFuelSpeech('gasolina a 6,29 o litro 50', ctx);
    const answers: FuelSpeechAnswers = { [first.question!.id]: 'total' };
    const second = parseFuelSpeech('gasolina a 6,29 o litro 50', ctx, answers);
    expect(second.question).toBeNull();
    expect(second.fields).toMatchObject({ total: 50, pricePerLiter: 6.29, liters: 7.95 });
    expect(second.calculated).toBe('liters');
  });

  it('responder "litros" calcula o valor', () => {
    const first = parseFuelSpeech('gasolina a 6,29 o litro 50', ctx);
    const answers: FuelSpeechAnswers = { [first.question!.id]: 'liters' };
    const { fields, question } = parseFuelSpeech('gasolina a 6,29 o litro 50', ctx, answers);
    expect(question).toBeNull();
    expect(fields).toMatchObject({ liters: 50, total: 314.5 });
  });

  it('a resposta pode ser km', () => {
    const first = parseFuelSpeech('150', ctx);
    const { fields, question } = parseFuelSpeech('150', ctx, { [first.question!.id]: 'km' });
    expect(question).toBeNull();
    expect(fields.km).toBe(150);
  });

  it('duas perguntas em sequência: uma por vez', () => {
    const phrase = '150 5';
    const first = parseFuelSpeech(phrase, ctx);
    expect(first.question?.number).toBe(150);
    const second = parseFuelSpeech(phrase, ctx, { [first.question!.id]: 'total' });
    // O outro número só pode ser os litros: não há segunda pergunta.
    expect(second.question).toBeNull();
    expect(second.fields).toMatchObject({ total: 150, liters: 5 });
  });

  it('não pergunta quando só falta o km ou o tanque', () => {
    expect(parseFuelSpeech('150 reais 25 litros', ctx).question).toBeNull();
  });
});

describe('frase sem nada útil', () => {
  it('texto vazio ou sem números devolve só o combustível do contexto', () => {
    for (const phrase of ['', '   ', 'abasteci agora', 'um tanque']) {
      const result = parseFuelSpeech(phrase, ctx);
      expect(result.question).toBeNull();
      expect(result.fields).toEqual({ fuelType: 'gasoline' });
    }
  });

  it('"um" e "uma" sozinhos não são o número 1', () => {
    const { fields, question } = parseFuelSpeech('uma gasolina e um tanque cheio', ctx);
    expect(question).toBeNull();
    expect(fields).toMatchObject({ fuelType: 'gasoline', fullTank: true });
    expect(fields.total).toBeUndefined();
  });

  it('número de horário ou dia é ignorado', () => {
    const { question, fields } = parseFuelSpeech('hoje dia 26 às 10 horas', ctx);
    expect(question).toBeNull();
    expect(fields).toEqual({ fuelType: 'gasoline' });
  });
});
