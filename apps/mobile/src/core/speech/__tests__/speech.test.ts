import { isSpeechAvailable, requestSpeechPermission, speechFailure, startSpeech } from '../speech';

// No Jest não há módulo nativo: é o mesmo caso do Expo Go.
describe('sem módulo nativo', () => {
  it('a fala fica indisponível e nada quebra', async () => {
    expect(isSpeechAvailable()).toBe(false);
    expect(await requestSpeechPermission()).toBe('unavailable');
    expect(startSpeech({ onText: jest.fn(), onEnd: jest.fn(), onError: jest.fn() })).toBeNull();
  });
});

describe('speechFailure', () => {
  it('traduz o erro do sistema no motivo mostrado', () => {
    expect(speechFailure('not-allowed')).toBe('denied');
    expect(speechFailure('network')).toBe('network');
    expect(speechFailure('no-speech')).toBe('no-speech');
    expect(speechFailure('speech-timeout')).toBe('no-speech');
    expect(speechFailure('service-not-allowed')).toBe('unavailable');
    expect(speechFailure('busy')).toBe('error');
  });

  it('cancelar não é falha', () => {
    expect(speechFailure('aborted')).toBeNull();
  });
});
