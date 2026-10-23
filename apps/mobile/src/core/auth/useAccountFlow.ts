import * as SecureStore from 'expo-secure-store';
import { useMemo } from 'react';
import { Platform } from 'react-native';
import { useDb } from '../db';
import { apiUrl } from '../env/appEnv';
import { refreshReminders } from '../reminders';
import type { AccountFlowDeps } from './accountFlow';
import { signInWithProvider, signOutOfProvider } from './providers';

/** As dependências reais do fluxo de conta: SQLite, API, SecureStore e as janelas do Google e da Apple. */
export function useAccountFlow(): AccountFlowDeps {
  const db = useDb();
  return useMemo(
    () => ({
      db,
      apiUrl,
      platform: Platform.OS === 'ios' ? ('ios' as const) : ('android' as const),
      store: SecureStore,
      signIn: signInWithProvider,
      signOutProvider: signOutOfProvider,
      onApplied: () => void refreshReminders(db),
    }),
    [db],
  );
}
