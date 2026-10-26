const mockLocation = {
  getBackgroundPermissionsAsync: jest.fn(),
  requestBackgroundPermissionsAsync: jest.fn(),
  startGeofencingAsync: jest.fn(),
  stopGeofencingAsync: jest.fn(),
  hasStartedGeofencingAsync: jest.fn(),
};
let mockModules: Record<string, unknown> = {};

jest.mock('expo', () => ({
  requireOptionalNativeModule: (name: string) => mockModules[name] ?? null,
}));

const load = () => {
  let mod: typeof import('../geofencing');
  jest.isolateModules(() => {
    mod = jest.requireActual('../geofencing');
  });
  return mod!;
};

const region = {
  identifier: 'posto:node/1',
  latitude: -23.56,
  longitude: -46.65,
  radius: 150,
  notifyOnEnter: true,
  notifyOnExit: true,
};

beforeEach(() => {
  mockModules = { ExpoLocation: mockLocation, ExpoTaskManager: {} };
  jest.resetAllMocks();
});

describe('sem módulo nativo (build antigo)', () => {
  it('sem expo-task-manager, o aviso fica indisponível e nada quebra', async () => {
    mockModules = { ExpoLocation: mockLocation };
    const { nativeGeofencer } = load();
    expect(nativeGeofencer.available).toBe(false);
    expect(await nativeGeofencer.backgroundPermission()).toBe('unavailable');
    expect(await nativeGeofencer.start([region])).toBe(false);
    await nativeGeofencer.stop();
    expect(mockLocation.startGeofencingAsync).not.toHaveBeenCalled();
  });
});

describe('nativeGeofencer', () => {
  it('lê e pede o "sempre"', async () => {
    const { nativeGeofencer } = load();
    expect(nativeGeofencer.available).toBe(true);
    mockLocation.getBackgroundPermissionsAsync.mockResolvedValue({ granted: true });
    expect(await nativeGeofencer.backgroundPermission()).toBe('granted');
    mockLocation.requestBackgroundPermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: false,
    });
    expect(await nativeGeofencer.requestBackgroundPermission()).toBe('denied');
    mockLocation.getBackgroundPermissionsAsync.mockRejectedValue(new Error('x'));
    expect(await nativeGeofencer.backgroundPermission()).toBe('unavailable');
  });

  it('registra as regiões na tarefa do aviso e para só se estiver ligada', async () => {
    const { nativeGeofencer, STATION_ARRIVAL_TASK } = load();
    mockLocation.startGeofencingAsync.mockResolvedValue(undefined);
    expect(await nativeGeofencer.start([region])).toBe(true);
    expect(mockLocation.startGeofencingAsync).toHaveBeenCalledWith(STATION_ARRIVAL_TASK, {
      regions: [region],
    });

    mockLocation.hasStartedGeofencingAsync.mockResolvedValue(false);
    await nativeGeofencer.stop();
    expect(mockLocation.stopGeofencingAsync).not.toHaveBeenCalled();
    mockLocation.hasStartedGeofencingAsync.mockResolvedValue(true);
    await nativeGeofencer.stop();
    expect(mockLocation.stopGeofencingAsync).toHaveBeenCalledWith(STATION_ARRIVAL_TASK);
  });

  it('o sistema recusar não lança erro', async () => {
    const { nativeGeofencer } = load();
    mockLocation.startGeofencingAsync.mockRejectedValue(new Error('negado'));
    expect(await nativeGeofencer.start([region])).toBe(false);
    expect(await nativeGeofencer.start([])).toBe(false);
  });
});
