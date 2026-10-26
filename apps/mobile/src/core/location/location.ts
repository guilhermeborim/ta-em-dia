import { requireOptionalNativeModule } from 'expo';
import type {
  LocationLastKnownOptions,
  LocationObject,
  LocationOptions,
  LocationPermissionResponse,
} from 'expo-location';
import type { LatLng } from '@ta-em-dia/shared';

/**
 * Localização "durante o uso" (`expo-location`), só na tela Abastecer, para achar o posto mais
 * perto. A posição fica na memória: não vai para o SQLite, a API, log ou a `outbox`
 * (docs/05-privacidade-lgpd.md). O módulo nativo só existe no development build feito depois do
 * C6; sem ele, a localização fica indisponível e o formulário segue como antes.
 */

interface LocationNative {
  getForegroundPermissionsAsync(): Promise<LocationPermissionResponse>;
  requestForegroundPermissionsAsync(): Promise<LocationPermissionResponse>;
  getCurrentPositionAsync(options: LocationOptions): Promise<LocationObject>;
  getLastKnownPositionAsync(options: LocationLastKnownOptions): Promise<LocationObject | null>;
}

// O pacote chama `requireNativeModule`, que quebra num build sem o módulo: aqui ele é opcional.
const native = requireOptionalNativeModule<LocationNative>('ExpoLocation');

/**
 * - `granted`: pode ler a posição.
 * - `undetermined`: nunca perguntou (ou pode perguntar de novo): o app explica antes e pede.
 * - `denied`: recusou e o sistema não deixa perguntar de novo (só nos Ajustes).
 * - `unavailable`: sem módulo nativo ou erro.
 */
export type LocationPermission = 'granted' | 'undetermined' | 'denied' | 'unavailable';

/** Precisão "alta" (~10 m): o raio do posto é de 150 m. Valor de `Accuracy.High`. */
const HIGH_ACCURACY = 4;
/** Posição guardada pelo sistema que ainda serve (ms). */
const LAST_KNOWN_MAX_AGE_MS = 60_000;
/** Precisão mínima da posição guardada (m). */
const LAST_KNOWN_MIN_ACCURACY_M = 100;
/** Quanto esperar pelo GPS antes de desistir (ms). */
const POSITION_TIMEOUT_MS = 15_000;

function toPermission(response: LocationPermissionResponse): LocationPermission {
  if (response.granted) return 'granted';
  return response.canAskAgain ? 'undetermined' : 'denied';
}

/** Estado da permissão, sem perguntar. Nunca lança erro. */
export async function getLocationPermission(): Promise<LocationPermission> {
  if (!native) return 'unavailable';
  try {
    return toPermission(await native.getForegroundPermissionsAsync());
  } catch {
    return 'unavailable';
  }
}

/** Abre o pedido do sistema ("durante o uso"). Nunca lança erro. */
export async function requestLocationPermission(): Promise<LocationPermission> {
  if (!native) return 'unavailable';
  try {
    return toPermission(await native.requestForegroundPermissionsAsync());
  } catch {
    return 'unavailable';
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

/**
 * A posição de agora (só com permissão): a guardada pelo sistema, se é recente e precisa, senão
 * uma leitura nova. `null` sem permissão, sem GPS ou se demorar demais. Nunca lança erro.
 */
export async function getCurrentPosition(): Promise<LatLng | null> {
  if (!native) return null;
  const toLatLng = (location: LocationObject | null): LatLng | null =>
    location ? { lat: location.coords.latitude, lng: location.coords.longitude } : null;
  try {
    const last = await native.getLastKnownPositionAsync({
      maxAge: LAST_KNOWN_MAX_AGE_MS,
      requiredAccuracy: LAST_KNOWN_MIN_ACCURACY_M,
    });
    if (last) return toLatLng(last);
    return toLatLng(
      await withTimeout(
        native.getCurrentPositionAsync({ accuracy: HIGH_ACCURACY }),
        POSITION_TIMEOUT_MS,
      ),
    );
  } catch {
    return null;
  }
}
