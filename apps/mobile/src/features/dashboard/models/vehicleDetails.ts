import type { HomeState } from './home.repository';

const km = new Intl.NumberFormat('pt-BR');

/** Linha de detalhes do seletor: "VW Gol 1.0 · 2019 · 48.320 km" (partes vazias saem). */
export function vehicleDetails(vehicle: NonNullable<HomeState['vehicle']>): string {
  const model = [vehicle.brand, vehicle.model].filter(Boolean).join(' ');
  return [model, vehicle.year?.toString(), `${km.format(vehicle.currentKm)} km`]
    .filter(Boolean)
    .join(' · ');
}
