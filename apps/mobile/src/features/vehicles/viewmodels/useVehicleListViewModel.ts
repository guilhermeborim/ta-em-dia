import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useDb } from '../../../core/db';
import { buildVehicleCards, moveId, type VehicleListEntry } from '../models/vehicleList';
import { loadVehicleList } from '../models/vehicleList.repository';
import { reorderVehicles } from '../models/vehicles.repository';

/** ViewModel de Meus veículos (tela 16): cartões, adicionar e reordenar. Lê só o SQLite local. */
export function useVehicleListViewModel() {
  const db = useDb();
  const router = useRouter();
  const [entries, setEntries] = useState<VehicleListEntry[] | null>(null);

  const load = useCallback(() => loadVehicleList(db).then(setEntries), [db]);

  // Recarrega ao voltar para a tela (ex.: depois de adicionar um veículo).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadVehicleList(db).then((value) => {
        if (active) setEntries(value);
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
    isEmpty: entries !== null && entries.length === 0,
    cards,
    /** Com um veículo só, não há o que reordenar. */
    canReorder: cards.length > 1,
    openMoveMenu,
    moveUp: (id: string) => move(id, -1),
    moveDown: (id: string) => move(id, 1),
    back: () => router.back(),
    addVehicle: () => router.push('/novo-veiculo'),
  };
}
