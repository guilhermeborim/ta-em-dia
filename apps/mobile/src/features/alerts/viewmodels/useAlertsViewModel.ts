import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useDb } from '../../../core/db';
import { loadHomeState, type HomeState } from '../../dashboard/models/home.repository';
import { buildHomeAlerts, type HomeAlertCard } from '../../dashboard/models/homeAlerts';

/** ViewModel de "Todos os alertas": manutenções e documentos perto de vencer ou vencidos, sem limite. */
export function useAlertsViewModel() {
  const db = useDb();
  const router = useRouter();
  const [state, setState] = useState<HomeState | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadHomeState(db).then((value) => {
        if (active) setState(value);
      });
      return () => {
        active = false;
      };
    }, [db]),
  );

  const cards = useMemo(
    () => (state ? buildHomeAlerts(state, new Date(), Infinity).cards : []),
    [state],
  );

  return {
    loading: state === null,
    cards,
    isEmpty: cards.length === 0,
    back: () => router.back(),
    openAlert: (card: HomeAlertCard) =>
      card.kind === 'document'
        ? router.push('/documentos')
        : router.push({ pathname: '/plano-manutencao/[id]', params: { id: card.id } }),
  };
}
