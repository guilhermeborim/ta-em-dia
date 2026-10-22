import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useDb } from '../../../core/db';
import { useFlag } from '../../../core/flags/useFlag';
import {
  buildVehicleInput,
  emptyFirstVehicleForm,
  formatKm,
  type FirstVehicleErrors,
  type FirstVehicleForm,
  type VehicleKind,
} from '../models/firstVehicle';
import { createVehicle, VehicleLimitError } from '../models/vehicles.repository';
import { vehicleLimitMessage } from '../models/vehicleLimit';

/**
 * ViewModel: estado do formulário, validação, gravação local e saída. No primeiro uso
 * (`first`), segue para as notificações e pode pular; em `add` (Meus veículos), volta.
 */
export function useFirstVehicleViewModel(mode: 'first' | 'add' = 'first') {
  const db = useDb();
  const router = useRouter();
  const max = useFlag('vehicles.max');
  const [form, setForm] = useState<FirstVehicleForm>(emptyFirstVehicleForm);
  const [errors, setErrors] = useState<FirstVehicleErrors>({});
  const [busy, setBusy] = useState(false);

  const set = useCallback(
    <K extends keyof FirstVehicleForm>(key: K, value: FirstVehicleForm[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    },
    [],
  );

  const next = useCallback(
    () => (mode === 'add' ? router.back() : router.replace('/permissao-notificacoes')),
    [mode, router],
  );

  const save = useCallback(async () => {
    const result = buildVehicleInput(form);
    if (result.errors) {
      setErrors(result.errors);
      return;
    }
    setBusy(true);
    try {
      await createVehicle(db, result.value, { max });
      next();
    } catch (error) {
      // Outro aparelho ou outra tela pode ter enchido o limite entre abrir e salvar.
      if (!(error instanceof VehicleLimitError)) throw error;
      Alert.alert('Limite de veículos', vehicleLimitMessage(error.max));
    } finally {
      setBusy(false);
    }
  }, [db, form, max, next]);

  return {
    step: mode === 'add' ? undefined : 'Passo 1 de 2',
    skipLabel: mode === 'add' ? 'Cancelar' : 'Pular',
    form,
    errors,
    busy,
    kinds: [
      { kind: 'car' as VehicleKind, label: 'Carro' },
      { kind: 'motorcycle' as VehicleKind, label: 'Moto' },
    ],
    setKind: (kind: VehicleKind) => set('kind', kind),
    setBrand: (value: string) => set('brand', value),
    setModel: (value: string) => set('model', value),
    setYear: (value: string) => set('year', value.replace(/\D/g, '').slice(0, 4)),
    setNickname: (value: string) => set('nickname', value),
    setKm: (value: string) => set('km', formatKm(value)),
    save,
    skip: next,
  };
}
