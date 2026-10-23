import type { Db } from '../../../core/db';
import { getLastSyncedAt } from '../../../core/sync';
import type { FlowFailure } from '../../../core/auth/accountFlow';

/** O que a tela Conta mostra do aparelho: veículos, registros e quando o sync terminou. */
export interface LocalData {
  vehicles: number;
  /** Abastecimentos e serviços de manutenção (os "registros" da tela). Excluídos não contam. */
  records: number;
  lastSyncedAt: string | null;
}

export async function loadLocalData(db: Db): Promise<LocalData> {
  const count = async (sql: string) => (await db.getFirstAsync<{ total: number }>(sql))?.total ?? 0;
  const [vehicles, fuel, maintenance] = await Promise.all([
    count('SELECT COUNT(*) AS total FROM vehicles WHERE deleted_at IS NULL'),
    count('SELECT COUNT(*) AS total FROM fuel_entries WHERE deleted_at IS NULL'),
    count('SELECT COUNT(*) AS total FROM maintenance_records WHERE deleted_at IS NULL'),
  ]);
  return { vehicles, records: fuel + maintenance, lastSyncedAt: await getLastSyncedAt(db) };
}

const two = (n: number) => String(n).padStart(2, '0');
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** "hoje, 09:12", "ontem, 09:12" ou "21/10, 09:12". Sem sync ainda: "Ainda não". */
export function formatLastSync(iso: string | null, now: Date = new Date()): string {
  if (!iso) return 'Ainda não';
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return 'Ainda não';
  const time = `${two(at.getHours())}:${two(at.getMinutes())}`;
  if (sameDay(at, now)) return `hoje, ${time}`;
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (sameDay(at, yesterday)) return `ontem, ${time}`;
  return `${two(at.getDate())}/${two(at.getMonth() + 1)}, ${time}`;
}

export const plural = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`;

export const vehiclesText = (n: number) => plural(n, 'veículo', 'veículos');
export const recordsText = (n: number) => plural(n, 'registro', 'registros');

/** Corpo da tela 24: o que a conta que já existe tem. */
export function conflictBody(account: { vehicles: number; records: number }): string {
  return `Encontramos ${vehiclesText(account.vehicles)} e ${recordsText(account.records)} salvos de outro celular. O que fazer com os dados deste aparelho?`;
}

/** Subtítulo de "Juntar dados": a soma do aparelho com a conta. */
export function mergeHint(
  local: Pick<LocalData, 'vehicles' | 'records'>,
  account: { vehicles: number; records: number },
): string {
  return `Soma tudo: ${vehiclesText(local.vehicles + account.vehicles)} e ${recordsText(local.records + account.records)}`;
}

/** A conta que já existe está vazia: não há o que perguntar, junta direto. */
export const isEmptyAccount = (account: { vehicles: number; records: number }): boolean =>
  account.vehicles === 0 && account.records === 0;

/** Texto do aviso quando o login não deu certo. `cancelled` não avisa nada. */
export function failureMessage(status: FlowFailure): string | null {
  switch (status) {
    case 'cancelled':
      return null;
    case 'unavailable':
      return 'Esse login ainda não está disponível neste aparelho.';
    case 'retry':
      return 'Sem conexão com o servidor. Tente de novo em instantes.';
    case 'rejected':
    case 'error':
      return 'Não foi possível entrar. Tente de novo.';
  }
}

/** Progresso do anel (0 a 1); fila vazia conta como completa. */
export const progressOf = (done: number, total: number): number =>
  total <= 0 ? 1 : Math.min(Math.max(done / total, 0), 1);
