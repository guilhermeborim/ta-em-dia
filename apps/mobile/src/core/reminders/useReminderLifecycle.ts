import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useDb } from '../db';
import { onNotificationOpened, setupNotificationPresentation } from '../notifications';
import { refreshReminders } from './refreshReminders';

/**
 * Mantém os avisos (manutenção, documentos, rascunhos de abastecimento e atualizar o km) em dia enquanto o app vive: reagenda ao abrir e sempre que
 * o app volta para a frente (a data muda), e abre o item (a lista de prazos, o rascunho ou Atualizar km) quando a pessoa toca num aviso.
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
      const { planId, documentId, fuelDraftId, vehicleId } = data;
      if (typeof planId === 'string') {
        router.push({ pathname: '/plano-manutencao/[id]', params: { id: planId } });
      } else if (typeof documentId === 'string') {
        // Abre a lista do veículo do aviso (com mais de um veículo ativo, pode não ser o do Início).
        router.push(
          typeof vehicleId === 'string'
            ? { pathname: '/documentos', params: { vehicleId } }
            : '/documentos',
        );
      } else if (typeof fuelDraftId === 'string') {
        router.push({ pathname: '/abastecimento/[id]', params: { id: fuelDraftId } });
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
