import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { requestNotificationPermission } from '../permission';

jest.mock('expo-notifications', () => ({
  setNotificationChannelAsync: jest.fn(async () => null),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  AndroidImportance: { DEFAULT: 3 },
  IosAuthorizationStatus: { PROVISIONAL: 3 },
}));

const mocked = jest.mocked(Notifications);
const status = (granted: boolean, iosStatus?: number) =>
  ({ granted, ios: iosStatus === undefined ? undefined : { status: iosStatus } }) as never;

beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = 'android';
});

describe('requestNotificationPermission', () => {
  it('não pede de novo se já está permitido', async () => {
    mocked.getPermissionsAsync.mockResolvedValue(status(true));
    expect(await requestNotificationPermission()).toBe('granted');
    expect(mocked.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('cria o canal antes de pedir no Android', async () => {
    mocked.getPermissionsAsync.mockResolvedValue(status(false));
    mocked.requestPermissionsAsync.mockResolvedValue(status(true));
    expect(await requestNotificationPermission()).toBe('granted');
    expect(mocked.setNotificationChannelAsync).toHaveBeenCalledTimes(1);
  });

  it('não cria canal no iOS', async () => {
    Platform.OS = 'ios';
    mocked.getPermissionsAsync.mockResolvedValue(status(false));
    mocked.requestPermissionsAsync.mockResolvedValue(status(true));
    await requestNotificationPermission();
    expect(mocked.setNotificationChannelAsync).not.toHaveBeenCalled();
  });

  it('recusa vira denied', async () => {
    mocked.getPermissionsAsync.mockResolvedValue(status(false));
    mocked.requestPermissionsAsync.mockResolvedValue(status(false, 1));
    expect(await requestNotificationPermission()).toBe('denied');
  });

  it('permissão provisória do iOS conta como permitida', async () => {
    mocked.getPermissionsAsync.mockResolvedValue(status(false));
    mocked.requestPermissionsAsync.mockResolvedValue(status(false, 3));
    expect(await requestNotificationPermission()).toBe('granted');
  });

  it('erro do sistema vira denied, sem lançar', async () => {
    mocked.getPermissionsAsync.mockRejectedValue(new Error('falhou'));
    expect(await requestNotificationPermission()).toBe('denied');
  });
});
