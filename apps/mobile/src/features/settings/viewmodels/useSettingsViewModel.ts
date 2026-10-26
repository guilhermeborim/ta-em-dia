import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useDb } from '../../../core/db';
import { hasExternalLink, openExternalLink, type ExternalLink } from '../../../core/links';
import { requestNotificationPermission } from '../../../core/notifications';
import { refreshReminders } from '../../../core/reminders';
import {
  loadSettings,
  saveToggle,
  type AppSettings,
  type NotifySetting,
} from '../../../core/settings';
import { useToast } from '../../../core/toast/useToast';
import { formatNotifyDays } from '../models/settingsView';

/** ViewModel de Configurações (tela 20): avisos por tipo, antecedência padrão, unidades, exportar, Termos e Privacidade. */
export function useSettingsViewModel() {
  const db = useDb();
  const router = useRouter();
  const { toast, show } = useToast();
  const [settings, setSettings] = useState<AppSettings | null>(null);

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
    documentNotifyDays: settings ? formatNotifyDays(settings.documentNotifyDays) : '',
    setNotifyMaintenance: (value: boolean) => void toggle('notifyMaintenance', value),
    setNotifyDocuments: (value: boolean) => void toggle('notifyDocuments', value),
    setNotifyOdometer: (value: boolean) => void toggle('notifyOdometer', value),
    setVoiceAutoSave: (value: boolean) => void setVoiceAutoSave(value),
    openNotifyDays: () => router.push('/configuracoes/antecedencia'),
    exportData: () => show({ title: 'Em breve' }),
    /** "Em breve" abaixo de Termos e Privacidade enquanto o build não tem as URLs. */
    termsHint: hasExternalLink('terms') ? undefined : 'Em breve',
    privacyHint: hasExternalLink('privacy') ? undefined : 'Em breve',
    openTerms: () => void openLink('terms'),
    openPrivacy: () => void openLink('privacy'),
    back: () => router.back(),
  };
}
