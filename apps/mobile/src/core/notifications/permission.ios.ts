import type { NotificationPermission } from './permission.impl';

/**
 * Temporário: sem conta Apple Developer não há development build no iOS, e o Expo Go não
 * traz o módulo nativo do expo-notifications. Aqui o iOS não importa o pacote e só mostra a
 * tela. Quando houver build para iOS, apague este arquivo para o iOS usar permission.ts.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  return 'unavailable';
}

export type { NotificationPermission };
