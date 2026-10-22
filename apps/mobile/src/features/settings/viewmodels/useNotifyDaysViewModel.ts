import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useDb } from '../../../core/db';
import { loadSettings, saveDocumentNotifyDays } from '../../../core/settings';
import { notifyDayOptions, notifyDaysError, toggleDay } from '../models/settingsView';

/** ViewModel da Antecedência padrão dos prazos novos (sem frame no Figma: segue o formulário de prazo). */
export function useNotifyDaysViewModel() {
  const db = useDb();
  const router = useRouter();
  const [days, setDays] = useState<number[] | null>(null);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    loadSettings(db).then((settings) => {
      if (active) setDays(settings.documentNotifyDays);
    });
    return () => {
      active = false;
    };
  }, [db]);

  const save = useCallback(async () => {
    if (busy || days === null) return;
    const problem = notifyDaysError(days);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    try {
      await saveDocumentNotifyDays(db, days);
      router.back();
    } finally {
      setBusy(false);
    }
  }, [busy, days, db, router]);

  return {
    loading: days === null,
    options: notifyDayOptions.map((option) => ({
      ...option,
      selected: days?.includes(option.days) ?? false,
    })),
    error,
    busy,
    toggle: (value: number) => {
      setDays((prev) => toggleDay(prev ?? [], value));
      setError(undefined);
    },
    save,
    close: () => router.back(),
  };
}
