import type { Vehicle } from '@ta-em-dia/shared';
import { parseYear } from './firstVehicle';
import type { VehiclePatch } from './vehicles.repository';

export interface EditVehicleForm {
  brand: string;
  model: string;
  year: string;
  nickname: string;
  plate: string;
}

export type EditVehicleErrors = Partial<Record<'brand' | 'model' | 'year' | 'plate', string>>;

/** Placa antiga (ABC1234) ou Mercosul (ABC1D23). */
const PLATE = /^[A-Z]{3}\d[A-Z0-9]\d{2}$/;

/** Só letras e números, em maiúsculas, até 7 caracteres (o que a pessoa digita vira a placa). */
export function normalizePlate(text: string): string {
  return text
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(0, 7);
}

/** O formulário de edição começa com os dados atuais; sem apelido, o nome é o modelo. */
export function editFormFrom(vehicle: Vehicle): EditVehicleForm {
  return {
    brand: vehicle.brand ?? '',
    model: vehicle.model ?? '',
    year: vehicle.year?.toString() ?? '',
    nickname: vehicle.name === vehicle.model ? '' : vehicle.name,
    plate: vehicle.plate ?? '',
  };
}

/**
 * Valida a edição: marca, modelo e ano são obrigatórios; apelido e placa são opcionais (sem
 * apelido, usa o modelo; placa vazia remove a placa).
 */
export function buildVehiclePatch(
  form: EditVehicleForm,
  currentYear: number = new Date().getFullYear(),
): { value: VehiclePatch; errors?: undefined } | { value?: undefined; errors: EditVehicleErrors } {
  const errors: EditVehicleErrors = {};

  const brand = form.brand.trim();
  const model = form.model.trim();
  if (!brand) errors.brand = 'Informe a marca';
  if (!model) errors.model = 'Informe o modelo';

  const parsedYear = parseYear(form.year, currentYear);
  if (parsedYear.error) errors.year = parsedYear.error;

  const plate = normalizePlate(form.plate);
  if (plate && !PLATE.test(plate)) errors.plate = 'Placa inválida (ex.: ABC1D23)';

  if (Object.keys(errors).length > 0 || parsedYear.year === undefined) return { errors };

  return {
    value: {
      name: (form.nickname.trim() || model).slice(0, 40),
      brand,
      model,
      year: parsedYear.year,
      plate: plate || undefined,
    },
  };
}
