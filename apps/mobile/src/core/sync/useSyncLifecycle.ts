import * as Network from 'expo-network';
import * as SecureStore from 'expo-secure-store';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { shouldRetryOnNetwork } from '../auth/sessionKeeper';
import { useDb, onOutboxChange } from '../db';
import { apiUrl } from '../env/appEnv';
import { useFlag } from '../flags/useFlag';
import { refreshReminders } from '../reminders';
import { createSyncScheduler } from './scheduler';
import { runSync } from './syncRunner';

/**
 * Mantém o SQLite local e a API em dia sem atrapalhar o app: sincroniza ao abrir, ao voltar para
 * a frente, ao ir para o segundo plano, quando a internet volta e uns segundos depois de cada
 * gravação (a `outbox` avisa). Só liga depois do "Continuar sem login"; quem pode sincronizar
 * é decidido pelas flags `sync.cloud` e `sync.anonymous`. Em plataforma sem iOS/Android (web)
 * não faz nada.
 */
export function useSyncLifecycle(enabled: boolean): void {
  const db = useDb();
  const cloud = useFlag('sync.cloud');
  const anonymous = useFlag('sync.anonymous');

  useEffect(() => {
    if (!enabled || (Platform.OS !== 'ios' && Platform.OS !== 'android')) return;

    const platform = Platform.OS;
    const scheduler = createSyncScheduler(() =>
      runSync({
        db,
        apiUrl,
        platform,
        store: SecureStore,
        flags: { cloud, anonymous },
        onApplied: () => void refreshReminders(db),
      }),
    );
    scheduler.request({ immediate: true });

    // Ao voltar para a frente, sincroniza; ao sair, tenta enviar o que ficou (o sistema pode
    // encerrar o app em seguida).
    const appState = AppState.addEventListener('change', () => {
      scheduler.request({ immediate: true });
    });
    const network = Network.addNetworkStateListener((state) => {
      if (AppState.currentState === 'active' && shouldRetryOnNetwork(state)) {
        scheduler.request({ immediate: true });
      }
    });
    const outbox = onOutboxChange(() => scheduler.request());
    return () => {
      appState.remove();
      network.remove();
      outbox();
      scheduler.stop();
    };
  }, [anonymous, cloud, db, enabled]);
}
