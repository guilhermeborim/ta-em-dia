import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useDb } from '../../../core/db';
import {
  buildIntervalInput,
  intervalFormFrom,
  type IntervalErrors,
  type IntervalForm,
} from '../models/intervalForm';
import { maintenanceLabel, MAINTENANCE_CATALOG } from '@ta-em-dia/shared';
import { loadPlanDetail, updatePlanInterval } from '../models/plans.repository';

/** ViewModel de "Editar intervalo" (tela 11c): campos em km e meses, salvar e remover. */
export function usePlanIntervalViewModel() {
  const db = useDb();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [plan, setPlan] = useState<{ title: string; own: boolean } | null | undefined>(undefined);
  const [form, setForm] = useState<IntervalForm>({ km: '', months: '' });
  const [errors, setErrors] = useState<IntervalErrors>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    loadPlanDetail(db, id).then((data) => {
      if (!active) return;
      if (!data) return setPlan(null);
      setPlan({
        title: maintenanceLabel(data.plan.type),
        own: !MAINTENANCE_CATALOG.some((item) => item.code === data.plan.type),
      });
      setForm(intervalFormFrom(data.plan));
    });
    return () => {
      active = false;
    };
  }, [db, id]);

  const setKm = useCallback((text: string) => {
    const digits = text.replace(/\D/g, '');
    setForm((prev) => ({
      ...prev,
      km: digits === '' ? '' : new Intl.NumberFormat('pt-BR').format(Number(digits)),
    }));
    setErrors((prev) => ({ ...prev, km: undefined }));
  }, []);

  const setMonths = useCallback((text: string) => {
    setForm((prev) => ({ ...prev, months: text.replace(/\D/g, '').slice(0, 3) }));
    setErrors((prev) => ({ ...prev, months: undefined }));
  }, []);

  const persist = useCallback(
    async (interval: { intervalKm?: number; intervalMonths?: number }) => {
      if (busy) return;
      setBusy(true);
      try {
        await updatePlanInterval(db, id, interval);
        router.back();
      } finally {
        setBusy(false);
      }
    },
    [busy, db, id, router],
  );

  const save = useCallback(async () => {
    const result = buildIntervalInput(form);
    if (result.errors) return setErrors(result.errors);
    await persist(result.value);
  }, [form, persist]);

  return {
    loading: plan === undefined,
    notFound: plan === null,
    title: plan?.title ?? '',
    own: plan?.own ?? false,
    form,
    errors,
    busy,
    setKm,
    setMonths,
    close: () => router.back(),
    save,
    remove: () => persist({}),
  };
}
