import { DOCUMENT_NOTIFY_OPTIONS } from '@ta-em-dia/shared';

/** "30 e 7 dias", "30, 15 e 7 dias", "1 dia". */
export function formatNotifyDays(days: number[]): string {
  const sorted = [...days].sort((a, b) => b - a);
  if (sorted.length === 0) return 'Sem aviso';
  if (sorted.length === 1) return `${sorted[0]} ${sorted[0] === 1 ? 'dia' : 'dias'}`;
  return `${sorted.slice(0, -1).join(', ')} e ${sorted.at(-1)} dias`;
}

/** Chips de antecedência: "30 dias", "1 dia"... */
export const notifyDayOptions = DOCUMENT_NOTIFY_OPTIONS.map((days) => ({
  days,
  label: `${days} ${days === 1 ? 'dia' : 'dias'}`,
}));

/** Marca ou desmarca um dia, mantendo do maior para o menor. */
export function toggleDay(current: number[], days: number): number[] {
  const next = current.includes(days) ? current.filter((d) => d !== days) : [...current, days];
  return next.sort((a, b) => b - a);
}

/** A antecedência padrão precisa de ao menos um dia (sem nenhum, o prazo novo nasceria sem aviso). */
export function notifyDaysError(days: number[]): string | undefined {
  return days.length === 0 ? 'Marque ao menos um dia' : undefined;
}
