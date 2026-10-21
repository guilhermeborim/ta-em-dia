import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import type { ReactNode } from 'react';
import { migrate } from './migrations';
import type { Db } from './types';

export const DATABASE_NAME = 'ta-em-dia.db';

/** Abre o SQLite, roda as migrations e só então renderiza o app. */
export function DatabaseProvider({ children }: { children: ReactNode }) {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrate}>
      {children}
    </SQLiteProvider>
  );
}

export function useDb(): Db {
  return useSQLiteContext();
}
