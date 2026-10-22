import { costPerKm, type Vehicle } from '@ta-em-dia/shared';
import { formatBRL, formatNumber, relativeDays } from '../../../core/format';
import type { InfoRow } from '../../../ui';

export interface VehicleDetailData {
  vehicle: Vehicle;
  /** O maior entre o km inicial e o de abastecimentos, serviços e leituras manuais. */
  currentKm: number;
  dailyKm: number;
  /** Soma de todos os abastecimentos do veículo. */
  fuelTotal: number;
  /** Data da leitura de km mais recente (abastecimento, serviço ou manual); `null` sem nenhuma. */
  lastReadingAt: Date | null;
}

export interface VehicleDetailView {
  title: string;
  /** Placa em maiúsculas; sem placa cadastrada, fica de fora. */
  plate?: string;
  stats: { label: string; value: string }[];
  rows: InfoRow[];
}

const typeLabel: Record<Vehicle['type'], string> = {
  flex: 'Flex',
  combustion: 'Combustão',
  electric: 'Elétrico',
};

/**
 * Tela 17: números e dados do veículo. Custo/km é o gasto com abastecimentos ÷ km rodados
 * desde o km inicial; sem distância, fica "—". A média diária vem de `shared` (30 km/dia
 * enquanto não há duas leituras).
 */
export function buildVehicleDetail(
  data: VehicleDetailData,
  today: Date = new Date(),
): VehicleDetailView {
  const { vehicle } = data;
  const perKm = costPerKm(data.fuelTotal, data.currentKm - vehicle.initialKm);
  const model = [vehicle.brand, vehicle.model].filter(Boolean).join(' ');

  const rows: InfoRow[] = [];
  if (model) rows.push({ label: 'Marca e modelo', value: model });
  if (vehicle.year) rows.push({ label: 'Ano', value: String(vehicle.year) });
  rows.push({ label: 'Combustível', value: typeLabel[vehicle.type] });
  rows.push({
    label: 'Km atualizado',
    value: data.lastReadingAt ? relativeDays(data.lastReadingAt, today) : 'Só o km inicial',
  });

  return {
    title: vehicle.name,
    plate: vehicle.plate?.toUpperCase(),
    stats: [
      { label: 'Km atual', value: formatNumber(data.currentKm, 0) },
      { label: 'Média/dia', value: `${Math.round(data.dailyKm)} km` },
      { label: 'Custo/km', value: perKm === null ? '—' : formatBRL(perKm) },
    ],
    rows,
  };
}
