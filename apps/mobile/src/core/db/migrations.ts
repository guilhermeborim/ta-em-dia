import type { Db } from './types';

/**
 * Migrations do SQLite local, em ordem. A versão aplicada fica em PRAGMA user_version.
 * Regra: nunca editar uma migration já publicada; crie a próxima. Só adicione
 * (colunas, tabelas, índices) para o app novo e o antigo conviverem.
 *
 * Tabelas sincronizáveis (vehicles, fuel_entries, maintenance_plans, maintenance_records): id UUID v7 gerado no app,
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
  `
  -- Preferências locais do app (ex.: boas-vindas já vistas). Não sincroniza.
  CREATE TABLE app_settings (
    key    TEXT PRIMARY KEY NOT NULL,
    value  TEXT NOT NULL
  );
  `,
  `
  -- Plano de manutenção por veículo (sincronizável). Espelha MaintenancePlan no Prisma.
  -- type: código da lista pronta ou o nome digitado em "Outro".
  CREATE TABLE maintenance_plans (
    id                  TEXT PRIMARY KEY NOT NULL,
    user_id             TEXT,
    vehicle_id          TEXT NOT NULL REFERENCES vehicles(id),
    type                TEXT NOT NULL,
    interval_km         INTEGER,
    interval_months     INTEGER,
    last_done_km        INTEGER NOT NULL,
    last_done_at        TEXT NOT NULL,
    enabled             INTEGER NOT NULL DEFAULT 1,
    notify_before_km    INTEGER,
    notify_before_days  INTEGER,
    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL,
    deleted_at          TEXT,
    version             INTEGER
  );
  CREATE INDEX idx_maintenance_plans_vehicle ON maintenance_plans (vehicle_id);
  `,
  `
  -- Serviço de manutenção feito (sincronizável). Espelha MaintenanceRecord no Prisma.
  -- plan_id: plano que este serviço reiniciou (opcional). type: igual ao de maintenance_plans.
  CREATE TABLE maintenance_records (
    id          TEXT PRIMARY KEY NOT NULL,
    user_id     TEXT,
    vehicle_id  TEXT NOT NULL REFERENCES vehicles(id),
    plan_id     TEXT REFERENCES maintenance_plans(id),
    type        TEXT NOT NULL,
    date        TEXT NOT NULL,
    km          INTEGER NOT NULL,
    cost        REAL,
    shop        TEXT,
    note        TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    deleted_at  TEXT,
    version     INTEGER
  );
  CREATE INDEX idx_maintenance_records_vehicle_date ON maintenance_records (vehicle_id, date);
  `,
  `
  -- Ordem dos veículos em "Meus veículos"; o primeiro é o veículo ativo. Só adiciona (compatível
  -- com a versão anterior do app). Os veículos que já existem seguem a ordem de criação.
  ALTER TABLE vehicles ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
  UPDATE vehicles SET sort_order = (
    SELECT COUNT(*) FROM vehicles other
     WHERE other.created_at < vehicles.created_at
        OR (other.created_at = vehicles.created_at AND other.id < vehicles.id)
  );
  `,
  `
  -- Leitura do hodômetro (sincronizável). Espelha OdometerReading no Prisma. Só o app grava
  -- 'manual' (Atualizar km); abastecimento e manutenção já guardam o próprio km.
  CREATE TABLE odometer_readings (
    id          TEXT PRIMARY KEY NOT NULL,
    user_id     TEXT,
    vehicle_id  TEXT NOT NULL REFERENCES vehicles(id),
    km          INTEGER NOT NULL,
    read_at     TEXT NOT NULL,
    source      TEXT NOT NULL CHECK (source IN ('manual', 'fuel', 'maintenance')),
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    deleted_at  TEXT,
    version     INTEGER
  );
  CREATE INDEX idx_odometer_readings_vehicle ON odometer_readings (vehicle_id, read_at);
  `,
  `
  -- Documentos e prazos (sincronizável). Espelha Document no Prisma. Só a data de vencimento:
  -- sem número, sem foto (docs/05-privacidade-lgpd.md). vehicle_id é nulo para a CNH (da pessoa).
  -- due_date: "aaaa-mm-dd". notify_days: JSON, ex.: [30,7].
  CREATE TABLE documents (
    id          TEXT PRIMARY KEY NOT NULL,
    user_id     TEXT,
    vehicle_id  TEXT REFERENCES vehicles(id),
    kind        TEXT NOT NULL CHECK (kind IN ('ipva', 'licensing', 'insurance', 'cnh')),
    due_date    TEXT NOT NULL,
    notify_days TEXT NOT NULL,
    note        TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    deleted_at  TEXT,
    version     INTEGER
  );
  CREATE INDEX idx_documents_vehicle ON documents (vehicle_id);
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
