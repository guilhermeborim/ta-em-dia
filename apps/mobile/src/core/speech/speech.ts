import { requireOptionalNativeModule } from 'expo';
import type {
  ExpoSpeechRecognitionErrorCode,
  ExpoSpeechRecognitionModule,
} from 'expo-speech-recognition';

/**
 * Reconhecimento de fala do sistema (`expo-speech-recognition`), pela rede da Apple ou do Google.
 * O app não grava nem guarda o áudio: só recebe o texto. O módulo nativo só existe no development
 * build; no Expo Go (e no iOS sem build) a fala fica indisponível e o formulário segue.
 */

/** Por que a fala não deu texto. */
export type SpeechFailure = 'unavailable' | 'denied' | 'network' | 'no-speech' | 'error';

export type SpeechPermission = 'granted' | 'denied' | 'unavailable';

export interface SpeechHandlers {
  /** Texto até agora; `isFinal` quando o sistema fechou a frase. */
  onText: (text: string, isFinal: boolean) => void;
  /** O reconhecimento terminou (com texto, sem texto ou com erro). */
  onEnd: () => void;
  onError: (failure: SpeechFailure) => void;
}

export interface SpeechSession {
  /** Para de ouvir e entrega o texto que já veio. */
  stop: () => void;
  /** Cancela sem texto final. */
  abort: () => void;
}

// O pacote chama `requireNativeModule`, que quebra no Expo Go: aqui o módulo é opcional.
const native =
  requireOptionalNativeModule<typeof ExpoSpeechRecognitionModule>('ExpoSpeechRecognition');

/** Palavras que o reconhecimento deve preferir (iOS e Android 13+). */
const HINTS = ['reais', 'litros', 'o litro', 'km', 'tanque cheio', 'gasolina', 'etanol', 'diesel'];

/** Código de erro do sistema → motivo que a tela explica. */
export function speechFailure(code: ExpoSpeechRecognitionErrorCode): SpeechFailure | null {
  switch (code) {
    case 'aborted':
      return null;
    case 'not-allowed':
      return 'denied';
    case 'network':
      return 'network';
    case 'no-speech':
    case 'speech-timeout':
      return 'no-speech';
    case 'service-not-allowed':
    case 'language-not-supported':
      return 'unavailable';
    default:
      return 'error';
  }
}

/** Há serviço de reconhecimento no aparelho (Google no Android, Ditado/Siri no iPhone)? */
export function isSpeechAvailable(): boolean {
  try {
    return native !== null && native.isRecognitionAvailable();
  } catch {
    return false;
  }
}

/** Pede microfone e reconhecimento de fala. Nunca lança erro: falha vira `denied`. */
export async function requestSpeechPermission(): Promise<SpeechPermission> {
  if (!native) return 'unavailable';
  try {
    const result = await native.requestPermissionsAsync();
    return result.granted ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

/** Começa a ouvir em português. `null` se não há módulo nativo. */
export function startSpeech(handlers: SpeechHandlers): SpeechSession | null {
  if (!native) return null;
  const subscriptions = [
    native.addListener('result', (event) => {
      const text = event.results[0]?.transcript ?? '';
      handlers.onText(text, event.isFinal);
    }),
    native.addListener('nomatch', () => handlers.onError('no-speech')),
    native.addListener('error', (event) => {
      const failure = speechFailure(event.error);
      if (failure) handlers.onError(failure);
    }),
    native.addListener('end', () => {
      subscriptions.forEach((subscription) => subscription.remove());
      handlers.onEnd();
    }),
  ];
  try {
    native.start({
      lang: 'pt-BR',
      interimResults: true,
      continuous: false,
      contextualStrings: HINTS,
      iosTaskHint: 'dictation',
      // No posto a pessoa pausa entre os números: espera 2 s de silêncio antes de fechar.
      androidIntentOptions: { EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 2000 },
    });
  } catch {
    subscriptions.forEach((subscription) => subscription.remove());
    handlers.onError('unavailable');
    handlers.onEnd();
    return null;
  }
  return { stop: () => native.stop(), abort: () => native.abort() };
}
