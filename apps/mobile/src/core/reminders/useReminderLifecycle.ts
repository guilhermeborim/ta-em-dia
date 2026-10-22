import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useDb } from '../db';
import { onNotificationOpened, setupNotificationPresentation } from '../notifications';
import { refreshMaintenanceReminders } from './reminders';

/**
 * Mantém os avisos de manutenção em dia enquanto o app vive: reagenda ao abrir e sempre que
 * o app volta para a frente (a data muda), e abre o item quando a pessoa toca num aviso.
 * Só liga depois da entrada (boas-vindas e login concluídos).
 */
export function useReminderLifecycle(enabled: boolean): void {
  const db = useDb();
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;

    setupNotificationPresentation();
    void refreshMaintenanceReminders(db);

    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshMaintenanceReminders(db);
    });
    const stopOpened = onNotificationOpened((data) => {
      const id = data.planId;
      if (typeof id === 'string') {
        router.push({ pathname: '/plano-manutencao/[id]', params: { id } });
      }
    });

    return () => {
      appState.remove();
      stopOpened();
    };
  }, [db, enabled, router]);
}
