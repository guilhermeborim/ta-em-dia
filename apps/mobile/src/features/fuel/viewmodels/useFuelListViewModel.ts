import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useDb } from '../../../core/db';
import { buildAverage, deleteFuelEntry } from '../../../core/fuel';
import { refreshReminders } from '../../../core/reminders';
import { buildFilterChips, buildSections, type FuelFilter } from '../models/fuelList';
import { loadFuelList, type FuelListData } from '../models/fuelList.repository';

/** ViewModel da aba Abastecer: lista por mês, filtros e médias. Lê só o SQLite local. */
export function useFuelListViewModel() {
  const db = useDb();
  const router = useRouter();
  const [data, setData] = useState<FuelListData | null>(null);
  const [selected, setSelected] = useState<FuelFilter>('all');

  // Recarrega ao voltar para a aba (ex.: depois de salvar um abastecimento).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadFuelList(db).then((value) => {
        if (active) setData(value);
      });
      return () => {
        active = false;
      };
    }, [db]),
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteFuelEntry(db, id);
      // O km atual e as médias mudam: os avisos de manutenção dependem deles.
      void refreshReminders(db);
      setData(await loadFuelList(db));
    },
    [db],
  );

  /** Pergunta antes de excluir; cancelar (ou tocar fora) fecha o item arrastado de volta. */
  const confirmDelete = useCallback(
    (id: string, title: string, close: () => void) => {
      Alert.alert(
        'Excluir abastecimento?',
        `${title}. Ele deixa de contar nos gastos e no consumo.`,
        [
          { text: 'Cancelar', style: 'cancel', onPress: close },
          { text: 'Excluir', style: 'destructive', onPress: () => void remove(id) },
        ],
        { cancelable: true, onDismiss: close },
      );
    },
    [remove],
  );

  const entries = data?.entries ?? [];
  const chips = useMemo(() => buildFilterChips(entries), [entries]);
  // Se o combustível filtrado deixar de existir na lista, volta para "Tudo".
  const filter = chips.some((chip) => chip.filter === selected) ? selected : 'all';
  const sections = useMemo(() => buildSections(entries, filter), [entries, filter]);
  const average = useMemo(() => buildAverage(entries), [entries]);

  return {
    loading: data === null,
    hasVehicle: data?.vehicle != null,
    isEmpty: entries.length === 0,
    chips: chips.map((chip) => ({ ...chip, selected: chip.filter === filter })),
    sections,
    average,
    selectFilter: setSelected,
    openNewEntry: () => router.push('/novo-abastecimento'),
    openEntry: (id: string) => router.push({ pathname: '/abastecimento/[id]', params: { id } }),
    confirmDelete,
    addVehicle: () => router.push('/primeiro-veiculo'),
  };
}
