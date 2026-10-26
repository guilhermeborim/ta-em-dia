import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { Db } from '../db';
import { apiUrl } from '../env/appEnv';
import { getFlag } from '../flags/useFlag';
import { getCurrentPosition } from '../location';
import { localNotificationsAvailable, reminderScheduler } from '../notifications';
import { downloadRegionPlaces } from '../stations';
import { nativeGeofencer } from './geofencing';
import type { StationArrivalDeps } from './stationArrival';

/** As peças de verdade do aviso ao chegar no posto (sistema, notificações, API de postos). */
export function stationArrivalDeps(db: Db): StationArrivalDeps {
  return {
    db,
    geofencer: nativeGeofencer,
    scheduler: reminderScheduler,
    flagOn: getFlag('geo.fuelReminder') && localNotificationsAvailable,
    getPosition: getCurrentPosition,
    download: (position) =>
      Platform.OS === 'ios' || Platform.OS === 'android'
        ? downloadRegionPlaces({ db, apiUrl, platform: Platform.OS, store: SecureStore }, position)
        : Promise.resolve(0),
  };
}
