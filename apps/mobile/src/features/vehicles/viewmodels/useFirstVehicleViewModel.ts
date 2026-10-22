import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useDb } from '../../../core/db';
import {
  buildVehicleInput,
  emptyFirstVehicleForm,
  formatKm,
  type FirstVehicleErrors,
  type FirstVehicleForm,
  type VehicleKind,
} from '../models/firstVehicle';
import { createVehicle } from '../models/vehicles.repository';

/** ViewModel: estado do formulário, validação, gravação local e saída (salvar ou pular). */
export function useFirstVehicleViewModel() {
  const db = useDb();
  const router = useRouter();
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

  // Próximo passo do fluxo ainda não existe (permissão de notificações): vai para o app.
  const next = useCallback(() => router.replace('/'), [router]);

  const save = useCallback(async () => {
    const result = buildVehicleInput(form);
    if (result.errors) {
      setErrors(result.errors);
      return;
    }
    setBusy(true);
    try {
      await createVehicle(db, result.value);
      next();
    } finally {
      setBusy(false);
    }
  }, [db, form, next]);

  return {
    step: 'Passo 1 de 2',
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
