import { requireOptionalNativeModule } from 'expo';
import { openDatabaseAsync } from 'expo-sqlite';
import { DATABASE_NAME } from '../db/DatabaseProvider';
import { migrate } from '../db/migrations';
import type { Db } from '../db';
import { STATION_ARRIVAL_TASK } from './geofencing';
import { stationArrivalDeps } from './nativeDeps';
import { handleGeofenceEvent } from './stationArrival';

/**
 * Tarefa que recebe as geofences do aviso ao chegar no posto. Precisa ser definida no início do
 * app (importada pelo `_layout` raiz), porque o sistema pode acordar o app só para ela, sem tela.
 * Num build sem `expo-task-manager` não define nada (o pacote quebraria ao ser importado).
 */

/** Valores de `LocationGeofencingEventType` do `expo-location`. */
const GEOFENCE_ENTER = 1;
const GEOFENCE_EXIT = 2;

interface GeofenceTaskData {
  eventType?: number;
  region?: { identifier?: string };
}

let database: Promise<Db> | null = null;

/** O mesmo arquivo do app; as migrations rodam se o app foi atualizado e ainda não abriu. */
function openDb(): Promise<Db> {
  database ??= openDatabaseAsync(DATABASE_NAME).then(async (db) => {
    await migrate(db);
    return db;
  });
  return database;
}

if (requireOptionalNativeModule('ExpoTaskManager') && requireOptionalNativeModule('ExpoLocation')) {
  // Só aqui, com o módulo nativo presente, o pacote pode ser carregado.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const TaskManager = require('expo-task-manager') as typeof import('expo-task-manager');
  TaskManager.defineTask<GeofenceTaskData>(STATION_ARRIVAL_TASK, async ({ data, error }) => {
    if (error || !data?.region?.identifier) return;
    const type =
      data.eventType === GEOFENCE_ENTER
        ? 'enter'
        : data.eventType === GEOFENCE_EXIT
          ? 'exit'
          : null;
    if (!type) return;
    try {
      const db = await openDb();
      await handleGeofenceEvent(stationArrivalDeps(db), {
        type,
        regionId: data.region.identifier,
      });
    } catch {
      database = null;
    }
  });
}
