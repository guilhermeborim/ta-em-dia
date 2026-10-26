import { requireOptionalNativeModule } from 'expo';
import type { LocationPermissionResponse, LocationRegion } from 'expo-location';
import type { LocationPermission } from '../location';

/**
 * Geofences do sistema (`expo-location` + `expo-task-manager`) para o aviso ao chegar no posto.
 * O sistema acorda o app só ao entrar ou sair de uma região, sem GPS contínuo. Os dois módulos
 * nativos só existem no development build feito depois do C7; sem eles, o aviso fica indisponível
 * e o resto do app segue igual.
 */

interface LocationNative {
  getBackgroundPermissionsAsync(): Promise<LocationPermissionResponse>;
  requestBackgroundPermissionsAsync(): Promise<LocationPermissionResponse>;
  startGeofencingAsync(taskName: string, options: { regions: LocationRegion[] }): Promise<void>;
  stopGeofencingAsync(taskName: string): Promise<void>;
  hasStartedGeofencingAsync(taskName: string): Promise<boolean>;
}

// Os pacotes chamam `requireNativeModule`, que quebra num build sem o módulo: aqui são opcionais.
const location = requireOptionalNativeModule<LocationNative>('ExpoLocation');
const taskManager = requireOptionalNativeModule('ExpoTaskManager');

/** Nome da tarefa que recebe os eventos das geofences (ver `task.ts`). */
export const STATION_ARRIVAL_TASK = 'station-arrival-geofence';

/** Uma região vigiada (o formato do `expo-location`). */
export type GeofenceRegion = Required<
  Pick<
    LocationRegion,
    'identifier' | 'latitude' | 'longitude' | 'radius' | 'notifyOnEnter' | 'notifyOnExit'
  >
>;

/** O que o aviso usa das geofences; nos testes entra um falso. */
export interface Geofencer {
  /** O build tem os módulos nativos. */
  available: boolean;
  /** Permissão "sempre" (no Android, "Permitir o tempo todo"). Nunca lança erro. */
  backgroundPermission(): Promise<LocationPermission>;
  /** Abre o pedido do sistema do "sempre". Nunca lança erro. */
  requestBackgroundPermission(): Promise<LocationPermission>;
  /** As geofences já estão ligadas? */
  started(): Promise<boolean>;
  /** Troca as regiões vigiadas pelas de `regions`. `false` se o sistema recusou. Nunca lança erro. */
  start(regions: GeofenceRegion[]): Promise<boolean>;
  /** Para de vigiar. Nunca lança erro. */
  stop(): Promise<void>;
}

function toPermission(response: LocationPermissionResponse): LocationPermission {
  if (response.granted) return 'granted';
  return response.canAskAgain ? 'undetermined' : 'denied';
}

async function permission(
  read: (native: LocationNative) => Promise<LocationPermissionResponse>,
): Promise<LocationPermission> {
  if (!location || !taskManager) return 'unavailable';
  try {
    return toPermission(await read(location));
  } catch {
    return 'unavailable';
  }
}

export const nativeGeofencer: Geofencer = {
  available: Boolean(location && taskManager),
  backgroundPermission: () => permission((native) => native.getBackgroundPermissionsAsync()),
  requestBackgroundPermission: () =>
    permission((native) => native.requestBackgroundPermissionsAsync()),
  async started() {
    if (!location || !taskManager) return false;
    try {
      return await location.hasStartedGeofencingAsync(STATION_ARRIVAL_TASK);
    } catch {
      return false;
    }
  },
  async start(regions) {
    if (!location || !taskManager || regions.length === 0) return false;
    try {
      await location.startGeofencingAsync(STATION_ARRIVAL_TASK, { regions });
      return true;
    } catch {
      return false;
    }
  },
  async stop() {
    if (!location || !taskManager) return;
    try {
      if (await location.hasStartedGeofencingAsync(STATION_ARRIVAL_TASK)) {
        await location.stopGeofencingAsync(STATION_ARRIVAL_TASK);
      }
    } catch {
      // Já parado ou o sistema recusou: nada a fazer.
    }
  },
};
