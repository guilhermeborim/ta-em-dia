import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useDb } from '../../../core/db';
import { refreshReminders } from '../../../core/reminders';
import { addManualReading } from '../../../core/odometer';
import { buildKmInput, formatKm } from '../models/updateKm';
import { loadVehicleDetail } from '../models/vehicleDetail.repository';

/** ViewModel de Atualizar km: valida contra o km atual, grava a leitura e reagenda os avisos. */
export function useUpdateKmViewModel() {
  const db = useDb();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  // `undefined` = carregando; `null` = não existe (ou foi excluído).
  const [vehicle, setVehicle] = useState<{ name: string; currentKm: number } | null | undefined>(
    undefined,
  );
  const [km, setKm] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    loadVehicleDetail(db, id).then((data) => {
      if (!active) return;
      setVehicle(data && { name: data.vehicle.name, currentKm: data.currentKm });
      if (data) setKm(formatKm(String(data.currentKm)));
    });
    return () => {
      active = false;
    };
  }, [db, id]);

  const close = useCallback(() => router.back(), [router]);

  const save = useCallback(async () => {
    if (!vehicle || busy) return;
    const result = buildKmInput(km, vehicle.currentKm);
    if (result.error !== undefined) {
      setError(result.error);
      return;
    }
    setBusy(true);
    try {
      await addManualReading(db, { vehicleId: id, km: result.km });
      // O km mudou: os avisos de manutenção dependem dele.
      void refreshReminders(db);
      router.back();
    } finally {
      setBusy(false);
    }
  }, [busy, db, id, km, router, vehicle]);

  return {
    loading: vehicle === undefined,
    notFound: vehicle === null,
    name: vehicle?.name ?? '',
    km,
    error,
    busy,
    setKm: (value: string) => {
      setKm(formatKm(value));
      setError(undefined);
    },
    save,
    close,
  };
}
