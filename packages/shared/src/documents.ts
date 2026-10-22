/**
 * Documentos e prazos: só a data de vencimento (sem número, sem foto; ver docs/05-privacidade-lgpd.md).
 * A data é "aaaa-mm-dd" (sem hora), para o dia não mudar com o fuso.
 */

import { nextReminderTime, REMINDER_HOUR } from './maintenance';

export const DOCUMENT_KINDS = ['ipva', 'licensing', 'insurance', 'cnh'] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export const DOCUMENT_LABELS: Record<DocumentKind, string> = {
  ipva: 'IPVA',
  licensing: 'Licenciamento',
  insurance: 'Seguro',
  cnh: 'CNH',
};

/** CNH é da pessoa; os outros são do veículo. */
export function isVehicleDocument(kind: DocumentKind): boolean {
  return kind !== 'cnh';
}

/** Dias de antecedência dos avisos, quando a pessoa não escolhe. */
export const DEFAULT_DOCUMENT_NOTIFY_DAYS = [30, 7];

const DAY_MS = 24 * 60 * 60 * 1000;
const DUE_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "aaaa-mm-dd" do dia da data, no fuso do aparelho. */
export function toDueDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Lê "aaaa-mm-dd" como o dia no fuso do aparelho (meio-dia), ou `null` se não é uma data real. */
export function parseDueDate(text: string): Date | null {
  const match = DUE_DATE.exec(text);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day, 12);
  const real =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return real ? date : null;
}

export type DocumentTone = 'ok' | 'soon' | 'overdue';

export interface DocumentStatus {
  tone: DocumentTone;
  /** Dias até vencer: 0 é hoje, negativo se já venceu. */
  daysLeft: number;
}

/** Opções de antecedência que a pessoa pode marcar, em dias. */
export const DOCUMENT_NOTIFY_OPTIONS = [30, 15, 7, 3, 1];

export interface DocumentReminderInput {
  id: string;
  kind: DocumentKind;
  dueDate: string;
  notifyDays: number[];
}

export interface DocumentReminder {
  documentId: string;
  kind: DocumentKind;
  /** Quantos dias antes do vencimento este aviso chega. */
  daysBefore: number;
  fireAt: Date;
}

/**
 * Avisos a agendar: um por dia de antecedência de cada prazo, às `REMINDER_HOUR` horas (fuso do
 * aparelho). Só os que ainda estão no futuro; o que já passou não é repetido e prazo vencido não
 * avisa mais. Do mais próximo ao mais distante.
 */
export function documentReminders(
  documents: DocumentReminderInput[],
  now: Date = new Date(),
  hour: number = REMINDER_HOUR,
): DocumentReminder[] {
  const reminders: DocumentReminder[] = [];
  for (const document of documents) {
    const due = parseDueDate(document.dueDate);
    if (!due) continue;
    for (const daysBefore of new Set(document.notifyDays)) {
      const fireAt = new Date(due.getFullYear(), due.getMonth(), due.getDate() - daysBefore, hour);
      if (fireAt > now) {
        reminders.push({ documentId: document.id, kind: document.kind, daysBefore, fireAt });
      }
    }
  }
  return reminders.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
}

export interface LateDocumentReminder {
  documentId: string;
  kind: DocumentKind;
  /** Dias que faltam no dia do aviso (0 é o próprio vencimento). */
  daysLeft: number;
  /** O próximo 9h. */
  fireAt: Date;
}

/**
 * Aviso de um prazo que já passou de algum dos seus avisos mas ainda não venceu (ex.: cadastrado
 * faltando 10 dias, com aviso de 30): avisa uma vez, no próximo 9h, igual à manutenção. `null` se
 * nenhum aviso foi perdido ou se o próximo 9h já cai depois do vencimento. Quem agenda decide
 * se já avisou (a regra não sabe o histórico).
 */
export function lateDocumentReminder(
  document: DocumentReminderInput,
  now: Date = new Date(),
  hour: number = REMINDER_HOUR,
): LateDocumentReminder | null {
  const due = parseDueDate(document.dueDate);
  if (!due) return null;
  const missed = document.notifyDays.some(
    (daysBefore) =>
      new Date(due.getFullYear(), due.getMonth(), due.getDate() - daysBefore, hour) <= now,
  );
  if (!missed) return null;

  const fireAt = nextReminderTime(now, hour);
  const start = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const daysLeft = Math.round((start(due) - start(fireAt)) / DAY_MS);
  if (daysLeft < 0) return null;
  return { documentId: document.id, kind: document.kind, daysLeft, fireAt };
}

/**
 * Situação do prazo: vencido (já passou), "perto" (faltam até `soonDays` dias, por padrão o maior
 * aviso, 30) ou em dia. O dia do vencimento ainda conta como perto, não como vencido.
 */
export function documentStatus(
  dueDate: string,
  today: Date = new Date(),
  soonDays: number = Math.max(...DEFAULT_DOCUMENT_NOTIFY_DAYS),
): DocumentStatus {
  const due = parseDueDate(dueDate);
  if (!due) throw new Error(`Data de vencimento inválida: ${dueDate}`);
  const start = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const daysLeft = Math.round((start(due) - start(today)) / DAY_MS);
  const tone: DocumentTone = daysLeft < 0 ? 'overdue' : daysLeft <= soonDays ? 'soon' : 'ok';
  return { tone, daysLeft };
}
