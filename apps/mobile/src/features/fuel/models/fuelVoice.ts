import {
  FUEL_PRICE_MAX,
  FUEL_PRICE_MIN,
  fuelEntryIssues,
  type FuelAmountField,
  type FuelSpeechQuestion,
  type FuelSpeechResult,
} from '@ta-em-dia/shared';
import type { NewFuelEntry } from '../../../core/fuel';
import { formatBRL, formatKm, parseDecimal, parseKm } from '../../../core/format';
import type { SpeechFailure } from '../../../core/speech';
import {
  buildFuelEntryInput,
  deriveAmounts,
  formatDecimal,
  type FuelForm,
  type FuelFormErrors,
} from './fuelForm';

/**
 * Registro por voz na tela Abastecer: o texto falado (já interpretado por `parseFuelSpeech`)
 * preenche o formulário e decide o que fazer. Completo e válido salva sozinho; faltando dado ou
 * com valor fora da regra, não salva: o campo fica em vermelho e o foco vai para ele; ambíguo vira
 * pergunta.
 */

const AMOUNTS: FuelAmountField[] = ['pricePerLiter', 'liters', 'total'];

/**
 * Formulário com o que foi falado por cima. Valores falados trocam os três campos de valor (o
 * calculado volta a ser calculado pelo formulário); o que não foi falado fica como estava. O
 * combustível só muda se foi dito (o do último abastecimento o formulário já tem).
 */
export function applyFuelSpeech(
  form: FuelForm,
  result: FuelSpeechResult,
): { form: FuelForm; kmSpoken: boolean } {
  const { fields, calculated } = result;
  const spoken = AMOUNTS.filter((field) => fields[field] !== undefined && field !== calculated);
  const next: FuelForm = { ...form };

  if (spoken.length > 0) {
    for (const field of AMOUNTS) {
      const value = fields[field];
      next[field] =
        spoken.includes(field) && value !== undefined ? formatDecimal(value, field) : '';
    }
    next.amountOrder = spoken;
  }
  if (fields.km !== undefined) next.km = formatKm(String(fields.km));
  if (fields.fuelType !== undefined && !result.fuelTypeFromContext) next.fuelType = fields.fuelType;
  if (fields.fullTank !== undefined) next.fullTank = fields.fullTank;
  if (fields.stationName !== undefined) next.station = fields.stationName;

  return { form: next, kmSpoken: fields.km !== undefined };
}

/** A frase não trouxe nada que o formulário use (só o combustível do último abastecimento). */
function understoodNothing(result: FuelSpeechResult): boolean {
  const { fields } = result;
  return (
    [...AMOUNTS, 'km' as const].every((field) => fields[field] === undefined) &&
    fields.fullTank === undefined &&
    fields.stationName === undefined &&
    (fields.fuelType === undefined || result.fuelTypeFromContext)
  );
}

/** Campo que recebe o foco quando a voz não salva. */
export type FuelFocusField = 'pricePerLiter' | 'liters' | 'total' | 'km' | 'station';

export type FuelVoiceOutcome =
  | { kind: 'question'; question: FuelSpeechQuestion }
  | { kind: 'nothing' }
  /** Valor fora da regra: campo em vermelho, nada salvo. */
  | { kind: 'invalid'; errors: FuelFormErrors; focus: FuelFocusField }
  /** Falta dado: campo em vermelho, nada salvo, e o card diz o que falta. */
  | { kind: 'missing'; errors: FuelFormErrors; focus: FuelFocusField; message: string }
  | { kind: 'entry'; value: NewFuelEntry };

export interface FuelVoiceContext {
  vehicleId: string;
  date: Date;
  stations: readonly string[];
  /** O km do formulário foi dito ou digitado (o sugerido não conta). */
  kmTouched: boolean;
  /** Exige o km dito ou digitado (salvar sozinho). Sem isso, o km sugerido vale. */
  strictKm: boolean;
  /** Km do último abastecimento completo do veículo. */
  lastKm: number | null;
}

/** Mensagens das validações da voz, no campo que fica em vermelho. */
export function fuelIssueErrors(
  issues: ReturnType<typeof fuelEntryIssues>,
  lastKm: number | null,
): FuelFormErrors {
  const errors: FuelFormErrors = {};
  const last = lastKm === null ? '' : formatKm(String(lastKm));
  for (const issue of issues) {
    switch (issue.code) {
      case 'KM_BELOW_LAST':
        errors.km = `Menor que o km do último abastecimento (${last} km)`;
        break;
      case 'KM_TOO_FAR':
        errors.km = `Mais de 2.000 km acima do último abastecimento (${last} km)`;
        break;
      case 'PRICE_OUT_OF_RANGE':
        errors.pricePerLiter = `O litro precisa ficar entre ${formatBRL(FUEL_PRICE_MIN)} e ${formatBRL(FUEL_PRICE_MAX)}`;
        break;
      case 'AMOUNTS_MISMATCH':
        errors.amounts = 'Valor, litros e preço não batem. Confira os três.';
        break;
    }
  }
  return errors;
}

/**
 * Primeiro campo com erro, na ordem da tela (valores, km, posto). Nos valores, vai para o primeiro
 * que ainda está vazio (total, litros, preço), que é o que a pessoa precisa preencher.
 */
export function focusFor(errors: FuelFormErrors, form: FuelForm): FuelFocusField {
  if (errors.pricePerLiter) return 'pricePerLiter';
  if (errors.amounts) {
    const shown = deriveAmounts(form);
    return (['total', 'liters', 'pricePerLiter'] as const).find((f) => shown[f] === '') ?? 'total';
  }
  if (errors.km) return 'km';
  return 'station';
}

const MISSING_LABELS = { station: 'o posto', km: 'o km', amounts: 'os valores' } as const;

/** "Falta informar o posto", "Falta informar os valores, o km e o posto". */
export function missingText(errors: FuelFormErrors): string {
  const labels = (['amounts', 'km', 'station'] as const)
    .filter((field) => errors[field])
    .map((field) => MISSING_LABELS[field]);
  const list =
    labels.length <= 1 ? (labels[0] ?? '') : `${labels.slice(0, -1).join(', ')} e ${labels.at(-1)}`;
  return `Falta informar ${list}`;
}

/**
 * O que fazer com a frase, com o formulário já preenchido por `applyFuelSpeech`. Ordem: pergunta,
 * nada entendido, validação (km e preço), dado que falta e, por fim, completo (salva).
 */
export function decideFuelVoice(
  result: FuelSpeechResult,
  form: FuelForm,
  ctx: FuelVoiceContext,
): FuelVoiceOutcome {
  if (result.question) return { kind: 'question', question: result.question };
  if (understoodNothing(result)) return { kind: 'nothing' };

  // Valores falados (inclusive os três, quando não batem); sem nenhum falado, os do formulário.
  const shown = deriveAmounts(form);
  const spokeAmounts = AMOUNTS.some((field) => result.fields[field] !== undefined);
  const amount = (field: FuelAmountField) =>
    spokeAmounts ? result.fields[field] : (parseDecimal(shown[field]) ?? undefined);
  const issues = fuelEntryIssues(
    {
      km: ctx.kmTouched ? parseKm(form.km) : null,
      pricePerLiter: amount('pricePerLiter'),
      liters: amount('liters'),
      total: amount('total'),
    },
    ctx.lastKm,
  );
  if (issues.length > 0) {
    const errors = fuelIssueErrors(issues, ctx.lastKm);
    return { kind: 'invalid', errors, focus: focusFor(errors, form) };
  }

  const entry = buildFuelEntryInput(form, ctx);
  if (entry.value && (ctx.kmTouched || !ctx.strictKm)) {
    return { kind: 'entry', value: entry.value };
  }

  const errors: FuelFormErrors = { ...entry.errors };
  // O km que está no campo é só a sugestão: a pessoa precisa dizer ou confirmar.
  if (!ctx.kmTouched && ctx.strictKm) {
    errors.km = parseKm(form.km) === null ? 'Informe o km do painel' : 'Confirme o km do painel';
  }
  return { kind: 'missing', errors, focus: focusFor(errors, form), message: missingText(errors) };
}

/** Texto mostrado quando a fala não deu certo; o formulário continua na tela. */
export function speechFailureText(failure: SpeechFailure | 'nothing'): string {
  switch (failure) {
    case 'unavailable':
      return 'A fala não está disponível neste aparelho. Preencha abaixo.';
    case 'denied':
      return 'Sem acesso ao microfone. Preencha abaixo ou libere nos ajustes do aparelho.';
    case 'network':
      return 'Falar precisa de internet. Preencha abaixo.';
    case 'no-speech':
      return 'Não ouvi nada. Toque em Falar de novo ou preencha abaixo.';
    case 'nothing':
      return 'Não entendi os valores. Tente de novo ou preencha abaixo.';
    case 'error':
      return 'Não deu para ouvir agora. Preencha abaixo.';
  }
}

const ANSWER_LABELS: Record<FuelSpeechQuestion['options'][number], string> = {
  total: 'Valor',
  liters: 'Litros',
  pricePerLiter: 'Preço do litro',
  km: 'Km',
};

/** Botões da pergunta ("50 é o valor ou os litros?"). */
export function answerOptions(
  question: FuelSpeechQuestion,
): { field: FuelSpeechQuestion['options'][number]; label: string }[] {
  return question.options.map((field) => ({ field, label: ANSWER_LABELS[field] }));
}
