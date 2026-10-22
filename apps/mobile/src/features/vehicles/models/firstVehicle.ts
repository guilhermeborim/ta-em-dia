import { parseKm } from '../../../core/format';
import type { NewVehicle } from './vehicles.repository';

export { formatKm, parseKm } from '../../../core/format';

export type VehicleKind = 'car' | 'motorcycle';

export interface FirstVehicleForm {
  kind: VehicleKind;
  brand: string;
  model: string;
  year: string;
  nickname: string;
  km: string;
}

export type FirstVehicleErrors = Partial<Record<'brand' | 'model' | 'year' | 'km', string>>;

export const emptyFirstVehicleForm: FirstVehicleForm = {
  kind: 'car',
  brand: '',
  model: '',
  year: '',
  nickname: '',
  km: '',
};

/** Carro vira `flex` e moto `motorcycle`. */
const typeByKind: Record<VehicleKind, NewVehicle['type']> = {
  car: 'flex',
  motorcycle: 'motorcycle',
};

const onlyDigits = (text: string) => text.replace(/\D/g, '');

/** Lê o ano digitado: obrigatório, 4 dígitos, de 1950 até o ano que vem. */
export function parseYear(
  text: string,
  currentYear: number = new Date().getFullYear(),
): { year: number; error?: undefined } | { year?: undefined; error: string } {
  const digits = onlyDigits(text);
  if (digits === '') return { error: 'Informe o ano' };
  const year = Number(digits);
  if (digits.length !== 4 || year < 1950 || year > currentYear + 1)
    return { error: 'Ano inválido' };
  return { year };
}

/** Valida o formulário: tudo é obrigatório, menos o apelido (sem ele, usa o modelo). */
export function buildVehicleInput(
  form: FirstVehicleForm,
  currentYear: number = new Date().getFullYear(),
): { value: NewVehicle; errors?: undefined } | { value?: undefined; errors: FirstVehicleErrors } {
  const errors: FirstVehicleErrors = {};

  const brand = form.brand.trim();
  const model = form.model.trim();
  if (!brand) errors.brand = 'Informe a marca';
  if (!model) errors.model = 'Informe o modelo';

  const km = parseKm(form.km);
  if (km === null) errors.km = 'Informe o km atual';

  const parsedYear = parseYear(form.year, currentYear);
  if (parsedYear.error) errors.year = parsedYear.error;

  if (Object.keys(errors).length > 0 || km === null || parsedYear.year === undefined) {
    return { errors };
  }
  const year = parsedYear.year;

  const name = form.nickname.trim() || model;

  return {
    value: {
      name: name.slice(0, 40),
      type: typeByKind[form.kind],
      brand,
      model,
      year,
      initialKm: km,
    },
  };
}
