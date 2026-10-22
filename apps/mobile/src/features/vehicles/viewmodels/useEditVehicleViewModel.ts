import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useDb } from '../../../core/db';
import { refreshReminders } from '../../../core/reminders';
import {
  buildVehiclePatch,
  editFormFrom,
  normalizePlate,
  type EditVehicleErrors,
  type EditVehicleForm,
} from '../models/editVehicle';
import {
  deleteVehicle,
  findVehicle,
  setVehicleArchived,
  updateVehicle,
} from '../models/vehicles.repository';

const emptyForm: EditVehicleForm = { brand: '', model: '', year: '', nickname: '', plate: '' };

/** ViewModel de editar veículo: dados, arquivar/restaurar e excluir (com confirmação). */
export function useEditVehicleViewModel() {
  const db = useDb();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  // `undefined` = carregando; `null` = não existe (ou foi excluído).
  const [vehicle, setVehicle] = useState<{ name: string; archived: boolean } | null | undefined>(
    undefined,
  );
  const [form, setForm] = useState<EditVehicleForm>(emptyForm);
  const [errors, setErrors] = useState<EditVehicleErrors>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    findVehicle(db, id).then((found) => {
      if (!active) return;
      setVehicle(found && { name: found.name, archived: found.archived === true });
      if (found) setForm(editFormFrom(found));
    });
    return () => {
      active = false;
    };
  }, [db, id]);

  const set = useCallback(<K extends keyof EditVehicleForm>(key: K, value: EditVehicleForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }, []);

  const close = useCallback(() => router.back(), [router]);

  /** Depois de arquivar ou excluir, o detalhe deixa de fazer sentido: volta para a lista. */
  const leave = useCallback(() => router.dismissTo('/veiculos'), [router]);

  const run = useCallback(
    async (action: () => Promise<void>) => {
      if (busy) return;
      setBusy(true);
      try {
        await action();
      } finally {
        setBusy(false);
      }
    },
    [busy],
  );

  const save = useCallback(async () => {
    const result = buildVehiclePatch(form);
    if (result.errors) {
      setErrors(result.errors);
      return;
    }
    await run(async () => {
      await updateVehicle(db, id, result.value);
      router.back();
    });
  }, [db, form, id, router, run]);

  const toggleArchive = useCallback(
    () =>
      run(async () => {
        await setVehicleArchived(db, id, !vehicle?.archived);
        // O veículo ativo pode ter mudado: os avisos seguem o ativo.
        void refreshReminders(db);
        leave();
      }),
    [db, id, leave, run, vehicle?.archived],
  );

  const remove = useCallback(
    () =>
      run(async () => {
        await deleteVehicle(db, id);
        void refreshReminders(db);
        leave();
      }),
    [db, id, leave, run],
  );

  const confirmDelete = useCallback(() => {
    Alert.alert(
      'Excluir veículo?',
      'Os abastecimentos, as manutenções e os lembretes dele também serão apagados. Isso não pode ser desfeito.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => void remove() },
      ],
    );
  }, [remove]);

  return {
    loading: vehicle === undefined,
    notFound: vehicle === null,
    archived: vehicle?.archived === true,
    form,
    errors,
    busy,
    setBrand: (value: string) => set('brand', value),
    setModel: (value: string) => set('model', value),
    setYear: (value: string) => set('year', value.replace(/\D/g, '').slice(0, 4)),
    setNickname: (value: string) => set('nickname', value),
    setPlate: (value: string) => set('plate', normalizePlate(value)),
    save,
    toggleArchive,
    confirmDelete,
    close,
  };
}
