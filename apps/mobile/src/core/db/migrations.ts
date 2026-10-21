import type { Db } from './types';

/**
 * Migrations do SQLite local, em ordem. A versão aplicada fica em PRAGMA user_version.
 * Regra: nunca editar uma migration já publicada; crie a próxima. Só adicione
 * (colunas, tabelas, índices) para o app novo e o antigo conviverem.
 *
 * Tabelas sincronizáveis (vehicles, fuel_entries): id UUID v7 gerado no app,
 * datas em ISO 8601 UTC, exclusão lógica (deleted_at) e version (número do
 * servidor, nulo até sincronizar). Espelham apps/api/prisma/schema.prisma.
 */
export const MIGRATIONS: string[] = [
  `
  CREATE TABLE vehicles (
    id          TEXT PRIMARY KEY NOT NULL,
    user_id     TEXT,
    name        TEXT NOT NULL,
    type        TEXT NOT NULL CHECK (type IN ('combustion', 'flex', 'electric')),
    brand       TEXT,
    model       TEXT,
    year        INTEGER,
    plate       TEXT,
    initial_km  INTEGER NOT NULL,
    photo_url   TEXT,
    archived    INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    deleted_at  TEXT,
    version     INTEGER
  );

  CREATE TABLE fuel_entries (
    id             TEXT PRIMARY KEY NOT NULL,
    vehicle_id     TEXT NOT NULL REFERENCES vehicles(id),
    date           TEXT NOT NULL,
    km             INTEGER NOT NULL,
    fuel_type      TEXT NOT NULL CHECK (fuel_type IN ('gasoline', 'ethanol', 'diesel', 'gnv')),
    liters         REAL NOT NULL,
    price_per_liter REAL NOT NULL,
    total          REAL NOT NULL,
    full_tank      INTEGER NOT NULL DEFAULT 0,
    station_name   TEXT,
    note           TEXT,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL,
    deleted_at     TEXT,
    version        INTEGER
  );
  CREATE INDEX idx_fuel_entries_vehicle_date ON fuel_entries (vehicle_id, date);

  -- Fila de mudanças locais a enviar para a API (ver docs/03-arquitetura.md, Sincronização).
  CREATE TABLE outbox (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name  TEXT NOT NULL,
    row_id      TEXT NOT NULL,
    op          TEXT NOT NULL CHECK (op IN ('upsert', 'delete')),
    payload     TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  );

  -- Estado do sync (ex.: última version recebida do servidor).
  CREATE TABLE sync_state (
    key    TEXT PRIMARY KEY NOT NULL,
    value  TEXT NOT NULL
  );
  `,
];

export async function migrate(db: Db, migrations: string[] = MIGRATIONS): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  for (let version = current; version < migrations.length; version++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(migrations[version]!);
      await db.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
  }
}
