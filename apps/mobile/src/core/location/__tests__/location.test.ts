const mockNative = {
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
};
let mockInstalled = true;

jest.mock('expo', () => ({
  requireOptionalNativeModule: () => (mockInstalled ? mockNative : null),
}));

const load = () => {
  let mod: typeof import('../location');
  jest.isolateModules(() => {
    mod = jest.requireActual('../location');
  });
  return mod!;
};

const at = (lat: number, lng: number) => ({ coords: { latitude: lat, longitude: lng } });

beforeEach(() => {
  mockInstalled = true;
  jest.clearAllMocks();
});

describe('sem módulo nativo (build antigo)', () => {
  it('a localização fica indisponível e nada quebra', async () => {
    mockInstalled = false;
    const location = load();
    expect(await location.getLocationPermission()).toBe('unavailable');
    expect(await location.requestLocationPermission()).toBe('unavailable');
    expect(await location.getCurrentPosition()).toBeNull();
  });
});

describe('permissão', () => {
  it('permitida, ainda pode perguntar e recusada de vez', async () => {
    const location = load();
    mockNative.getForegroundPermissionsAsync.mockResolvedValueOnce({
      granted: true,
      canAskAgain: true,
    });
    expect(await location.getLocationPermission()).toBe('granted');
    mockNative.getForegroundPermissionsAsync.mockResolvedValueOnce({
      granted: false,
      canAskAgain: true,
    });
    expect(await location.getLocationPermission()).toBe('undetermined');
    mockNative.requestForegroundPermissionsAsync.mockResolvedValueOnce({
      granted: false,
      canAskAgain: false,
    });
    expect(await location.requestLocationPermission()).toBe('denied');
  });

  it('erro do sistema vira indisponível', async () => {
    const location = load();
    mockNative.getForegroundPermissionsAsync.mockRejectedValueOnce(new Error('x'));
    expect(await location.getLocationPermission()).toBe('unavailable');
  });
});

describe('getCurrentPosition', () => {
  it('usa a posição guardada pelo sistema se é recente e precisa', async () => {
    const location = load();
    mockNative.getLastKnownPositionAsync.mockResolvedValueOnce(at(-23.5, -46.6));
    expect(await location.getCurrentPosition()).toEqual({ lat: -23.5, lng: -46.6 });
    expect(mockNative.getLastKnownPositionAsync).toHaveBeenCalledWith({
      maxAge: 60_000,
      requiredAccuracy: 100,
    });
    expect(mockNative.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('sem posição guardada, lê uma nova com precisão alta', async () => {
    const location = load();
    mockNative.getLastKnownPositionAsync.mockResolvedValueOnce(null);
    mockNative.getCurrentPositionAsync.mockResolvedValueOnce(at(-22.9, -43.2));
    expect(await location.getCurrentPosition()).toEqual({ lat: -22.9, lng: -43.2 });
    expect(mockNative.getCurrentPositionAsync).toHaveBeenCalledWith({ accuracy: 4 });
  });

  it('GPS que falha devolve null', async () => {
    const location = load();
    mockNative.getLastKnownPositionAsync.mockResolvedValueOnce(null);
    mockNative.getCurrentPositionAsync.mockRejectedValueOnce(new Error('sem GPS'));
    expect(await location.getCurrentPosition()).toBeNull();
  });
});
