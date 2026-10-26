import type {
  NotificationOpenedData,
  ReminderNotification,
  ReminderScheduler,
} from './scheduler.types';

/**
 * Temporário, como permission.ios.ts: sem development build no iOS o módulo nativo do
 * expo-notifications não existe, então o iOS não agenda nada. Quando houver build para iOS,
 * apague este arquivo para o iOS usar scheduler.ts.
 */
export const localNotificationsAvailable = false;

export const reminderScheduler: ReminderScheduler = {
  async replaceScheduled(): Promise<boolean> {
    return false;
  },
};

export function setupNotificationPresentation(): void {}

export function onNotificationOpened(): () => void {
  return () => {};
}

export type { NotificationOpenedData, ReminderNotification, ReminderScheduler };
