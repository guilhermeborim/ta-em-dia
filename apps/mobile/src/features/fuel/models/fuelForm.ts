import { calculateMissingFuelAmount, type FuelAmountField } from '@ta-em-dia/shared';
import {
  atNoon,
  MONTH_NAMES_SHORT,
  parseDecimal,
  parseKm,
  sameDay,
  sanitizeDecimal,
} from '../../../core/format';

export { parseDecimal, sanitizeDecimal };
import { fuelTypeOptions, type FuelType, type NewFuelEntry } from '../../../core/fuel';

export { fuelTypeOptions };
export type { FuelType };

export interface FuelForm {
  fuelType: FuelType;
  pricePerLiter: string;
  liters: string;
  total: string;
  /** Campos de valor na ordem em que foram digitados (o mais recente por último). */
  amountOrder: FuelAmountField[];
  km: string;
  fullTank: boolean;
  station: string;
}

export type FuelFormErrors = Partial<Record<'amounts' | 'km', string>>;

export const emptyFuelForm: FuelForm = {
  fuelType: 'gasoline',
  pricePerLiter: '',
  liters: '',
  total: '',
  amountOrder: [],
  km: '',
  fullTank: false,
  station: '',
};

const decimals: Record<FuelAmountField, { min: number; max: number }> = {
  pricePerLiter: { min: 2, max: 3 },
  liters: { min: 2, max: 2 },
  total: { min: 2, max: 2 },
};

export function formatDecimal(value: number, field: FuelAmountField): string {
  const { min, max } = decimals[field];
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
    useGrouping: false,
  }).format(value);
}

export function maxDecimals(field: FuelAmountField): number {
  return decimals[field].max;
}

/** Campo digitado vira o mais recente da ordem (sem repetir). */
export function touchAmount(order: FuelAmountField[], field: FuelAmountField): FuelAmountField[] {
  return [...order.filter((f) => f !== field), field];
}

/** Textos mostrados nos três campos: o terceiro valor vem calculado dos dois digitados. */
export function deriveAmounts(form: FuelForm): {
  pricePerLiter: string;
  liters: string;
  total: string;
  calculated: FuelAmountField | null;
} {
  const missing = calculateMissingFuelAmount(
    {
      pricePerLiter: parseDecimal(form.pricePerLiter),
      liters: parseDecimal(form.liters),
      total: parseDecimal(form.total),
    },
    form.amountOrder,
  );
  const shown = { pricePerLiter: form.pricePerLiter, liters: form.liters, total: form.total };
  if (!missing) return { ...shown, calculated: null };
  return {
    ...shown,
    [missing.field]: formatDecimal(missing.value, missing.field),
    calculated: missing.field,
  };
}

/** "Hoje, 21 out" para o dia de hoje; "20 out" para os outros (com o ano, se não é o atual). */
export function formatEntryDate(date: Date, today: Date = new Date()): string {
  const text = `${date.getDate()} ${MONTH_NAMES_SHORT[date.getMonth()]}`;
  if (sameDay(date, today)) return `Hoje, ${text}`;
  return date.getFullYear() === today.getFullYear() ? text : `${text} ${date.getFullYear()}`;
}

/**
 * Data gravada no abastecimento: hoje guarda o instante de agora (a ordem entre os do mesmo dia
 * segue a hora); outro dia vale ao meio-dia. Sem escolha, é agora.
 */
export function entryDateFor(picked: Date | null, now: Date = new Date()): Date {
  return picked === null || sameDay(picked, now) ? now : atNoon(picked);
}

/**
 * Valida o formulário: km é obrigatório e dois dos três valores precisam estar
 * preenchidos. Posto é opcional.
 */
export function buildFuelEntryInput(
  form: FuelForm,
  ctx: { vehicleId: string; date: Date },
): { value: NewFuelEntry; errors?: undefined } | { value?: undefined; errors: FuelFormErrors } {
  const errors: FuelFormErrors = {};

  const km = parseKm(form.km);
  if (km === null) errors.km = 'Informe o km do painel';

  const amounts = deriveAmounts(form);
  const pricePerLiter = parseDecimal(amounts.pricePerLiter);
  const liters = parseDecimal(amounts.liters);
  const total = parseDecimal(amounts.total);
  if (!amounts.calculated || !pricePerLiter || !liters || !total) {
    errors.amounts = 'Preencha 2 dos 3 valores: preço por litro, litros e total';
  }

  if (errors.km || errors.amounts || km === null || !pricePerLiter || !liters || !total) {
    return { errors };
  }

  const station = form.station.trim();
  return {
    value: {
      vehicleId: ctx.vehicleId,
      date: ctx.date,
      km,
      fuelType: form.fuelType,
      liters,
      pricePerLiter,
      total,
      fullTank: form.fullTank,
      stationName: station === '' ? undefined : station,
    },
  };
}
