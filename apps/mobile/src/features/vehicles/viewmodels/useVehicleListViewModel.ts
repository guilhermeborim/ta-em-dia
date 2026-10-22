import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useDb } from '../../../core/db';
import { buildVehicleCards, moveId, type VehicleListEntry } from '../models/vehicleList';
import { loadVehicleList } from '../models/vehicleList.repository';
import { listArchivedVehicles, reorderVehicles } from '../models/vehicles.repository';

/** ViewModel de Meus veículos (tela 16): cartões, adicionar e reordenar. Lê só o SQLite local. */
export function useVehicleListViewModel() {
  const db = useDb();
  const router = useRouter();
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

  const move = useCallback(
    async (id: string, direction: -1 | 1) => {
      const ids = cards.map((card) => card.id);
      await reorderVehicles(db, moveId(ids, id, direction));
      await load();
    },
    [cards, db, load],
  );

  /** Segurar o cartão abre as opções de mover (sem biblioteca de arrastar). */
  const openMoveMenu = useCallback(
    (id: string) => {
      const card = cards.find((item) => item.id === id);
      if (!card || (!card.canMoveUp && !card.canMoveDown)) return;
      Alert.alert(card.name, 'Mudar a ordem. O primeiro veículo é o que aparece no Início.', [
        ...(card.canMoveUp ? [{ text: 'Mover para cima', onPress: () => void move(id, -1) }] : []),
        ...(card.canMoveDown
          ? [{ text: 'Mover para baixo', onPress: () => void move(id, 1) }]
          : []),
        { text: 'Cancelar', style: 'cancel' as const },
      ]);
    },
    [cards, move],
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
    openMoveMenu,
    moveUp: (id: string) => move(id, -1),
    moveDown: (id: string) => move(id, 1),
    back: () => router.back(),
    addVehicle: () => router.push('/novo-veiculo'),
  };
}
