import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDb } from '../../../core/db';
import { loadHomeState, type HomeState } from '../models/home.repository';
import { vehicleDetails } from '../models/vehicleDetails';

const TOAST_MS = 2500;

/** ViewModel do Início: veículo, estado vazio e navegação. Lê só o SQLite local. */
export function useDashboardViewModel() {
  const db = useDb();
  const router = useRouter();
  const [state, setState] = useState<HomeState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Recarrega ao voltar para a aba (ex.: depois de cadastrar um veículo).
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

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const comingSoon = useCallback(() => {
    setToast('Em breve');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  const vehicle = state?.vehicle ?? null;

  return {
    loading: state === null,
    vehicle: vehicle && { name: vehicle.name, details: vehicleDetails(vehicle) },
    // O cartão do mês entra no item "Início com dados"; até lá, com dados só some o vazio.
    showEmptyFuel: vehicle !== null && state?.hasFuelEntries === false,
    toast,
    openFuel: () => router.navigate('/abastecer'),
    openMaintenance: () => router.navigate('/manutencao'),
    addVehicle: () => router.push('/primeiro-veiculo'),
    saveData: comingSoon,
  };
}
