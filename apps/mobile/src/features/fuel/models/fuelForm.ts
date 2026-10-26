import {
  calculateMissingFuelAmount,
  resolveStationName,
  type FuelAmountField,
  type FuelDraft,
} from '@ta-em-dia/shared';
import {
  atNoon,
  formatKm,
  MONTH_NAMES_SHORT,
  parseDecimal,
  parseKm,
  sameDay,
  sanitizeDecimal,
} from '../../../core/format';

export { parseDecimal, sanitizeDecimal };
import {
  fuelTypeOptions,
  type FuelType,
  type NewFuelDraft,
  type NewFuelEntry,
} from '../../../core/fuel';

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

export type FuelFormErrors = Partial<Record<'amounts' | 'km' | 'station' | 'draft', string>>;

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

/**
 * Texto do campo de valor. No preço por litro, sem vírgula digitada, o primeiro dígito é o
 * inteiro e o resto são casas ("65" vira "6,5"), menos quando começa em 1: aí os dois primeiros
 * são o inteiro ("10" fica "10", "105" vira "10,5"). Com vírgula, vale o que foi digitado.
 */
export function sanitizeAmount(field: FuelAmountField, text: string): string {
  const clean = sanitizeDecimal(text, decimals[field].max);
  if (field !== 'pricePerLiter' || clean.includes(',')) return clean;
  // Começando em 1, o inteiro tem dois dígitos ("10", "10,5"): preço de R$ 1,xx não existe. Quem
  // precisa de 1,xx digita a vírgula.
  const integerDigits = clean.startsWith('1') ? 2 : 1;
  if (clean.length <= integerDigits) return clean;
  return sanitizeDecimal(
    `${clean.slice(0, integerDigits)},${clean.slice(integerDigits)}`,
    decimals[field].max,
  );
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
 * Valida o formulário: km e posto são obrigatórios e dois dos três valores precisam estar
 * preenchidos. O posto reaproveita o nome de um posto já usado.
 */
export function buildFuelEntryInput(
  form: FuelForm,
  ctx: { vehicleId: string; date: Date; stations?: readonly string[] },
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

  const stationName = resolveStationName(ctx.stations ?? [], form.station);
  if (stationName === undefined) errors.station = 'Informe o posto';

  if (
    errors.km ||
    errors.amounts ||
    stationName === undefined ||
    km === null ||
    !pricePerLiter ||
    !liters ||
    !total
  ) {
    return { errors };
  }

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
      stationName,
    },
  };
}

/**
 * Rascunho a partir do formulário: guarda o que foi preenchido, sem exigir nada. O km sugerido só
 * vale se a pessoa o tocou (senão o rascunho ficaria com um km que ninguém confirmou). Sem nenhum
 * dado, não há o que guardar.
 */
export function buildFuelDraftInput(
  form: FuelForm,
  ctx: { vehicleId: string; date: Date; stations?: readonly string[]; kmTouched: boolean },
): { value: NewFuelDraft; errors?: undefined } | { value?: undefined; errors: FuelFormErrors } {
  const amounts = deriveAmounts(form);
  const positive = (text: string) => {
    const value = parseDecimal(text);
    return value !== null && value > 0 ? value : undefined;
  };
  const pricePerLiter = positive(amounts.pricePerLiter);
  const liters = positive(amounts.liters);
  const total = positive(amounts.total);
  const km = ctx.kmTouched ? (parseKm(form.km) ?? undefined) : undefined;
  const stationName = resolveStationName(ctx.stations ?? [], form.station);

  if (
    pricePerLiter === undefined &&
    liters === undefined &&
    total === undefined &&
    km === undefined &&
    stationName === undefined
  ) {
    return { errors: { draft: 'Preencha ao menos um dado para guardar o rascunho' } };
  }

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
      stationName,
    },
  };
}

/** Formulário preenchido com o que o rascunho já tem; o km que falta volta como sugestão. */
export function fuelFormFromDraft(
  draft: FuelDraft,
  fallback: { fuelType: FuelType | null; suggestedKm: number | null },
): FuelForm {
  const kmText = draft.km ?? fallback.suggestedKm;
  const amount = (field: FuelAmountField) =>
    draft[field] === undefined ? '' : formatDecimal(draft[field], field);
  const present = (['pricePerLiter', 'liters', 'total'] as const).filter(
    (field) => draft[field] !== undefined,
  );
  return {
    fuelType: draft.fuelType ?? fallback.fuelType ?? emptyFuelForm.fuelType,
    pricePerLiter: amount('pricePerLiter'),
    liters: amount('liters'),
    total: amount('total'),
    amountOrder: present,
    km: kmText === null ? '' : formatKm(String(kmText)),
    fullTank: draft.fullTank ?? false,
    station: draft.stationName ?? '',
  };
}
