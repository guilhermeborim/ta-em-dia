import { vehicleIcon } from '../vehicleIcon';

describe('vehicleIcon', () => {
  it('moto tem o ícone próprio; os outros tipos (e sem tipo) usam o carro', () => {
    expect(vehicleIcon('motorcycle')).toBe('motorbike');
    expect(vehicleIcon('flex')).toBe('car');
    expect(vehicleIcon('combustion')).toBe('car');
    expect(vehicleIcon('electric')).toBe('car');
    expect(vehicleIcon(undefined)).toBe('car');
  });
});
