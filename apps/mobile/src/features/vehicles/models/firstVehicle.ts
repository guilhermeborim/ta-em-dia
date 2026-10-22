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

export type FirstVehicleErrors = Partial<Record<'year' | 'km', string>>;

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

const defaultName: Record<VehicleKind, string> = { car: 'Meu carro', motorcycle: 'Minha moto' };

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

/** Valida o formulário. Sem apelido, usa o modelo, ou "Meu carro" / "Minha moto". */
export function buildVehicleInput(
  form: FirstVehicleForm,
  currentYear: number = new Date().getFullYear(),
): { value: NewVehicle; errors?: undefined } | { value?: undefined; errors: FirstVehicleErrors } {
  const errors: FirstVehicleErrors = {};

  const km = parseKm(form.km);
  if (km === null) errors.km = 'Informe o km atual';

  const yearText = onlyDigits(form.year);
  let year: number | undefined;
  if (yearText !== '') {
    year = Number(yearText);
    if (yearText.length !== 4 || year < 1950 || year > currentYear + 1) {
      errors.year = 'Ano inválido';
    }
  }

  if (Object.keys(errors).length > 0 || km === null) return { errors };

  const brand = form.brand.trim();
  const model = form.model.trim();
  const name = form.nickname.trim() || model || defaultName[form.kind];

  return {
    value: {
      name: name.slice(0, 40),
      type: typeByKind[form.kind],
      brand: brand || undefined,
      model: model || undefined,
      year,
      initialKm: km,
    },
  };
}
