import { addVehicleBlock, vehicleLimitMessage } from '../models/vehicleLimit';

describe('vehicleLimit', () => {
  it('a mensagem diz o limite do plano', () => {
    expect(vehicleLimitMessage(1)).toBe(
      'No plano grátis, o app guarda 1 veículo. Mais veículos virão com o Premium.',
    );
    expect(vehicleLimitMessage(2)).toContain('2 veículos');
  });

  it('só bloqueia quando já está no limite', () => {
    expect(addVehicleBlock(0, 1)).toBeNull();
    expect(addVehicleBlock(1, 1)).toBe(vehicleLimitMessage(1));
    expect(addVehicleBlock(5, null)).toBeNull();
  });
});
