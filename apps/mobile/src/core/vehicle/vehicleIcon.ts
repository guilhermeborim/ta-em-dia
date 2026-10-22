import type { Vehicle } from '@ta-em-dia/shared';

/** Ícone do veículo: a moto tem o próprio; os demais tipos usam o carro. */
export function vehicleIcon(type: Vehicle['type'] | undefined): 'car' | 'motorbike' {
  return type === 'motorcycle' ? 'motorbike' : 'car';
}
