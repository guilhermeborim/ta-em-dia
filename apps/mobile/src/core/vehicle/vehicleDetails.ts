const km = new Intl.NumberFormat('pt-BR');

interface VehicleDetailsInput {
  brand?: string;
  model?: string;
  year?: number;
  /** O maior entre o km inicial e o do último abastecimento ou serviço. */
  currentKm: number;
}

/** Linha de detalhes do veículo: "VW Gol 1.0 · 2019 · 48.320 km" (partes vazias saem). */
export function vehicleDetails(vehicle: VehicleDetailsInput): string {
  const model = [vehicle.brand, vehicle.model].filter(Boolean).join(' ');
  return [model, vehicle.year?.toString(), `${km.format(vehicle.currentKm)} km`]
    .filter(Boolean)
    .join(' · ');
}
