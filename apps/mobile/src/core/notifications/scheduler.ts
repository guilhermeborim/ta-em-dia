// Android e web usam o expo-notifications de verdade. O iOS tem a sua versão em scheduler.ios.ts.
export {
  localNotificationsAvailable,
  onNotificationOpened,
  reminderScheduler,
  setupNotificationPresentation,
  type NotificationOpenedData,
  type ReminderNotification,
  type ReminderScheduler,
} from './scheduler.impl';
