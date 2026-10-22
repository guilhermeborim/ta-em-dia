/**
 * Relatórios (tela 14): janelas de meses e totais por mês e categoria. Funções puras.
 * Datas no fuso do aparelho; os meses vão de 0 (janeiro) a 11, como em `Date`.
 */

export type ReportPeriod = 'month' | '3months' | '6months' | 'year';

/** Quantos meses (contando o atual) cada período abrange. "Ano" são os últimos 12 meses. */
export const REPORT_PERIOD_MONTHS: Record<ReportPeriod, number> = {
  month: 1,
  '3months': 3,
  '6months': 6,
  year: 12,
};

export interface ReportWindow {
  /** Primeiro dia do primeiro mês do período. */
  start: Date;
  /** Primeiro dia do mês seguinte ao atual (o período vai até aqui, sem incluir). */
  end: Date;
  /** Primeiro dia do período anterior, de mesmo tamanho, que vem logo antes de `start`. */
  previousStart: Date;
  months: number;
}

/** Janela de `months` meses terminando no mês de `today`, e o período anterior de mesmo tamanho. */
export function reportWindow(months: number, today: Date = new Date()): ReportWindow {
  const first = today.getMonth() - (months - 1);
  return {
    start: new Date(today.getFullYear(), first, 1),
    end: new Date(today.getFullYear(), today.getMonth() + 1, 1),
    previousStart: new Date(today.getFullYear(), first - months, 1),
    months,
  };
}

export interface MonthTotals {
  year: number;
  month: number;
  fuel: number;
  maintenance: number;
  total: number;
}

/**
 * Gasto de cada um dos últimos `months` meses (do mais antigo ao atual), por categoria:
 * combustível e manutenção (só os serviços com custo informado).
 */
export function monthlyTotals(
  fuel: { date: Date; total: number }[],
  services: { date: Date; cost?: number }[],
  months: number,
  today: Date = new Date(),
): MonthTotals[] {
  const rows: MonthTotals[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const first = new Date(today.getFullYear(), today.getMonth() - i, 1);
    rows.push({
      year: first.getFullYear(),
      month: first.getMonth(),
      fuel: 0,
      maintenance: 0,
      total: 0,
    });
  }
  const at = (date: Date) =>
    rows.find((row) => row.year === date.getFullYear() && row.month === date.getMonth());

  for (const entry of fuel) {
    const row = at(entry.date);
    if (row) row.fuel += entry.total;
  }
  for (const service of services) {
    const row = at(service.date);
    if (row && service.cost) row.maintenance += service.cost;
  }
  for (const row of rows) row.total = row.fuel + row.maintenance;
  return rows;
}

/** Soma de gasto (combustível + serviços com custo) em `[start, end)`. */
export function spentBetween(
  fuel: { date: Date; total: number }[],
  services: { date: Date; cost?: number }[],
  start: Date,
  end: Date,
): number {
  const inside = (date: Date) => date >= start && date < end;
  return (
    fuel.filter((f) => inside(f.date)).reduce((sum, f) => sum + f.total, 0) +
    services.filter((s) => inside(s.date)).reduce((sum, s) => sum + (s.cost ?? 0), 0)
  );
}
