import { monthOverMonth, monthProjection } from '@ta-em-dia/shared';

export interface MonthSummary {
  spent: number;
  projection: number;
  vsPreviousPct: number | null;
}

/** Model: regra pura do resumo do mês. Depois lerá os valores do SQLite. */
export function buildMonthSummary(
  spentThisMonth: number,
  spentLastMonth: number,
  today: Date = new Date(),
): MonthSummary {
  return {
    spent: spentThisMonth,
    projection: monthProjection(spentThisMonth, today),
    vsPreviousPct: monthOverMonth(spentThisMonth, spentLastMonth),
  };
}
