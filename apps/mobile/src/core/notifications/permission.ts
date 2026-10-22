// Android e web usam o expo-notifications de verdade. O iOS tem a sua versão em permission.ios.ts.
export { requestNotificationPermission, type NotificationPermission } from './permission.impl';
