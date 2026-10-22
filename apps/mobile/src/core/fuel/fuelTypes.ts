import type { FuelEntry } from '@ta-em-dia/shared';

export type FuelType = FuelEntry['fuelType'];

export const fuelTypeOptions: { type: FuelType; label: string }[] = [
  { type: 'gasoline', label: 'Gasolina' },
  { type: 'ethanol', label: 'Etanol' },
  { type: 'diesel', label: 'Diesel' },
  { type: 'gnv', label: 'GNV' },
];

export const fuelTypeLabel = Object.fromEntries(
  fuelTypeOptions.map((option) => [option.type, option.label]),
) as Record<FuelType, string>;
