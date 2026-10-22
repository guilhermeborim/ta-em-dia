import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useDb } from '../db';
import { onNotificationOpened, setupNotificationPresentation } from '../notifications';
import { refreshReminders } from './refreshReminders';

/**
 * Mantém os avisos (manutenção, documentos e atualizar o km) em dia enquanto o app vive: reagenda ao abrir e sempre que
 * o app volta para a frente (a data muda), e abre o item (a lista de prazos, ou Atualizar km) quando a pessoa toca num aviso.
 * Só liga depois da entrada (boas-vindas e login concluídos).
 */
export function useReminderLifecycle(enabled: boolean): void {
  const db = useDb();
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;

    setupNotificationPresentation();
    void refreshReminders(db);

    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshReminders(db);
    });
    const stopOpened = onNotificationOpened((data) => {
      const { planId, documentId, vehicleId } = data;
      if (typeof planId === 'string') {
        router.push({ pathname: '/plano-manutencao/[id]', params: { id: planId } });
      } else if (typeof documentId === 'string') {
        router.push('/documentos');
      } else if (typeof vehicleId === 'string') {
        router.push({ pathname: '/veiculo/[id]/atualizar-km', params: { id: vehicleId } });
      }
    });

    return () => {
      appState.remove();
      stopOpened();
    };
  }, [db, enabled, router]);
}
