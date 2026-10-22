import * as Notifications from 'expo-notifications';
import { ensureDefaultChannel } from './channel.impl';

/** `unavailable`: a plataforma não tem o módulo nativo (ver permission.ios.ts). */
export type NotificationPermission = 'granted' | 'denied' | 'unavailable';

/**
 * Pede a permissão de notificações ao sistema. No Android 13+ o pedido só aparece
 * depois de existir um canal, por isso o canal é criado antes. Nunca lança erro:
 * se o sistema falhar, o app segue como se a pessoa tivesse recusado.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  try {
    await ensureDefaultChannel();

    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return 'granted';

    const result = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    const provisional = result.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    return result.granted || provisional ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}
