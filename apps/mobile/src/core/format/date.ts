export const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export const MONTH_NAMES_SHORT = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];

/** Aplica a máscara dd/mm/aaaa enquanto a pessoa digita (só dígitos, até 8). */
export function formatDateInput(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** "21/10/2026". */
export function toDateInput(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

const MIN_YEAR = 1990;

/**
 * Lê "dd/mm/aaaa" como data do dia (meio-dia, no fuso do aparelho, para não virar o dia
 * por causa de fuso). Recusa data incompleta, inexistente, antes de 1990 ou no futuro.
 */
export function parseDateInput(
  text: string,
  today: Date = new Date(),
): { date: Date; error?: undefined } | { date?: undefined; error: string } {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) return { error: 'Informe a data (dd/mm/aaaa)' };

  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day, 12);
  const exists =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  if (!exists || year < MIN_YEAR) return { error: 'Data inválida' };

  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
  if (date > endOfToday) return { error: 'A data não pode ser no futuro' };
  return { date };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** "hoje", "ontem", "há 3 dias", "há 2 meses" ou "há 1 ano": conta os dias do calendário. */
export function relativeDays(date: Date, today: Date = new Date()): string {
  const start = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const days = Math.max(0, Math.round((start(today) - start(date)) / DAY_MS));
  if (days === 0) return 'hoje';
  if (days === 1) return 'ontem';
  if (days < 30) return `há ${days} dias`;
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `há ${months} ${months === 1 ? 'mês' : 'meses'}`;
  }
  const years = Math.floor(days / 365);
  return `há ${years} ${years === 1 ? 'ano' : 'anos'}`;
}

/**
 * "dd/mm/aaaa" como o dia (meio-dia), sem as regras de passado e futuro de `parseDateInput`.
 * `null` se está incompleto ou não existe. Serve para abrir o calendário no dia já digitado.
 */
export function dateFromInput(text: string): Date | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) return null;
  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day, 12);
  const exists =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return exists ? date : null;
}

/** O dia da data escolhida no calendário, ao meio-dia (igual ao que `parseDateInput` devolve). */
export function atNoon(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
}

export const sameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();
