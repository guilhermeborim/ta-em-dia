import { calculateMissingFuelAmount, type FuelAmountField } from './calculations';
import type { FuelDraft, FuelEntry } from './schemas';

/**
 * Abastecimento incompleto e as validações dos valores digitados ou falados.
 * Não existe capacidade do tanque: as regras usam só a conta valor ÷ litros.
 */

/** Faixa do preço do litro, em R$, para o preço digitado e para valor ÷ litros. */
export const FUEL_PRICE_MIN = 2;
export const FUEL_PRICE_MAX = 12;

/** Quantos km acima do último abastecimento ainda parecem certos. */
export const FUEL_MAX_KM_JUMP = 2000;

/** Diferença aceita entre valor, litros e preço (2%). */
export const FUEL_AMOUNT_TOLERANCE = 0.02;

/** Os dados de um abastecimento incompleto, sem `id` nem `status` (ainda é só o que se sabe). */
export type FuelDraftFields = Omit<FuelDraft, 'id' | 'status'>;

const AMOUNT_FIELDS: FuelAmountField[] = ['pricePerLiter', 'liters', 'total'];

const has = (value: number | null | undefined): value is number =>
  value !== null && value !== undefined && value > 0;

/**
 * "Completo": posto, km, combustível, tanque cheio (sim ou não) e dois dos três entre valor,
 * litros e preço por litro. Falta algo, é rascunho.
 */
export function isFuelDraftComplete(draft: FuelDraftFields): boolean {
  const amounts = AMOUNT_FIELDS.filter((field) => has(draft[field])).length;
  return (
    (draft.stationName ?? '').trim() !== '' &&
    draft.km !== undefined &&
    draft.fuelType !== undefined &&
    draft.fullTank !== undefined &&
    amounts >= 2
  );
}

/** O que falta para o rascunho ficar completo, na ordem em que a tela pergunta. */
export function missingFuelFields(
  draft: FuelDraftFields,
): ('station' | 'km' | 'fuelType' | 'fullTank' | 'amounts')[] {
  const missing: ReturnType<typeof missingFuelFields> = [];
  if ((draft.stationName ?? '').trim() === '') missing.push('station');
  if (draft.km === undefined) missing.push('km');
  if (draft.fuelType === undefined) missing.push('fuelType');
  if (draft.fullTank === undefined) missing.push('fullTank');
  if (AMOUNT_FIELDS.filter((field) => has(draft[field])).length < 2) missing.push('amounts');
  return missing;
}

/**
 * Abastecimento completo a partir do rascunho, com o terceiro valor calculado quando faltava
 * (preço com 3 casas, litros e total com 2). `null` se o rascunho ainda não está completo.
 */
export function completeFuelDraft(draft: Omit<FuelDraft, 'status'>): FuelEntry | null {
  if (!isFuelDraftComplete(draft)) return null;

  let { pricePerLiter, liters, total } = draft;
  if (!has(pricePerLiter) || !has(liters) || !has(total)) {
    // Falta um só: os dois que existem valem, o outro é o calculado.
    const order = AMOUNT_FIELDS.filter((field) => has(draft[field]));
    const missing = calculateMissingFuelAmount({ pricePerLiter, liters, total }, order);
    if (!missing) return null;
    if (missing.field === 'pricePerLiter') pricePerLiter = missing.value;
    else if (missing.field === 'liters') liters = missing.value;
    else total = missing.value;
  }
  if (!has(pricePerLiter) || !has(liters) || !has(total)) return null;

  return {
    id: draft.id,
    vehicleId: draft.vehicleId,
    date: draft.date,
    km: draft.km!,
    fuelType: draft.fuelType!,
    liters,
    pricePerLiter,
    total,
    fullTank: draft.fullTank!,
    stationName: draft.stationName!.trim(),
    note: draft.note,
  };
}

export type FuelIssueCode =
  'KM_BELOW_LAST' | 'KM_TOO_FAR' | 'PRICE_OUT_OF_RANGE' | 'AMOUNTS_MISMATCH';

export interface FuelIssue {
  /** Campo que a tela deixa em vermelho; `amounts` quando a conta entre os três não fecha. */
  field: 'km' | 'pricePerLiter' | 'amounts';
  code: FuelIssueCode;
}

export interface FuelIssueInput {
  km?: number | null;
  pricePerLiter?: number | null;
  liters?: number | null;
  total?: number | null;
}

const outOfRange = (price: number) => price < FUEL_PRICE_MIN || price > FUEL_PRICE_MAX;

/**
 * Confere o que foi informado (todos os campos são opcionais; só o que existe é conferido):
 * - km menor que o do último abastecimento, ou mais de 2.000 km acima dele;
 * - preço do litro, ou valor ÷ litros, fora de R$ 2 a R$ 12;
 * - valor, litros e preço que não batem (mais de 2% de diferença).
 * `lastKm` é o km do último abastecimento completo do veículo (`null` se não há).
 */
export function fuelEntryIssues(input: FuelIssueInput, lastKm: number | null): FuelIssue[] {
  const issues: FuelIssue[] = [];
  const { km, pricePerLiter, liters, total } = input;

  if (km !== null && km !== undefined) {
    if (lastKm !== null && km < lastKm) issues.push({ field: 'km', code: 'KM_BELOW_LAST' });
    else if (lastKm !== null && km > lastKm + FUEL_MAX_KM_JUMP) {
      issues.push({ field: 'km', code: 'KM_TOO_FAR' });
    }
  }

  if (has(pricePerLiter) && outOfRange(pricePerLiter)) {
    issues.push({ field: 'pricePerLiter', code: 'PRICE_OUT_OF_RANGE' });
  }

  if (has(total) && has(liters)) {
    // Preço digitado e conta valor ÷ litros dizem a mesma coisa; sem preço, a conta é o preço.
    if (!has(pricePerLiter) && outOfRange(total / liters)) {
      issues.push({ field: 'pricePerLiter', code: 'PRICE_OUT_OF_RANGE' });
    }
    if (has(pricePerLiter)) {
      const expected = pricePerLiter * liters;
      if (Math.abs(expected - total) / total > FUEL_AMOUNT_TOLERANCE) {
        issues.push({ field: 'amounts', code: 'AMOUNTS_MISMATCH' });
      }
    }
  }

  return issues;
}
