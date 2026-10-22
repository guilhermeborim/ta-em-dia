import type { MaintenancePlan } from '@ta-em-dia/shared';

export interface IntervalForm {
  km: string;
  months: string;
}

export type IntervalErrors = Partial<Record<'km' | 'months', string>>;

const MAX_KM = 1_000_000;
const MAX_MONTHS = 240;

const onlyDigits = (text: string) => text.replace(/\D/g, '');

/** Texto inicial do formulário a partir do plano (km com ponto de milhar). */
export function intervalFormFrom(
  plan: Pick<MaintenancePlan, 'intervalKm' | 'intervalMonths'>,
): IntervalForm {
  return {
    km: plan.intervalKm ? new Intl.NumberFormat('pt-BR').format(plan.intervalKm) : '',
    months: plan.intervalMonths ? String(plan.intervalMonths) : '',
  };
}

/**
 * Valida o intervalo: os dois campos são opcionais; se preenchidos, precisam ser maiores
 * que zero. Os dois vazios são válidos (o item só guarda o histórico, sem alerta).
 */
export function buildIntervalInput(
  form: IntervalForm,
):
  | { value: { intervalKm?: number; intervalMonths?: number }; errors?: undefined }
  | { value?: undefined; errors: IntervalErrors } {
  const errors: IntervalErrors = {};
  const kmDigits = onlyDigits(form.km);
  const monthsDigits = onlyDigits(form.months);
  const km = kmDigits === '' ? undefined : Number(kmDigits);
  const months = monthsDigits === '' ? undefined : Number(monthsDigits);

  if (km !== undefined && (km < 1 || km > MAX_KM))
    errors.km = 'Informe um valor entre 1 e 1.000.000';
  if (months !== undefined && (months < 1 || months > MAX_MONTHS)) {
    errors.months = 'Informe um valor entre 1 e 240';
  }
  if (errors.km || errors.months) return { errors };
  return { value: { intervalKm: km, intervalMonths: months } };
}
