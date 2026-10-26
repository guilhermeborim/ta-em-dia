import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useDb } from '../../../core/db';
import { buildAverage } from '../../../core/fuel';
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

  const entries = data?.entries ?? [];
  const drafts = data?.drafts ?? [];
  const chips = useMemo(() => buildFilterChips(entries), [entries]);
  // Se o combustível filtrado deixar de existir na lista, volta para "Tudo".
  const filter = chips.some((chip) => chip.filter === selected) ? selected : 'all';
  const sections = useMemo(
    () => buildSections(entries, filter, new Date(), drafts),
    [entries, filter, drafts],
  );
  const average = useMemo(() => buildAverage(entries), [entries]);

  return {
    loading: data === null,
    hasVehicle: data?.vehicle != null,
    isEmpty: entries.length === 0 && drafts.length === 0,
    chips: chips.map((chip) => ({ ...chip, selected: chip.filter === filter })),
    sections,
    average,
    selectFilter: setSelected,
    openNewEntry: () => router.push('/novo-abastecimento'),
    /** Só o rascunho abre (para completar); abastecimento completo ainda não tem tela de edição. */
    openDraft: (id: string) => router.push({ pathname: '/abastecimento/[id]', params: { id } }),
    addVehicle: () => router.push('/primeiro-veiculo'),
  };
}
