import type { AccountProfile } from '../../../core/auth';
import type { AppSettings } from '../../../core/settings';

/** Tabelas com os dados da pessoa, na ordem do arquivo. Fila do sync e cache de postos ficam fora. */
export const EXPORT_TABLES = [
  'vehicles',
  'fuel_entries',
  'stations',
  'odometer_readings',
  'maintenance_plans',
  'maintenance_records',
  'documents',
] as const;

export type ExportTable = (typeof EXPORT_TABLES)[number];
export type Row = Record<string, unknown>;

/** Colunas 0/1 do SQLite que viram true/false no arquivo. */
const BOOLEAN_COLUMNS = new Set(['archived', 'full_tank', 'enabled']);
/** Colunas internas do sync, sem valor para a pessoa. */
const SKIPPED_COLUMNS = new Set(['version']);

const camel = (key: string) => key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

/** Uma linha do SQLite no formato do arquivo: camelCase, booleanos e `notify_days` como lista. */
export function exportRow(row: Row): Row {
  const out: Row = {};
  for (const [key, value] of Object.entries(row)) {
    if (SKIPPED_COLUMNS.has(key)) continue;
    if (BOOLEAN_COLUMNS.has(key) && value !== null) out[camel(key)] = value === 1;
    else if (key === 'notify_days' && typeof value === 'string') out[camel(key)] = parseList(value);
    else out[camel(key)] = value;
  }
  return out;
}

function parseList(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export interface ExportInput {
  exportedAt: string;
  appVersion: string;
  account: AccountProfile | null;
  settings: AppSettings;
  tables: Record<ExportTable, Row[]>;
}

/**
 * Documento de "Exportar meus dados" (LGPD, acesso e portabilidade): tudo o que o app guarda da
 * pessoa, inclusive os itens excluídos (com `deletedAt`), porque a exclusão é lógica.
 */
export function buildExport(input: ExportInput) {
  const rows = (table: ExportTable) => input.tables[table].map(exportRow);
  return {
    app: 'Tá em Dia',
    format: 1,
    exportedAt: input.exportedAt,
    appVersion: input.appVersion,
    account: input.account
      ? { provider: input.account.provider, name: input.account.name, email: input.account.email }
      : null,
    settings: input.settings,
    vehicles: rows('vehicles'),
    fuelEntries: rows('fuel_entries'),
    stations: rows('stations'),
    odometerReadings: rows('odometer_readings'),
    maintenancePlans: rows('maintenance_plans'),
    maintenanceRecords: rows('maintenance_records'),
    documents: rows('documents'),
  };
}

/** "ta-em-dia-dados-2026-10-26.json", com a data do aparelho. */
export function exportFileName(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `ta-em-dia-dados-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}
