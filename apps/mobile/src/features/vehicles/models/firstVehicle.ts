import type { NewVehicle } from './vehicles.repository';

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

/** Carro vira `flex` e moto `combustion` até o schema ganhar um tipo próprio de moto. */
const typeByKind: Record<VehicleKind, NewVehicle['type']> = {
  car: 'flex',
  motorcycle: 'combustion',
};

const onlyDigits = (text: string) => text.replace(/\D/g, '');

/** Aceita "48.320" ou "48320"; devolve `null` se vazio. */
export function parseKm(text: string): number | null {
  const digits = onlyDigits(text);
  return digits === '' ? null : Number(digits);
}

export function formatKm(text: string): string {
  const km = parseKm(text);
  return km === null ? '' : new Intl.NumberFormat('pt-BR').format(km);
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

  const yearText = onlyDigits(form.year);
  const year = yearText === '' ? null : Number(yearText);
  if (year === null) errors.year = 'Informe o ano';
  else if (yearText.length !== 4 || year < 1950 || year > currentYear + 1) {
    errors.year = 'Ano inválido';
  }

  if (Object.keys(errors).length > 0 || km === null || year === null) return { errors };

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
