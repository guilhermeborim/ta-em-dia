import { MAINTENANCE_CATALOG, resolveMaintenanceType } from '@ta-em-dia/shared';
import { parseDateInput, parseDecimal, parseKm } from '../../../core/format';
import type { RegisterMaintenanceInput } from './register.repository';

/** Valor do botão "Outro" (nome digitado). Não é um código nem um atalho. */
export const OTHER_TYPE = '__other__';

export interface RegisterForm {
  /** Código do catálogo, nome de um atalho "Seu" ou `OTHER_TYPE`. Null = nada escolhido. */
  typeKey: string | null;
  customName: string;
  /** "dd/mm/aaaa". */
  date: string;
  km: string;
  cost: string;
  shop: string;
}

/** Formulário vazio (a data de hoje entra no ViewModel). */
export const emptyRegisterForm: RegisterForm = {
  typeKey: null,
  customName: '',
  date: '',
  km: '',
  cost: '',
  shop: '',
};

export type RegisterErrors = Partial<
  Record<'type' | 'customName' | 'date' | 'km' | 'cost', string>
>;

export interface TypeOption {
  key: string;
  label: string;
  /** Atalho criado pela pessoa: mostra o selo "Seu". */
  own: boolean;
}

/** Botões de tipo: itens prontos, atalhos "Seu" e "Outro" (sempre por último). */
export function buildTypeOptions(customTypes: string[]): TypeOption[] {
  return [
    ...MAINTENANCE_CATALOG.map((item) => ({ key: item.code, label: item.shortLabel, own: false })),
    ...customTypes.map((name) => ({ key: name, label: name, own: true })),
    { key: OTHER_TYPE, label: 'Outro', own: false },
  ];
}

/**
 * Valida o formulário: tipo, data e km são obrigatórios; custo e oficina são opcionais.
 * Em "Outro", o nome digitado vira um tipo do catálogo se for o nome de um item pronto.
 */
export function buildRegisterInput(
  form: RegisterForm,
  ctx: { vehicleId: string; customTypes: string[]; today?: Date },
):
  | { value: RegisterMaintenanceInput; errors?: undefined }
  | { value?: undefined; errors: RegisterErrors } {
  const errors: RegisterErrors = {};

  let type: string | null = null;
  if (form.typeKey === null) {
    errors.type = 'Escolha o tipo';
  } else if (form.typeKey === OTHER_TYPE) {
    type = resolveMaintenanceType(form.customName, ctx.customTypes);
    if (type === null) errors.customName = 'Informe o nome do tipo';
  } else {
    type = form.typeKey;
  }

  const parsedDate = parseDateInput(form.date, ctx.today);
  if (parsedDate.error) errors.date = parsedDate.error;

  const km = parseKm(form.km);
  if (km === null) errors.km = 'Informe o km do painel';

  const cost = parseDecimal(form.cost);

  if (Object.keys(errors).length > 0 || type === null || !parsedDate.date || km === null) {
    return { errors };
  }

  const shop = form.shop.trim();
  return {
    value: {
      vehicleId: ctx.vehicleId,
      type,
      date: parsedDate.date,
      km,
      cost: cost ?? undefined,
      shop: shop === '' ? undefined : shop,
    },
  };
}
