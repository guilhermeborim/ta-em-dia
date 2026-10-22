import {
  DEFAULT_DOCUMENT_NOTIFY_DAYS,
  DOCUMENT_LABELS,
  DOCUMENT_NOTIFY_OPTIONS,
  toDueDate,
  type DocumentKind,
} from '@ta-em-dia/shared';
import { formatDateInput, toDateInput } from '../../../core/format';

export { formatDateInput };

export interface DocumentForm {
  /** `null` até a pessoa escolher (ou quando não há tipo disponível). */
  kind: DocumentKind | null;
  /** "dd/mm/aaaa". */
  dueDate: string;
  /** Dias de antecedência marcados (vazio = sem aviso). */
  notifyDays: number[];
}

/** Formulário novo: sem tipo escolhido, sem data e com os avisos padrão. */
export const emptyDocumentForm: DocumentForm = {
  kind: null,
  dueDate: '',
  notifyDays: DEFAULT_DOCUMENT_NOTIFY_DAYS,
};

/** Chips de antecedência: "30 dias", "1 dia"... */
export const notifyOptions = DOCUMENT_NOTIFY_OPTIONS.map((days) => ({
  days,
  label: `${days} ${days === 1 ? 'dia' : 'dias'}`,
}));

/** Marca ou desmarca um dia de antecedência, mantendo do maior para o menor. */
export function toggleNotifyDay(current: number[], days: number): number[] {
  const next = current.includes(days) ? current.filter((d) => d !== days) : [...current, days];
  return next.sort((a, b) => b - a);
}

export type DocumentErrors = Partial<Record<'kind' | 'dueDate', string>>;

export const kindOptions = (kinds: DocumentKind[]) =>
  kinds.map((kind) => ({ kind, label: DOCUMENT_LABELS[kind] }));

const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

/**
 * Lê "dd/mm/aaaa" como "aaaa-mm-dd". Aceita data passada (o prazo pode já ter vencido) e
 * futura; recusa data incompleta, que não existe ou fora de 2000–2100.
 */
export function parseDueInput(
  text: string,
): { dueDate: string; error?: undefined } | { dueDate?: undefined; error: string } {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) return { error: 'Informe a data (dd/mm/aaaa)' };

  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day, 12);
  const exists =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  if (!exists || year < MIN_YEAR || year > MAX_YEAR) return { error: 'Data inválida' };
  return { dueDate: toDueDate(date) };
}

/** Na edição, o campo já vem com a data do prazo. */
export const dueInputFrom = (dueDate: string): string => {
  const [year, month, day] = dueDate.split('-');
  return toDateInput(new Date(Number(year), Number(month) - 1, Number(day), 12));
};

export function buildDocumentInput(form: DocumentForm):
  | { value: { kind: DocumentKind; dueDate: string; notifyDays: number[] }; errors?: undefined }
  | {
      value?: undefined;
      errors: DocumentErrors;
    } {
  const errors: DocumentErrors = {};
  if (form.kind === null) errors.kind = 'Escolha o documento';
  const due = parseDueInput(form.dueDate);
  if (due.error) errors.dueDate = due.error;

  if (Object.keys(errors).length > 0 || form.kind === null || due.dueDate === undefined) {
    return { errors };
  }
  return { value: { kind: form.kind, dueDate: due.dueDate, notifyDays: form.notifyDays } };
}
