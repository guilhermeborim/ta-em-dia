import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useDb } from '../../../core/db';
import { useFlag } from '../../../core/flags/useFlag';
import { requestNotificationPermission } from '../../../core/notifications';
import { refreshReminders } from '../../../core/reminders';
import {
  disableStationArrival,
  enableStationArrival,
  stationArrivalAvailable,
  stationArrivalDeps,
} from '../../../core/stationArrival';
import {
  loadSettings,
  saveToggle,
  type AppSettings,
  type NotifySetting,
} from '../../../core/settings';
import { useToast } from '../../../core/toast/useToast';
import { formatNotifyDays } from '../models/settingsView';

/**
 * ViewModel de Configurações (tela 20): avisos por tipo, antecedência padrão, salvar pela fala,
 * aviso ao chegar no posto, unidades e exportar.
 */
export function useSettingsViewModel() {
  const db = useDb();
  const router = useRouter();
  const { toast, show } = useToast();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const arrivalFlag = useFlag('geo.fuelReminder');
  const arrivalDeps = useMemo(() => stationArrivalDeps(db), [db]);
  const showStationArrival = arrivalFlag && stationArrivalAvailable(arrivalDeps);

  // Recarrega ao voltar (ex.: depois de mudar a antecedência).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadSettings(db).then((value) => {
        if (active) setSettings(value);
      });
      return () => {
        active = false;
      };
    }, [db]),
  );

  const toggle = useCallback(
    async (key: NotifySetting, value: boolean) => {
      setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
      await saveToggle(db, key, value);
      // Ligar um aviso sem a permissão do sistema não adiantaria: pede agora (só se ainda não foi dada).
      if (value && (await requestNotificationPermission()) === 'denied') {
        show({
          title: 'Notificações desativadas',
          message: 'Ative nos ajustes do aparelho para receber os avisos.',
        });
      }
      await refreshReminders(db);
    },
    [db, show],
  );

  // Salvar pela fala não usa notificação: só grava a preferência.
  const setVoiceAutoSave = useCallback(
    async (value: boolean) => {
      setSettings((prev) => (prev ? { ...prev, voiceAutoSave: value } : prev));
      await saveToggle(db, 'voiceAutoSave', value);
    },
    [db],
  );

  // Aviso ao chegar no posto: sem o "sempre", abre as telas que explicam antes dos pedidos do
  // sistema; com ele (ex.: ligou antes e desligou), liga direto.
  const setStationArrival = useCallback(
    async (value: boolean) => {
      if (!value) {
        setSettings((prev) => (prev ? { ...prev, stationArrival: false } : prev));
        await disableStationArrival(arrivalDeps);
        return;
      }
      if ((await arrivalDeps.geofencer.backgroundPermission()) !== 'granted') {
        router.push('/configuracoes/aviso-no-posto');
        return;
      }
      setSettings((prev) => (prev ? { ...prev, stationArrival: true } : prev));
      await enableStationArrival(arrivalDeps);
      if ((await requestNotificationPermission()) === 'denied') {
        show({
          title: 'Notificações desativadas',
          message: 'Ative nos ajustes do aparelho para receber os avisos.',
        });
      }
    },
    [arrivalDeps, router, show],
  );

  return {
    loading: settings === null,
    toast,
    notifyMaintenance: settings?.notifyMaintenance ?? false,
    notifyDocuments: settings?.notifyDocuments ?? false,
    notifyOdometer: settings?.notifyOdometer ?? false,
    voiceAutoSave: settings?.voiceAutoSave ?? false,
    showStationArrival,
    stationArrival: settings?.stationArrival ?? false,
    documentNotifyDays: settings ? formatNotifyDays(settings.documentNotifyDays) : '',
    setNotifyMaintenance: (value: boolean) => void toggle('notifyMaintenance', value),
    setNotifyDocuments: (value: boolean) => void toggle('notifyDocuments', value),
    setNotifyOdometer: (value: boolean) => void toggle('notifyOdometer', value),
    setVoiceAutoSave: (value: boolean) => void setVoiceAutoSave(value),
    setStationArrival: (value: boolean) => void setStationArrival(value),
    openNotifyDays: () => router.push('/configuracoes/antecedencia'),
    exportData: () => show({ title: 'Em breve' }),
    back: () => router.back(),
  };
}
