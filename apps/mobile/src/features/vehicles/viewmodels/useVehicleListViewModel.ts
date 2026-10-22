import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useDb } from '../../../core/db';
import { refreshReminders } from '../../../core/reminders';
import { buildVehicleCards, moveItem, type VehicleListEntry } from '../models/vehicleList';
import { useFlag } from '../../../core/flags/useFlag';
import { addVehicleBlock } from '../models/vehicleLimit';
import { buildVehicleCards, moveId, type VehicleListEntry } from '../models/vehicleList';
import { loadVehicleList } from '../models/vehicleList.repository';
import { listArchivedVehicles, reorderVehicles } from '../models/vehicles.repository';

/** ViewModel de Meus veículos (tela 16): cartões, adicionar e reordenar. Lê só o SQLite local. */
export function useVehicleListViewModel() {
  const db = useDb();
  const router = useRouter();
  const max = useFlag('vehicles.max');
  const [entries, setEntries] = useState<VehicleListEntry[] | null>(null);
  const [archived, setArchived] = useState<{ id: string; name: string }[]>([]);

  const load = useCallback(() => loadVehicleList(db).then(setEntries), [db]);

  // Recarrega ao voltar para a tela (ex.: depois de adicionar um veículo).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([loadVehicleList(db), listArchivedVehicles(db)]).then(([value, old]) => {
        if (!active) return;
        setEntries(value);
        setArchived(old.map((vehicle) => ({ id: vehicle.id, name: vehicle.name })));
      });
      return () => {
        active = false;
      };
    }, [db]),
  );

  const cards = useMemo(() => (entries ? buildVehicleCards(entries) : []), [entries]);

  /** Solta o veículo de `from` na posição `to`: a tela já mostra a ordem nova e depois grava. */
  const reorder = useCallback(
    async (from: number, to: number) => {
      const ids = moveItem(
        cards.map((card) => card.id),
        from,
        to,
      );
      setEntries((prev) =>
        prev ? ids.map((id) => prev.find((entry) => entry.vehicle.id === id)!) : prev,
      );
      await reorderVehicles(db, ids);
      await load();
      // O veículo ativo pode ter mudado: os avisos de manutenção e de km seguem o ativo.
      void refreshReminders(db);
    },
    [cards, db, load],
  );

  /** Mover por botão (leitor de tela): uma posição para cima (`-1`) ou para baixo (`1`). */
  const move = useCallback(
    (id: string, direction: -1 | 1) => {
      const from = cards.findIndex((card) => card.id === id);
      return from < 0 ? Promise.resolve() : reorder(from, from + direction);
    },
    [cards, reorder],
  );

  return {
    loading: entries === null,
    isEmpty: entries !== null && entries.length === 0 && archived.length === 0,
    /** Veículos arquivados: ficam numa seção própria, onde dá para abrir e restaurar. */
    archived,
    cards,
    /** Com um veículo só, não há o que reordenar. */
    canReorder: cards.length > 1,
    openVehicle: (id: string) => router.push({ pathname: '/veiculo/[id]', params: { id } }),
    reorder,
    moveUp: (id: string) => move(id, -1),
    moveDown: (id: string) => move(id, 1),
    back: () => router.back(),
    addVehicle: () => {
      // Arquivados contam: o limite é de veículos guardados, não só dos ativos.
      const blocked = addVehicleBlock(cards.length + archived.length, max);
      if (!blocked) {
        router.push('/novo-veiculo');
        return;
      }
      Alert.alert('Limite de veículos', blocked, [
        { text: 'Ver Premium', onPress: () => router.push('/premium') },
        { text: 'Ok', style: 'cancel' },
      ]);
    },
  };
}
