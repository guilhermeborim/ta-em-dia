import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const DEFAULT_CHANNEL = 'default';

/** No Android 8+ toda notificação precisa de um canal. Seguro chamar mais de uma vez. */
export async function ensureDefaultChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(DEFAULT_CHANNEL, {
    name: 'Alertas',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}
