import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useDb } from '../db';
import { onNotificationOpened, setupNotificationPresentation } from '../notifications';
import { refreshStationArrival, stationArrivalDeps } from '../stationArrival';
import { refreshReminders } from './refreshReminders';

/**
 * Mantém os avisos (manutenção, documentos, atualizar o km e chegada ao posto) em dia enquanto o app vive: reagenda ao abrir e sempre que
 * o app volta para a frente (a data muda), e abre o item (a lista de prazos, Atualizar km ou o Novo abastecimento) quando a pessoa toca num aviso.
 * Só liga depois da entrada (boas-vindas e login concluídos).
 */
export function useReminderLifecycle(enabled: boolean): void {
  const db = useDb();
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;

    setupNotificationPresentation();
    void refreshReminders(db);
    // Aviso ao chegar no posto: mantém as geofences em dia (troca os postos a cada ~6 h de uso).
    void refreshStationArrival(stationArrivalDeps(db));

    const appState = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void refreshReminders(db);
      void refreshStationArrival(stationArrivalDeps(db));
    });
    const stopOpened = onNotificationOpened((data) => {
      const { planId, documentId, vehicleId, openNewFuelEntry } = data;
      if (openNewFuelEntry === true) {
        // Aviso ao chegar no posto: abre o Novo abastecimento (o posto vem pela localização, C6).
        router.push('/novo-abastecimento');
      } else if (typeof planId === 'string') {
        router.push({ pathname: '/plano-manutencao/[id]', params: { id: planId } });
      } else if (typeof documentId === 'string') {
        // Abre a lista do veículo do aviso (com mais de um veículo ativo, pode não ser o do Início).
        router.push(
          typeof vehicleId === 'string'
            ? { pathname: '/documentos', params: { vehicleId } }
            : '/documentos',
        );
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
