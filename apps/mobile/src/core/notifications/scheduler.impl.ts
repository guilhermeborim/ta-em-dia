import * as Notifications from 'expo-notifications';
import { DEFAULT_CHANNEL, ensureDefaultChannel } from './channel.impl';
import type {
  NotificationOpenedData,
  ReminderNotification,
  ReminderScheduler,
} from './scheduler.types';

/** Agendador de avisos locais (Android e web). O iOS tem o seu em scheduler.ios.ts. */
export const reminderScheduler: ReminderScheduler = {
  async replaceScheduled(prefix: string, items: ReminderNotification[]): Promise<boolean> {
    try {
      const permission = await Notifications.getPermissionsAsync();
      if (!permission.granted) return false;
      await ensureDefaultChannel();

      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      await Promise.all(
        scheduled
          .filter((request) => request.identifier.startsWith(prefix))
          .map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)),
      );

      for (const item of items) {
        await Notifications.scheduleNotificationAsync({
          identifier: item.id,
          content: { title: item.title, body: item.body, data: item.data },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: item.fireAt,
            channelId: DEFAULT_CHANNEL,
          },
        });
      }
      return true;
    } catch {
      // Aviso é um extra: se o sistema falhar, o app segue sem ele.
      return false;
    }
  },
};

/** Com o app aberto, o aviso também aparece (por padrão o sistema o esconderia). */
export function setupNotificationPresentation(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Chama `handler` com os dados do aviso quando a pessoa toca nele, inclusive quando o toque
 * abriu o app (app fechado). Devolve a função que para de escutar.
 */
export function onNotificationOpened(handler: (data: NotificationOpenedData) => void): () => void {
  const handled = new Set<string>();
  const handle = (response: Notifications.NotificationResponse) => {
    const key = `${response.notification.request.identifier}:${response.notification.date}`;
    if (handled.has(key)) return;
    handled.add(key);
    handler(response.notification.request.content.data ?? {});
  };

  const subscription = Notifications.addNotificationResponseReceivedListener(handle);
  Notifications.getLastNotificationResponseAsync()
    .then((response) => response && handle(response))
    .catch(() => undefined);
  return () => subscription.remove();
}

export type { NotificationOpenedData, ReminderNotification, ReminderScheduler };
