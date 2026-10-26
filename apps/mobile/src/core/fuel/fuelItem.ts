import type { FuelDraft, FuelEntry } from '@ta-em-dia/shared';
import { formatBRL, formatNumber, MONTH_NAMES_SHORT } from '../format';
import { fuelTypeLabel } from './fuelTypes';

export interface FuelListItem {
  id: string;
  /** Ex.: "18 out · Posto Ipiranga". */
  title: string;
  /** Ex.: "38,25 L · Gasolina · cheio". */
  details: string;
  /** Ex.: "R$ 229,10". */
  total: string;
  /** Só quando o trecho pode ser calculado. */
  kmPerLiter?: string;
  /** Rascunho: mostra a etiqueta "Incompleto" e abre o formulário para completar. */
  incomplete?: boolean;
}

/** Texto do item de abastecimento (lista e "Último abastecimento" do Início). */
export function toFuelListItem(
  entry: FuelEntry,
  kmPerLiter: number | null,
  /** Como o tanque cheio aparece nos detalhes: "cheio" na lista, "tanque cheio" no Início. */
  fullLabel = 'cheio',
): FuelListItem {
  const day = String(entry.date.getDate()).padStart(2, '0');
  const date = `${day} ${MONTH_NAMES_SHORT[entry.date.getMonth()]}`;
  return {
    id: entry.id,
    title: entry.stationName ? `${date} · ${entry.stationName}` : date,
    details: `${formatNumber(entry.liters, 1, 2)} L · ${fuelTypeLabel[entry.fuelType]} · ${
      entry.fullTank ? fullLabel : 'parcial'
    }`,
    total: formatBRL(entry.total),
    kmPerLiter: kmPerLiter === null ? undefined : `${formatNumber(kmPerLiter, 1)} km/l`,
  };
}

const dayText = (date: Date) =>
  `${String(date.getDate()).padStart(2, '0')} ${MONTH_NAMES_SHORT[date.getMonth()]}`;

/**
 * Texto do rascunho na lista de abastecimentos: só o que já se sabe, sem km/l. O que falta não é
 * listado (a etiqueta "Incompleto" já avisa); o total aparece como "—" enquanto não existe.
 */
export function toFuelDraftListItem(draft: FuelDraft): FuelListItem {
  const details = [
    draft.liters === undefined ? null : `${formatNumber(draft.liters, 1, 2)} L`,
    draft.fuelType === undefined ? null : fuelTypeLabel[draft.fuelType],
  ].filter(Boolean);
  return {
    id: draft.id,
    title: draft.stationName
      ? `${dayText(draft.date)} · ${draft.stationName}`
      : dayText(draft.date),
    details: details.length > 0 ? details.join(' · ') : 'Faltam dados',
    total: draft.total === undefined ? '—' : formatBRL(draft.total),
    incomplete: true,
  };
}
