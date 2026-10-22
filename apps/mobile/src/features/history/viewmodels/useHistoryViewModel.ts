import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useDb } from '../../../core/db';
import {
  buildTimeline,
  historyFilters,
  historyPeriods,
  type HistoryFilter,
  type HistoryPeriod,
} from '../models/history';
import { loadHistory, type HistoryLoad } from '../models/history.repository';

/** ViewModel do Histórico (tela 13): linha do tempo com filtros de tipo e período. Lê só o SQLite local. */
export function useHistoryViewModel() {
  const db = useDb();
  const router = useRouter();
  const [data, setData] = useState<HistoryLoad | null>(null);
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [period, setPeriod] = useState<HistoryPeriod>('all');
  const [periodOpen, setPeriodOpen] = useState(false);

  // Recarrega ao voltar para a tela (ex.: depois de registrar um abastecimento).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadHistory(db).then((value) => {
        if (active) setData(value);
      });
      return () => {
        active = false;
      };
    }, [db]),
  );

  const sections = useMemo(
    () => (data ? buildTimeline(data, filter, period) : []),
    [data, filter, period],
  );

  return {
    loading: data === null,
    hasVehicle: data?.vehicle != null,
    isEmpty: data !== null && data.entries.length === 0 && data.records.length === 0,
    chips: historyFilters.map((chip) => ({ ...chip, selected: chip.filter === filter })),
    periods: historyPeriods,
    period,
    periodOpen,
    /** O botão do calendário fica em destaque quando há período escolhido. */
    periodActive: period !== 'all',
    sections,
    selectFilter: setFilter,
    selectPeriod: setPeriod,
    togglePeriod: () => setPeriodOpen((open) => !open),
    back: () => router.back(),
    addVehicle: () => router.push('/primeiro-veiculo'),
  };
}
