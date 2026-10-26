import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useDb } from '../../../core/db';
import { appVersion } from '../../../core/env/appEnv';
import { useFlag } from '../../../core/flags/useFlag';
import { hasExternalLink, openExternalLink, type ExternalLink } from '../../../core/links';
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
import { exportFileName } from '../models/exportData';
import { loadExport } from '../models/exportData.repository';
import { formatNotifyDays } from '../models/settingsView';

/**
 * ViewModel de Configurações (tela 20): avisos por tipo, antecedência padrão, salvar pela fala,
 * aviso ao chegar no posto, unidades, exportar, Termos e Privacidade.
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

  // Exportar meus dados (LGPD): gera o JSON com tudo do aparelho e abre o menu de compartilhar.
  const [exporting, setExporting] = useState(false);
  const exportData = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const now = new Date();
      const doc = await loadExport(db, { now, appVersion });
      // Carregado só aqui: num build sem os módulos nativos, o erro vira aviso em vez de quebrar a tela.
      const { shareJsonFile } = await import('../models/shareFile');
      if (!(await shareJsonFile(exportFileName(now), JSON.stringify(doc, null, 2)))) {
        show({
          title: 'Não foi possível exportar',
          message: 'Este aparelho não compartilha arquivos.',
        });
      }
    } catch {
      show({ title: 'Não foi possível exportar', message: 'Tente de novo.' });
    } finally {
      setExporting(false);
    }
  }, [db, exporting, show]);

  const openLink = useCallback(
    async (kind: ExternalLink) => {
      const notice = await openExternalLink(kind);
      if (notice) show(notice);
    },
    [show],
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
    /** "Preparando o arquivo..." enquanto o arquivo é gerado. */
    exportHint: exporting ? 'Preparando o arquivo...' : undefined,
    exportData: () => void exportData(),
    /** "Em breve" abaixo de Termos e Privacidade enquanto o build não tem as URLs. */
    termsHint: hasExternalLink('terms') ? undefined : 'Em breve',
    privacyHint: hasExternalLink('privacy') ? undefined : 'Em breve',
    openTerms: () => void openLink('terms'),
    openPrivacy: () => void openLink('privacy'),
    back: () => router.back(),
  };
}
