import { loadAccount } from '../../../core/auth';
import type { Db } from '../../../core/db';
import { loadSettings } from '../../../core/settings';
import { buildExport, EXPORT_TABLES, type ExportTable, type Row } from './exportData';

/** Lê do SQLite tudo o que vai no arquivo de "Exportar meus dados". */
export async function loadExport(db: Db, options: { now: Date; appVersion: string }) {
  const tables = {} as Record<ExportTable, Row[]>;
  for (const table of EXPORT_TABLES) {
    // Nomes de tabela vêm da lista fixa acima, nunca de fora.
    tables[table] = await db.getAllAsync<Row>(`SELECT * FROM ${table} ORDER BY created_at, id`);
  }
  return buildExport({
    exportedAt: options.now.toISOString(),
    appVersion: options.appVersion,
    account: await loadAccount(db),
    settings: await loadSettings(db),
    tables,
  });
}
