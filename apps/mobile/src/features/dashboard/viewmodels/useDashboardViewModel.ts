import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { loadAccount } from '../../../core/auth';
import { useDb } from '../../../core/db';
import { buildAverage } from '../../../core/fuel';
import { useFlag } from '../../../core/flags/useFlag';
import { useToast } from '../../../core/toast/useToast';
import { loadHomeState, type HomeState } from '../models/home.repository';
import { buildHomeAlerts, type HomeAlertCard } from '../models/homeAlerts';
import { buildHomeSummary, buildLastEntry, buildSavedToast } from '../models/homeSummary';
import { vehicleIcon } from '../../../core/vehicle';
import { vehicleDetails } from '../models/vehicleDetails';

/**
 * ViewModel do Início: veículo, estado vazio ou painel do mês, e navegação. Lê só o SQLite local.
 * Depois de salvar um abastecimento, o formulário volta para cá com `saved` (o id) para mostrar o aviso.
 */
export function useDashboardViewModel() {
  const db = useDb();
  const router = useRouter();
  const { saved } = useLocalSearchParams<{ saved?: string }>();
  const maxVehicles = useFlag('vehicles.max');
  const [state, setState] = useState<HomeState | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const { toast, show: showToast } = useToast();

  // Recarrega ao voltar para a aba (ex.: depois de salvar um abastecimento).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadAccount(db).then((account) => {
        if (active) setLoggedIn(account !== null);
      });
      loadHomeState(db).then((value) => {
        if (!active) return;
        setState(value);
        if (saved) {
          const savedToast = buildSavedToast(value.entries, saved);
          if (savedToast) showToast(savedToast);
          router.setParams({ saved: undefined });
        }
      });
      return () => {
        active = false;
      };
    }, [db, router, saved, showToast]),
  );

  const vehicle = state?.vehicle ?? null;
  const entries = useMemo(() => state?.entries ?? [], [state]);
  const hasFuelEntries = entries.length > 0;
  const summary = useMemo(
    () => (hasFuelEntries ? buildHomeSummary(entries) : null),
    [entries, hasFuelEntries],
  );
  const average = useMemo(() => buildAverage(entries), [entries]);
  const lastEntry = useMemo(() => buildLastEntry(entries), [entries]);
  const alerts = useMemo(() => (state ? buildHomeAlerts(state) : null), [state]);

  return {
    loading: state === null,
    vehicle: vehicle && {
      name: vehicle.name,
      icon: vehicleIcon(vehicle.type),
      details: vehicleDetails(vehicle),
    },
    // Com mais de um veículo liberado (Premium), a seta mostra que dá para trocar.
    canSwitchVehicle: maxVehicles === null || maxVehicles > 1,
    showEmptyFuel: vehicle !== null && !hasFuelEntries,
    summary,
    average,
    lastEntry,
    alertCards: alerts?.cards ?? [],
    hasReminders: alerts?.hasReminders ?? false,
    toast,
    openFuel: () => router.push('/novo-abastecimento'),
    openMaintenance: () => router.navigate('/manutencao'),
    openAllAlerts: () => router.push('/alertas'),
    openAlert: (card: HomeAlertCard) =>
      card.kind === 'document'
        ? router.push('/documentos')
        : router.push({ pathname: '/plano-manutencao/[id]', params: { id: card.id } }),
    openPlan: (id: string) => router.push({ pathname: '/plano-manutencao/[id]', params: { id } }),
    addVehicle: () => router.push('/primeiro-veiculo'),
    /** Quem já entrou com Google ou Apple não vê o convite; o selo mostra "Sincronizado". */
    loggedIn,
    saveData: () => router.push('/conta'),
  };
}
