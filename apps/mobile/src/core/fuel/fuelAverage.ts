import { exactKmPerLiter, periodConsumption, type FuelEntry } from '@ta-em-dia/shared';
import { formatNumber } from '../format';

/** Textos do cartão de consumo (lista e Início). */
export interface FuelAverage {
  /** Sem ela (menos de dois abastecimentos), o cartão pede mais um abastecimento. */
  periodAverage?: string;
  periodCalc?: string;
  exactAverage?: string;
}

/**
 * Médias do veículo. Sempre sobre todos os abastecimentos: filtrar por
 * combustível quebraria a distância entre os tanques.
 */
export function buildAverage(entries: FuelEntry[]): FuelAverage {
  const period = periodConsumption(entries);
  if (!period) return {};
  const exact = exactKmPerLiter(entries);
  return {
    periodAverage: formatNumber(period.kmPerLiter, 1),
    periodCalc: `${formatNumber(period.distanceKm, 0)} km ÷ ${formatNumber(period.liters, 1)} L`,
    exactAverage: exact === null ? undefined : formatNumber(exact, 1),
  };
}
