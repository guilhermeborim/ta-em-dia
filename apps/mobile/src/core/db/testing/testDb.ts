import { DatabaseSync } from 'node:sqlite';
import type { Db } from '../types';

type Param = string | number | null;

/** Driver de teste: SQLite real em memória (node:sqlite) com a interface Db do app. */
export function createTestDb(): Db {
  const sqlite = new DatabaseSync(':memory:');
  return {
    async execAsync(sql) {
      sqlite.exec(sql);
    },
    async runAsync(sql, ...params: Param[]) {
      return sqlite.prepare(sql).run(...params);
    },
    async getAllAsync<T>(sql: string, ...params: Param[]) {
      return sqlite.prepare(sql).all(...params) as T[];
    },
    async getFirstAsync<T>(sql: string, ...params: Param[]) {
      return (sqlite.prepare(sql).get(...params) as T | undefined) ?? null;
    },
    async withTransactionAsync(task) {
      sqlite.exec('BEGIN');
      try {
        await task();
        sqlite.exec('COMMIT');
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  };
}
