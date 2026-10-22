import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { MAINTENANCE_CATALOG } from '@ta-em-dia/shared';
import { useDb } from '../../../core/db';
import { buildMaintenanceList, type MaintenanceTab } from '../models/maintenanceList';
import { activatePlan, loadMaintenance, type MaintenanceData } from '../models/plans.repository';

/** ViewModel da aba Manutenção: Próximas e Feitas, sugestões e ativar lembrete. Lê só o SQLite local. */
export function useMaintenanceViewModel() {
  const db = useDb();
  const router = useRouter();
  const [data, setData] = useState<MaintenanceData | null>(null);
  const [tab, setTab] = useState<MaintenanceTab>('next');
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => loadMaintenance(db).then(setData), [db]);

  // Recarrega ao voltar para a aba.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadMaintenance(db).then((value) => {
        if (active) setData(value);
      });
      return () => {
        active = false;
      };
    }, [db]),
  );

  const list = useMemo(() => (data ? buildMaintenanceList(data) : null), [data]);

  const activate = useCallback(
    async (code: string) => {
      const item = MAINTENANCE_CATALOG.find((i) => i.code === code);
      if (!data?.vehicle || !item || busy) return;
      setBusy(true);
      try {
        await activatePlan(db, {
          vehicleId: data.vehicle.id,
          type: item.code,
          intervalKm: item.intervalKm,
          intervalMonths: item.intervalMonths,
          currentKm: data.currentKm,
        });
        await reload();
      } finally {
        setBusy(false);
      }
    },
    [busy, data, db, reload],
  );

  return {
    loading: data === null,
    hasVehicle: data?.vehicle != null,
    vehicleName: data?.vehicle?.name ?? '',
    tab,
    tabs: [
      { value: 'next' as MaintenanceTab, label: 'Próximas' },
      { value: 'done' as MaintenanceTab, label: 'Feitas' },
    ],
    alerts: list?.alerts ?? [],
    noInterval: list?.noInterval ?? [],
    suggestions: list?.suggestions ?? [],
    setTab,
    activate,
    openNewFuelEntry: () => router.push('/novo-abastecimento'),
    addVehicle: () => router.push('/primeiro-veiculo'),
  };
}
