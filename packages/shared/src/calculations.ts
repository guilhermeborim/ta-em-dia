/**
 * Regras de cálculo usadas pelo app (offline) e pela API (relatórios).
 * Funções puras: recebem dados, devolvem números. Sem acesso a banco.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Média diária usada enquanto não há duas leituras de hodômetro. */
export const DEFAULT_DAILY_KM = 30;

export interface FuelEntryInput {
  date: Date;
  km: number;
  liters: number;
  total: number;
  fullTank: boolean;
}

export interface OdometerReading {
  km: number;
  readAt: Date;
}

/**
 * Média do período (principal): km rodados entre o primeiro e o último
 * abastecimento ÷ litros colocados depois do primeiro. Funciona com
 * abastecimento parcial. Retorna null com menos de dois abastecimentos.
 */
export function periodKmPerLiter(entries: FuelEntryInput[]): number | null {
  if (entries.length < 2) return null;
  const sorted = [...entries].sort((a, b) => a.km - b.km);
  const distance = sorted[sorted.length - 1].km - sorted[0].km;
  const liters = sorted.slice(1).reduce((sum, e) => sum + e.liters, 0);
  if (distance <= 0 || liters <= 0) return null;
  return distance / liters;
}

/**
 * Média exata (km/l) entre os dois últimos abastecimentos de tanque cheio.
 * Abastecimentos parciais no meio somam litros ao trecho.
 * Retorna null se não houver dois tanques cheios.
 */
export function exactKmPerLiter(entries: FuelEntryInput[]): number | null {
  const sorted = [...entries].sort((a, b) => a.km - b.km);
  const fullIdx = sorted.flatMap((e, i) => (e.fullTank ? [i] : []));
  if (fullIdx.length < 2) return null;

  const end = fullIdx[fullIdx.length - 1];
  const start = fullIdx[fullIdx.length - 2];
  const distance = sorted[end].km - sorted[start].km;
  const liters = sorted.slice(start + 1, end + 1).reduce((sum, e) => sum + e.liters, 0);
  if (distance <= 0 || liters <= 0) return null;
  return distance / liters;
}

export type FuelAmountField = 'pricePerLiter' | 'liters' | 'total';
export type FuelAmountsInput = Partial<Record<FuelAmountField, number | null>>;

const FUEL_AMOUNT_FIELDS: FuelAmountField[] = ['pricePerLiter', 'liters', 'total'];

const round = (value: number, decimals: number) => Number(value.toFixed(decimals));

/**
 * Dois dos três valores (preço/litro, litros, total) preenchem o terceiro.
 * `order` lista os campos na ordem em que foram digitados, o mais recente por
 * último: valem os dois últimos com valor; o outro é o calculado. Retorna
 * null com menos de dois valores. Preço com 3 casas, litros e total com 2.
 */
export function calculateMissingFuelAmount(
  amounts: FuelAmountsInput,
  order: FuelAmountField[],
): { field: FuelAmountField; value: number } | null {
  const inputs: FuelAmountField[] = [];
  for (const field of [...order].reverse()) {
    const value = amounts[field];
    if (value != null && value > 0 && !inputs.includes(field)) inputs.push(field);
    if (inputs.length === 2) break;
  }
  if (inputs.length < 2) return null;

  const field = FUEL_AMOUNT_FIELDS.find((f) => !inputs.includes(f))!;
  const { pricePerLiter, liters, total } = amounts;
  const value =
    field === 'total'
      ? round(pricePerLiter! * liters!, 2)
      : field === 'liters'
        ? round(total! / pricePerLiter!, 2)
        : round(total! / liters!, 3);
  return value > 0 ? { field, value } : null;
}

/** Custo por km rodado no período, ou null sem distância. */
export function costPerKm(totalSpent: number, distanceKm: number): number | null {
  if (distanceKm <= 0) return null;
  return totalSpent / distanceKm;
}

/**
 * Média de km por dia, olhando a leitura mais recente contra a leitura
 * mais antiga dentro da janela (padrão 60 dias).
 */
export function dailyAverageKm(readings: OdometerReading[], windowDays = 60): number {
  if (readings.length < 2) return DEFAULT_DAILY_KM;
  const sorted = [...readings].sort((a, b) => a.readAt.getTime() - b.readAt.getTime());
  const last = sorted[sorted.length - 1];
  const windowStart = last.readAt.getTime() - windowDays * DAY_MS;
  const first = sorted.find((r) => r.readAt.getTime() >= windowStart) ?? sorted[0];

  const days = (last.readAt.getTime() - first.readAt.getTime()) / DAY_MS;
  const km = last.km - first.km;
  if (days < 1 || km <= 0) return DEFAULT_DAILY_KM;
  return km / days;
}

export interface MaintenancePlanInput {
  intervalKm?: number | null;
  intervalMonths?: number | null;
  lastDoneKm: number;
  lastDoneAt: Date;
}

export interface NextMaintenance {
  dueDate: Date;
  dueKm: number | null;
  reason: 'km' | 'time';
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * Próxima manutenção: o que vier primeiro entre o limite de km
 * (convertido em data pela média diária) e o limite de tempo.
 */
export function nextMaintenance(
  plan: MaintenancePlanInput,
  currentKm: number,
  dailyKm: number,
  today: Date = new Date(),
): NextMaintenance | null {
  let byKm: { date: Date; km: number } | null = null;
  if (plan.intervalKm) {
    const dueKm = plan.lastDoneKm + plan.intervalKm;
    const daysLeft = dailyKm > 0 ? (dueKm - currentKm) / dailyKm : Infinity;
    byKm = { date: new Date(today.getTime() + daysLeft * DAY_MS), km: dueKm };
  }
  const byTime = plan.intervalMonths ? addMonths(plan.lastDoneAt, plan.intervalMonths) : null;

  if (byKm && (!byTime || byKm.date <= byTime)) {
    return { dueDate: byKm.date, dueKm: byKm.km, reason: 'km' };
  }
  if (byTime) return { dueDate: byTime, dueKm: byKm?.km ?? null, reason: 'time' };
  return null;
}

/** Projeção do gasto do mês: gasto até hoje ÷ dias passados × dias do mês. */
export function monthProjection(spentSoFar: number, today: Date = new Date()): number {
  const day = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return (spentSoFar / day) * daysInMonth;
}

/** Variação percentual contra o mês anterior, ou null se não houver base. */
export function monthOverMonth(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}
