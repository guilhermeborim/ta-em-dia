import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDb } from '../../../core/db';
import { formatDateInput, formatKm, sanitizeDecimal, toDateInput } from '../../../core/format';
import {
  buildRegisterInput,
  buildTypeOptions,
  emptyRegisterForm,
  OTHER_TYPE,
  type RegisterErrors,
  type RegisterForm,
} from '../models/registerForm';
import {
  loadRegisterContext,
  registerMaintenance,
  type RegisterContext,
} from '../models/register.repository';

const initialForm = (): RegisterForm => ({
  ...emptyRegisterForm,
  date: toDateInput(new Date()),
});

/**
 * ViewModel de "Registrar manutenção" (tela 12): tipo (pronto, atalho "Seu" ou "Outro"), data, km,
 * custo e oficina. Chegando por "Marcar como feita", o tipo do plano já vem escolhido.
 */
export function useRegisterMaintenanceViewModel() {
  const db = useDb();
  const router = useRouter();
  const { planId } = useLocalSearchParams<{ planId?: string }>();
  const [context, setContext] = useState<RegisterContext | null>(null);
  const [form, setForm] = useState<RegisterForm>(initialForm);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    loadRegisterContext(db, planId).then((value) => {
      if (!active) return;
      setContext(value);
      setForm((prev) => ({
        ...prev,
        typeKey: value.planType ?? prev.typeKey,
        km: value.currentKm > 0 ? formatKm(String(value.currentKm)) : '',
      }));
    });
    return () => {
      active = false;
    };
  }, [db, planId]);

  const options = useMemo(() => buildTypeOptions(context?.customTypes ?? []), [context]);

  const set = useCallback(
    <K extends keyof RegisterForm>(
      key: K,
      value: RegisterForm[K],
      clear?: keyof RegisterErrors,
    ) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      if (clear) setErrors((prev) => ({ ...prev, [clear]: undefined }));
    },
    [],
  );

  const save = useCallback(async () => {
    if (!context?.vehicle || busy) return;
    const result = buildRegisterInput(form, {
      vehicleId: context.vehicle.id,
      customTypes: context.customTypes,
    });
    if (result.errors) return setErrors(result.errors);
    setBusy(true);
    try {
      await registerMaintenance(db, result.value);
      router.back();
    } finally {
      setBusy(false);
    }
  }, [busy, context, db, form, router]);

  return {
    loading: context === null,
    hasVehicle: context?.vehicle != null,
    form,
    errors,
    busy,
    options,
    showCustomName: form.typeKey === OTHER_TYPE,
    selectType: (key: string) => set('typeKey', key, 'type'),
    setCustomName: (text: string) => set('customName', text, 'customName'),
    setDate: (text: string) => set('date', formatDateInput(text), 'date'),
    setKm: (text: string) => set('km', formatKm(text), 'km'),
    setCost: (text: string) => set('cost', sanitizeDecimal(text, 2)),
    setShop: (text: string) => set('shop', text),
    close: () => router.back(),
    addVehicle: () => router.replace('/primeiro-veiculo'),
    save,
  };
}
