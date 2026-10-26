import {
  FUEL_PRICE_MAX,
  FUEL_PRICE_MIN,
  fuelEntryIssues,
  missingFuelFields,
  type FuelAmountField,
  type FuelSpeechQuestion,
  type FuelSpeechResult,
} from '@ta-em-dia/shared';
import { getSetting, setSetting, type Db } from '../../../core/db';
import type { NewFuelDraft, NewFuelEntry } from '../../../core/fuel';
import { formatBRL, formatKm, formatNumber, parseDecimal, parseKm } from '../../../core/format';
import type { SpeechFailure } from '../../../core/speech';
import {
  buildFuelDraftInput,
  buildFuelEntryInput,
  deriveAmounts,
  formatDecimal,
  type FuelForm,
  type FuelFormErrors,
} from './fuelForm';

/**
 * Registro por voz na tela Abastecer: o texto falado (já interpretado por `parseFuelSpeech`)
 * preenche o formulário e decide o que fazer. Completo e válido salva sozinho; faltando dado vira
 * rascunho; valor fora da regra fica em vermelho e não salva; ambíguo vira pergunta.
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

  return { form: next, kmSpoken: fields.km !== undefined };
}

/** A frase não trouxe nada que o formulário use (só o combustível do último abastecimento). */
function understoodNothing(result: FuelSpeechResult): boolean {
  const { fields } = result;
  return (
    [...AMOUNTS, 'km' as const].every((field) => fields[field] === undefined) &&
    fields.fullTank === undefined &&
    (fields.fuelType === undefined || result.fuelTypeFromContext)
  );
}

export type FuelVoiceOutcome =
  | { kind: 'question'; question: FuelSpeechQuestion }
  | { kind: 'nothing' }
  | { kind: 'invalid'; errors: FuelFormErrors }
  | { kind: 'entry'; value: NewFuelEntry; summary: string }
  | { kind: 'draft'; value: NewFuelDraft; summary: string; missing: string };

export interface FuelVoiceContext {
  vehicleId: string;
  date: Date;
  stations: readonly string[];
  /** O km do formulário foi dito ou digitado (o sugerido não conta). */
  kmTouched: boolean;
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

/** "Shell · R$ 150,00 · 25 L · 45.300 km": só o que existe. */
export function fuelVoiceSummary(value: {
  stationName?: string;
  total?: number;
  liters?: number;
  km?: number;
}): string {
  const parts: string[] = [];
  if (value.stationName) parts.push(value.stationName);
  if (value.total !== undefined) parts.push(formatBRL(value.total));
  if (value.liters !== undefined) parts.push(`${formatNumber(value.liters, 0, 2)} L`);
  if (value.km !== undefined) parts.push(`${formatKm(String(value.km))} km`);
  return parts.join(' · ');
}

const MISSING_LABELS: Record<ReturnType<typeof missingFuelFields>[number], string> = {
  station: 'o posto',
  km: 'o km',
  fuelType: 'o combustível',
  fullTank: 'o tanque cheio',
  amounts: 'os valores',
};

/** "Falta o posto", "Falta o posto e o km". */
export function missingText(missing: ReturnType<typeof missingFuelFields>): string {
  const labels = missing.map((field) => MISSING_LABELS[field]);
  const list =
    labels.length <= 1 ? (labels[0] ?? '') : `${labels.slice(0, -1).join(', ')} e ${labels.at(-1)}`;
  return `Falta ${list}`;
}

/**
 * O que fazer com a frase, com o formulário já preenchido por `applyFuelSpeech`. Ordem: pergunta,
 * nada entendido, validação (km e preço), completo (salva) e, por fim, rascunho.
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
  if (issues.length > 0) return { kind: 'invalid', errors: fuelIssueErrors(issues, ctx.lastKm) };

  const entry = buildFuelEntryInput(form, ctx);
  if (entry.value && ctx.kmTouched) {
    return { kind: 'entry', value: entry.value, summary: fuelVoiceSummary(entry.value) };
  }

  const draft = buildFuelDraftInput(form, ctx);
  if (!draft.value) return { kind: 'nothing' };
  return {
    kind: 'draft',
    value: draft.value,
    summary: fuelVoiceSummary(draft.value),
    missing: missingText(missingFuelFields(draft.value)),
  };
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

const NOTICE_KEY = 'fuel.voice_notice_seen';

/** O aviso do áudio (uma vez, antes do primeiro uso) já foi aceito? */
export async function voiceNoticeSeen(db: Db): Promise<boolean> {
  return (await getSetting(db, NOTICE_KEY)) === '1';
}

export async function markVoiceNoticeSeen(db: Db): Promise<void> {
  await setSetting(db, NOTICE_KEY, '1');
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
