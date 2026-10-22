import {
  maintenanceStatus,
  type DocumentRecord,
  type MaintenancePlan,
  type Vehicle,
} from '@ta-em-dia/shared';
import { statusOfDocument } from '../../../core/documents';
import { vehicleDetails, vehicleIcon } from '../../../core/vehicle';

/** Veículo com o que "Meus veículos" precisa para montar o cartão. */
export interface VehicleListEntry {
  vehicle: Vehicle;
  /** O maior entre o km inicial e o do último abastecimento ou serviço. */
  currentKm: number;
  dailyKm: number;
  plans: MaintenancePlan[];
  /** Prazos do veículo (IPVA, licenciamento, seguro). A CNH é da pessoa e não entra. */
  documents: DocumentRecord[];
}

export type VehicleStatusTone = 'ok' | 'warning' | 'danger';

export interface VehicleCardView {
  id: string;
  name: string;
  /** Ícone do tipo: carro ou moto. */
  icon: 'car' | 'motorbike';
  /** Ex.: "VW Gol 1.0 · 2019 · 48.910 km". */
  details: string;
  /** Sem lembretes com intervalo, o cartão fica sem selo. */
  status?: { tone: VehicleStatusTone; label: string };
  canMoveUp: boolean;
  canMoveDown: boolean;
}

/**
 * Selo do cartão pelos lembretes de manutenção ativos com intervalo e pelos prazos de
 * documentos do veículo: vencidos primeiro, depois "perto de vencer"; sem nada pendente,
 * "Tudo em dia".
 */
export function vehicleStatus(
  entry: Pick<VehicleListEntry, 'plans' | 'documents' | 'currentKm' | 'dailyKm'>,
  today: Date = new Date(),
): VehicleCardView['status'] {
  let overdue = 0;
  let soon = 0;
  let tracked = 0;
  for (const plan of entry.plans) {
    if (!plan.enabled) continue;
    const { tone } = maintenanceStatus(plan, entry.currentKm, entry.dailyKm, today);
    if (tone === 'none') continue;
    tracked++;
    if (tone === 'overdue') overdue++;
    else if (tone === 'soon') soon++;
  }
  for (const document of entry.documents) {
    const { tone } = statusOfDocument(document, today);
    tracked++;
    if (tone === 'overdue') overdue++;
    else if (tone === 'soon') soon++;
  }
  if (overdue > 0)
    return { tone: 'danger', label: `${overdue} ${overdue === 1 ? 'vencido' : 'vencidos'}` };
  if (soon > 0) return { tone: 'warning', label: `${soon} perto de vencer` };
  return tracked > 0 ? { tone: 'ok', label: 'Tudo em dia' } : undefined;
}

export function buildVehicleCards(
  entries: VehicleListEntry[],
  today: Date = new Date(),
): VehicleCardView[] {
  return entries.map((entry, index) => ({
    id: entry.vehicle.id,
    name: entry.vehicle.name,
    icon: vehicleIcon(entry.vehicle.type),
    details: vehicleDetails({ ...entry.vehicle, currentKm: entry.currentKm }),
    status: vehicleStatus(entry, today),
    canMoveUp: index > 0,
    canMoveDown: index < entries.length - 1,
  }));
}

/** A mesma lista com o item de `from` movido para `to`. Fora dos limites, não muda. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

/** Move o id uma posição para cima (`-1`) ou para baixo (`1`). Fora dos limites, não muda. */
export function moveId(ids: string[], id: string, direction: -1 | 1): string[] {
  const from = ids.indexOf(id);
  return moveItem(ids, from, from + direction);
}
