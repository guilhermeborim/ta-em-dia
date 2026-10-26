import {
  arrivalSetupContent,
  stepAfterBackground,
  stepAfterForeground,
  type ArrivalSetupStep,
} from '../models/stationArrivalSetup';

describe('stepAfterForeground', () => {
  it('permitiu: explica o "sempre"; recusou de vez: ajustes; fechou: volta ao começo', () => {
    expect(stepAfterForeground('granted')).toBe('always');
    expect(stepAfterForeground('denied')).toBe('denied');
    expect(stepAfterForeground('undetermined')).toBe('intro');
    expect(stepAfterForeground('unavailable')).toBe('unavailable');
  });
});

describe('stepAfterBackground', () => {
  it('permitiu o "sempre": liga; senão fica ou vai aos ajustes', () => {
    expect(stepAfterBackground('granted')).toBe('enable');
    expect(stepAfterBackground('denied')).toBe('denied');
    expect(stepAfterBackground('undetermined')).toBe('always');
    expect(stepAfterBackground('unavailable')).toBe('unavailable');
  });
});

describe('arrivalSetupContent', () => {
  const steps: ArrivalSetupStep[] = ['intro', 'always', 'denied', 'notifications', 'unavailable'];

  it('toda tela tem título, texto e botão', () => {
    for (const platform of ['ios', 'android']) {
      for (const step of steps) {
        const content = arrivalSetupContent(step, platform);
        expect(content.title).not.toBe('');
        expect(content.text).not.toBe('');
        expect(content.primary).not.toBe('');
      }
    }
  });

  it('a primeira tela explica bateria, privacidade e as regras, com "Agora não" visível', () => {
    const intro = arrivalSetupContent('intro', 'android');
    expect(intro.secondary).toBe('Agora não');
    const text = intro.bullets.join(' ');
    expect(text).toContain('bateria');
    expect(text).toContain('não sai do celular');
    expect(text).toContain('12 horas');
    expect(text).toContain('abastecimento hoje');
  });

  it('o "sempre" usa o nome da opção de cada sistema, com "Agora não" visível', () => {
    expect(arrivalSetupContent('always', 'android').text).toContain('Permitir o tempo todo');
    expect(arrivalSetupContent('always', 'ios').text).toContain('Sempre');
    expect(arrivalSetupContent('always', 'android').secondary).toBe('Agora não');
  });
});
