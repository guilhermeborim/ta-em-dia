import { canAddVehicle } from '@ta-em-dia/shared';

/** "No plano grátis, o app guarda 1 veículo. Mais veículos virão com o Premium." */
export function vehicleLimitMessage(max: number): string {
  const total = max === 1 ? '1 veículo' : `${max} veículos`;
  return `No plano grátis, o app guarda ${total}. Mais veículos virão com o Premium.`;
}

/** Texto do aviso quando a pessoa toca em "Adicionar veículo" já no limite; `null` se cabe mais um. */
export function addVehicleBlock(count: number, max: number | null): string | null {
  return max !== null && !canAddVehicle(count, max) ? vehicleLimitMessage(max) : null;
}
